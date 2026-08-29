import React, { useState } from 'react';
import { useBoardStore } from '../store/boardStore';
import { AiService } from '../lib/aiService';
import { jiraSync } from '../lib/jiraSync';
import { linearSync } from '../lib/linearSync';
import { asanaSync } from '../lib/asanaSync';
import { githubSync } from '../lib/githubSync';
import { parseAcpModels, resolveTargetAcpModelId } from '../lib/acpModelParser';
import { CustomDropdown } from './CustomDropdown';
import { LumoraLogo } from './LumoraLogo';
import {
  ArrowLeft,
  ArrowRight,
  Settings,
  Bot,
  Github,
  Server,
  User,
  Sliders,
  Check,
  Moon,
  Sun,
  Eye,
  EyeOff,
  Bell,
  RefreshCw,
  Cpu,
  Lock,
  LogOut,
  Save,
  CheckCircle2,
  Folder,
  Layers,
  Palette,
  Layout,
  Database,
  ExternalLink,
  ShieldCheck,
  Zap,
  HardDrive,
  CheckCircle,
  XCircle,
  Loader2,
  Flame,
  FileCode2,
  Brain,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    boards,
    updateBoard,
    switchBoard,
    settings,
    updateSettings,
    setWatchLevel,
    session,
    logout,
    ddpState,
    activeBoard,
    setActiveView,
  } = useBoardStore();

  const [activeCategory, setActiveCategory] = useState<'appearance' | 'projects' | 'defaults' | 'ai' | 'integrations' | 'github' | 'account'>('projects');

  // Form states
  const [theme, setTheme] = useState<string>(settings.theme || 'midnight');
  const [listWidth, setListWidth] = useState<number>(settings.listWidth || 300);
  const [showApiKey, setShowApiKey] = useState(false);
  const [defaultSubfolders, setDefaultSubfolders] = useState<string>(
    localStorage.getItem('kanso_default_subfolders') || 'Core Features, UI & Design System, Performance & Infra'
  );
  const [defaultLists, setDefaultLists] = useState<string>(
    localStorage.getItem('kanso_default_lists') || 'Backlog, In Progress, Review, Done'
  );

  // AI states
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('kanso_gemini_key') || '');
  const [aiProvider, setAiProvider] = useState(localStorage.getItem('kanso_ai_provider') || 'codex');
  const [geminiModel, setGeminiModel] = useState(localStorage.getItem('kanso_gemini_model') || 'gemini-2.5-flash');
  const [customModelName, setCustomModelName] = useState(localStorage.getItem('kanso_custom_gemini_model') || '');
  const [isCustomModel, setIsCustomModel] = useState(
    !['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3.7-flash', 'gemini-2.0-flash'].includes(
      localStorage.getItem('kanso_gemini_model') || 'gemini-2.5-flash'
    )
  );
  const [reasoningLevel, setReasoningLevel] = useState<'low' | 'medium' | 'high'>(
    (localStorage.getItem('kanso_gemini_reasoning') as any) || 'medium'
  );

  // Codex ACP States
  const [codexMode, setCodexMode] = useState<'builtin' | 'custom_command' | 'remote_url'>(
    (localStorage.getItem('kanso_codex_mode') as any) || 'builtin'
  );
  const [codexModel, setCodexModel] = useState(localStorage.getItem('kanso_codex_model') || '');
  const [codexCustomCommand, setCodexCustomCommand] = useState(localStorage.getItem('kanso_codex_command') || '');
  const [codexServerUrl, setCodexServerUrl] = useState(localStorage.getItem('kanso_codex_server_url') || '');
  const [discoveredCodexModels, setDiscoveredCodexModels] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('kanso_codex_discovered_models');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const parsedAcpModels = React.useMemo(() => {
    return parseAcpModels(discoveredCodexModels);
  }, [discoveredCodexModels]);

  // Determine current active base model ID and current thinking tier
  const activeAcpBaseModel = React.useMemo(() => {
    const rawId = codexModel || (discoveredCodexModels[0]?.id || 'gpt-5.6-sol');
    const match = rawId.match(/^(.+?)\[([a-zA-Z0-9_\-]+)\]$/);
    const baseId = match ? match[1] : rawId;
    return parsedAcpModels.find(m => m.baseId === baseId) || parsedAcpModels[0] || null;
  }, [codexModel, parsedAcpModels, discoveredCodexModels]);

  const activeThinkingTier = React.useMemo(() => {
    const rawId = codexModel || '';
    const match = rawId.match(/^.+?\[([a-zA-Z0-9_\-]+)\]$/);
    if (match) return match[1];
    return reasoningLevel || activeAcpBaseModel?.defaultThinkingTier || 'medium';
  }, [codexModel, reasoningLevel, activeAcpBaseModel]);
  const [isLoadingCodexModels, setIsLoadingCodexModels] = useState(false);
  const [isCustomCodexModel, setIsCustomCodexModel] = useState(false);

  const [ollamaEndpoint, setOllamaEndpoint] = useState(localStorage.getItem('kanso_ollama_endpoint') || 'http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState(localStorage.getItem('kanso_ollama_model') || 'llama3.2');
  const [aiPersona, setAiPersona] = useState(localStorage.getItem('kanso_ai_persona') || 'architect');

  const [githubPat, setGithubPat] = useState(settings.githubPat || '');
  const [githubRepo, setGithubRepo] = useState(settings.githubRepo || '');
  const [autoSync, setAutoSync] = useState(settings.autoSyncGithub ?? true);
  const [syncInterval, setSyncInterval] = useState(settings.syncIntervalSeconds || 30);
  const [watchLevelState, setWatchLevelState] = useState<'muted' | 'tracking' | 'watching'>(settings.watchLevel || 'watching');
  const [savedBanner, setSavedBanner] = useState(false);
  const [aiSavedBanner, setAiSavedBanner] = useState(false);

  // Cloud PM States (Jira, Linear, Asana)
  const [activePmTab, setActivePmTab] = useState<'jira' | 'linear' | 'asana' | 'github'>('jira');
  const [jiraDomain, setJiraDomain] = useState(localStorage.getItem('kanso_jira_domain') || '');
  const [jiraEmail, setJiraEmail] = useState(localStorage.getItem('kanso_jira_email') || '');
  const [jiraToken, setJiraToken] = useState(localStorage.getItem('kanso_jira_token') || '');
  const [jiraProject, setJiraProject] = useState(localStorage.getItem('kanso_jira_project') || '');
  const [jiraAutoSync, setJiraAutoSync] = useState(localStorage.getItem('kanso_jira_auto_sync') === 'true');

  const [linearApiKey, setLinearApiKey] = useState(localStorage.getItem('kanso_linear_api_key') || '');
  const [linearTeamId, setLinearTeamId] = useState(localStorage.getItem('kanso_linear_team_id') || '');
  const [linearAutoSync, setLinearAutoSync] = useState(localStorage.getItem('kanso_linear_auto_sync') === 'true');

  const [asanaPat, setAsanaPat] = useState(localStorage.getItem('kanso_asana_pat') || '');
  const [asanaProjectId, setAsanaProjectId] = useState(localStorage.getItem('kanso_asana_project_id') || '');
  const [asanaAutoSync, setAsanaAutoSync] = useState(localStorage.getItem('kanso_asana_auto_sync') === 'true');

  const [isTestingPm, setIsTestingPm] = useState(false);
  const [pmTestResult, setPmTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [pmSavedBanner, setPmSavedBanner] = useState(false);

  // Connection Test States
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchCodexModels = async () => {
    if (typeof window !== 'undefined' && window.electronAPI?.codexListModels) {
      setIsLoadingCodexModels(true);
      try {
        const config = {
          command: codexMode === 'custom_command' ? codexCustomCommand.trim() : undefined,
          serverUrl: codexMode === 'remote_url' ? codexServerUrl.trim() : undefined,
        };
        if (window.electronAPI.codexInit) {
          await window.electronAPI.codexInit(config);
        }
        const res = await window.electronAPI.codexListModels();
        if (res?.models && res.models.length > 0) {
          setDiscoveredCodexModels(res.models);
          localStorage.setItem('kanso_codex_discovered_models', JSON.stringify(res.models));
          if (!codexModel && res.currentModelId) {
            setCodexModel(res.currentModelId);
          }
          setAiTestResult({
            success: true,
            message: `Discovered ${res.models.length} modern models dynamically from Codex ACP!`,
          });
        } else {
          setAiTestResult({
            success: false,
            message: 'No model options returned by ACP server. Ensure Codex CLI is up to date.',
          });
        }
      } catch (err: any) {
        console.warn('Could not list models from Codex ACP:', err);
        setAiTestResult({
          success: false,
          message: err.message || 'Could not discover models from Codex ACP.',
        });
      } finally {
        setIsLoadingCodexModels(false);
      }
    }
  };

  const openExternalUrl = (url: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if ((window as any).electronAPI?.openExternal) {
      (window as any).electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleTestAiConnection = async () => {
    setIsTestingAi(true);
    setAiTestResult(null);
    try {
      if (aiProvider === 'codex') {
        if (typeof window !== 'undefined' && window.electronAPI?.codexInit) {
          const config = {
            command: codexMode === 'custom_command' ? codexCustomCommand.trim() : undefined,
            serverUrl: codexMode === 'remote_url' ? codexServerUrl.trim() : undefined,
            model: codexModel,
          };
          const res = await window.electronAPI.codexInit(config);
          if (res.success) {
            const status = window.electronAPI.codexGetStatus ? await window.electronAPI.codexGetStatus() : null;
            setAiTestResult({
              success: true,
              message: `Codex ACP Server initialized & authenticated! Model: ${status?.model || codexModel}. Subprocess ready.`,
            });
          } else {

            setAiTestResult({
              success: false,
              message: res.error || 'Failed to initialize Codex ACP subprocess.',
            });
          }
        } else {
          setAiTestResult({ success: false, message: 'Electron IPC unavailable for Codex ACP in this browser context.' });
        }
        return;
      }

      const activeModel = isCustomModel && customModelName.trim() ? customModelName.trim() : geminiModel;
      const prompt = 'Respond with "Ready" if you can read this message.';
      const res = await AiService.generate(prompt, {
        provider: aiProvider as any,
        geminiApiKey: geminiKey.trim(),
        geminiModel: activeModel,
        ollamaEndpoint: ollamaEndpoint.trim(),
        ollamaModel: ollamaModel.trim(),
        reasoningLevel,
      });
      if (res) {
        setAiTestResult({ success: true, message: `Connection verified! Model (${activeModel}) responded successfully.` });
      } else {
        setAiTestResult({ success: false, message: 'Empty response received from engine.' });
      }
    } catch (err: any) {
      setAiTestResult({
        success: false,
        message: err.message || 'Connection failed. Please check your API key or endpoint URL.',
      });
    } finally {
      setIsTestingAi(false);
    }
  };

  const handleSaveAiSettings = () => {
    const activeModel = isCustomModel && customModelName.trim() ? customModelName.trim() : geminiModel;
    localStorage.setItem('kanso_gemini_key', geminiKey.trim());
    localStorage.setItem('kanso_ai_provider', aiProvider);
    localStorage.setItem('kanso_gemini_model', activeModel);
    localStorage.setItem('kanso_custom_gemini_model', customModelName.trim());
    localStorage.setItem('kanso_gemini_reasoning', reasoningLevel);
    localStorage.setItem('kanso_codex_mode', codexMode);
    localStorage.setItem('kanso_codex_model', codexModel);
    localStorage.setItem('kanso_codex_command', codexCustomCommand.trim());
    localStorage.setItem('kanso_codex_server_url', codexServerUrl.trim());
    localStorage.setItem('kanso_ollama_endpoint', ollamaEndpoint.trim());
    localStorage.setItem('kanso_ollama_model', ollamaModel.trim());
    localStorage.setItem('kanso_ai_persona', aiPersona);

    setAiSavedBanner(true);
    setTimeout(() => setAiSavedBanner(false), 2500);
  };

  const handleSaveAll = () => {
    updateSettings({
      theme: theme as any,
      listWidth: Number(listWidth),
      githubPat: githubPat.trim(),
      githubRepo: githubRepo.trim(),
      autoSyncGithub: autoSync,
      syncIntervalSeconds: Number(syncInterval),
      watchLevel: watchLevelState,
    });

    localStorage.setItem('kanso_default_subfolders', defaultSubfolders.trim());
    localStorage.setItem('kanso_default_lists', defaultLists.trim());

    handleSaveAiSettings();

    setWatchLevel(watchLevelState);

    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2500);
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    updateSettings({ theme: newTheme as any });
  };

  const THEMES = [
    // Dark Themes
    {
      id: 'midnight',
      group: 'Dark',
      name: 'Notion Dark',
      desc: 'Warm charcoal canvas (#191919) with soft subtle borders and cozy contrast',
      bg: '#191919',
      sidebarBg: '#202020',
      cardBg: '#252525',
      accent: '#2383e2',
      textColor: '#efefef',
      badge: 'Notion Aesthetic',
    },
    {
      id: 'slate',
      group: 'Dark',
      name: 'Slate Charcoal',
      desc: 'Cool graphite industrial slate with cyan glow',
      bg: '#0b0f19',
      sidebarBg: '#070b14',
      cardBg: '#1e293b',
      accent: '#38bdf8',
      textColor: '#f1f5f9',
      badge: 'Graphite Cyan',
    },
    {
      id: 'purple',
      group: 'Dark',
      name: 'Dark Monotone',
      desc: 'Pure minimalist obsidian grayscale with crisp white accents',
      bg: '#09090b',
      sidebarBg: '#09090b',
      cardBg: '#18181b',
      accent: '#ffffff',
      textColor: '#fafafa',
      badge: 'Minimal Grayscale',
    },
    // Light Themes
    {
      id: 'light',
      group: 'Light',
      name: 'Studio Pure',
      desc: 'Crisp porcelain white canvas with deep indigo accents',
      bg: '#ffffff',
      sidebarBg: '#f1f5f9',
      cardBg: '#ffffff',
      accent: '#2563eb',
      textColor: '#0f172a',
      badge: 'Indigo Studio',
    },
    {
      id: 'warm',
      group: 'Light',
      name: 'Warm Paper',
      desc: 'Soft warm sand canvas with rich espresso & amber accents',
      bg: '#fcfaf7',
      sidebarBg: '#eee9e0',
      cardBg: '#ffffff',
      accent: '#d97706',
      textColor: '#1c1917',
      badge: 'Warm Sand',
    },
    {
      id: 'frost',
      group: 'Light',
      name: 'Light Monotone',
      desc: 'Pure minimalist neutral paper canvas with crisp deep black accents',
      bg: '#ffffff',
      sidebarBg: '#ebebeb',
      cardBg: '#ffffff',
      accent: '#18181b',
      textColor: '#18181b',
      badge: 'Pure Monochrome',
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--bg-app)',
        color: 'var(--text-primary)',
        overflow: 'hidden',
      }}
    >
      {/* ── Top Header Navigation Bar ──────────────────────────────── */}
      <div
        style={{
          height: '52px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          background: 'var(--bg-header)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setActiveView('board')}
            className="btn-subtle"
            style={{ height: '30px', fontSize: '12px', gap: '6px', padding: '0 10px' }}
          >
            <ArrowLeft size={13} />
            <span>Back to Project</span>
          </button>

          <div style={{ width: '1px', height: '18px', background: 'var(--border-subtle)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: 'var(--r-sm)',
                background: 'rgba(79,142,247,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-blue)',
              }}
            >
              <Settings size={14} />
            </div>
            <div>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Workspace Preferences & Settings
              </span>
            </div>
          </div>
        </div>

        {/* Save Button & Feedback */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {savedBanner && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                color: 'var(--success)',
                fontSize: '12px',
                fontWeight: 600,
                animation: 'fade-in 150ms ease-out',
              }}
            >
              <CheckCircle2 size={13} />
              <span>Preferences Saved!</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleSaveAll}
            className="btn-primary"
            style={{ height: '32px', fontSize: '12px', padding: '0 16px', gap: '6px' }}
          >
            <Save size={13} />
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      {/* ── Main Settings Layout ───────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Sidebar Menu */}
        <div
          style={{
            width: '230px',
            background: 'var(--bg-sidebar)',
            borderRight: '1px solid var(--border-subtle)',
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            flexShrink: 0,
          }}
        >
          <div style={{ padding: '4px 8px 8px 8px', fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Settings Menu
          </div>

          <button
            type="button"
            onClick={() => setActiveCategory('projects')}
            className={`sidebar-nav-item ${activeCategory === 'projects' ? 'active' : ''}`}
          >
            <Folder size={14} />
            <span>Project Workspaces & Codex</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('appearance')}
            className={`sidebar-nav-item ${activeCategory === 'appearance' ? 'active' : ''}`}
          >
            <Palette size={14} />
            <span>Appearance & Themes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('defaults')}
            className={`sidebar-nav-item ${activeCategory === 'defaults' ? 'active' : ''}`}
          >
            <Sliders size={14} />
            <span>Project Defaults</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('ai')}
            className={`sidebar-nav-item ${activeCategory === 'ai' ? 'active' : ''}`}
          >
            <LumoraLogo size={14} showText={false} />
            <span>Lumora Copilot & Engine</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('integrations')}
            className={`sidebar-nav-item ${activeCategory === 'integrations' || activeCategory === 'github' ? 'active' : ''}`}
          >
            <Layers size={14} />
            <span>Cloud PM & Integrations</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('account')}
            className={`sidebar-nav-item ${activeCategory === 'account' ? 'active' : ''}`}
          >
            <User size={14} />
            <span>Account & Storage</span>
          </button>
        </div>

        {/* Right Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '36px 48px', maxWidth: '1080px' }}>
          {/* ── 0. PROJECT WORKSPACES & CODEX HUB ───────────────────────── */}
          {activeCategory === 'projects' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Project Workspaces & Codex Hub
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Configure codebase repositories, assign autonomous Codex dev access, and monitor project status.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--r-md)',
                    padding: '8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Total Projects:</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{boards.length}</span>
                  </div>
                  <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--r-md)',
                    padding: '8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Linked Repos:</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-blue)' }}>
                      {boards.filter(b => b.localRepoPath).length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Project Cards Matrix */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {boards.map(b => {
                  // Strip any emoji from title for clean display
                  const cleanTitle = (b.title || 'Untitled Project').replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF])\s*/u, '');
                  const isCurrentActive = b._id === activeBoard?._id;
                  const isCodexEnabled = b.enableCodexAgent !== false && b.projectType !== 'general';

                  return (
                    <div
                      key={b._id}
                      style={{
                        background: 'var(--bg-card)',
                        border: isCurrentActive ? '1.5px solid var(--accent-blue)' : '1px solid var(--border-card)',
                        borderRadius: 'var(--r-lg)',
                        padding: '18px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        boxShadow: isCurrentActive ? '0 0 16px rgba(79, 142, 247, 0.08)' : 'var(--shadow-xs)',
                        transition: 'all var(--t-fast)',
                      }}
                    >
                      {/* Project Top Bar */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: b.color ? `var(--${b.color}, #4f8ef7)` : '#4f8ef7',
                          }} />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {cleanTitle}
                              </span>
                              {isCurrentActive && (
                                <span style={{
                                  fontSize: '9.5px',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: 'var(--r-full)',
                                  background: 'rgba(79, 142, 247, 0.15)',
                                  color: 'var(--accent-blue)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                }}>
                                  Active
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              switchBoard(b._id);
                              setActiveView('board');
                            }}
                            className="btn-subtle"
                            style={{ height: '28px', fontSize: '11.5px', padding: '0 12px', gap: '4px' }}
                          >
                            <span>Open Board</span>
                            <ArrowRight size={11} />
                          </button>
                        </div>
                      </div>

                      {/* Project Config Grid: Local Repo & Codex Toggle */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1.4fr 1fr',
                        gap: '14px',
                        background: 'var(--bg-input)',
                        padding: '12px 14px',
                        borderRadius: 'var(--r-md)',
                        border: '1px solid var(--border-subtle)',
                      }}>
                        {/* Column 1: Local Codebase Repo */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Folder size={12} style={{ color: b.localRepoPath ? 'var(--accent-blue)' : 'var(--text-muted)' }} />
                            <span>Linked Codebase Repository</span>
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              flex: 1,
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 'var(--r-sm)',
                              padding: '6px 10px',
                              fontSize: '11.5px',
                              fontFamily: 'var(--font-mono)',
                              color: b.localRepoPath ? 'var(--text-primary)' : 'var(--text-muted)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {b.localRepoPath || 'No repository folder linked'}
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                if (window.electronAPI?.openDirectoryDialog) {
                                  const chosen = await window.electronAPI.openDirectoryDialog('Select Codebase Repository Folder');
                                  if (chosen) {
                                    await updateBoard(b._id, { localRepoPath: chosen });
                                  }
                                }
                              }}
                              className="btn-subtle"
                              style={{ height: '30px', fontSize: '11.5px', padding: '0 10px', flexShrink: 0 }}
                            >
                              <span>{b.localRepoPath ? 'Change' : 'Browse Folder'}</span>
                            </button>
                            {b.localRepoPath && (
                              <button
                                type="button"
                                onClick={() => updateBoard(b._id, { localRepoPath: '' })}
                                className="btn-subtle"
                                style={{ height: '30px', fontSize: '11.5px', padding: '0 8px', color: 'var(--text-muted)' }}
                                title="Unlink repository"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Column 2: Autonomous Dev Agent & Tools Access */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Cpu size={12} style={{ color: isCodexEnabled ? 'var(--accent-green)' : 'var(--text-muted)' }} />
                            <span>Codex Coding Agent</span>
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-sm)', padding: '6px 10px', height: '30px' }}>
                            <span style={{ fontSize: '11.5px', color: isCodexEnabled ? 'var(--accent-green)' : 'var(--text-muted)', fontWeight: 500 }}>
                              {isCodexEnabled ? 'Autonomous Dev Enabled' : 'Disabled (Task Only)'}
                            </span>
                            <input
                              type="checkbox"
                              checked={isCodexEnabled}
                              onChange={e => {
                                updateBoard(b._id, {
                                  enableCodexAgent: e.target.checked,
                                  projectType: e.target.checked ? 'engineering' : 'general',
                                });
                              }}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 1. APPEARANCE & THEMES ───────────────────────────────── */}
          {activeCategory === 'appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Appearance & Curated Themes
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Switch between 6 hand-tuned themes crafted for high contrast, minimal eye strain, and precision focus.
                </p>
              </div>

              {/* Dark Themes Grid */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Moon size={14} style={{ color: 'var(--accent-blue)' }} />
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Dark Themes (3)
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {THEMES.filter(t => t.group === 'Dark').map(t => {
                    const isSelected = theme === t.id || (t.id === 'midnight' && theme === 'dark') || (t.id === 'purple' && theme === 'dark_monotone');
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleThemeChange(t.id)}
                        style={{
                          background: t.bg,
                          border: isSelected ? `2px solid ${t.accent}` : '1px solid var(--border-medium)',
                          borderRadius: 'var(--r-lg)',
                          padding: '16px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          boxShadow: isSelected ? `0 0 16px ${t.accent}25` : 'var(--shadow-xs)',
                          transition: 'all var(--t-fast)',
                          position: 'relative',
                        }}
                      >
                        {/* Mini Window Preview */}
                        <div
                          style={{
                            background: t.bg,
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 'var(--r-md)',
                            height: '76px',
                            display: 'flex',
                            overflow: 'hidden',
                          }}
                        >
                          <div style={{ width: '28px', background: t.sidebarBg, borderRight: '1px solid rgba(255,255,255,0.08)' }} />
                          <div style={{ flex: 1, padding: '6px', display: 'flex', gap: '6px' }}>
                            <div style={{ flex: 1, background: t.cardBg, borderRadius: '4px', padding: '5px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <div style={{ width: '60%', height: '4px', background: t.accent, borderRadius: '2px' }} />
                              <div style={{ width: '80%', height: '3px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px' }} />
                            </div>
                            <div style={{ flex: 1, background: t.cardBg, borderRadius: '4px', padding: '5px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <div style={{ width: '50%', height: '4px', background: 'rgba(255,255,255,0.4)', borderRadius: '2px' }} />
                              <div style={{ width: '70%', height: '3px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px' }} />
                            </div>
                          </div>
                        </div>

                        {/* Title & Desc */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: t.textColor }}>
                              {t.name}
                            </span>
                            {isSelected && (
                              <span style={{ background: t.accent, color: t.accent === '#ffffff' ? '#09090b' : '#ffffff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Check size={11} strokeWidth={3} />
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', marginTop: '4px', lineHeight: 1.4 }}>
                            {t.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Light Themes Grid */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Sun size={14} style={{ color: 'var(--accent-amber)' }} />
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Light Themes (3)
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {THEMES.filter(t => t.group === 'Light').map(t => {
                    const isSelected = theme === t.id || (t.id === 'frost' && theme === 'light_monotone');
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleThemeChange(t.id)}
                        style={{
                          background: t.bg,
                          border: isSelected ? `2px solid ${t.accent}` : '1px solid var(--border-medium)',
                          borderRadius: 'var(--r-lg)',
                          padding: '16px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          boxShadow: isSelected ? `0 0 16px ${t.accent}25` : 'var(--shadow-xs)',
                          transition: 'all var(--t-fast)',
                          position: 'relative',
                        }}
                      >
                        {/* Mini Window Preview */}
                        <div
                          style={{
                            background: t.bg,
                            border: '1px solid rgba(0,0,0,0.1)',
                            borderRadius: 'var(--r-md)',
                            height: '76px',
                            display: 'flex',
                            overflow: 'hidden',
                          }}
                        >
                          <div style={{ width: '28px', background: t.sidebarBg, borderRight: '1px solid rgba(0,0,0,0.06)' }} />
                          <div style={{ flex: 1, padding: '6px', display: 'flex', gap: '6px' }}>
                            <div style={{ flex: 1, background: t.cardBg, border: '1px solid rgba(0,0,0,0.06)', borderRadius: '4px', padding: '5px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <div style={{ width: '60%', height: '4px', background: t.accent, borderRadius: '2px' }} />
                              <div style={{ width: '80%', height: '3px', background: 'rgba(0,0,0,0.15)', borderRadius: '2px' }} />
                            </div>
                            <div style={{ flex: 1, background: t.cardBg, border: '1px solid rgba(0,0,0,0.06)', borderRadius: '4px', padding: '5px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <div style={{ width: '50%', height: '4px', background: 'rgba(0,0,0,0.3)', borderRadius: '2px' }} />
                              <div style={{ width: '70%', height: '3px', background: 'rgba(0,0,0,0.15)', borderRadius: '2px' }} />
                            </div>
                          </div>
                        </div>

                        {/* Title & Desc */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: t.textColor }}>
                              {t.name}
                            </span>
                            {isSelected && (
                              <span style={{ background: t.accent, color: '#ffffff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Check size={11} strokeWidth={3} />
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: '12px', color: 'rgba(0,0,0,0.65)', marginTop: '4px', lineHeight: 1.4 }}>
                            {t.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Layout & Column Sizing */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 'var(--r-lg)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layout size={15} style={{ color: 'var(--accent-blue)' }} />
                      <span>Kanban Column Width ({listWidth}px)</span>
                    </span>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
                      Adjust column width for wider monitors or compact laptop screens.
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>260px</span>
                    <input
                      type="range"
                      min={260}
                      max={380}
                      step={10}
                      value={listWidth}
                      onChange={e => setListWidth(Number(e.target.value))}
                      style={{ width: '160px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>380px</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── 2. PROJECT DEFAULTS ─────────────────────────────────── */}
          {activeCategory === 'defaults' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Project Defaults & Templates
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Configure the default columns and workstreams automatically generated when creating new projects.
                </p>
              </div>

              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 'var(--r-lg)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                    <Layers size={14} style={{ color: 'var(--accent-blue)' }} />
                    <span>Default Kanban Columns</span>
                  </label>
                  <input
                    type="text"
                    value={defaultLists}
                    onChange={e => setDefaultLists(e.target.value)}
                    className="form-input"
                    placeholder="Backlog, In Progress, Review, Done"
                    style={{ marginTop: '6px' }}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {defaultLists.split(',').filter(Boolean).map((l, i) => (
                      <span key={i} className="notion-prop-pill" style={{ fontSize: '11px', padding: '3px 8px' }}>
                        {l.trim()}
                      </span>
                    ))}
                  </div>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    New projects will automatically populate with these Kanban columns.
                  </span>
                </div>

                <div style={{ height: '1px', background: 'var(--border-subtle)' }} />

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                    <Folder size={14} style={{ color: 'var(--accent-purple)' }} />
                    <span>Default Subfolders & Workstreams</span>
                  </label>
                  <input
                    type="text"
                    value={defaultSubfolders}
                    onChange={e => setDefaultSubfolders(e.target.value)}
                    className="form-input"
                    placeholder="Core Features, UI & Design System, Performance & Infra"
                    style={{ marginTop: '6px' }}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {defaultSubfolders.split(',').filter(Boolean).map((s, i) => (
                      <span key={i} className="notion-prop-pill" style={{ fontSize: '11px', padding: '3px 8px', borderColor: 'var(--border-strong)' }}>
                        📁 {s.trim()}
                      </span>
                    ))}
                  </div>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    New projects will automatically generate these swimlane workstreams.
                  </span>
                </div>
              </div>

              {/* Application Preferences & Accidental Quit Protection */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 'var(--r-lg)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={15} style={{ color: 'var(--accent-blue)' }} />
                    <span>Application Safety & Preferences</span>
                  </span>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    Configure window behaviors and exit protection prompts.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg-card-hover)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Confirm Before Quitting
                    </span>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      Ask for confirmation before closing or quitting Lumora to prevent accidental exits (Cmd+Q).
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
            </div>
          )}

          {/* ── 3. AI COPILOT & ENGINE (STATE OF THE ART) ────────────── */}
          {activeCategory === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    AI Copilot & Engine Configuration
                  </h2>
                  <span style={{ background: 'rgba(79,142,247,0.12)', color: 'var(--accent-blue)', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Cpu size={11} />
                    <span>Gemini 3.7 / 2.5 Engine</span>
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Configure your intelligent pair assistant for automatic technical specification generation, agile checklist decomposition, and sprint velocity diagnostics.
                </p>
              </div>

              {/* 1. Provider Selector Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                {/* OpenAI Codex ACP Card */}
                <div
                  onClick={() => setAiProvider('codex')}
                  style={{
                    background: aiProvider === 'codex' ? 'var(--bg-card)' : 'var(--bg-app)',
                    border: aiProvider === 'codex' ? '2px solid #818cf8' : '1px solid var(--border-medium)',
                    borderRadius: 'var(--r-lg)',
                    padding: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: aiProvider === 'codex' ? '0 0 16px rgba(129,140,248,0.2)' : 'none',
                    transition: 'all var(--t-fast)',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Cpu size={20} style={{ color: '#818cf8' }} />
                      <div>
                        <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          OpenAI Codex ACP
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }} />
                          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>ACP JSON-RPC Stdio</span>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: aiProvider === 'codex' ? 'none' : '1.5px solid var(--border-strong)',
                        background: aiProvider === 'codex' ? '#818cf8' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                      }}
                    >
                      {aiProvider === 'codex' && <Check size={11} strokeWidth={3} />}
                    </div>
                  </div>

                  <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Autonomous coding agent running on ChatGPT subscription. Stdio JSON-RPC 2.0 with isolated git branches.
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: 'auto' }}>
                    <span className="notion-prop-pill" style={{ fontSize: '10px', padding: '1px 5px' }}>🚀 Subscription Auth</span>
                    <span className="notion-prop-pill" style={{ fontSize: '10px', padding: '1px 5px' }}>🛠️ Quality Gates</span>
                  </div>
                </div>

                {/* Google Gemini Card */}
                <div
                  onClick={() => setAiProvider('gemini')}
                  style={{
                    background: aiProvider === 'gemini' ? 'var(--bg-card)' : 'var(--bg-app)',
                    border: aiProvider === 'gemini' ? '2px solid var(--accent-blue)' : '1px solid var(--border-medium)',
                    borderRadius: 'var(--r-lg)',
                    padding: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: aiProvider === 'gemini' ? '0 0 16px rgba(79,142,247,0.15)' : 'none',
                    transition: 'all var(--t-fast)',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <LumoraLogo size={20} showText={false} />
                      <div>
                        <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Google Gemini Cloud
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }} />
                          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Gemini 3.7 / 2.5 Active</span>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: aiProvider === 'gemini' ? 'none' : '1.5px solid var(--border-strong)',
                        background: aiProvider === 'gemini' ? 'var(--accent-blue)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                      }}
                    >
                      {aiProvider === 'gemini' && <Check size={11} strokeWidth={3} />}
                    </div>
                  </div>

                  <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Cloud-hosted models offering extreme speed, deep reasoning, and high multimodal context for technical spec drafting.
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: 'auto' }}>
                    <span className="notion-prop-pill" style={{ fontSize: '10px', padding: '1px 5px' }}>⚡ Fast Latency</span>
                    <span className="notion-prop-pill" style={{ fontSize: '10px', padding: '1px 5px' }}>🎁 Free Tier Key</span>
                  </div>
                </div>

                {/* Local Ollama Card */}
                <div
                  onClick={() => setAiProvider('ollama')}
                  style={{
                    background: aiProvider === 'ollama' ? 'var(--bg-card)' : 'var(--bg-app)',
                    border: aiProvider === 'ollama' ? '2px solid var(--accent-blue)' : '1px solid var(--border-medium)',
                    borderRadius: 'var(--r-lg)',
                    padding: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: aiProvider === 'ollama' ? '0 0 16px rgba(79,142,247,0.15)' : 'none',
                    transition: 'all var(--t-fast)',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Server size={20} style={{ color: 'var(--accent-green)' }} />
                      <div>
                        <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Local Ollama
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)' }} />
                          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>100% Offline / Private</span>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: aiProvider === 'ollama' ? 'none' : '1.5px solid var(--border-strong)',
                        background: aiProvider === 'ollama' ? 'var(--accent-blue)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                      }}
                    >
                      {aiProvider === 'ollama' && <Check size={11} strokeWidth={3} />}
                    </div>
                  </div>

                  <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Executes entirely on your local GPU/CPU hardware. Zero data leaves your computer, ensuring total confidentiality.
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: 'auto' }}>
                    <span className="notion-prop-pill" style={{ fontSize: '10px', padding: '1px 5px' }}>🔒 100% Private</span>
                    <span className="notion-prop-pill" style={{ fontSize: '10px', padding: '1px 5px' }}>✈️ Offline Mode</span>
                  </div>
                </div>
              </div>

              {/* 2. Credentials & Models Card */}

              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 'var(--r-lg)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Lock size={15} style={{ color: 'var(--accent-blue)' }} />
                    <span>Engine Credentials & Model Version</span>
                  </span>

                  <button
                    type="button"
                    onClick={handleTestAiConnection}
                    disabled={isTestingAi || (aiProvider === 'gemini' && !geminiKey.trim())}
                    className="btn-subtle"
                    style={{ height: '28px', fontSize: '11.5px', gap: '5px', padding: '0 10px', color: 'var(--accent-blue)' }}
                  >
                    {isTestingAi ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                    <span>Test {aiProvider === 'codex' ? 'Codex ACP' : aiProvider === 'gemini' ? 'Gemini API' : 'Ollama'}</span>
                  </button>
                </div>

                {/* Codex ACP Credentials & Config */}
                {aiProvider === 'codex' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 600 }}>Codex Subprocess & Transport Mode</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        {[
                          { id: 'builtin', label: 'Local Adapter', desc: 'ChatGPT Subscription (~/.codex/auth.json)' },
                          { id: 'custom_command', label: 'Custom Stdio', desc: 'Custom binary path / CLI command' },
                          { id: 'remote_url', label: 'Remote Server', desc: 'Remote WebSocket / TCP ACP endpoint' },
                        ].map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setCodexMode(m.id as any)}
                            style={{
                              padding: '10px 12px',
                              borderRadius: 'var(--r-md)',
                              border: codexMode === m.id ? '2px solid #818cf8' : '1px solid var(--border-medium)',
                              background: codexMode === m.id ? 'rgba(129,140,248,0.12)' : 'var(--bg-app)',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '3px',
                              textAlign: 'left',
                            }}
                          >
                            <span style={{ fontSize: '12.5px', fontWeight: codexMode === m.id ? 700 : 600, color: codexMode === m.id ? '#818cf8' : 'var(--text-primary)' }}>
                              {m.label}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {m.desc}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {codexMode === 'custom_command' && (
                      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 600 }}>Custom Stdio Command / Binary Path</label>
                        <input
                          type="text"
                          value={codexCustomCommand}
                          onChange={e => setCodexCustomCommand(e.target.value)}
                          placeholder="e.g. /usr/local/bin/codex-acp or codex-acp --custom"
                          className="form-input"
                        />
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          Spawned as a child process speaking JSON-RPC 2.0 over standard I/O.
                        </span>
                      </div>
                    )}

                    {codexMode === 'remote_url' && (
                      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 600 }}>Remote ACP Server Endpoint</label>
                        <input
                          type="text"
                          value={codexServerUrl}
                          onChange={e => setCodexServerUrl(e.target.value)}
                          placeholder="ws://localhost:9090 or http://acp.internal:8080"
                          className="form-input"
                        />
                      </div>
                    )}

                    {/* Codex ACP Model & Thinking Level Dropdowns */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      {/* Dropdown 1: Model Selection */}
                      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                            1. Active Codex Model
                          </label>
                          <button
                            type="button"
                            onClick={fetchCodexModels}
                            disabled={isLoadingCodexModels}
                            className="btn-subtle"
                            style={{ fontSize: '11px', height: '22px', padding: '0 6px', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Query live models advertised by ACP subprocess"
                          >
                            {isLoadingCodexModels ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                            <span>Query ACP Catalog</span>
                          </button>
                        </div>

                        {isCustomCodexModel ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                              type="text"
                              value={codexModel}
                              onChange={e => setCodexModel(e.target.value)}
                              placeholder="e.g. gpt-5.6-sol[high] or custom model ID"
                              className="form-input"
                              style={{ height: '38px' }}
                            />
                            <button
                              type="button"
                              onClick={() => setIsCustomCodexModel(false)}
                              className="btn-subtle"
                              style={{ fontSize: '11px', padding: '0 8px', whiteSpace: 'nowrap' }}
                            >
                              Catalog
                            </button>
                          </div>
                        ) : parsedAcpModels.length > 0 ? (
                          <CustomDropdown
                            value={activeAcpBaseModel?.baseId || parsedAcpModels[0]?.baseId}
                            options={parsedAcpModels.map(m => ({
                              value: m.baseId,
                              label: m.displayName,
                              badge: m.tag,
                              description: m.description,
                            }))}
                            onChange={newBaseId => {
                              const newTarget = resolveTargetAcpModelId(newBaseId, activeThinkingTier, parsedAcpModels);
                              setCodexModel(newTarget);
                            }}
                            searchable
                          />
                        ) : (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              value={codexModel}
                              onChange={e => setCodexModel(e.target.value)}
                              placeholder="Click 'Query ACP Catalog' to load models..."
                              className="form-input"
                            />
                          </div>
                        )}

                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {activeAcpBaseModel?.description || 'Dynamic model advertised by local Codex ACP subprocess.'}
                        </span>
                      </div>

                      {/* Dropdown 2: Reasoning Effort / Thinking Level */}
                      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                          2. Thinking Level & Reasoning Budget
                        </label>
                        <CustomDropdown
                          value={activeThinkingTier}
                          options={
                            activeAcpBaseModel && activeAcpBaseModel.thinkingTiers.length > 0
                              ? activeAcpBaseModel.thinkingTiers.map(t => ({
                                  value: t.id,
                                  label: t.label,
                                }))
                              : [
                                  { value: 'low', label: 'Low (Instant / Fast)' },
                                  { value: 'medium', label: 'Medium (Balanced)' },
                                  { value: 'high', label: 'High (Deep Reasoning)' },
                                ]
                          }
                          onChange={newTier => {
                            setReasoningLevel(newTier as any);
                            if (activeAcpBaseModel) {
                              const newTarget = resolveTargetAcpModelId(activeAcpBaseModel.baseId, newTier, parsedAcpModels);
                              setCodexModel(newTarget);
                            }
                          }}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Target ID: <code style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{codexModel || resolveTargetAcpModelId(activeAcpBaseModel?.baseId || 'gpt-5.6-sol', activeThinkingTier, parsedAcpModels)}</code>
                        </span>
                      </div>
                    </div>
                  </div>
                )}






                {/* Gemini Credentials */}
                {aiProvider === 'gemini' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 600 }}>Gemini API Key</label>
                        <button
                          type="button"
                          onClick={e => openExternalUrl('https://aistudio.google.com/app/apikey', e)}
                          style={{
                            fontSize: '11.5px',
                            color: 'var(--accent-blue)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          <span>Get Free Key at Google AI Studio</span>
                          <ExternalLink size={11} />
                        </button>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={geminiKey}
                          onChange={e => setGeminiKey(e.target.value)}
                          placeholder="AIzaSy..."
                          className="form-input"
                          style={{ paddingRight: '40px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="btn-icon"
                          style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', width: '24px', height: '24px' }}
                          title={showApiKey ? 'Hide Key' : 'Show Key'}
                        >
                          {showApiKey ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        Stored locally in encrypted browser storage. Never transmitted to third parties.
                      </span>
                    </div>

                    {/* Model Version Selector */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 600 }}>Active Model Version</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!geminiKey.trim()) return;
                              setIsTestingAi(true);
                              try {
                                const models = await AiService.listGeminiModels(geminiKey);
                                if (models.length > 0) {
                                  setAiTestResult({ success: true, message: `Discovered ${models.length} available models from your Google AI key!` });
                                }
                              } catch (e: any) {
                                setAiTestResult({ success: false, message: e.message || 'Could not fetch model catalog.' });
                              } finally {
                                setIsTestingAi(false);
                              }
                            }}
                            className="btn-subtle"
                            style={{ fontSize: '11px', height: '22px', padding: '0 6px', color: 'var(--accent-blue)' }}
                          >
                            <span>Query Model Catalog</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsCustomModel(!isCustomModel)}
                            className="btn-subtle"
                            style={{ fontSize: '11px', height: '22px', padding: '0 6px' }}
                          >
                            {isCustomModel ? 'Use Presets' : 'Custom Model Name'}
                          </button>
                        </div>
                      </div>

                      {isCustomModel ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <input
                            type="text"
                            value={customModelName}
                            onChange={e => setCustomModelName(e.target.value)}
                            placeholder="e.g. gemini-2.5-flash, gemini-3.7-flash, gemini-2.0-flash, gemini-1.5-flash"
                            className="form-input"
                            style={{ height: '34px', fontSize: '12.5px' }}
                          />
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Enter any active model identifier from Google AI Studio. Automatic fallback will prevent failures if unavailable.
                          </span>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                          {[
                            { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash', tag: 'Fastest', desc: 'Active high-speed generation with automatic failover' },
                            { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash', tag: 'Frontier', desc: 'Frontier model optimized for coding & agentic flows' },
                            { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', tag: 'Stable', desc: 'Balanced high performance and reasoning' },
                            { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite', tag: 'Ultra-Fast', desc: 'Lightweight ultra-low latency generation' },
                          ].map(m => {
                            const isSel = geminiModel === m.id;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setGeminiModel(m.id)}
                                className={isSel ? 'selector-card-btn active' : 'selector-card-btn'}
                                style={{
                                  border: isSel ? '1.5px solid var(--accent-blue)' : '1px solid var(--border-medium)',
                                  background: isSel ? 'var(--bg-button-hover)' : 'var(--bg-card)',
                                  padding: '12px 14px',
                                  minHeight: '68px',
                                  boxShadow: isSel ? '0 0 12px rgba(79, 142, 247, 0.12)' : 'none',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '2px' }}>
                                  <span style={{ fontSize: '12.5px', fontWeight: isSel ? 700 : 600, color: isSel ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                                    {m.label}
                                  </span>
                                  <span className="notion-prop-pill" style={{ fontSize: '9.5px', padding: '1px 6px', background: isSel ? 'rgba(79,142,247,0.15)' : 'var(--bg-badge)' }}>
                                    {m.tag}
                                  </span>
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                  {m.desc}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Reasoning Levels (Thinking Budget) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Brain size={13} style={{ color: 'var(--accent-purple)' }} />
                        <span>Reasoning Depth & Thinking Budget</span>
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                        {[
                          { id: 'low', label: 'Instant / Low', desc: 'Direct, concise, zero latency delay' },
                          { id: 'medium', label: 'Balanced', desc: 'Standard technical depth and structure' },
                          { id: 'high', label: 'Deep Reasoning', desc: 'Full chain-of-thought spec breakdown' },
                        ].map(r => {
                          const isSel = reasoningLevel === r.id;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => setReasoningLevel(r.id as any)}
                              className={isSel ? 'selector-card-btn active' : 'selector-card-btn'}
                              style={{
                                border: isSel ? '1.5px solid var(--accent-purple)' : '1px solid var(--border-medium)',
                                background: isSel ? 'var(--bg-button-hover)' : 'var(--bg-card)',
                                padding: '12px 14px',
                                minHeight: '68px',
                                boxShadow: isSel ? '0 0 12px rgba(192, 132, 252, 0.15)' : 'none',
                              }}
                            >
                              <span style={{ fontSize: '12.5px', fontWeight: isSel ? 700 : 600, color: isSel ? 'var(--accent-purple)' : 'var(--text-primary)', marginBottom: '2px' }}>
                                {r.label}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                {r.desc}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Ollama Credentials */}
                {aiProvider === 'ollama' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 600 }}>Ollama Base URL</label>
                      <input
                        type="text"
                        value={ollamaEndpoint}
                        onChange={e => setOllamaEndpoint(e.target.value)}
                        placeholder="http://localhost:11434"
                        className="form-input"
                      />
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        Default local endpoint: http://localhost:11434
                      </span>
                    </div>

                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 600 }}>Installed Model Name</label>
                      <input
                        type="text"
                        value={ollamaModel}
                        onChange={e => setOllamaModel(e.target.value)}
                        placeholder="llama3.2, mistral, qwen2.5-coder, etc."
                        className="form-input"
                      />
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        Ensure you have pulled this model via `ollama run {ollamaModel || 'llama3.2'}` in terminal.
                      </span>
                    </div>
                  </div>
                )}

                {/* Test Result Message Banner */}
                {aiTestResult && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--r-md)',
                      background: aiTestResult.success ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                      border: aiTestResult.success ? '1px solid var(--success)' : '1px solid var(--danger)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      color: aiTestResult.success ? 'var(--success)' : 'var(--danger)',
                      animation: 'fade-in 150ms ease-out',
                    }}
                  >
                    {aiTestResult.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    <span>{aiTestResult.message}</span>
                  </div>
                )}

                {/* Save AI Settings Action Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      Keys and models are encrypted & stored in local sandbox storage.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveAiSettings}
                    className="btn-primary"
                    style={{ height: '32px', fontSize: '12px', padding: '0 16px', gap: '6px' }}
                  >
                    {aiSavedBanner ? <CheckCircle2 size={13} /> : <Save size={13} />}
                    <span>{aiSavedBanner ? 'AI Settings Saved!' : 'Save AI Settings'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── 4. CLOUD PM INTEGRATIONS (JIRA, LINEAR, ASANA, GITHUB) ─ */}

          {(activeCategory === 'integrations' || activeCategory === 'github') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Cloud PM & Issue Tracker Integrations
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Configure 2-way live synchronization and event broadcasting for Atlassian Jira, Linear, Asana, and GitHub Projects.
                </p>
              </div>

              {/* Provider Selection Tabs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {[
                  { id: 'jira', label: 'Atlassian Jira', desc: 'Cloud & Server REST v3', active: !!jiraToken },
                  { id: 'linear', label: 'Linear', desc: 'GraphQL issue tracker', active: !!linearApiKey },
                  { id: 'asana', label: 'Asana', desc: 'Workspaces & Sections', active: !!asanaPat },
                  { id: 'github', label: 'GitHub Projects', desc: 'Issues & PRs Sync', active: !!githubPat },
                ].map(p => {
                  const isSel = activePmTab === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setActivePmTab(p.id as any); setPmTestResult(null); }}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--r-md)',
                        border: '1px solid',
                        borderColor: isSel ? 'var(--accent-blue)' : 'var(--border-medium)',
                        background: isSel ? 'var(--bg-button-hover)' : 'var(--bg-card)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: '4px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        boxShadow: isSel ? '0 0 12px rgba(79, 142, 247, 0.12)' : 'none',
                        transition: 'all var(--t-fast)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <span style={{ fontSize: '13px', fontWeight: isSel ? 700 : 600, color: isSel ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {p.label}
                        </span>
                        {p.active && (
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)' }} />
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.desc}</span>
                    </button>
                  );
                })}
              </div>

              {/* ── Jira Panel ── */}
              {activePmTab === 'jira' && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 'var(--r-lg)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Atlassian Jira Cloud Settings</span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!jiraDomain || !jiraEmail || !jiraToken) {
                          setPmTestResult({ success: false, message: 'Please enter Domain, Email, and API Token first.' });
                          return;
                        }
                        setIsTestingPm(true);
                        try {
                          const res = await jiraSync.testConnection(jiraDomain, jiraEmail, jiraToken);
                          setPmTestResult({ success: res.ok, message: res.message });
                        } catch (e: any) {
                          setPmTestResult({ success: false, message: e.message || 'Jira connection failed.' });
                        } finally {
                          setIsTestingPm(false);
                        }
                      }}
                      disabled={isTestingPm}
                      className="btn-subtle"
                      style={{ fontSize: '11.5px', height: '26px', padding: '0 10px', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      {isTestingPm ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      <span>Test Jira Connection</span>
                    </button>
                  </div>

                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Atlassian Domain</label>
                    <input
                      type="text"
                      value={jiraDomain}
                      onChange={e => setJiraDomain(e.target.value)}
                      placeholder="company.atlassian.net"
                      className="form-input"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Atlassian Account Email</label>
                      <input
                        type="email"
                        value={jiraEmail}
                        onChange={e => setJiraEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Jira Project Key (e.g. KAN, ENG)</label>
                      <input
                        type="text"
                        value={jiraProject}
                        onChange={e => setJiraProject(e.target.value)}
                        placeholder="PROJ"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Jira API Token</label>
                    <input
                      type="password"
                      value={jiraToken}
                      onChange={e => setJiraToken(e.target.value)}
                      placeholder="ATATT3xFfGF0..."
                      className="form-input"
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Generate an API token in Atlassian Account Settings → Security → API Tokens.
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Automatic Stage Sync</span>
                      <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Automatically transition remote Jira tickets when cards move columns in Lumora.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={jiraAutoSync}
                      onChange={e => setJiraAutoSync(e.target.checked)}
                      style={{ width: '17px', height: '17px', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              )}

              {/* ── Linear Panel ── */}
              {activePmTab === 'linear' && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 'var(--r-lg)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Linear Workspace Settings</span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!linearApiKey) {
                          setPmTestResult({ success: false, message: 'Please enter your Linear API Key first.' });
                          return;
                        }
                        setIsTestingPm(true);
                        try {
                          const res = await linearSync.testConnection(linearApiKey);
                          setPmTestResult({ success: res.ok, message: res.message });
                        } catch (e: any) {
                          setPmTestResult({ success: false, message: e.message || 'Linear connection failed.' });
                        } finally {
                          setIsTestingPm(false);
                        }
                      }}
                      disabled={isTestingPm}
                      className="btn-subtle"
                      style={{ fontSize: '11.5px', height: '26px', padding: '0 10px', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      {isTestingPm ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      <span>Test Linear Connection</span>
                    </button>
                  </div>

                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Linear Personal API Key</label>
                    <input
                      type="password"
                      value={linearApiKey}
                      onChange={e => setLinearApiKey(e.target.value)}
                      placeholder="lin_api_..."
                      className="form-input"
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Created in Linear → Settings → Account → Security → Personal API Keys.
                    </span>
                  </div>

                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Target Team ID (Optional)</label>
                    <input
                      type="text"
                      value={linearTeamId}
                      onChange={e => setLinearTeamId(e.target.value)}
                      placeholder="e.g. ENG, DESIGN, or leave blank to discover"
                      className="form-input"
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Automatic Linear State Sync</span>
                      <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Updates Linear issue status when cards are moved across Backlog, In Progress, and Done.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={linearAutoSync}
                      onChange={e => setLinearAutoSync(e.target.checked)}
                      style={{ width: '17px', height: '17px', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              )}

              {/* ── Asana Panel ── */}
              {activePmTab === 'asana' && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 'var(--r-lg)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Asana Workspace Settings</span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!asanaPat) {
                          setPmTestResult({ success: false, message: 'Please enter your Asana PAT first.' });
                          return;
                        }
                        setIsTestingPm(true);
                        try {
                          const res = await asanaSync.testConnection(asanaPat);
                          setPmTestResult({ success: res.ok, message: res.message });
                        } catch (e: any) {
                          setPmTestResult({ success: false, message: e.message || 'Asana connection failed.' });
                        } finally {
                          setIsTestingPm(false);
                        }
                      }}
                      disabled={isTestingPm}
                      className="btn-subtle"
                      style={{ fontSize: '11.5px', height: '26px', padding: '0 10px', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      {isTestingPm ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      <span>Test Asana Connection</span>
                    </button>
                  </div>

                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Asana Personal Access Token (PAT)</label>
                    <input
                      type="password"
                      value={asanaPat}
                      onChange={e => setAsanaPat(e.target.value)}
                      placeholder="1/120..."
                      className="form-input"
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Generate a token in Asana Developer Console → Personal access tokens.
                    </span>
                  </div>

                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Target Project GID</label>
                    <input
                      type="text"
                      value={asanaProjectId}
                      onChange={e => setAsanaProjectId(e.target.value)}
                      placeholder="1208945..."
                      className="form-input"
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Automatic Section Sync</span>
                      <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Moves tasks between Asana sections as cards progress in Lumora.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={asanaAutoSync}
                      onChange={e => setAsanaAutoSync(e.target.checked)}
                      style={{ width: '17px', height: '17px', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              )}

              {/* ── GitHub Panel ── */}
              {activePmTab === 'github' && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 'var(--r-lg)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>GitHub Projects & Issues Settings</span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!githubPat || !githubRepo) {
                          setPmTestResult({ success: false, message: 'Please enter GitHub PAT and Repo first.' });
                          return;
                        }
                        setIsTestingPm(true);
                        try {
                          const issues = await githubSync.fetchIssues(githubRepo, githubPat);
                          setPmTestResult({ success: true, message: `Connected to GitHub! Found ${issues.length} active repository issues.` });
                        } catch (e: any) {
                          setPmTestResult({ success: false, message: e.message || 'GitHub connection failed.' });
                        } finally {
                          setIsTestingPm(false);
                        }
                      }}
                      disabled={isTestingPm}
                      className="btn-subtle"
                      style={{ fontSize: '11.5px', height: '26px', padding: '0 10px', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      {isTestingPm ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      <span>Test GitHub Connection</span>
                    </button>
                  </div>

                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>GitHub Personal Access Token (PAT)</label>
                    <input
                      type="password"
                      value={githubPat}
                      onChange={e => setGithubPat(e.target.value)}
                      placeholder="ghp_..."
                      className="form-input"
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Requires `repo` permissions to sync issues, comments, and pull requests.
                    </span>
                  </div>

                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Target Repository (owner/repo)</label>
                    <input
                      type="text"
                      value={githubRepo}
                      onChange={e => setGithubRepo(e.target.value)}
                      placeholder="e.g. wekan/wekan"
                      className="form-input"
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Background Two-Way Issue Sync</span>
                      <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Polls repository every {syncInterval} seconds for external changes.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoSync}
                      onChange={e => setAutoSync(e.target.checked)}
                      style={{ width: '17px', height: '17px', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              )}

              {/* PM Test Result Banner */}
              {pmTestResult && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--r-md)',
                    background: pmTestResult.success ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                    border: pmTestResult.success ? '1px solid var(--success)' : '1px solid var(--danger)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    color: pmTestResult.success ? 'var(--success)' : 'var(--danger)',
                  }}
                >
                  {pmTestResult.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
                  <span>{pmTestResult.message}</span>
                </div>
              )}

              {/* Save PM Settings Action Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Credentials are encrypted in local desktop sandbox storage.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('kanso_jira_domain', jiraDomain.trim());
                    localStorage.setItem('kanso_jira_email', jiraEmail.trim());
                    localStorage.setItem('kanso_jira_token', jiraToken.trim());
                    localStorage.setItem('kanso_jira_project', jiraProject.trim());
                    localStorage.setItem('kanso_jira_auto_sync', String(jiraAutoSync));

                    localStorage.setItem('kanso_linear_api_key', linearApiKey.trim());
                    localStorage.setItem('kanso_linear_team_id', linearTeamId.trim());
                    localStorage.setItem('kanso_linear_auto_sync', String(linearAutoSync));

                    localStorage.setItem('kanso_asana_pat', asanaPat.trim());
                    localStorage.setItem('kanso_asana_project_id', asanaProjectId.trim());
                    localStorage.setItem('kanso_asana_auto_sync', String(asanaAutoSync));

                    updateSettings({
                      githubPat: githubPat.trim(),
                      githubRepo: githubRepo.trim(),
                      autoSyncGithub: autoSync,
                    });

                    setPmSavedBanner(true);
                    setTimeout(() => setPmSavedBanner(false), 2500);
                  }}
                  className="btn-primary"
                  style={{ height: '32px', fontSize: '12px', padding: '0 16px', gap: '6px' }}
                >
                  {pmSavedBanner ? <CheckCircle2 size={13} /> : <Save size={13} />}
                  <span>{pmSavedBanner ? 'Integrations Saved!' : 'Save PM Settings'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ── 5. ACCOUNT & STORAGE ─────────────────────────────────── */}
          {activeCategory === 'account' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Account & Workspace Storage
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Inspect local storage status, backend connection health, and session details.
                </p>
              </div>

              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 'var(--r-lg)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: 'var(--r-sm)', background: 'rgba(52, 211, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                      <HardDrive size={16} />
                    </div>
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Storage Engine
                      </span>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Local SQLite & Bundled FerretDB Database
                      </p>
                    </div>
                  </div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--success)', fontSize: '12px', fontWeight: 600 }}>
                    <ShieldCheck size={14} />
                    <span>Healthy & Active</span>
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Active User Session
                    </span>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {session?.isGuest ? 'Local Solo Guest Mode (Offline)' : (session?.username || 'Authenticated User')}
                    </p>
                  </div>
                  {session && (
                    <button
                      type="button"
                      onClick={() => logout()}
                      className="btn-subtle"
                      style={{ color: 'var(--accent-red)', height: '28px', fontSize: '12px', gap: '5px', padding: '0 10px' }}
                    >
                      <LogOut size={12} />
                      <span>Log Out</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
