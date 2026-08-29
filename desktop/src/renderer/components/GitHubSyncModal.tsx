import React, { useState } from 'react';
import { useBoardStore } from '../store/boardStore';
import { githubSync } from '../lib/githubSync';
import { X, Github, RefreshCw, CheckCircle2, AlertCircle, Key, GitBranch, ArrowRightLeft, Loader2 } from 'lucide-react';

export const GitHubSyncModal: React.FC = () => {
  const {
    isGitHubModalOpen,
    setGitHubModalOpen,
    settings,
    updateSettings,
    session,
    activeBoardId,
    lists,
    swimlanes,
    cards,
  } = useBoardStore();

  const [pat, setPat] = useState(settings.githubPat || '');
  const [repo, setRepo] = useState(settings.githubRepo || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  if (!isGitHubModalOpen) return null;

  const handleTestConnection = async () => {
    if (!pat.trim() || !repo.trim()) {
      setTestResult({ ok: false, message: 'Please enter both a GitHub PAT and repository (owner/repo)' });
      return;
    }
    setIsSyncing(true);
    setTestResult(null);
    const res = await githubSync.testConnection(repo.trim(), pat.trim());
    setTestResult(res);
    setIsSyncing(false);
    if (res.ok) {
      updateSettings({ githubPat: pat.trim(), githubRepo: repo.trim() });
    }
  };

  const handleRunSync = async () => {
    if (!session || !activeBoardId) return;
    if (!pat.trim() || !repo.trim()) {
      setTestResult({ ok: false, message: 'Please enter both a GitHub PAT and repository' });
      return;
    }

    setIsSyncing(true);
    setSyncStatus(null);
    try {
      updateSettings({ githubPat: pat.trim(), githubRepo: repo.trim(), githubSyncEnabled: true });
      const swimlaneId = swimlanes[0]?._id || '';
      const { addedCount, updatedCount } = await githubSync.syncInbound(
        repo.trim(),
        pat.trim(),
        session.serverUrl,
        session.token,
        activeBoardId,
        lists,
        swimlaneId,
        cards
      );
      setSyncStatus(`Sync Complete: ${addedCount} issue(s) imported, ${updatedCount} issue(s) refreshed.`);
    } catch (e: any) {
      setSyncStatus(`Sync error: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const syncedCards = cards.filter(c => c.github);

  return (
    <div className="modal-backdrop" onClick={() => setGitHubModalOpen(false)}>
      <div className="modal-content" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Github size={20} />
            </div>
            <div>
              <h2 className="modal-title">GitHub Two-Way Sync</h2>
              <p className="modal-subtitle">Bi-directional issue sync with cards, comments & state tracking</p>
            </div>
          </div>
          <button
            onClick={() => setGitHubModalOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {testResult && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.85rem',
              background: testResult.ok ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
              border: `1px solid ${testResult.ok ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
              color: testResult.ok ? '#6ee7b7' : '#fda4af',
            }}
          >
            {testResult.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{testResult.message}</span>
          </div>
        )}

        {syncStatus && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#c7d2fe',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ArrowRightLeft size={16} />
            <span>{syncStatus}</span>
          </div>
        )}

        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Key size={13} style={{ color: 'var(--accent-primary)' }} />
            <span>GitHub Personal Access Token (PAT)</span>
          </label>
          <input
            type="password"
            value={pat}
            onChange={(e) => setPat(e.target.value)}
            placeholder="github_pat_11..."
            className="form-input font-mono"
          />
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Requires <code>repo</code> or <code>issues:write</code> scope permissions.
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <GitBranch size={13} style={{ color: 'var(--accent-primary)' }} />
            <span>GitHub Repository (owner/repo)</span>
          </label>
          <input
            type="text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="e.g. facebook/react or wekan/wekan"
            className="form-input font-mono"
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isSyncing}
            className="btn-subtle"
            style={{ flex: 1 }}
          >
            Test Connection
          </button>

          <button
            type="button"
            onClick={handleRunSync}
            disabled={isSyncing}
            className="btn-primary"
            style={{ flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {isSyncing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <RefreshCw size={15} />
                <span>Sync Now</span>
              </>
            )}
          </button>
        </div>

        {/* Sync Summary */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Synced Cards on this Board ({syncedCards.length})
          </div>
          {syncedCards.length === 0 ? (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-subtle)', fontStyle: 'italic' }}>
              No cards currently linked to GitHub issues.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
              {syncedCards.map(c => (
                <div
                  key={c._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                  }}
                >
                  <span style={{ color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {c.title}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: c.github?.state === 'open' ? '#34d399' : '#94a3b8' }}>
                    {c.github?.state}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
