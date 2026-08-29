import React from 'react';
import { useBoardStore } from '../store/boardStore';
import { X, Moon, Sun, Monitor, Laptop, ShieldCheck } from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsModalOpen,
    setSettingsModalOpen,
    settings,
    updateSettings,
  } = useBoardStore();

  if (!isSettingsModalOpen) return null;

  const handleThemeChange = (theme: 'dark' | 'light' | 'oled') => {
    updateSettings({ theme });
    document.documentElement.setAttribute('data-theme', theme);
  };

  const handleDensityChange = (fontScale: 'compact' | 'normal' | 'spacious') => {
    updateSettings({ fontScale });
  };

  const handleModeChange = (appMode: 'team' | 'solo') => {
    updateSettings({ appMode });
  };

  return (
    <div className="modal-backdrop" onClick={() => setSettingsModalOpen(false)}>
      <div
        className="modal-content"
        style={{ maxWidth: '560px', padding: '24px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 className="modal-title">Settings & Preferences</h2>
            <p className="modal-subtitle">Customize theme, layout density, and runtime mode</p>
          </div>
          <button
            onClick={() => setSettingsModalOpen(false)}
            className="btn-header-action"
            style={{ padding: '4px', border: 'none' }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ height: '1px', background: 'var(--border-subtle)', marginBottom: '20px' }} />

        {/* Section 1: Appearance */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
            Theme & Appearance
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => handleThemeChange('dark')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                background: settings.theme === 'dark' ? 'var(--bg-button-subtle-hover)' : 'var(--bg-input)',
                border: `1px solid ${settings.theme === 'dark' ? 'var(--border-active)' : 'var(--border-subtle)'}`,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.8rem',
              }}
            >
              <Moon size={14} />
              <span>Dark</span>
            </button>

            <button
              type="button"
              onClick={() => handleThemeChange('oled')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                background: settings.theme === 'oled' ? 'var(--bg-button-subtle-hover)' : 'var(--bg-input)',
                border: `1px solid ${settings.theme === 'oled' ? 'var(--border-active)' : 'var(--border-subtle)'}`,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.8rem',
              }}
            >
              <Monitor size={14} />
              <span>OLED</span>
            </button>

            <button
              type="button"
              onClick={() => handleThemeChange('light')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                background: settings.theme === 'light' ? 'var(--bg-button-subtle-hover)' : 'var(--bg-input)',
                border: `1px solid ${settings.theme === 'light' ? 'var(--border-active)' : 'var(--border-subtle)'}`,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.8rem',
              }}
            >
              <Sun size={14} />
              <span>Light</span>
            </button>
          </div>

          {/* Column Width Slider */}
          <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Column Width</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{settings.listWidth}px</span>
            </div>
            <input
              type="range"
              min="250"
              max="380"
              step="10"
              value={settings.listWidth}
              onChange={(e) => {
                const w = Number(e.target.value);
                updateSettings({ listWidth: w });
                document.documentElement.style.setProperty('--column-width', `${w}px`);
              }}
              style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
            />
          </div>

          {/* Density */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {(['compact', 'normal', 'spacious'] as const).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => handleDensityChange(d)}
                style={{
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: settings.fontScale === d ? 'var(--bg-button-subtle-hover)' : 'var(--bg-input)',
                  border: `1px solid ${settings.fontScale === d ? 'var(--border-active)' : 'var(--border-subtle)'}`,
                  color: 'var(--text-primary)',
                  textTransform: 'capitalize',
                  fontWeight: 500,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Runtime Mode */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
            Execution Runtime
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div
              onClick={() => handleModeChange('team')}
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                background: settings.appMode === 'team' ? 'var(--bg-button-subtle-hover)' : 'var(--bg-input)',
                border: `1px solid ${settings.appMode === 'team' ? 'var(--border-active)' : 'var(--border-subtle)'}`,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Laptop size={14} />
                <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Team Server</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Connects over REST & WebSocket DDP
              </div>
            </div>

            <div
              onClick={() => handleModeChange('solo')}
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                background: settings.appMode === 'solo' ? 'var(--bg-button-subtle-hover)' : 'var(--bg-input)',
                border: `1px solid ${settings.appMode === 'solo' ? 'var(--border-active)' : 'var(--border-subtle)'}`,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <ShieldCheck size={14} />
                <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Solo Local</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Embedded FerretDB + SQLite storage
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Safety & Exit Protection */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
            Application Safety
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Confirm Before Quitting
              </span>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Ask for confirmation before closing or quitting Lumora (prevents accidental Cmd+Q).
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.confirmBeforeQuit !== false}
                onChange={e => updateSettings({ confirmBeforeQuit: e.target.checked })}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button
            onClick={() => setSettingsModalOpen(false)}
            className="btn-primary"
            style={{ padding: '8px 20px' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
