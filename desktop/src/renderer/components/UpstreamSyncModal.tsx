import React, { useState, useEffect } from 'react';
import {
  GitPullRequest,
  RefreshCw,
  X,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Download,
  Clock,
  Layers,
  ArrowRight,
  GitCommit,
} from 'lucide-react';

interface UpstreamRepoInfo {
  name: string;
  localPath: string;
  upstreamUrl: string;
  hasUpstreamRemote: boolean;
  commitsBehind: number;
  commitsAhead: number;
  incomingCommits: Array<{ hash: string; message: string; date?: string; author?: string }>;
  diffStat?: string;
  lastChecked?: string;
  error?: string;
}

interface ModelCheckpoint {
  modelId: string;
  name: string;
  category: 'STT' | 'TTS';
  currentVersion: string;
  latestVersion: string;
  isUpdateAvailable: boolean;
  downloadUrl: string;
  size: string;
  releaseNotesUrl?: string;
}

interface UpstreamSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpstreamSyncModal: React.FC<UpstreamSyncModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'git' | 'models'>('git');
  const [selectedRepo, setSelectedRepo] = useState<'openwhispr' | 'kokoro'>('openwhispr');
  const [repoStatus, setRepoStatus] = useState<UpstreamRepoInfo | null>(null);
  const [modelCheckpoints, setModelCheckpoints] = useState<ModelCheckpoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRepoStatus = async (repoKey: 'openwhispr' | 'kokoro') => {
    setIsLoading(true);
    setError(null);
    try {
      if (window.electronAPI?.upstreamCheckStatus) {
        const res = await window.electronAPI.upstreamCheckStatus(repoKey);
        setRepoStatus(res);
      } else {
        // Mock for renderer/web testing
        setRepoStatus({
          name: repoKey === 'openwhispr' ? 'OpenWhispr (STT Base)' : 'Kokoro (TTS Base)',
          localPath: `.tools/${repoKey}`,
          upstreamUrl: repoKey === 'openwhispr' ? 'https://github.com/OpenWhispr/openwhispr.git' : 'https://github.com/hexgrad/kokoro.git',
          hasUpstreamRemote: true,
          commitsBehind: 0,
          commitsAhead: 0,
          incomingCommits: [],
          lastChecked: new Date().toISOString(),
        });
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to check upstream status');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModelCheckpoints = async () => {
    try {
      if (window.electronAPI?.upstreamCheckModelCheckpoints) {
        const res = await window.electronAPI.upstreamCheckModelCheckpoints();
        setModelCheckpoints(res);
      }
    } catch (e: any) {
      console.warn('Error checking model checkpoints:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRepoStatus(selectedRepo);
      fetchModelCheckpoints();
    }
  }, [isOpen, selectedRepo]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <GitPullRequest className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                Upstream Sync & Checkpoint Feeds
              </h2>
              <p className="text-xs text-slate-400">
                Track upstream companion forks (OpenWhispr / Kokoro) & inspect model updates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('git')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'git'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitCommit className="w-4 h-4" />
            Companion Git Forks
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'models'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Model Checkpoint Updates
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'git' && (
            <>
              {/* Repository Selector */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedRepo('openwhispr')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedRepo === 'openwhispr'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/50'
                    }`}
                  >
                    OpenWhispr (STT Fork)
                  </button>
                  <button
                    onClick={() => setSelectedRepo('kokoro')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedRepo === 'kokoro'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/50'
                    }`}
                  >
                    Kokoro (TTS Base)
                  </button>
                </div>

                <button
                  onClick={() => fetchRepoStatus(selectedRepo)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
                  Fetch Upstream
                </button>
              </div>

              {/* Status card */}
              {repoStatus && (
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{repoStatus.name}</h3>
                      <p className="text-xs font-mono text-slate-400">{repoStatus.upstreamUrl}</p>
                    </div>
                    {repoStatus.commitsBehind === 0 ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Up to date
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" /> {repoStatus.commitsBehind} new upstream commits
                      </span>
                    )}
                  </div>

                  {repoStatus.error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-300">
                      {repoStatus.error}
                    </div>
                  )}

                  {/* Incoming commits review */}
                  {repoStatus.incomingCommits.length > 0 ? (
                    <div className="space-y-2 pt-2 border-t border-slate-700/40">
                      <p className="text-xs font-medium text-slate-300">Incoming Commits (Diff for Review):</p>
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {repoStatus.incomingCommits.map(c => (
                          <div
                            key={c.hash}
                            className="flex items-center justify-between bg-slate-900/60 p-2 rounded-lg border border-slate-800 text-xs"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="font-mono text-cyan-400 font-semibold">{c.hash}</span>
                              <span className="text-slate-200 truncate">{c.message}</span>
                            </div>
                            <span className="text-slate-500 whitespace-nowrap text-[11px]">{c.date || ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      No unmerged commits from upstream. Local workspace is aligned with latest canonical commits.
                    </p>
                  )}

                  {repoStatus.diffStat && (
                    <div className="pt-2">
                      <p className="text-xs font-medium text-slate-300 mb-1">Diff Summary:</p>
                      <pre className="text-[11px] font-mono bg-slate-950 p-2.5 rounded-lg text-slate-400 overflow-x-auto border border-slate-800">
                        {repoStatus.diffStat}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === 'models' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Model weights (Whisper, Parakeet, Kokoro-82M) are downloaded directly from release repositories into{' '}
                <code className="text-cyan-300 font-mono">~/.lumora/models/</code>. Config updates do not require app code rebuilds.
              </p>

              <div className="grid gap-3">
                {modelCheckpoints.map(model => (
                  <div
                    key={model.modelId}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 hover:border-slate-600 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                          {model.category}
                        </span>
                        <h4 className="text-sm font-semibold text-white">{model.name}</h4>
                      </div>
                      <p className="text-xs text-slate-400">
                        Current: <span className="font-mono text-slate-300">{model.currentVersion}</span> • Size:{' '}
                        <span className="text-slate-300 font-medium">{model.size}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {model.releaseNotesUrl && (
                        <a
                          href={model.releaseNotesUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Releases
                        </a>
                      )}
                      <a
                        href={model.downloadUrl}
                        download
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors shadow-lg shadow-cyan-600/20"
                      >
                        <Download className="w-3.5 h-3.5" /> Download Weights
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Upstream checks inspect diffs safely without silent auto-merging
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
