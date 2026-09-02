import React, { useState } from 'react';
import {
  X,
  Check,
  AlertCircle,
  Github,
  CheckCircle2,
  RefreshCw,
  Layers,
  ArrowRight,
  Database,
  Radio,
  CheckSquare,
} from 'lucide-react';
import { githubSync } from '../lib/githubSync';
import { jiraSync } from '../lib/jiraSync';
import { linearSync } from '../lib/linearSync';
import { asanaSync } from '../lib/asanaSync';

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ProviderType = 'github' | 'jira' | 'linear' | 'asana';

export const IntegrationsModal: React.FC<IntegrationsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<ProviderType>('github');

  // GitHub State
  const [githubPat, setGithubPat] = useState(() => localStorage.getItem('kanso_github_pat') || '');
  const [githubRepo, setGithubRepo] = useState(() => localStorage.getItem('kanso_github_repo') || '');
  const [ghStatus, setGhStatus] = useState<{ ok?: boolean; msg?: string; loading?: boolean }>({});

  // Jira State
  const [jiraDomain, setJiraDomain] = useState(() => localStorage.getItem('kanso_jira_domain') || '');
  const [jiraEmail, setJiraEmail] = useState(() => localStorage.getItem('kanso_jira_email') || '');
  const [jiraToken, setJiraToken] = useState(() => localStorage.getItem('kanso_jira_token') || '');
  const [jiraProjectKey, setJiraProjectKey] = useState(() => localStorage.getItem('kanso_jira_project_key') || '');
  const [jiraStatus, setJiraStatus] = useState<{ ok?: boolean; msg?: string; loading?: boolean }>({});

  // Linear State
  const [linearApiKey, setLinearApiKey] = useState(() => localStorage.getItem('kanso_linear_api_key') || '');
  const [linearTeamKey, setLinearTeamKey] = useState(() => localStorage.getItem('kanso_linear_team_key') || '');
  const [linearStatus, setLinearStatus] = useState<{ ok?: boolean; msg?: string; loading?: boolean }>({});

  // Asana State
  const [asanaPat, setAsanaPat] = useState(() => localStorage.getItem('kanso_asana_pat') || '');
  const [asanaProjectGid, setAsanaProjectGid] = useState(() => localStorage.getItem('kanso_asana_project_gid') || '');
  const [asanaStatus, setAsanaStatus] = useState<{ ok?: boolean; msg?: string; loading?: boolean }>({});

  if (!isOpen) return null;

  const testGithub = async () => {
    if (!githubPat) return;
    setGhStatus({ loading: true });
    const res = await githubSync.testConnection(githubRepo || 'wekan/wekan', githubPat);
    setGhStatus({ loading: false, ok: res.ok, msg: res.message });
    if (res.ok) {
      localStorage.setItem('kanso_github_pat', githubPat);
      localStorage.setItem('kanso_github_repo', githubRepo);
    }
  };

  const testJira = async () => {
    if (!jiraDomain || !jiraEmail || !jiraToken) return;
    setJiraStatus({ loading: true });
    const res = await jiraSync.testConnection(jiraDomain, jiraEmail, jiraToken);
    setJiraStatus({ loading: false, ok: res.ok, msg: res.message });
    if (res.ok) {
      localStorage.setItem('kanso_jira_domain', jiraDomain);
      localStorage.setItem('kanso_jira_email', jiraEmail);
      localStorage.setItem('kanso_jira_token', jiraToken);
      localStorage.setItem('kanso_jira_project_key', jiraProjectKey);
    }
  };

  const testLinear = async () => {
    if (!linearApiKey) return;
    setLinearStatus({ loading: true });
    const res = await linearSync.testConnection(linearApiKey);
    setLinearStatus({ loading: false, ok: res.ok, msg: res.message });
    if (res.ok) {
      localStorage.setItem('kanso_linear_api_key', linearApiKey);
      localStorage.setItem('kanso_linear_team_key', linearTeamKey);
    }
  };

  const testAsana = async () => {
    if (!asanaPat) return;
    setAsanaStatus({ loading: true });
    const res = await asanaSync.testConnection(asanaPat);
    setAsanaStatus({ loading: false, ok: res.ok, msg: res.message });
    if (res.ok) {
      localStorage.setItem('kanso_asana_pat', asanaPat);
      localStorage.setItem('kanso_asana_project_gid', asanaProjectGid);
    }
  };

  const PROVIDERS = [
    { id: 'github' as const, label: 'GitHub Issues', icon: Github, badge: 'Active' },
    { id: 'jira' as const, label: 'Jira Software', icon: Database, badge: 'Cloud / DC' },
    { id: 'linear' as const, label: 'Linear', icon: Radio, badge: 'GraphQL' },
    { id: 'asana' as const, label: 'Asana', icon: CheckSquare, badge: 'REST' },
  ];

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className="modal-dialog"
        style={{
          width: '640px',
          maxWidth: '92vw',
          height: 'auto',
          maxHeight: '88vh',
          background: 'var(--bg-modal)',
          borderRadius: '36px',
          border: '1.5px solid var(--border-medium)',
          boxShadow: 'var(--shadow-modal)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header (Seamless, Minimalist) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '22px 26px 12px',
            background: 'var(--bg-modal)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={22} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                Integrations & PM Sync
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                Synchronize cards and issue states with your external tracking tools
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-icon"
            style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--accent-primary)' }}
            title="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Body: Provider Sidebar + Form Panel */}
        <div style={{ display: 'flex', minHeight: '380px', padding: '0 24px 24px', gap: '20px' }}>
          {/* Provider Sidebar */}
          <div
            style={{
              width: '180px',
              padding: '12px 10px',
              background: 'var(--bg-input)',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '4px 8px 4px' }}>
              Supported Trackers
            </div>
            {PROVIDERS.map(p => {
              const IconComponent = p.icon;
              const isSelected = activeTab === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveTab(p.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: '14px',
                    border: 'none',
                    background: isSelected ? 'var(--accent-primary)' : 'transparent',
                    color: isSelected ? 'var(--accent-primary-text)' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontWeight: isSelected ? 800 : 600,
                    fontSize: '12px',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 4px 12px var(--border-card)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IconComponent size={14} style={{ color: isSelected ? 'var(--accent-primary-text)' : 'var(--text-muted)' }} />
                    <span>{p.label}</span>
                  </div>
                  <span style={{
                    fontSize: '9.5px',
                    fontWeight: 800,
                    color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)',
                    background: isSelected ? 'var(--accent-primary-text)' : 'var(--bg-modal)',
                    padding: '2px 6px',
                    borderRadius: '100px',
                  }}>
                    {p.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Panel */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', background: 'transparent', padding: '4px 0 0' }}>
            {activeTab === 'github' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>GitHub Issues & Pull Requests</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45, fontWeight: 500 }}>
                    Synchronize GitHub Issues into cards and automatically open Pull Requests during Codex execution.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)' }}>Personal Access Token (PAT)</label>
                  <input
                    type="password"
                    value={githubPat}
                    onChange={e => setGithubPat(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    style={{
                      height: '38px',
                      background: 'var(--bg-input)',
                      border: '1.5px solid var(--border-subtle)',
                      borderRadius: '16px',
                      padding: '0 14px',
                      fontSize: '12.5px',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Requires <code>repo</code> permissions for issue reading and PR branch creation.
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)' }}>Repository (owner/repo)</label>
                  <input
                    type="text"
                    value={githubRepo}
                    onChange={e => setGithubRepo(e.target.value)}
                    placeholder="e.g. wekan/wekan"
                    style={{
                      height: '38px',
                      background: 'var(--bg-input)',
                      border: '1.5px solid var(--border-subtle)',
                      borderRadius: '16px',
                      padding: '0 14px',
                      fontSize: '12.5px',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', marginTop: 'auto' }}>
                  <button
                    onClick={testGithub}
                    disabled={ghStatus.loading || !githubPat}
                    className="btn-primary"
                    style={{ fontSize: '12px', height: '36px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '100px', background: 'var(--accent-primary)', color: 'var(--accent-primary-text)', boxShadow: '0 4px 14px var(--border-card)' }}
                  >
                    {ghStatus.loading ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                    <span>Test & Save Connection</span>
                  </button>

                  {ghStatus.msg && (
                    <span style={{ fontSize: '12px', color: ghStatus.ok ? 'var(--success)' : 'var(--danger)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {ghStatus.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                      {ghStatus.msg}
                    </span>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'jira' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>Jira Software (Cloud & Data Center)</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45, fontWeight: 500 }}>
                    Map Jira issues into cards and transition status across backlog, in-progress, and shipped stages.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)' }}>Jira Domain / URL</label>
                  <input
                    type="text"
                    value={jiraDomain}
                    onChange={e => setJiraDomain(e.target.value)}
                    placeholder="my-company.atlassian.net"
                    style={{
                      height: '38px',
                      background: 'var(--bg-input)',
                      border: '1.5px solid var(--border-subtle)',
                      borderRadius: '16px',
                      padding: '0 14px',
                      fontSize: '12.5px',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)' }}>Email Address</label>
                    <input
                      type="email"
                      value={jiraEmail}
                      onChange={e => setJiraEmail(e.target.value)}
                      placeholder="user@company.com"
                      style={{
                        height: '38px',
                        background: 'var(--bg-input)',
                        border: '1.5px solid var(--border-subtle)',
                        borderRadius: '16px',
                        padding: '0 14px',
                        fontSize: '12.5px',
                        color: 'var(--text-primary)',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)' }}>Project Key</label>
                    <input
                      type="text"
                      value={jiraProjectKey}
                      onChange={e => setJiraProjectKey(e.target.value)}
                      placeholder="e.g. PROJ"
                      style={{
                        height: '38px',
                        background: 'var(--bg-input)',
                        border: '1.5px solid var(--border-subtle)',
                        borderRadius: '16px',
                        padding: '0 14px',
                        fontSize: '12.5px',
                        color: 'var(--text-primary)',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)' }}>API Token</label>
                  <input
                    type="password"
                    value={jiraToken}
                    onChange={e => setJiraToken(e.target.value)}
                    placeholder="Atlassian API Token"
                    style={{
                      height: '38px',
                      background: 'var(--bg-input)',
                      border: '1.5px solid var(--border-subtle)',
                      borderRadius: '16px',
                      padding: '0 14px',
                      fontSize: '12.5px',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', marginTop: 'auto' }}>
                  <button
                    onClick={testJira}
                    disabled={jiraStatus.loading || !jiraDomain || !jiraEmail || !jiraToken}
                    className="btn-primary"
                    style={{ fontSize: '12px', height: '36px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '100px', background: 'var(--accent-primary)', color: 'var(--accent-primary-text)', boxShadow: '0 4px 14px var(--border-card)' }}
                  >
                    {jiraStatus.loading ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                    <span>Test & Save Jira</span>
                  </button>

                  {jiraStatus.msg && (
                    <span style={{ fontSize: '12px', color: jiraStatus.ok ? 'var(--success)' : 'var(--danger)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {jiraStatus.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                      {jiraStatus.msg}
                    </span>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'linear' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>Linear Workspace (GraphQL API)</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45, fontWeight: 500 }}>
                    Real-time synchronization for engineering teams with high-speed Linear cycles.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)' }}>Linear API Key</label>
                  <input
                    type="password"
                    value={linearApiKey}
                    onChange={e => setLinearApiKey(e.target.value)}
                    placeholder="lin_api_xxxxxxxxxxxxxxxxxxxx"
                    style={{
                      height: '38px',
                      background: 'var(--bg-input)',
                      border: '1.5px solid var(--border-subtle)',
                      borderRadius: '16px',
                      padding: '0 14px',
                      fontSize: '12.5px',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)' }}>Target Team Key (Optional)</label>
                  <input
                    type="text"
                    value={linearTeamKey}
                    onChange={e => setLinearTeamKey(e.target.value)}
                    placeholder="e.g. ENG"
                    style={{
                      height: '38px',
                      background: 'var(--bg-input)',
                      border: '1.5px solid var(--border-subtle)',
                      borderRadius: '16px',
                      padding: '0 14px',
                      fontSize: '12.5px',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', marginTop: 'auto' }}>
                  <button
                    onClick={testLinear}
                    disabled={linearStatus.loading || !linearApiKey}
                    className="btn-primary"
                    style={{ fontSize: '12px', height: '36px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '100px', background: 'var(--accent-primary)', color: 'var(--accent-primary-text)', boxShadow: '0 4px 14px var(--border-card)' }}
                  >
                    {linearStatus.loading ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                    <span>Test & Save Linear</span>
                  </button>

                  {linearStatus.msg && (
                    <span style={{ fontSize: '12px', color: linearStatus.ok ? 'var(--success)' : 'var(--danger)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {linearStatus.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                      {linearStatus.msg}
                    </span>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'asana' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>Asana Tasks & Projects</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45, fontWeight: 500 }}>
                    Synchronize tasks, custom fields, and sections directly with your Asana workspaces.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)' }}>Personal Access Token (PAT)</label>
                  <input
                    type="password"
                    value={asanaPat}
                    onChange={e => setAsanaPat(e.target.value)}
                    placeholder="1/120xxxxxxxxxxxxxxxxxxxx"
                    style={{
                      height: '38px',
                      background: 'var(--bg-input)',
                      border: '1.5px solid var(--border-subtle)',
                      borderRadius: '16px',
                      padding: '0 14px',
                      fontSize: '12.5px',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)' }}>Project GID</label>
                  <input
                    type="text"
                    value={asanaProjectGid}
                    onChange={e => setAsanaProjectGid(e.target.value)}
                    placeholder="e.g. 120584930284"
                    style={{
                      height: '38px',
                      background: 'var(--bg-input)',
                      border: '1.5px solid var(--border-subtle)',
                      borderRadius: '16px',
                      padding: '0 14px',
                      fontSize: '12.5px',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', marginTop: 'auto' }}>
                  <button
                    onClick={testAsana}
                    disabled={asanaStatus.loading || !asanaPat}
                    className="btn-primary"
                    style={{ fontSize: '12px', height: '36px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '100px', background: 'var(--accent-primary)', color: 'var(--accent-primary-text)', boxShadow: '0 4px 14px var(--border-card)' }}
                  >
                    {asanaStatus.loading ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                    <span>Test & Save Asana</span>
                  </button>

                  {asanaStatus.msg && (
                    <span style={{ fontSize: '12px', color: asanaStatus.ok ? 'var(--success)' : 'var(--danger)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {asanaStatus.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                      {asanaStatus.msg}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
