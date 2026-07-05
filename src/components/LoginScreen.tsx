import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Lock, Mail, User, AlertCircle, CheckCircle, RefreshCw, Smartphone, KeyRound } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // MFA Flow State
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaTempToken, setMfaTempToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  // Password Reset Flow State
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  // Quick preset accounts for demonstration
  const presets = [
    { email: 'admin@aegisroute.com', pass: 'admin123', label: 'Admin', color: 'border-blue-500/30 text-blue-400 hover:bg-blue-950/20' },
    { email: 'manager@aegisroute.com', pass: 'manager123', label: 'Manager', color: 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/20' },
    { email: 'driver@aegisroute.com', pass: 'driver123', label: 'Driver', color: 'border-amber-500/30 text-amber-400 hover:bg-amber-950/20' },
    { email: 'viewer@aegisroute.com', pass: 'viewer123', label: 'Viewer', color: 'border-zinc-700 text-zinc-400 hover:bg-zinc-900/40' }
  ];

  const handleApplyPreset = (preset: typeof presets[0]) => {
    setEmail(preset.email);
    setPassword(preset.pass);
    setError(null);
  };

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (data.mfaRequired) {
        setMfaRequired(true);
        setMfaTempToken(data.tempToken);
      } else {
        onLoginSuccess(data.token, data.user);
      }
    } catch (err: any) {
      setError(err.message || 'Login error');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken: mfaTempToken, code: mfaCode })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'MFA validation failed');
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/reset-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request reset');

      if (data.resetToken) {
        setResetToken(data.resetToken); // Displayed visually in preview simulation
      }
      setResetSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken || !newPassword) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/reset-password-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset confirm failed');

      setResetSuccessMsg('Password reset successful. Please login.');
      setTimeout(() => {
        setIsResetMode(false);
        setResetSent(false);
        setResetToken('');
        setNewPassword('');
        setResetSuccessMsg(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Popup Trigger
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/google/url');
      if (!res.ok) throw new Error('Could not request Google auth details');
      const { url, redirectUri } = await res.json();

      // Configure simulated popup payload if real Client ID isn't linked
      const popupUrl = `${url}&code=google-user-federated-operator-${encodeURIComponent(email || 'federated-operator@google.com')}-Federated_Operator`;

      // Open OAuth centered popup directly as recommended by guidelines
      const width = 540;
      const height = 620;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const authWindow = window.open(
        popupUrl,
        'aegisroute_google_oauth',
        `width=${width},height=${height},top=${top},left=${left},status=no,resizable=yes`
      );

      if (!authWindow) {
        setError('Popup blocked! Please allow popups to utilize Google Sign-In.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Listen for Google Sign-In success messages from popup (OAuth skill requirement)
  useEffect(() => {
    const handleOauthMessage = (event: MessageEvent) => {
      // Validate origin pattern matches runtime preview or standard port
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { token, user } = event.data;
        onLoginSuccess(token, user);
      }
    };

    window.addEventListener('message', handleOauthMessage);
    return () => window.removeEventListener('message', handleOauthMessage);
  }, [onLoginSuccess]);

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 relative overflow-hidden font-sans scanline">
      {/* Dynamic Background Mesh Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-zinc-950 to-black z-0" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md bg-zinc-950 border border-zinc-850 rounded-lg p-8 shadow-2xl space-y-6"
      >
        {/* Branding header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-blue-600/10 border border-blue-500/20 text-blue-500 mb-2">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">AEGISROUTE GATEWAY</h2>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono font-bold">Logistics Command Security</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-3 bg-red-950/20 border border-red-900/40 text-red-400 rounded text-xs flex items-start space-x-2 font-mono"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {/* 1. MFA Screen */}
          {mfaRequired ? (
            <motion.form
              key="mfa"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleMfaSubmit}
              className="space-y-4"
            >
              <div className="p-3 bg-zinc-900 rounded border border-zinc-850 flex items-start space-x-2.5">
                <Smartphone className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-zinc-300">Multi-Factor Secured Code</h4>
                  <p className="text-[10px] text-zinc-500 leading-normal">
                    This account is under active MFA protection. To bypass, input the dynamic 6-digit key shown in your authenticator or your mock code <span className="text-blue-400 font-bold font-mono">123456</span>.
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500 font-mono">MFA PASSCODE</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    placeholder="Enter code (e.g. 123456)"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded px-10 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 font-mono tracking-widest text-center"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/10 cursor-pointer"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>VERIFY & SIGN IN</span>}
              </button>

              <button
                type="button"
                onClick={() => setMfaRequired(false)}
                className="w-full text-center text-[10px] font-mono text-zinc-500 hover:text-zinc-300"
              >
                BACK TO CREDENTIALS
              </button>
            </motion.form>
          ) : isResetMode ? (
            /* 2. Password Reset Form */
            <motion.div
              key="reset"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="border-b border-zinc-850 pb-2">
                <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">Password Recovery System</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">Simulate secure account recovery</p>
              </div>

              {resetSuccessMsg && (
                <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 text-emerald-400 rounded text-xs flex items-center space-x-2 font-mono">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>{resetSuccessMsg}</span>
                </div>
              )}

              {!resetSent ? (
                <form onSubmit={handleResetRequest} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 font-mono">ACCOUNT EMAIL</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                      <input
                        type="email"
                        required
                        placeholder="email@aegisroute.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full bg-black border border-zinc-800 rounded px-10 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 rounded text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>REQUEST RECOVERY CODE</span>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetConfirm} className="space-y-3">
                  <div className="p-3 bg-zinc-900 rounded border border-zinc-850 font-mono text-[10px] text-zinc-400 space-y-1">
                    <p className="text-zinc-300 font-bold">Simulated Recovery Sandbox:</p>
                    <p>Standard recovery token successfully sent! Use the simulated token below to authorize.</p>
                    <div className="p-1.5 bg-black border border-zinc-800 text-blue-400 font-bold text-xs rounded break-all select-all mt-1">
                      {resetToken}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 font-mono">RECOVERY CODE</label>
                    <input
                      type="text"
                      required
                      placeholder="Paste recovery code"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-100 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 font-mono">NEW SECURE PASSWORD</label>
                    <input
                      type="password"
                      required
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-100"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-2 rounded text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>UPDATE ACCOUNT PASSWORD</span>}
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={() => { setIsResetMode(false); setResetSent(false); }}
                className="w-full text-center text-[10px] font-mono text-zinc-500 hover:text-zinc-300"
              >
                BACK TO SIGN IN
              </button>
            </motion.div>
          ) : (
            /* 3. Credentials login form */
            <motion.div
              key="credentials"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              {/* Preset selectors to demonstrate Roles immediately */}
              <div className="space-y-1.5">
                <span className="text-[9px] uppercase font-bold text-zinc-500 font-mono">Quick Access Simulation Presets</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {presets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className={`px-1.5 py-1.5 bg-zinc-900 border text-[10px] font-mono font-bold rounded text-center transition-all ${preset.color} cursor-pointer`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleCredentialLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 font-mono">COMMAND EMAIL</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                    <input
                      type="email"
                      required
                      placeholder="name@aegisroute.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded px-10 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 font-mono">PASSWORD</label>
                    <button
                      type="button"
                      onClick={() => setIsResetMode(true)}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 font-mono"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded px-10 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/10 cursor-pointer"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>ACCESS CONTROL DESK</span>}
                </button>
              </form>

              {/* Federated Login Divider */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-zinc-850"></div>
                <span className="flex-shrink mx-3 text-[9px] uppercase tracking-widest text-zinc-500 font-mono font-bold">Federated Identity</span>
                <div className="flex-grow border-t border-zinc-850"></div>
              </div>

              {/* Google OAuth Login Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center space-x-2.5 px-4 py-2.5 bg-black border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/30 text-zinc-200 hover:text-white rounded text-xs transition-all font-mono font-bold cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>SIGN IN WITH GOOGLE</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer info */}
        <div className="pt-2 text-center text-[9px] text-zinc-600 font-mono leading-relaxed">
          <p>PROTECTED BY AEGIS CRYPTOGRAPHY MODULE v1.0.4</p>
          <p>AUTHORIZED USERS ONLY • DATA INGRESS LOGGED</p>
        </div>
      </motion.div>
    </div>
  );
}
