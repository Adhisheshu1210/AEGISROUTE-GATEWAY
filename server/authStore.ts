import crypto from 'crypto';

// Base64Url Utilities for custom type-safe JWT implementation (Zero-dependency production pattern)
function base64UrlEncode(str: string | Buffer): string {
  const buf = typeof str === 'string' ? Buffer.from(str) : str;
  return buf.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

const JWT_SECRET = process.env.JWT_SECRET || 'aegisroute-super-secure-production-jwt-token-secret-2026';

export function signJwt(payload: object, expirySeconds: number = 3600): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const fullPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expirySeconds,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac('sha256', JWT_SECRET)
    .update(signatureInput)
    .digest();
  const encodedSignature = base64UrlEncode(signature);
  return `${signatureInput}.${encodedSignature}`;
}

export function verifyJwt(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const signatureInput = `${header}.${payload}`;
    const computedSignature = base64UrlEncode(
      crypto.createHmac('sha256', JWT_SECRET).update(signatureInput).digest()
    );
    if (computedSignature !== signature) return null;
    const decodedPayload = JSON.parse(base64UrlDecode(payload));
    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Token has expired
    }
    return decodedPayload;
  } catch (err) {
    return null;
  }
}

// Password hashing utility using standard Node.js pbkdf2 with salt
export function hashPassword(password: string, salt: string = 'aegisroute_salt_2026'): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export type UserRole = 'Admin' | 'Manager' | 'Driver' | 'Viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  mfaSecret?: string;
  mfaEnabled: boolean;
  googleId?: string;
  avatarUrl?: string;
}

export interface UserSession {
  id: string;
  userId: string;
  email: string;
  role: UserRole;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  lastActive: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId?: string;
  userEmail?: string;
  action: string;
  details: string;
  ipAddress: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

class AuthStore {
  public users: Map<string, User> = new Map();
  public sessions: Map<string, UserSession> = new Map();
  public auditLogs: AuditLog[] = [];
  public passwordResetTokens: Map<string, { email: string; expiresAt: number }> = new Map();

  constructor() {
    this.seedDefaultUsers();
    this.addAuditLog(
      'SYSTEM',
      'system@aegisroute.com',
      'AUTHENTICATION_SERVICE_INIT',
      'AegisRoute production authentication modules successfully loaded.',
      '127.0.0.1',
      'INFO'
    );
  }

  private seedDefaultUsers() {
    // Standard secure hash of "admin123", "manager123", "driver123", "viewer123"
    const credentials = [
      { email: 'admin@aegisroute.com', name: 'Dr. Sarah Carter', role: 'Admin' as UserRole, pass: 'admin123', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=faces' },
      { email: 'manager@aegisroute.com', name: 'Marcus Sterling', role: 'Manager' as UserRole, pass: 'manager123', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=faces' },
      { email: 'driver@aegisroute.com', name: 'Sven Lindqvist', role: 'Driver' as UserRole, pass: 'driver123', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces' },
      { email: 'viewer@aegisroute.com', name: 'Clara Oswald', role: 'Viewer' as UserRole, pass: 'viewer123', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces' }
    ];

    credentials.forEach(cred => {
      const id = `user-${cred.role.toLowerCase()}`;
      this.users.set(cred.email, {
        id,
        email: cred.email,
        name: cred.name,
        role: cred.role,
        passwordHash: hashPassword(cred.pass),
        mfaEnabled: false,
        mfaSecret: crypto.randomBytes(10).toString('hex').toUpperCase(),
        avatarUrl: cred.avatar
      });
    });
  }

  public getUserByEmail(email: string): User | undefined {
    return this.users.get(email.toLowerCase());
  }

  public registerUser(name: string, email: string, role: UserRole, pass: string): User {
    const emailLower = email.toLowerCase();
    if (this.users.has(emailLower)) {
      throw new Error('User already exists');
    }
    const newUser: User = {
      id: `user-${Date.now()}`,
      email: emailLower,
      name,
      role,
      passwordHash: hashPassword(pass),
      mfaEnabled: false,
      mfaSecret: crypto.randomBytes(10).toString('hex').toUpperCase(),
      avatarUrl: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 999999)}?w=150&h=150&fit=crop&crop=faces`
    };
    this.users.set(emailLower, newUser);
    return newUser;
  }

  public createSession(user: User, ipAddress: string, userAgent: string): UserSession {
    const sessionId = `sess-${crypto.randomBytes(16).toString('hex')}`;
    const session: UserSession = {
      id: sessionId,
      userId: user.id,
      email: user.email,
      role: user.role,
      ipAddress: ipAddress || '127.0.0.1',
      userAgent: userAgent || 'AegisRoute Operations Terminal',
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  public revokeSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  public getUserSessions(userId: string): UserSession[] {
    return Array.from(this.sessions.values()).filter(s => s.userId === userId);
  }

  public addAuditLog(
    userId: string,
    userEmail: string,
    action: string,
    details: string,
    ipAddress: string,
    severity: 'INFO' | 'WARNING' | 'CRITICAL'
  ) {
    const log: AuditLog = {
      id: `audit-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      timestamp: new Date().toISOString(),
      userId,
      userEmail,
      action,
      details,
      ipAddress: ipAddress || '127.0.0.1',
      severity
    };
    this.auditLogs.unshift(log); // Prepend to show most recent first
  }

  public createResetToken(email: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    this.passwordResetTokens.set(token, {
      email: email.toLowerCase(),
      expiresAt: Date.now() + 15 * 60 * 1000 // 15 mins expiry
    });
    return token;
  }

  public verifyResetToken(token: string): string | null {
    const reset = this.passwordResetTokens.get(token);
    if (!reset) return null;
    if (reset.expiresAt < Date.now()) {
      this.passwordResetTokens.delete(token);
      return null;
    }
    return reset.email;
  }
}

export const authStore = new AuthStore();
