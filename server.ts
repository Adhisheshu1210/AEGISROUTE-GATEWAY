/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

import { 
  INITIAL_SHIPMENTS, 
  INITIAL_INCIDENTS, 
  INITIAL_GPU_METRIC, 
  getStats 
} from './server/mockData';
import { getRerouteRecommendation } from './server/gemini';
import { Shipment, DisruptionIncident, GpuMetric } from './src/types';
import { authStore, signJwt, verifyJwt, hashPassword, UserRole, User } from './server/authStore';
import { notificationStore } from './server/notificationStore';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Express JSON middleware
  app.use(express.json());

  // In-memory backend state
  let shipments: Shipment[] = JSON.parse(JSON.stringify(INITIAL_SHIPMENTS));
  let incidents: DisruptionIncident[] = JSON.parse(JSON.stringify(INITIAL_INCIDENTS));
  let gpuMetric: GpuMetric = JSON.parse(JSON.stringify(INITIAL_GPU_METRIC));

  // Historical GPU metrics for thermal and power consumption line charting over time
  let gpuHistory = [
    { timestamp: '08:00', temperature: 52, powerDraw: 110, utilization: 35 },
    { timestamp: '09:00', temperature: 55, powerDraw: 140, utilization: 45 },
    { timestamp: '10:00', temperature: 68, powerDraw: 210, utilization: 75 },
    { timestamp: '11:00', temperature: 72, powerDraw: 245, utilization: 88 },
    { timestamp: '12:00', temperature: 75, powerDraw: 280, utilization: 95 },
    { timestamp: '13:00', temperature: 64, powerDraw: 180, utilization: 60 },
    { timestamp: '14:00', temperature: 59, powerDraw: 155, utilization: 50 },
    { timestamp: '15:00', temperature: 71, powerDraw: 250, utilization: 90 },
    { timestamp: '16:00', temperature: 76, powerDraw: 295, utilization: 98 },
    { timestamp: '17:00', temperature: 74, powerDraw: 275, utilization: 92 },
    { timestamp: '18:00', temperature: 62, powerDraw: 165, utilization: 55 },
    { timestamp: '19:00', temperature: 58, powerDraw: 130, utilization: 42 }
  ];

  // Initialize affected route indicators
  shipments.forEach(s => {
    const matchingIncident = incidents.find(inc => inc.routesAffected.includes(s.id));
    if (matchingIncident) {
      s.status = 'disrupted';
      s.activeDisruptionId = matchingIncident.id;
      s.delayHours = 5.5;
    }
  });

  // ==========================================
  // AUTHENTICATION MIDDLEWARES (RBAC & JWT)
  // ==========================================

  const authenticateUser = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication token required' });
    }
    const token = authHeader.split(' ')[1];
    const payload = verifyJwt(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired session token' });
    }
    const session = authStore.sessions.get(payload.sessionId);
    if (!session) {
      return res.status(401).json({ error: 'Session has been invalidated or revoked' });
    }
    const user = authStore.users.get(payload.email);
    if (!user) {
      return res.status(401).json({ error: 'User account not found' });
    }
    
    // Attach to request
    (req as any).user = user;
    (req as any).session = session;
    next();
  };

  const requireRole = (allowedRoles: UserRole[]) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const user = (req as any).user;
      if (!user || !allowedRoles.includes(user.role)) {
        authStore.addAuditLog(
          user?.id || 'ANONYMOUS',
          user?.email || 'anonymous',
          'ACCESS_DENIED',
          `Access to ${req.method} ${req.path} rejected. Allowed: ${allowedRoles.join(',')}. Current: ${user?.role || 'None'}`,
          req.ip || '127.0.0.1',
          'WARNING'
        );
        return res.status(403).json({ 
          error: `Access Denied: Action requires any of the following roles: ${allowedRoles.join(', ')}` 
        });
      }
      next();
    };
  };

  // ==========================================
  // AUTHENTICATION GATEWAY API ENDPOINTS
  // ==========================================

  // 1. Password/Credential Based Login
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = authStore.getUserByEmail(email);
    if (!user) {
      authStore.addAuditLog(
        'UNKNOWN',
        email,
        'LOGIN_FAILED',
        'Invalid email address provided',
        req.ip || '127.0.0.1',
        'WARNING'
      );
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const targetHash = hashPassword(password);
    if (user.passwordHash !== targetHash) {
      authStore.addAuditLog(
        user.id,
        user.email,
        'LOGIN_FAILED',
        'Incorrect password validation attempt',
        req.ip || '127.0.0.1',
        'WARNING'
      );
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check Multi-Factor Authentication Requirements
    if (user.mfaEnabled) {
      const tempToken = signJwt({ email: user.email, mfaPending: true }, 300); // 5 mins expiry
      authStore.addAuditLog(
        user.id,
        user.email,
        'MFA_CHALLENGE',
        'MFA second-factor validation challenge issued',
        req.ip || '127.0.0.1',
        'INFO'
      );
      return res.json({ mfaRequired: true, tempToken, email: user.email });
    }

    // Standard session initialization
    const session = authStore.createSession(user, req.ip || '127.0.0.1', req.headers['user-agent'] || '');
    const token = signJwt({ email: user.email, role: user.role, sessionId: session.id }, 86400); // 24hr

    authStore.addAuditLog(
      user.id,
      user.email,
      'LOGIN_SUCCESS',
      `Session established via credentials. ID: ${session.id}`,
      req.ip || '127.0.0.1',
      'INFO'
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        mfaEnabled: user.mfaEnabled
      }
    });
  });

  // 2. MFA Verification Code Verification
  app.post('/api/auth/login-mfa', (req, res) => {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) {
      return res.status(400).json({ error: 'Temporary token and MFA verification code are required' });
    }

    const payload = verifyJwt(tempToken);
    if (!payload || !payload.mfaPending) {
      return res.status(401).json({ error: 'MFA session challenge has expired' });
    }

    const user = authStore.getUserByEmail(payload.email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Multi-Factor Authentication Verification logic:
    // In our live responsive system, we dynamically match the user's static MFA secret key (displayed visually),
    // or allow verification codes based on standard OTP patterns. Let's make it match user.mfaSecret or the 6-digit dynamic code "123456" for convenience,
    // plus allow simulated TOTP code evaluation.
    const isMockOtpCode = code === '123456' || code === user.mfaSecret;
    if (!isMockOtpCode) {
      authStore.addAuditLog(
        user.id,
        user.email,
        'MFA_VERIFICATION_FAILED',
        `MFA verification code ${code} failed verification check.`,
        req.ip || '127.0.0.1',
        'WARNING'
      );
      return res.status(401).json({ error: 'Invalid Multi-Factor Authentication code' });
    }

    const session = authStore.createSession(user, req.ip || '127.0.0.1', req.headers['user-agent'] || '');
    const token = signJwt({ email: user.email, role: user.role, sessionId: session.id }, 86400);

    authStore.addAuditLog(
      user.id,
      user.email,
      'LOGIN_SUCCESS_MFA',
      `Session established via Multi-Factor. ID: ${session.id}`,
      req.ip || '127.0.0.1',
      'INFO'
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        mfaEnabled: user.mfaEnabled
      }
    });
  });

  // 3. User Registration / Account Creation
  app.post('/api/auth/register', (req, res) => {
    const { name, email, role, password } = req.body;
    if (!name || !email || !role || !password) {
      return res.status(400).json({ error: 'All registration parameters are required' });
    }

    try {
      const user = authStore.registerUser(name, email, role as UserRole, password);
      authStore.addAuditLog(
        user.id,
        user.email,
        'USER_REGISTERED',
        `New ${role} account successfully provisioned for ${name}.`,
        req.ip || '127.0.0.1',
        'INFO'
      );

      // Create login session instantly
      const session = authStore.createSession(user, req.ip || '127.0.0.1', req.headers['user-agent'] || '');
      const token = signJwt({ email: user.email, role: user.role, sessionId: session.id }, 86400);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
          mfaEnabled: user.mfaEnabled
        }
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Registration failed' });
    }
  });

  // 4. Session Validation (Check JWT & Active Token Status)
  app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No active session token provided' });
    }
    const token = authHeader.split(' ')[1];
    const payload = verifyJwt(token);
    if (!payload) {
      return res.status(401).json({ error: 'Session token has expired' });
    }
    const session = authStore.sessions.get(payload.sessionId);
    if (!session) {
      return res.status(401).json({ error: 'Active session revoked' });
    }
    const user = authStore.users.get(payload.email);
    if (!user) {
      return res.status(401).json({ error: 'User does not exist' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        mfaEnabled: user.mfaEnabled,
        mfaSecret: user.mfaSecret
      },
      session: {
        id: session.id,
        createdAt: session.createdAt,
        ipAddress: session.ipAddress
      }
    });
  });

  // 5. Invalidate / Sign Out active user
  app.post('/api/auth/logout', authenticateUser, (req, res) => {
    const session = (req as any).session;
    const user = (req as any).user;
    authStore.revokeSession(session.id);

    authStore.addAuditLog(
      user.id,
      user.email,
      'LOGOUT',
      `Session ${session.id} successfully invalidated.`,
      req.ip || '127.0.0.1',
      'INFO'
    );

    res.json({ success: true, message: 'Logged out successfully' });
  });

  // 6. Generate Password Reset Token (Simulation flow)
  app.post('/api/auth/reset-password-request', (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = authStore.getUserByEmail(email);
    if (!user) {
      // Avoid revealing account enumeration, return success anyway but don't generate token
      return res.json({ success: true, message: 'If the email matches an account, a reset code was generated.' });
    }

    const token = authStore.createResetToken(email);
    authStore.addAuditLog(
      user.id,
      user.email,
      'PASSWORD_RESET_REQUEST',
      `Password reset code generated. Code: ${token}`,
      req.ip || '127.0.0.1',
      'INFO'
    );

    res.json({ 
      success: true, 
      message: 'Password reset code generated.',
      resetToken: token, // Returned to client to simulate email delivery in the interactive UI
      email: user.email 
    });
  });

  // 7. Execute Password Reset update
  app.post('/api/auth/reset-password-confirm', (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }

    const email = authStore.verifyResetToken(token);
    if (!email) {
      return res.status(400).json({ error: 'Invalid or expired password reset code' });
    }

    const user = authStore.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.passwordHash = hashPassword(newPassword);
    authStore.passwordResetTokens.delete(token);

    // Revoke all existing sessions for security
    const userSessions = authStore.getUserSessions(user.id);
    userSessions.forEach(s => authStore.revokeSession(s.id));

    authStore.addAuditLog(
      user.id,
      user.email,
      'PASSWORD_RESET_SUCCESS',
      'Password updated successfully. All active sessions invalidated.',
      req.ip || '127.0.0.1',
      'INFO'
    );

    res.json({ success: true, message: 'Password has been updated. Please sign in.' });
  });

  // 8. Generate Multi-Factor Authentication Setup Secret
  app.post('/api/auth/mfa/setup', authenticateUser, (req, res) => {
    const user = (req as any).user;
    
    // Generate standard QR-URI simulation parameters
    const qrUri = `otpauth://totp/AegisRoute:${user.email}?secret=${user.mfaSecret}&issuer=AegisRoute`;

    res.json({
      secret: user.mfaSecret,
      qrUri,
      qrCodeBase64: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUri)}`
    });
  });

  // 9. Confirm and Enable Multi-Factor Authentication
  app.post('/api/auth/mfa/verify', authenticateUser, (req, res) => {
    const { code } = req.body;
    const user = (req as any).user;

    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    // Allow user.mfaSecret or mock TOTP dynamic codes
    const isVerified = code === '123456' || code === user.mfaSecret;
    if (!isVerified) {
      return res.status(400).json({ error: 'Invalid setup verification code' });
    }

    user.mfaEnabled = true;
    authStore.addAuditLog(
      user.id,
      user.email,
      'MFA_ENABLED',
      'Multi-Factor Authentication (MFA) has been configured and activated.',
      req.ip || '127.0.0.1',
      'INFO'
    );

    res.json({ success: true, message: 'MFA successfully activated!' });
  });

  // 10. List current active sessions
  app.get('/api/auth/sessions', authenticateUser, (req, res) => {
    const user = (req as any).user;
    const sessions = authStore.getUserSessions(user.id);
    res.json(sessions);
  });

  // 11. Revoke active user session
  app.post('/api/auth/sessions/revoke', authenticateUser, (req, res) => {
    const { sessionId } = req.body;
    const user = (req as any).user;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const session = authStore.sessions.get(sessionId);
    if (!session || session.userId !== user.id) {
      return res.status(404).json({ error: 'Session not found' });
    }

    authStore.revokeSession(sessionId);
    authStore.addAuditLog(
      user.id,
      user.email,
      'SESSION_REVOKED',
      `Active session ${sessionId} was manually revoked by user.`,
      req.ip || '127.0.0.1',
      'INFO'
    );

    res.json({ success: true });
  });

  // 12. Retrieve Operational Audit Logs (RBAC Protected: Admin Only)
  app.get('/api/auth/audit-logs', authenticateUser, requireRole(['Admin']), (req, res) => {
    res.json(authStore.auditLogs);
  });

  // 13. Construct Google OAuth Authorization URL
  app.get('/api/auth/google/url', (req, res) => {
    const callbackOrigin = req.headers.referer || `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${callbackOrigin.replace(/\/$/, '')}/auth/callback`;

    // Construct authorization query parameters
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || 'aegisroute-mock-google-client-id-2026.apps.googleusercontent.com',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      prompt: 'consent'
    });

    // If real Google secrets exist, we can forward to Google, else provide our highly-immersive OAuth simulation callback directly
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    
    // For local ease of test, we output BOTH a dynamic real URL and a mock trigger so developers have instantaneous testing.
    res.json({ url: authUrl, redirectUri });
  });

  // 14. Handle Google OAuth Callback (Conforms strictly with popup / postMessage guidelines)
  app.get(['/auth/callback', '/auth/callback/'], (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
      return res.send(`
        <html>
          <body style="background:#09090b; color:#ef4444; font-family:sans-serif; text-align:center; padding: 40px;">
            <h3>Google OAuth Authorization Rejected</h3>
            <p>${error}</p>
            <button onclick="window.close()" style="background:#ef4444; border:none; padding:10px 20px; color:white; border-radius:4px; cursor:pointer;">Close Window</button>
          </body>
        </html>
      `);
    }

    // Establish a Google Federated user simulation or look up real profile code
    let email = 'external-partner@google.com';
    let name = 'Google Federated Operator';
    let avatarUrl = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop';

    if (code && typeof code === 'string' && code.includes('google-user-')) {
      // Custom user simulation values decoded from standard popup triggers
      try {
        const parts = code.split('-');
        if (parts[2]) email = decodeURIComponent(parts[2]);
        if (parts[3]) name = decodeURIComponent(parts[3]).replace(/_/g, ' ');
      } catch (e) {}
    }

    // Get or register the federated user under 'Viewer' (default federated scope)
    let user = authStore.getUserByEmail(email);
    if (!user) {
      user = authStore.registerUser(name, email, 'Viewer', crypto.randomBytes(16).toString('hex'));
      user.avatarUrl = avatarUrl;
    }

    const session = authStore.createSession(user, req.ip || '127.0.0.1', req.headers['user-agent'] || '');
    const token = signJwt({ email: user.email, role: user.role, sessionId: session.id }, 86400);

    authStore.addAuditLog(
      user.id,
      user.email,
      'GOOGLE_OAUTH_LOGIN_SUCCESS',
      `Federated login successful. Session ID: ${session.id}`,
      req.ip || '127.0.0.1',
      'INFO'
    );

    // Communicate back to parent frame inside AI Studio (Popup mode)
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>AegisRoute Google Identity Authentication</title>
          <style>
            body {
              background: #09090b;
              color: #f4f4f5;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
            }
            .spinner {
              width: 40px;
              height: 40px;
              border: 3px solid rgba(59, 130, 246, 0.1);
              border-top-color: #3b82f6;
              border-radius: 50%;
              animation: spin 1s infinite linear;
              margin-bottom: 20px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            h3 { font-weight: 500; margin: 0 0 8px 0; font-size: 16px; }
            p { color: #a1a1aa; font-size: 12px; margin: 0; }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <h3>Synchronizing Secure Handshake</h3>
          <p>Transferring cryptographic tokens. This dialog will close automatically.</p>
          <script>
            try {
              const responseData = {
                type: 'OAUTH_AUTH_SUCCESS',
                token: ${JSON.stringify(token)},
                user: {
                  id: ${JSON.stringify(user.id)},
                  email: ${JSON.stringify(user.email)},
                  name: ${JSON.stringify(user.name)},
                  role: ${JSON.stringify(user.role)},
                  avatarUrl: ${JSON.stringify(user.avatarUrl)},
                  mfaEnabled: ${user.mfaEnabled}
                }
              };

              // Post to opener window
              if (window.opener) {
                window.opener.postMessage(responseData, '*');
                setTimeout(() => {
                  window.close();
                }, 400);
              } else {
                // If opened directly
                localStorage.setItem('aegisroute_jwt_token', responseData.token);
                localStorage.setItem('aegisroute_user_profile', JSON.stringify(responseData.user));
                window.location.href = '/';
              }
            } catch (err) {
              console.error('Handshake postMessage delivery failed:', err);
            }
          </script>
        </body>
      </html>
    `);
  });

  // ==========================================
  // SECURED GENERAL OPERATIONAL ENDPOINTS
  // ==========================================

  // Get all active shipments (Protected)
  app.get('/api/shipments', authenticateUser, (req, res) => {
    res.json(shipments);
  });

  // Get all active disruption incidents (Protected)
  app.get('/api/incidents', authenticateUser, (req, res) => {
    res.json(incidents);
  });

  // Get current GPU metrics (Protected)
  app.get('/api/gpu-metrics', authenticateUser, (req, res) => {
    res.json({
      ...gpuMetric,
      history: gpuHistory
    });
  });

  // Get high-level aggregated statistics (Protected)
  app.get('/api/stats', authenticateUser, (req, res) => {
    const stats = getStats(shipments, incidents);
    res.json(stats);
  });

  // Reset the entire simulation state to default (Protected: Admin Only)
  app.post('/api/reset', authenticateUser, requireRole(['Admin']), (req, res) => {
    shipments = JSON.parse(JSON.stringify(INITIAL_SHIPMENTS));
    incidents = JSON.parse(JSON.stringify(INITIAL_INCIDENTS));
    gpuMetric = JSON.parse(JSON.stringify(INITIAL_GPU_METRIC));
    
    // Re-bind default incident
    shipments.forEach(s => {
      const matchingIncident = incidents.find(inc => inc.routesAffected.includes(s.id));
      if (matchingIncident) {
        s.status = 'disrupted';
        s.activeDisruptionId = matchingIncident.id;
        s.delayHours = 5.5;
      }
    });

    const user = (req as any).user;
    authStore.addAuditLog(
      user.id,
      user.email,
      'PLATFORM_RESET',
      'AegisRoute shipment state ledger manually initialized back to seeds.',
      req.ip || '127.0.0.1',
      'CRITICAL'
    );

    console.log('🔄 AegisRoute platform state has been reset.');
    res.json({ success: true, message: 'Platform state reset successful.' });
  });

  // Trigger a specific disruption incident (Protected: Admin Only)
  app.post('/api/disruptions/trigger', authenticateUser, requireRole(['Admin']), async (req, res) => {
    const { type, locationName } = req.body;
    const user = (req as any).user;
    console.log(`📡 Disruption trigger received: Type=${type}, Location=${locationName}`);

    let newIncident: DisruptionIncident;
    const nowStr = new Date().toISOString();

    if (type === 'hurricane') {
      newIncident = {
        id: `inc-${Date.now()}`,
        type: 'hurricane',
        title: 'Hurricane Delilah (Category 3)',
        location: 'Eastern Gulf of Mexico Corridor',
        description: 'Dangerous category-3 convective hurricane system moving northward at 18 knots, packing sustained wind speeds of 115mph. Restricting all flight routes and open-water maritime freight lanes.',
        severity: 'critical',
        coordinates: { lat: 25.5, lng: -85.5 },
        radiusKm: 320,
        routesAffected: ['ship-003'], // Franklin to Houston Composite Turbines route
        timestamp: nowStr
      };
    } else if (type === 'port_congestion') {
      newIncident = {
        id: `inc-${Date.now()}`,
        type: 'port_congestion',
        title: 'LA/Long Beach Maritime Strike',
        location: 'San Pedro Bay Terminal Yards',
        description: 'Sudden wildcat longshoreman walkouts creating severe berth queue bottlenecks. Yard density spikes to 96% with inbound container dwell times exceeding 4.8 days.',
        severity: 'high',
        coordinates: { lat: 33.7, lng: -118.2 },
        radiusKm: 180,
        routesAffected: ['ship-001'], // Shanghai to LA Semiconductors
        timestamp: nowStr
      };
    } else if (type === 'customs_delay') {
      newIncident = {
        id: `inc-${Date.now()}`,
        type: 'customs_delay',
        title: 'Schengen Gateway Cyber-Outage',
        location: 'Venlo Rail-Customs Border Crossing',
        description: 'Critical cyber incident has taken down the automated battery import safety validation systems, causing standard customs verification queues to backlog for miles.',
        severity: 'high',
        coordinates: { lat: 51.3, lng: 6.1 },
        radiusKm: 90,
        routesAffected: ['ship-004'], // Rotterdam to Munich EV Batteries
        timestamp: nowStr
      };
    } else {
      return res.status(400).json({ error: 'Unsupported disruption type.' });
    }

    // Add incident if not duplicate
    if (!incidents.some(i => i.title === newIncident.title)) {
      incidents.push(newIncident);
    }

    // Update target shipments to Disrupted status and dispatch notifications
    shipments.forEach(s => {
      if (newIncident.routesAffected.includes(s.id)) {
        s.status = 'disrupted';
        s.activeDisruptionId = newIncident.id;
        const delayHours = type === 'hurricane' ? 12 : type === 'port_congestion' ? 36 : 14;
        s.delayHours = delayHours;

        notificationStore.dispatchPlatformNotification('disruption', {
          shipment_code: s.code,
          incident_type: type.replace('_', ' ').toUpperCase(),
          incident_title: newIncident.title,
          location: newIncident.location,
          shipment_priority: s.priority.toUpperCase(),
          delay_hours: delayHours.toString(),
          value_usd: s.value.toLocaleString()
        });
      }
    });

    authStore.addAuditLog(
      user.id,
      user.email,
      'DISRUPTION_TRIGGERED',
      `Disruption incident '${newIncident.title}' manually injected into corridor flow.`,
      req.ip || '127.0.0.1',
      'CRITICAL'
    );

    console.log(`✅ Disruption triggered. Shipment status updated to DISRUPTED.`);
    res.json({ success: true, incident: newIncident, affectedShipments: newIncident.routesAffected });
  });

  // Core intelligence route - Invoke Gemini to calculate detour path & options (Protected: Admin, Manager)
  app.post('/api/shipments/reroute', authenticateUser, requireRole(['Admin', 'Manager']), async (req, res) => {
    const { shipmentId } = req.body;
    const user = (req as any).user;
    console.log(`🧠 Invoking Gemini recommendation for Shipment: ${shipmentId}`);

    const shipment = shipments.find(s => s.id === shipmentId);
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    const incident = incidents.find(i => i.routesAffected.includes(shipmentId));
    if (!incident) {
      return res.status(400).json({ error: 'Shipment has no active disruption to optimize.' });
    }

    try {
      // Call Gemini solver
      const detourResult = await getRerouteRecommendation(shipment, incident);

      // Mutate shipment with optimal route point calculations
      shipment.optimizedRoutePoints = detourResult.reroutePoints;
      shipment.status = 'delayed'; // downgraded from "disrupted" to optimized delay
      shipment.delayHours = detourResult.estimatedArrivalDiffHours;
      shipment.currentEta = new Date(new Date(shipment.originalEta).getTime() + (detourResult.estimatedArrivalDiffHours * 60 * 60 * 1000)).toISOString();
      shipment.geminiSuggestion = detourResult.reasoning;

      notificationStore.dispatchPlatformNotification('reroute', {
        shipment_code: shipment.code,
        current_eta: shipment.currentEta.substring(0, 16).replace('T', ' '),
        delay_hours: (shipment.delayHours || 0).toString(),
        carbon_percent: detourResult.carbonEmissionDiffPercent.toString(),
        gemini_reasoning: detourResult.reasoning
      });

      authStore.addAuditLog(
        user.id,
        user.email,
        'DISRUPTION_SOLVED',
        `Disruption solved for shipment ${shipment.code} using Gemini Reasoning Engine.`,
        req.ip || '127.0.0.1',
        'INFO'
      );

      console.log(`🎯 Rerouting optimization completed. Distance: ${detourResult.recommendedDistanceMiles} miles. Saved time delay.`);
      res.json({ success: true, recommendation: detourResult });
    } catch (err: any) {
      console.error('Error solving route detour with Gemini:', err);
      res.status(500).json({ error: 'Gemini re-routing calculation failed', details: err.message });
    }
  });

  // Simulate GPU execution speedup (Protected: Admin, Manager)
  app.post('/api/gpu/run', authenticateUser, requireRole(['Admin', 'Manager']), (req, res) => {
    const user = (req as any).user;
    console.log('⚡ Running NVIDIA cuDF + Spark RAPIDS pipeline simulation...');
    
    // Simulate real pipeline recalculation metrics
    const records = 14250000 + Math.floor(Math.random() * 500000);
    const rapidsSec = parseFloat((0.95 + Math.random() * 0.3).toFixed(2));
    const speedup = parseFloat((((38.5 * 60) / rapidsSec)).toFixed(1));
    const throughput = parseFloat((records / (rapidsSec * 1000)).toFixed(1));

    gpuMetric = {
      legacyTimeMinutes: 38.5,
      rapidsTimeSeconds: rapidsSec,
      speedupMultiplier: speedup,
      recordsProcessed: records,
      throughputMsGpu: throughput,
      activeGpuCores: 7424, // NVIDIA L4
      gpuMemoryUsageGb: parseFloat((10.5 + Math.random() * 2).toFixed(1)),
      lastRanTimestamp: new Date().toISOString()
    };

    // Add a new history tick for thermal & power draw tracking over time
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const newTemp = Math.floor(62 + Math.random() * 14); // 62 - 76°C
    const newPower = Math.floor(180 + Math.random() * 90); // 180 - 270W
    const newUtil = Math.floor(82 + Math.random() * 15); // 82 - 97%
    gpuHistory.push({
      timestamp: timeStr,
      temperature: newTemp,
      powerDraw: newPower,
      utilization: newUtil
    });
    if (gpuHistory.length > 20) {
      gpuHistory.shift();
    }

    authStore.addAuditLog(
      user.id,
      user.email,
      'RAPIDS_SIMULATION_RUN',
      `Spark-RAPIDS scheduler triggered processing of ${records.toLocaleString()} rows in ${rapidsSec}s. Speedup: ${speedup}x.`,
      req.ip || '127.0.0.1',
      'INFO'
    );

    res.json({ success: true, metrics: { ...gpuMetric, history: gpuHistory } });
  });

  // ==========================================
  // NOTIFICATION SERVICE INTEGRATION ENDPOINTS
  // ==========================================

  // Get active gateways (channels)
  app.get('/api/notifications/channels', authenticateUser, (req, res) => {
    res.json(notificationStore.getChannels());
  });

  // Edit gateway config (Admin only)
  app.post('/api/notifications/channels', authenticateUser, requireRole(['Admin']), (req, res) => {
    const { id, enabled, config } = req.body;
    const updated = notificationStore.updateChannel(id, enabled, config);
    if (updated) {
      const user = (req as any).user;
      authStore.addAuditLog(
        user.id,
        user.email,
        'NOTIFICATION_GATEWAY_CONFIGURED',
        `Notification channel '${updated.name}' configurations updated. State: ${updated.enabled ? 'ACTIVE' : 'INACTIVE'}`,
        req.ip || '127.0.0.1',
        'WARNING'
      );
    }
    res.json({ success: !!updated, channel: updated });
  });

  // Get all notification templates
  app.get('/api/notifications/templates', authenticateUser, (req, res) => {
    res.json(notificationStore.getTemplates());
  });

  // Create notification template (Admin/Manager)
  app.post('/api/notifications/templates', authenticateUser, requireRole(['Admin', 'Manager']), (req, res) => {
    const { name, subject, body, channels } = req.body;
    const template = notificationStore.addTemplate(name, subject, body, channels);
    const user = (req as any).user;
    authStore.addAuditLog(
      user.id,
      user.email,
      'TEMPLATE_CREATED',
      `Custom notification template '${name}' created.`,
      req.ip || '127.0.0.1',
      'INFO'
    );
    res.json({ success: true, template });
  });

  // Edit notification template (Admin/Manager)
  app.put('/api/notifications/templates/:id', authenticateUser, requireRole(['Admin', 'Manager']), (req, res) => {
    const { subject, body, channels } = req.body;
    const updated = notificationStore.updateTemplate(req.params.id, subject, body, channels);
    if (updated) {
      const user = (req as any).user;
      authStore.addAuditLog(
        user.id,
        user.email,
        'TEMPLATE_UPDATED',
        `Notification template '${updated.name}' subjects and layouts updated.`,
        req.ip || '127.0.0.1',
        'INFO'
      );
    }
    res.json({ success: !!updated, template: updated });
  });

  // Delete notification template (Admin)
  app.delete('/api/notifications/templates/:id', authenticateUser, requireRole(['Admin']), (req, res) => {
    const success = notificationStore.deleteTemplate(req.params.id);
    if (success) {
      const user = (req as any).user;
      authStore.addAuditLog(
        user.id,
        user.email,
        'TEMPLATE_DELETED',
        `Notification template UUID ${req.params.id} permanently deleted.`,
        req.ip || '127.0.0.1',
        'INFO'
      );
    }
    res.json({ success });
  });

  // Get dispatch routing rules
  app.get('/api/notifications/rules', authenticateUser, (req, res) => {
    res.json(notificationStore.getPriorityRules());
  });

  // Update routing priority rules (Admin only)
  app.post('/api/notifications/rules', authenticateUser, requireRole(['Admin']), (req, res) => {
    const { rules } = req.body;
    notificationStore.updatePriorityRules(rules);
    const user = (req as any).user;
    authStore.addAuditLog(
      user.id,
      user.email,
      'ROUTING_RULES_UPDATED',
      'Operational notification routing priority channel maps updated.',
      req.ip || '127.0.0.1',
      'WARNING'
    );
    res.json({ success: true });
  });

  // Get active schedules
  app.get('/api/notifications/scheduled', authenticateUser, (req, res) => {
    res.json(notificationStore.getScheduled());
  });

  // Create scheduled broadcast (Admin/Manager)
  app.post('/api/notifications/scheduled', authenticateUser, requireRole(['Admin', 'Manager']), (req, res) => {
    const { name, time, frequency, templateId, recipient } = req.body;
    const sched = notificationStore.addScheduled(name, time, frequency, templateId, recipient);
    const user = (req as any).user;
    authStore.addAuditLog(
      user.id,
      user.email,
      'SCHEDULED_ALERT_CREATED',
      `Scheduled alert '${name}' assigned to recipient ${recipient} at frequency ${frequency}.`,
      req.ip || '127.0.0.1',
      'INFO'
    );
    res.json({ success: true, scheduled: sched });
  });

  // Delete scheduled alert (Admin)
  app.delete('/api/notifications/scheduled/:id', authenticateUser, requireRole(['Admin']), (req, res) => {
    const success = notificationStore.deleteScheduled(req.params.id);
    if (success) {
      const user = (req as any).user;
      authStore.addAuditLog(
        user.id,
        user.email,
        'SCHEDULED_ALERT_DELETED',
        `Scheduled alert ID ${req.params.id} deleted.`,
        req.ip || '127.0.0.1',
        'INFO'
      );
    }
    res.json({ success });
  });

  // Get escalations policies
  app.get('/api/notifications/escalation', authenticateUser, (req, res) => {
    res.json(notificationStore.getEscalationPolicies());
  });

  // Update escalation steps (Admin only)
  app.put('/api/notifications/escalation/:id', authenticateUser, requireRole(['Admin']), (req, res) => {
    const { steps, enabled } = req.body;
    const updated = notificationStore.updateEscalationPolicy(req.params.id, steps, enabled);
    if (updated) {
      const user = (req as any).user;
      authStore.addAuditLog(
        user.id,
        user.email,
        'ESCALATION_POLICY_UPDATED',
        `Escalation policy for ${updated.severity.toUpperCase()} alerts has been modified. Status: ${updated.enabled ? 'ACTIVE' : 'INACTIVE'}`,
        req.ip || '127.0.0.1',
        'WARNING'
      );
    }
    res.json({ success: !!updated, policy: updated });
  });

  // Get live telemetry notification logs
  app.get('/api/notifications/logs', authenticateUser, (req, res) => {
    res.json(notificationStore.getLogs());
  });

  // Clear live logs (Admin only)
  app.post('/api/notifications/logs/clear', authenticateUser, requireRole(['Admin']), (req, res) => {
    notificationStore.clearLogs();
    const user = (req as any).user;
    authStore.addAuditLog(
      user.id,
      user.email,
      'NOTIFICATION_LOGS_PURGED',
      'All active notification dispatch historical records successfully purged.',
      req.ip || '127.0.0.1',
      'INFO'
    );
    res.json({ success: true });
  });

  // Manual test simulation dispatch trigger
  app.post('/api/notifications/test-dispatch', authenticateUser, requireRole(['Admin', 'Manager']), (req, res) => {
    const { templateId, channelId, recipient } = req.body;
    const result = notificationStore.triggerManualTestDispatch(templateId, channelId, recipient);
    if (result.success && result.log) {
      const user = (req as any).user;
      authStore.addAuditLog(
        user.id,
        user.email,
        'NOTIFICATION_TEST_DISPATCHED',
        `Manual test alert routed via gateway channel [${channelId}] using template [${templateId}] to recipient ${recipient}.`,
        req.ip || '127.0.0.1',
        'INFO'
      );
    }
    res.json(result);
  });

  // ==========================================
  // REPORTING MODULE ENDPOINTS & DOWNLOAD APIs
  // ==========================================

  // Get aggregated reports data
  app.get('/api/reports/data', authenticateUser, (req, res) => {
    const stats = getStats(shipments, incidents);
    
    // Carbon Footprint calculations based on carriers
    const carriers = Array.from(new Set(shipments.map(s => s.carrier)));
    const carbonData = carriers.map(carrier => {
      const carrierShipments = shipments.filter(s => s.carrier === carrier);
      const ontimeCount = carrierShipments.filter(s => s.status === 'ontime').length;
      const delayedCount = carrierShipments.filter(s => s.status === 'delayed').length;
      const totalVal = carrierShipments.reduce((sum, s) => sum + s.value, 0);
      
      const fuelOptimal = Math.round(carrierShipments.length * 1250);
      const fuelWasted = Math.round(delayedCount * 380);
      const totalCO2 = Math.round((fuelOptimal + fuelWasted) * 2.68);
      
      return {
        carrier,
        shipmentCount: carrierShipments.length,
        ontimeCount,
        delayedCount,
        totalValueUsd: totalVal,
        fuelOptimalLiters: fuelOptimal,
        fuelWastedLiters: fuelWasted,
        co2EmissionKg: totalCO2,
        greenTier: totalCO2 < 15000 ? 'Tier A (Excellent)' : totalCO2 < 30000 ? 'Tier B (Standard)' : 'Tier C (Exceeded)'
      };
    });

    // Performance comparison metrics
    const performanceData = [
      { dataset: '1M Telematics', cpuMinutes: 162.0, gpuSeconds: 0.12, speedup: 1350 },
      { dataset: '5M Telematics', cpuMinutes: 810.0, gpuSeconds: 0.45, speedup: 1800 },
      { dataset: '10M Telematics', cpuMinutes: 1620.0, gpuSeconds: 0.88, speedup: 1840 },
      { dataset: '15M Telematics', cpuMinutes: 2430.0, gpuSeconds: 1.25, speedup: 1944 }
    ];

    // Incident log list with impact
    const incidentData = incidents.map(inc => {
      const affectedCargoValue = shipments
        .filter(s => inc.routesAffected.includes(s.id))
        .reduce((sum, s) => sum + s.value, 0);
      return {
        id: inc.id,
        type: inc.type,
        title: inc.title,
        location: inc.location,
        severity: inc.severity,
        radiusKm: inc.radiusKm,
        affectedRoutesCount: inc.routesAffected.length,
        affectedValueUsd: affectedCargoValue,
        timestamp: inc.timestamp
      };
    });

    res.json({
      stats,
      carbonData,
      performanceData,
      incidentData,
      totalValuation: shipments.reduce((sum, s) => sum + s.value, 0)
    });
  });

  // Download reports (PDF, CSV, Excel, PowerPoint)
  app.get('/api/reports/download', authenticateUser, (req, res) => {
    const { format, type } = req.query;
    if (!format || !type) {
      return res.status(400).json({ error: 'Parameters "format" and "type" are required' });
    }

    const stats = getStats(shipments, incidents);
    const dateStr = new Date().toISOString().substring(0, 10);
    const timestampStr = new Date().toLocaleTimeString();

    let filename = `aegis_report_${type}_${dateStr}`;
    let contentType = 'text/plain';
    let fileContent = '';

    const formatUpper = String(format).toUpperCase();
    const typeUpper = String(type).toUpperCase();

    // Log the audit event for report generation
    const user = (req as any).user;
    authStore.addAuditLog(
      user.id,
      user.email,
      'REPORT_GENERATED',
      `User generated and downloaded standard operations report: Type [${typeUpper}], Format [${formatUpper}]`,
      req.ip || '127.0.0.1',
      'INFO'
    );

    // 1. GENERATE CSV FORMAT
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      
      if (type === 'executive') {
        fileContent = `AEGISROUTE EXECUTIVE REPORT,Date: ${dateStr},Generated At: ${timestampStr}\n`;
        fileContent += `METRIC,VALUE,SLA METRIC\n`;
        fileContent += `Total Shipments Active,${stats.totalShipments},SLA Target: 100%\n`;
        fileContent += `On-Time Shipments,${stats.ontimeCount},On-Time %: ${Math.round(stats.ontimeCount/stats.totalShipments*100)}%\n`;
        fileContent += `Delayed Shipments,${stats.delayedCount},-\n`;
        fileContent += `Disrupted Shipments,${stats.disruptedCount},-\n`;
        fileContent += `Active Disruption Incidents,${stats.activeIncidentsCount},-\n`;
        fileContent += `Total Cargo At-Risk Value (USD),${stats.atRiskValueUsd},Exposure Rate: ${Math.round(stats.atRiskValueUsd / shipments.reduce((sum,s)=>sum+s.value,0) * 100)}%\n`;
        fileContent += `Average Time Saved (Minutes),${stats.averageTimeSavedMinutes},Gemini Powered Rerouting\n`;
      } else if (type === 'carbon') {
        fileContent = `AEGISROUTE GREEN LOGISTICS & CARBON ACCOUNTING,Date: ${dateStr}\n`;
        fileContent += `CARRIER,ACTIVE SHIPMENTS,FUEL OPTIMAL (L),FUEL WASTE (L),CO2 EMISSION (KG),GREEN TIER\n`;
        const carriers = Array.from(new Set(shipments.map(s => s.carrier)));
        carriers.forEach(carrier => {
          const cShipments = shipments.filter(s => s.carrier === carrier);
          const delayed = cShipments.filter(s => s.status === 'delayed').length;
          const fuelOptimal = cShipments.length * 1250;
          const fuelWasted = delayed * 380;
          const totalCO2 = (fuelOptimal + fuelWasted) * 2.68;
          const tier = totalCO2 < 15000 ? 'Tier A' : totalCO2 < 30000 ? 'Tier B' : 'Tier C';
          fileContent += `"${carrier}",${cShipments.length},${fuelOptimal},${fuelWasted},${totalCO2},${tier}\n`;
        });
      } else if (type === 'performance') {
        fileContent = `AEGISROUTE COMPUTE INFRASTRUCTURE PERFORMANCE,Date: ${dateStr}\n`;
        fileContent += `TELEMETRY BATCH SIZE,LEGACY CPU CLUSTER (MIN),RAPIDS ON GKE GPU (SEC),ACCELERATION MULTIPLIER\n`;
        fileContent += `"1 Million Rows",162.0,0.12,"1,350x Faster"\n`;
        fileContent += `"5 Million Rows",810.0,0.45,"1,800x Faster"\n`;
        fileContent += `"10 Million Rows",1,620.0,0.88,"1,840x Faster"\n`;
        fileContent += `"15 Million Rows",2,430.0,1.25,"1,944x Faster"\n`;
      } else if (type === 'incident') {
        fileContent = `AEGISROUTE DISRUPTION & CORRIDOR BLOCKAGES,Date: ${dateStr}\n`;
        fileContent += `INCIDENT ID,INCIDENT TYPE,TITLE,LOCATION,SEVERITY,RADIUS (KM),AFFECTED SHIPS COUNT\n`;
        incidents.forEach(inc => {
          fileContent += `"${inc.id}","${inc.type}","${inc.title}","${inc.location}","${inc.severity}",${inc.radiusKm},${inc.routesAffected.length}\n`;
        });
      } else {
        fileContent = `AEGISROUTE SHIPMENT TRACKING LEDGER,Date: ${dateStr}\n`;
        fileContent += `SHIPMENT CODE,CARGO TYPE,CARRIER,ORIGIN,DESTINATION,PROGRESS %,STATUS,PRIORITY,CARGO VALUE (USD)\n`;
        shipments.forEach(s => {
          fileContent += `"${s.code}","${s.cargoType}","${s.carrier}","${s.origin}","${s.destination}",${s.progress},"${s.status.toUpperCase()}","${s.priority.toUpperCase()}",${s.value}\n`;
        });
      }
      return res.send(fileContent);
    }

    // 2. GENERATE EXCEL FORMAT (Natively opened HTML spreadsheet)
    if (format === 'excel') {
      res.setHeader('Content-Type', 'application/vnd.ms-excel');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xls"`);

      let sheetRows = '';
      if (type === 'executive') {
        sheetRows += `
          <tr style="background-color: #1e3a8a; color: white; font-weight: bold;">
            <th colspan="3" style="padding: 10px; font-size: 16px;">AEGISROUTE EXECUTIVE LOGISTICS DASHBOARD</th>
          </tr>
          <tr style="background-color: #f3f4f6; font-weight: bold;">
            <td style="border: 1px solid #d1d5db; padding: 5px;">Key Metric Indicator</td>
            <td style="border: 1px solid #d1d5db; padding: 5px;">Reported Live Value</td>
            <td style="border: 1px solid #d1d5db; padding: 5px;">SLA Status</td>
          </tr>
          <tr>
            <td style="border: 1px solid #d1d5db; padding: 5px;">Total Active Fleets</td>
            <td style="border: 1px solid #d1d5db; padding: 5px; font-weight: bold;">${stats.totalShipments} units</td>
            <td style="border: 1px solid #d1d5db; padding: 5px; color: green;">SLA Stable</td>
          </tr>
          <tr>
            <td style="border: 1px solid #d1d5db; padding: 5px;">On-Time Transits</td>
            <td style="border: 1px solid #d1d5db; padding: 5px; font-weight: bold; color: green;">${stats.ontimeCount} fleets</td>
            <td style="border: 1px solid #d1d5db; padding: 5px;">${Math.round(stats.ontimeCount / stats.totalShipments * 100)}% reliability</td>
          </tr>
          <tr>
            <td style="border: 1px solid #d1d5db; padding: 5px;">Delayed Segments</td>
            <td style="border: 1px solid #d1d5db; padding: 5px; font-weight: bold; color: #b45309;">${stats.delayedCount} fleets</td>
            <td style="border: 1px solid #d1d5db; padding: 5px;">Action Required</td>
          </tr>
          <tr>
            <td style="border: 1px solid #d1d5db; padding: 5px;">Disrupted Blockages</td>
            <td style="border: 1px solid #d1d5db; padding: 5px; font-weight: bold; color: #b91c1c;">${stats.disruptedCount} fleets</td>
            <td style="border: 1px solid #d1d5db; padding: 5px;">Severe Risk</td>
          </tr>
          <tr style="background-color: #fef2f2;">
            <td style="border: 1px solid #d1d5db; padding: 5px;">Total Value Exposure (USD)</td>
            <td style="border: 1px solid #d1d5db; padding: 5px; font-weight: bold; color: #b91c1c;">$${stats.atRiskValueUsd.toLocaleString()}</td>
            <td style="border: 1px solid #d1d5db; padding: 5px;">SLA High Warning</td>
          </tr>
          <tr style="background-color: #f0fdf4;">
            <td style="border: 1px solid #d1d5db; padding: 5px;">Average Time Saved / Reroute</td>
            <td style="border: 1px solid #d1d5db; padding: 5px; font-weight: bold; color: #166534;">${stats.averageTimeSavedMinutes} minutes</td>
            <td style="border: 1px solid #d1d5db; padding: 5px; color: #166534; font-weight: bold;">Gemini Rerouting AI</td>
          </tr>
        `;
      } else if (type === 'carbon') {
        sheetRows += `
          <tr style="background-color: #064e3b; color: white; font-weight: bold;">
            <th colspan="6" style="padding: 10px; font-size: 16px;">GREEN LOGISTICS & FUEL CONSTRAINTS ACCOUNTING</th>
          </tr>
          <tr style="background-color: #f3f4f6; font-weight: bold;">
            <td style="border: 1px solid #d1d5db; padding: 5px;">Alliance Carrier</td>
            <td style="border: 1px solid #d1d5db; padding: 5px;">Active Units</td>
            <td style="border: 1px solid #d1d5db; padding: 5px;">Optimal Burn (L)</td>
            <td style="border: 1px solid #d1d5db; padding: 5px;">Wasted Burn (L)</td>
            <td style="border: 1px solid #d1d5db; padding: 5px;">Total CO2 emissions (KG)</td>
            <td style="border: 1px solid #d1d5db; padding: 5px;">Environmental Tier</td>
          </tr>
        `;
        const carriers = Array.from(new Set(shipments.map(s => s.carrier)));
        carriers.forEach(carrier => {
          const cShipments = shipments.filter(s => s.carrier === carrier);
          const delayed = cShipments.filter(s => s.status === 'delayed').length;
          const fuelOptimal = cShipments.length * 1250;
          const fuelWasted = delayed * 380;
          const totalCO2 = (fuelOptimal + fuelWasted) * 2.68;
          const tier = totalCO2 < 15000 ? 'Tier A (Excellent)' : totalCO2 < 30000 ? 'Tier B (Standard)' : 'Tier C (Compliance Alert)';
          const color = totalCO2 < 15000 ? 'green' : totalCO2 < 30000 ? '#b45309' : 'red';
          sheetRows += `
            <tr>
              <td style="border: 1px solid #d1d5db; padding: 5px;">${carrier}</td>
              <td style="border: 1px solid #d1d5db; padding: 5px;">${cShipments.length}</td>
              <td style="border: 1px solid #d1d5db; padding: 5px;">${fuelOptimal.toLocaleString()} L</td>
              <td style="border: 1px solid #d1d5db; padding: 5px;">${fuelWasted.toLocaleString()} L</td>
              <td style="border: 1px solid #d1d5db; padding: 5px; font-weight: bold;">${totalCO2.toLocaleString()} kg</td>
              <td style="border: 1px solid #d1d5db; padding: 5px; color: ${color}; font-weight: bold;">${tier}</td>
            </tr>
          `;
        });
      } else {
        sheetRows += `
          <tr style="background-color: #111827; color: white; font-weight: bold;">
            <th colspan="9" style="padding: 10px; font-size: 16px;">AEGISROUTE CARGO SHIPMENTS RUNTIME INVENTORY</th>
          </tr>
          <tr style="background-color: #f3f4f6; font-weight: bold;">
            <td style="border: 1px solid #d1d5db; padding: 5px;">Code</td>
            <td style="border: 1px solid #d1d5db; padding: 5px;">Cargo Description</td>
            <td style="border: 1px solid #d1d5db; padding: 5px;">Carrier Alliance</td>
            <td style="border: 1px solid #d1d5db; padding: 5px;">Origin</td>
            <td style="border: 1px solid #d1d5db; padding: 5px;">Destination</td>
            <td style="border: 1px solid #d1d5db; padding: 5px;">Progress %</td>
            <td style="border: 1px solid #d1d5db; padding: 5px;">Status</td>
            <td style="border: 1px solid #d1d5db; padding: 5px;">Priority</td>
            <td style="border: 1px solid #d1d5db; padding: 5px;">Cargo Value (USD)</td>
          </tr>
        `;
        shipments.forEach(s => {
          const statusCol = s.status === 'ontime' ? 'green' : s.status === 'delayed' ? '#b45309' : 'red';
          sheetRows += `
            <tr>
              <td style="border: 1px solid #d1d5db; padding: 5px; font-family: monospace;">${s.code}</td>
              <td style="border: 1px solid #d1d5db; padding: 5px;">${s.cargoType}</td>
              <td style="border: 1px solid #d1d5db; padding: 5px;">${s.carrier}</td>
              <td style="border: 1px solid #d1d5db; padding: 5px;">${s.origin}</td>
              <td style="border: 1px solid #d1d5db; padding: 5px;">${s.destination}</td>
              <td style="border: 1px solid #d1d5db; padding: 5px;">${s.progress}%</td>
              <td style="border: 1px solid #d1d5db; padding: 5px; color: ${statusCol}; font-weight: bold;">${s.status.toUpperCase()}</td>
              <td style="border: 1px solid #d1d5db; padding: 5px; font-weight: bold;">${s.priority.toUpperCase()}</td>
              <td style="border: 1px solid #d1d5db; padding: 5px; font-weight: bold;">$${s.value.toLocaleString()}</td>
            </tr>
          `;
        });
      }

      fileContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="Content-type" content="text/html;charset=UTF-8" />
          <style>
            table { border-collapse: collapse; font-family: 'Segoe UI', Arial, sans-serif; }
            td, th { text-align: left; vertical-align: middle; }
          </style>
        </head>
        <body>
          <table border="1" style="border: 1px solid #d1d5db;">
            ${sheetRows}
          </table>
        </body>
        </html>
      `;
      return res.send(fileContent);
    }

    // 3. GENERATE POWERPOINT FORMAT (HTML slides layout)
    if (format === 'ppt') {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.html"`);

      fileContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>AegisRoute Presentation Deck</title>
          <style>
            body { background-color: #0c0a09; color: #e7e5e4; font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px; margin: 0; }
            .slide { background-color: #1c1917; border: 2px solid #292524; border-radius: 12px; max-width: 900px; height: 500px; margin: 0 auto 50px auto; padding: 50px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            .header { border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 20px; }
            .title { font-size: 28px; font-weight: 800; color: #ffffff; margin: 0; letter-spacing: -0.025em; }
            .subtitle { font-size: 14px; text-transform: uppercase; color: #3b82f6; font-family: monospace; letter-spacing: 0.1em; margin-top: 5px; }
            .content { font-size: 18px; line-height: 1.6; color: #d6d3d1; }
            .bullet { margin-bottom: 12px; display: flex; align-items: flex-start; }
            .bullet::before { content: "▪"; color: #3b82f6; margin-right: 12px; font-size: 20px; line-height: 1; }
            .footer { position: absolute; bottom: 30px; left: 50px; right: 50px; display: flex; justify-content: space-between; font-size: 11px; font-family: monospace; color: #78716c; border-top: 1px solid #292524; padding-top: 15px; }
            .tag { background-color: #1e3a8a; color: #3b82f6; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; font-family: monospace; text-transform: uppercase; }
            @media print {
              .slide { page-break-after: always; border: none; box-shadow: none; background-color: white; color: black; }
              body { background-color: white; color: black; padding: 0; }
              .header { border-bottom-color: black; }
              .title { color: black; }
              .bullet::before { color: black; }
              .tag { background-color: #e5e7eb; color: black; border: 1px solid black; }
            }
          </style>
        </head>
        <body>
          <div class="slide">
            <div>
              <div class="header">
                <h1 class="title">AEGISROUTE OPERATIONS SUMMIT</h1>
                <div class="subtitle">Global Logistics Optimization & Gemini Reasoning</div>
              </div>
              <div class="content" style="margin-top: 50px;">
                <p style="font-size: 22px; font-weight: 300;">Strategic performance deck presenting the integration of GPU computational analytics and AI routing intelligence.</p>
                <div style="margin-top: 30px; display: flex; gap: 15px;">
                  <span class="tag">System Profile: RAPIDS Spark</span>
                  <span class="tag">Date: ${dateStr}</span>
                </div>
              </div>
            </div>
            <div class="footer">
              <span>AegisRoute Operations Hub</span>
              <span>Slide 1 of 4</span>
            </div>
          </div>

          <div class="slide">
            <div>
              <div class="header">
                <h1 class="title">Active Fleet Status & SLA Coverage</h1>
                <div class="subtitle">Real-time Performance Metrics</div>
              </div>
              <div class="content">
                <div class="bullet">Active Supply Chain Transits: <strong>${stats.totalShipments} Fleet Lanes</strong> currently tracked.</div>
                <div class="bullet">SLA Delivery Reliability Rate: <strong>${Math.round(stats.ontimeCount / stats.totalShipments * 100)}% on-time target metrics</strong>.</div>
                <div class="bullet">Total Cargo Value Exposure: <strong>$${stats.atRiskValueUsd.toLocaleString()} USD</strong> categorized at risk.</div>
                <div class="bullet">Efficiency Gain: Average <strong>${stats.averageTimeSavedMinutes} minutes saved</strong> per shipment with Gemini route corrections.</div>
              </div>
            </div>
            <div class="footer">
              <span>AegisRoute Operations Hub</span>
              <span>Slide 2 of 4</span>
            </div>
          </div>

          <div class="slide">
            <div>
              <div class="header">
                <h1 class="title">Green Logistics & CO2 Abatement</h1>
                <div class="subtitle">Carrier Emissions Dashboard</div>
              </div>
              <div class="content">
                <div class="bullet">Optimized routing paths reduced cumulative fuel consumption across the global trade alliance.</div>
                <div class="bullet">Identified and redirected delayed transits, lowering fuel idle times by 22%.</div>
                <div class="bullet">Active tracking of environmental carbon penalties to guarantee corporate sustainability directives.</div>
              </div>
            </div>
            <div class="footer">
              <span>AegisRoute Operations Hub</span>
              <span>Slide 3 of 4</span>
            </div>
          </div>

          <div class="slide">
            <div>
              <div class="header">
                <h1 class="title">Looker GPU & Spark Computational Speedups</h1>
                <div class="subtitle">Technology Infrastructure Overview</div>
              </div>
              <div class="content">
                <div class="bullet">Replaced legacy CPU cluster architectures with <strong>NVIDIA L4 Tensor Core GPU Nodes</strong>.</div>
                <div class="bullet">Reduced calculation latency from <strong>40 minutes down to less than 2 seconds</strong>.</div>
                <div class="bullet">Achieved average <strong>1,940x performance accelerations</strong> utilizing Spark-RAPIDS cuDF libraries.</div>
              </div>
            </div>
            <div class="footer">
              <span>AegisRoute Operations Hub</span>
              <span>Slide 4 of 4</span>
            </div>
          </div>
        </body>
        </html>
      `;
      return res.send(fileContent);
    }

    // 4. GENERATE PDF FORMAT (Printable detailed report format)
    if (format === 'pdf') {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.html"`);

      let pdfBody = '';
      if (type === 'executive') {
        pdfBody = `
          <h2>Executive Performance Summary</h2>
          <p>This report compiles operational indices, cargo exposure value metrics, and SLA status reports managed in the AegisRoute control center. Dynamic updates are generated in real-time by the RAPIDS on GKE pipeline.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 25px;">
            <thead>
              <tr style="background-color: #f3f4f6; text-align: left; font-weight: bold;">
                <th style="padding: 10px; border: 1px solid #e5e7eb;">Operational Metric</th>
                <th style="padding: 10px; border: 1px solid #e5e7eb;">Value</th>
                <th style="padding: 10px; border: 1px solid #e5e7eb;">Status Code</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">Total Tracked Shipments</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">${stats.totalShipments} units</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb; color: green; font-weight: bold;">Stable</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">On-Time Transits</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">${stats.ontimeCount} units</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb; color: green;">${Math.round(stats.ontimeCount/stats.totalShipments*100)}% reliability</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">Delayed Lanes</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold; color: #b45309;">${stats.delayedCount} units</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb; color: #b45309;">Review Rerouting</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">Disrupted Lanes</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold; color: #b91c1c;">${stats.disruptedCount} units</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb; color: #b91c1c; font-weight: bold;">Incident Escalated</td>
              </tr>
              <tr style="background-color: #fef2f2;">
                <td style="padding: 10px; border: 1px solid #e5e7eb;">Cargo Valuation Under Threat</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold; color: #b91c1c;">$${stats.atRiskValueUsd.toLocaleString()} USD</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb; color: #b91c1c; font-weight: bold;">High Exposure</td>
              </tr>
              <tr style="background-color: #f0fdf4;">
                <td style="padding: 10px; border: 1px solid #e5e7eb;">Time Preserved with Gemini AI</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold; color: #166534;">${stats.averageTimeSavedMinutes} minutes avg</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb; color: #166534; font-weight: bold;">Optimized</td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top: 40px; padding: 20px; background-color: #f9fafb; border-left: 4px solid #3b82f6; border-radius: 4px;">
            <h4 style="margin: 0 0 10px 0; font-size: 14px;">Gemini Routing Operations Review</h4>
            <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #4b5563;">
              Corridor detour models successfully solved severe weather boundaries on multiple routes. Automated alerts successfully pushed to active carriers. No additional manual pipeline interruptions recorded.
            </p>
          </div>
        `;
      } else if (type === 'carbon') {
        pdfBody = `
          <h2>Green Logistics & Fuel Abatement Accounting</h2>
          <p>Detailed overview of fuel consumption benchmarks, cumulative CO2 carbon footprint metrics, and fleet environmental rating tiers across active carrier fleets.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 25px;">
            <thead>
              <tr style="background-color: #f3f4f6; text-align: left; font-weight: bold;">
                <th style="padding: 10px; border: 1px solid #e5e7eb;">Carrier</th>
                <th style="padding: 10px; border: 1px solid #e5e7eb;">Fleets</th>
                <th style="padding: 10px; border: 1px solid #e5e7eb;">Fuel Optimal (L)</th>
                <th style="padding: 10px; border: 1px solid #e5e7eb;">Fuel Wasted (L)</th>
                <th style="padding: 10px; border: 1px solid #e5e7eb;">Total CO2 (KG)</th>
                <th style="padding: 10px; border: 1px solid #e5e7eb;">Rating Tier</th>
              </tr>
            </thead>
            <tbody>
        `;
        const carriers = Array.from(new Set(shipments.map(s => s.carrier)));
        carriers.forEach(carrier => {
          const cShipments = shipments.filter(s => s.carrier === carrier);
          const delayed = cShipments.filter(s => s.status === 'delayed').length;
          const fuelOptimal = cShipments.length * 1250;
          const fuelWasted = delayed * 380;
          const totalCO2 = (fuelOptimal + fuelWasted) * 2.68;
          const tier = totalCO2 < 15000 ? 'Tier A (Excellent)' : totalCO2 < 30000 ? 'Tier B (Standard)' : 'Tier C (Compliance Alert)';
          pdfBody += `
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">${carrier}</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${cShipments.length}</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${fuelOptimal.toLocaleString()} L</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${fuelWasted.toLocaleString()} L</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">${totalCO2.toLocaleString()} kg</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold; color: ${totalCO2 < 15000 ? 'green' : totalCO2 < 30000 ? '#b45309' : 'red'};">${tier}</td>
            </tr>
          `;
        });
        pdfBody += `
            </tbody>
          </table>
        `;
      } else {
        pdfBody = `
          <h2>Cargo Tracking & Transit Inventory</h2>
          <p>Detailed listings of active cargo shipments and tracking values in transit.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 25px; font-size: 11px;">
            <thead>
              <tr style="background-color: #f3f4f6; text-align: left; font-weight: bold;">
                <th style="padding: 8px; border: 1px solid #e5e7eb;">Code</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb;">Cargo Description</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb;">Carrier</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb;">Origin</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb;">Destination</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb;">Progress %</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb;">Status</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb;">Value (USD)</th>
              </tr>
            </thead>
            <tbody>
        `;
        shipments.forEach(s => {
          pdfBody += `
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb; font-family: monospace;">${s.code}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${s.cargoType}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${s.carrier}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${s.origin}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${s.destination}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${s.progress}%</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold; color: ${s.status === 'ontime' ? 'green' : s.status === 'delayed' ? 'orange' : 'red'};">${s.status.toUpperCase()}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">$${s.value.toLocaleString()}</td>
            </tr>
          `;
        });
        pdfBody += `
            </tbody>
          </table>
        `;
      }

      fileContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>AegisRoute Official Report - PDF Export</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1f2937; line-height: 1.6; padding: 50px; }
            .header-table { width: 100%; border-bottom: 3px solid #1e3b8b; padding-bottom: 20px; margin-bottom: 30px; }
            .logo-text { font-size: 24px; font-weight: bold; color: #1e3b8b; letter-spacing: -0.05em; }
            .meta-text { text-align: right; font-size: 12px; color: #6b7280; font-family: monospace; }
            .report-title { font-size: 28px; font-weight: 800; color: #111827; margin: 0 0 10px 0; }
            .footer-line { border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 50px; font-size: 11px; color: #9ca3af; text-align: center; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body onload="window.print()">
          <table class="header-table">
            <tr>
              <td>
                <span class="logo-text">A E G I S R O U T E</span><br/>
                <span style="font-size: 10px; color: #6b7280; letter-spacing: 2px;">INTELLIGENT SUPPLY CHAIN SECURITY</span>
              </td>
              <td class="meta-text">
                REPORT_ID: AR-REP-${typeUpper}-${dateStr}<br/>
                DATE_GENERATED: ${dateStr} ${timestampStr}<br/>
                AUTHENTICATED_OPERATOR: ${(req as any).user.name}
              </td>
            </tr>
          </table>

          <h1 class="report-title">${typeUpper} OPERATIONAL ADVISORY REPORT</h1>
          
          ${pdfBody}

          <div class="footer-line">
            This document represents an official intelligence report generated by AegisRoute Supply Chain Intel.<br/>
            Classified: Confidential - For Internal Alliance Use Only. Page 1 of 1.
          </div>
        </body>
        </html>
      `;
      return res.send(fileContent);
    }

    res.status(400).json({ error: 'Unsupported format requested' });
  });

  // Serve static UI assets or mount Vite HMR middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 AegisRoute Enterprise Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
