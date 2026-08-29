import React from 'react';

export interface LumoraLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const LumoraLogo: React.FC<LumoraLogoProps> = ({ size = 22, className = '', showText = true }) => {
  const gradId = React.useId().replace(/:/g, '');
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '9px' }} className={className}>
      {/* Sleek Luminous Mark — Dynamic Theme Adaptive Harmony (Light & Dark) */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id={`lumora-left-${gradId}`} x1="0" y1="0" x2="0" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--logo-left-pill, #ffffff)" />
            <stop offset="100%" stopColor="var(--logo-left-pill-bottom, #e2e8f0)" />
          </linearGradient>
          <linearGradient id={`lumora-right-${gradId}`} x1="0" y1="0" x2="0" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--logo-right-pill, #60a5fa)" />
            <stop offset="100%" stopColor="var(--logo-right-pill-bottom, #2563eb)" />
          </linearGradient>
        </defs>

        {/* Primary Stream Arc (High Contrast White in Dark, Deep Obsidian in Light) */}
        <path
          d="M6 7C6 5.34315 7.34315 4 9 4H12C13.6569 4 15 5.34315 15 7V21C15 22.6569 13.6569 24 12 24H9C7.34315 24 6 22.6569 6 21V7Z"
          fill={`url(#lumora-left-${gradId})`}
        />
        {/* Secondary Focus Pill (Vibrant Electric/Royal Blue) */}
        <path
          d="M17 11C17 9.34315 18.3431 8 20 8H21C22.6569 8 24 9.34315 24 11V21C24 22.6569 22.6569 24 21 24H20C18.3431 24 17 22.6569 17 21V11Z"
          fill={`url(#lumora-right-${gradId})`}
        />
        {/* Harmonic Bridge Dot */}
        <circle cx="20.5" cy="4.5" r="2.5" fill="var(--logo-dot, #60a5fa)" />
      </svg>

      {showText && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontWeight: 800,
              fontSize: '15px',
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, var(--text-primary) 30%, #3b82f6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1,
              userSelect: 'none',
            }}
          >
            Lumora
          </span>
          {(import.meta as any).env?.DEV && (
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: '3px',
                background: 'rgba(251, 191, 36, 0.15)',
                color: 'var(--accent-amber)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                lineHeight: 1.1,
              }}
            >
              DEV
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Backwards-compatible alias
export const KansoLogo = LumoraLogo;
export default LumoraLogo;
