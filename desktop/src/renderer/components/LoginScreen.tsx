import React, { useState } from 'react';
import { useBoardStore } from '../store/boardStore';
import { LumoraLogo } from './LumoraLogo';
import {
  Server,
  User,
  Lock,
  Mail,
  Loader2,
  AlertCircle,
  Laptop,
  Globe,
  Zap,
  Compass,
  ArrowRight,
  ShieldCheck,
  HardDrive,
} from 'lucide-react';

const nordicImg = '/nordic_adventure.jpg';

export const LoginScreen: React.FC = () => {
  const { login, register, continueAsGuest, isLoadingAuth, authError, settings } = useBoardStore();

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [engineMode, setEngineMode] = useState<'team' | 'solo'>('team');
  const [serverUrl, setServerUrl] = useState(
    settings.serverUrl ||
    (typeof window !== 'undefined' && window.location.port === '5173'
      ? `${window.location.protocol}//${window.location.hostname}`
      : 'http://127.0.0.1')
  );
  const [username, setUsername] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password123!');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e?: React.FormEvent, customUser?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    const userToUse = customUser || username;
    const passToUse = customPass || password;

    try {
      if (authMode === 'signup') {
        const emailToUse = email.trim() || `${userToUse.trim()}@example.com`;
        await register(serverUrl.trim(), userToUse.trim(), emailToUse, passToUse);
      } else {
        await login(serverUrl.trim(), userToUse.trim(), passToUse);
      }
    } catch (err: any) {
      setErrorMsg(err.message || (authMode === 'signup' ? 'Registration failed' : 'Authentication failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    handleSubmit(undefined, u, p);
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100vw',
        background: 'var(--bg-app)',
        color: 'var(--text-primary)',
        overflow: 'hidden',
      }}
    >
      {/* Left 50%: Hero Banner */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px',
          overflow: 'hidden',
          background: '#12141c',
        }}
      >
        {/* Background Image with Ambient Backdrop Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${nordicImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.75,
          }}
        />

        {/* Gradient Scrim */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(14, 16, 24, 0.4) 0%, rgba(14, 16, 24, 0.2) 50%, rgba(10, 11, 18, 0.94) 100%)',
          }}
        />

        {/* Top Left Watermark */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(12px)',
              padding: '6px 14px',
              borderRadius: 'var(--r-full)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            <Compass size={13} />
            <span>LUMORA • ARCHITECTURAL WORKSPACE</span>
          </div>
        </div>

        {/* Bottom Hero Philosophy */}
        <div style={{ position: 'relative', zIndex: 10, maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h2
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
              color: '#ffffff',
            }}
          >
            Structure your thoughts. Flow with precision.
          </h2>

          <p
            style={{
              fontSize: '14px',
              lineHeight: 1.55,
              color: 'rgba(255, 255, 255, 0.8)',
            }}
          >
            Minimalist engineering workspace with subfolder workstreams, instant DDP sync, and offline-first local storage.
          </p>
        </div>
      </div>

      {/* Right 50%: Sign In / Sign Up & Guest Form */}
      <div
        style={{
          width: '520px',
          maxWidth: '520px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '48px 52px',
          background: 'var(--bg-canvas)',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '400px', width: '100%', margin: '0 auto' }}>
          {/* Header & Logo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <LumoraLogo size={26} showText />
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Sign in to your team workspace or continue in offline guest mode.
            </p>
          </div>

          {/* Quick Offline Guest Mode Card */}
          <div
            onClick={continueAsGuest}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--r-md)',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all var(--t-fast) var(--ease-out)',
              boxShadow: 'var(--shadow-card)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)';
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-button-hover)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-card)';
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--r-sm)',
                  background: 'var(--bg-badge)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-blue)',
                }}
              >
                <HardDrive size={16} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Continue as Guest (Offline)
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  No server needed · Stored 100% locally
                </div>
              </div>
            </div>
            <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Or Connect to Server
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          </div>

          {/* Sign In vs Sign Up Tabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-subtle)',
              gap: '20px',
              paddingBottom: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => setAuthMode('signin')}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px 0',
                fontSize: '13.5px',
                fontWeight: 600,
                color: authMode === 'signin' ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottom: authMode === 'signin' ? '2px solid var(--text-primary)' : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              Sign In
            </button>

            <button
              type="button"
              onClick={() => setAuthMode('signup')}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px 0',
                fontSize: '13.5px',
                fontWeight: 600,
                color: authMode === 'signup' ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottom: authMode === 'signup' ? '2px solid var(--text-primary)' : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              Create Account
            </button>
          </div>

          {/* Error Alert */}
          {(errorMsg || authError) && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--danger)',
                borderRadius: 'var(--r-sm)',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--danger)',
                fontSize: '12px',
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMsg || authError}</span>
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={e => handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Server size={12} />
                <span>WeKan Instance URL</span>
              </label>
              <input
                type="url"
                required
                value={serverUrl}
                onChange={e => setServerUrl(e.target.value)}
                placeholder="http://127.0.0.1"
                className="form-input"
              />
            </div>

            {authMode === 'signup' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={12} />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="form-input"
                />
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={12} />
                <span>Username</span>
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Username"
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={12} />
                <span>Password</span>
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="form-input"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLoadingAuth}
              className="btn-primary"
              style={{
                height: '38px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '4px',
                cursor: (isSubmitting || isLoadingAuth) ? 'not-allowed' : 'pointer',
              }}
            >
              {(isSubmitting || isLoadingAuth) ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Connecting to WeKan...</span>
                </>
              ) : (
                <>
                  <span>{authMode === 'signup' ? 'Create Account & Enter' : 'Sign In to Workspace'}</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Quick Login Helper Shortcuts */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                One-Click Demo Accounts
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                disabled={isSubmitting || isLoadingAuth}
                onClick={() => handleQuickLogin('admin', 'Password123!')}
                className="btn-subtle"
                style={{ flex: 1, fontSize: '12px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
              >
                <Zap size={12} style={{ color: 'var(--accent-amber)' }} />
                <span>Admin Demo</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting || isLoadingAuth}
                onClick={() => handleQuickLogin('engineer', 'Password123!')}
                className="btn-subtle"
                style={{ flex: 1, fontSize: '12px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
              >
                <User size={12} style={{ color: 'var(--accent-blue)' }} />
                <span>Engineer Demo</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
