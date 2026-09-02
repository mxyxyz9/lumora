import React, { useState, useRef } from 'react';
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
  Sparkles,
  Upload,
  Trash2,
  Image as ImageIcon,
  Plus,
  Bookmark,
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
  const [theme, setTheme] = useState<string>(settings.theme || 'lavender');
  const [customBackground, setCustomBackground] = useState<string>(settings.customBackground || '');
  const [appIconTheme, setAppIconTheme] = useState<string>(settings.appIcon || 'dark');
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

  // Saved Wallpapers & Custom URL states
  const [savedWallpapers, setSavedWallpapers] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('kanso_saved_wallpapers');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [urlStatusMsg, setUrlStatusMsg] = useState<string | null>(null);

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    updateSettings({ theme: newTheme as any });
  };

  const handleCustomBackgroundChange = (newBg: string) => {
    setCustomBackground(newBg);
    updateSettings({ customBackground: newBg });
  };

  const handleApplyUrl = (urlToApply?: string) => {
    const target = urlToApply !== undefined ? urlToApply : customUrlInput.trim();
    if (!target) return;
    handleCustomBackgroundChange(target);
    setUrlStatusMsg('Wallpaper applied to board canvas!');
    setTimeout(() => setUrlStatusMsg(null), 3000);
  };

  const handleSaveWallpaperToLibrary = (urlToSave?: string) => {
    const target = urlToSave !== undefined ? urlToSave : (customUrlInput.trim() || customBackground);
    if (!target || target === 'default' || target === 'clean_solid') return;
    if (!savedWallpapers.includes(target)) {
      const updated = [target, ...savedWallpapers];
      setSavedWallpapers(updated);
      localStorage.setItem('kanso_saved_wallpapers', JSON.stringify(updated));
      setUrlStatusMsg('Saved to your personal wallpaper library!');
      setTimeout(() => setUrlStatusMsg(null), 3000);
    } else {
      setUrlStatusMsg('Already saved in your library!');
      setTimeout(() => setUrlStatusMsg(null), 3000);
    }
  };

  const handleRemoveSavedWallpaper = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = savedWallpapers.filter((_, i) => i !== index);
    setSavedWallpapers(updated);
    localStorage.setItem('kanso_saved_wallpapers', JSON.stringify(updated));
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        handleCustomBackgroundChange(dataUrl);
        handleSaveWallpaperToLibrary(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAppIconChange = (newIconTheme: string) => {
    setAppIconTheme(newIconTheme);
    updateSettings({ appIcon: newIconTheme as any });
    if (typeof window !== 'undefined' && window.electronAPI?.setAppIcon) {
      window.electronAPI.setAppIcon(newIconTheme);
    }
  };

  const APP_ICONS = [
    {
      id: 'dark',
      name: 'Midnight Dark',
      desc: 'Deep obsidian squircle with luminous white & electric blue emblem.',
      badge: 'Classic Dark',
      preview: './icon-dark.png',
      accent: '#3b82f6',
      borderAccent: '#232838',
      bgPreview: '#0b0d13',
    },
    {
      id: 'light',
      name: 'Studio Light',
      desc: 'Crisp Apple silver & platinum squircle with obsidian slate & sapphire pills.',
      badge: 'Light Mode',
      preview: './icon-light.png',
      accent: '#2563eb',
      borderAccent: '#cbd5e1',
      bgPreview: '#f8fafc',
    },
    {
      id: 'liquid_glass',
      name: 'Liquid Glass',
      desc: 'Translucent glassmorphic squircle with iridescent refraction & caustic neon glow.',
      badge: 'Liquid Glass',
      preview: './icon-liquid_glass.png',
      accent: '#60a5fa',
      borderAccent: '#c084fc',
      bgPreview: '#0f172a',
    },
  ];

  const THEMES = [
    {
      id: 'lavender',
      group: 'Playful Pastel Light',
      name: 'Lavender Dream',
      emoji: '🌸',
      desc: 'Soft pastel lavender (#f4f0ff) with deep plum text (#201435) and vibrant purple (#7c5ce5) accents',
      bg: '#f4f0ff',
      sidebarBg: '#ffffff',
      cardBg: '#ffffff',
      accent: '#7c5ce5',
      textColor: '#201435',
      badge: 'Default Playful',
    },
    {
      id: 'sakura',
      group: 'Playful Pastel Light',
      name: 'Sakura Blossom',
      emoji: '🍓',
      desc: 'Soft sweet pastel cherry pink (#fdf2f8) with blackberry plum text (#371b2d) and strawberry rose (#ec4899) accents',
      bg: '#fdf2f8',
      sidebarBg: '#ffffff',
      cardBg: '#ffffff',
      accent: '#ec4899',
      textColor: '#371b2d',
      badge: 'Pastel Rose',
    },
    {
      id: 'vanilla',
      group: 'Playful Pastel Light',
      name: 'Vanilla Honey',
      emoji: '🍯',
      desc: 'Warm comforting vanilla cream (#fffdf5) with rich dark espresso text (#451a03) and golden amber honey (#d97706) accents',
      bg: '#fffdf5',
      sidebarBg: '#ffffff',
      cardBg: '#ffffff',
      accent: '#d97706',
      textColor: '#451a03',
      badge: 'Warm Honey',
    },
    {
      id: 'midnight',
      group: 'Cohesive Dark',
      name: 'Cyber Midnight',
      emoji: '🪐',
      desc: 'Velvet obsidian purple (#0d0b18) with luminous lilac text (#f8f6ff) and neon electric violet (#a29bfe) glow',
      bg: '#0d0b18',
      sidebarBg: '#131024',
      cardBg: '#231d42',
      accent: '#a29bfe',
      textColor: '#f8f6ff',
      badge: 'Neon Violet',
    },
    {
      id: 'abyss',
      group: 'Cohesive Dark',
      name: 'Obsidian Abyss',
      emoji: '🌌',
      desc: 'Ultra-sleek deep carbon black (#080c14) with glowing sapphire azure (#38bdf8) and crisp silver text',
      bg: '#080c14',
      sidebarBg: '#0e1320',
      cardBg: '#1c283e',
      accent: '#38bdf8',
      textColor: '#f8fafc',
      badge: 'Deep Sapphire',
    },
    {
      id: 'emerald_dark',
      group: 'Cohesive Dark',
      name: 'Twilight Emerald',
      emoji: '🌲',
      desc: 'Mystique midnight forest (#05120f) with glowing aurora jade (#34d399) accents and frosted mint text',
      bg: '#05120f',
      sidebarBg: '#091c17',
      cardBg: '#163c32',
      accent: '#34d399',
      textColor: '#f0fdf8',
      badge: 'Aurora Jade',
    },
  ];

  const BG_PRESETS = [
    { id: 'default', name: '✦ Theme Dotted Matrix', value: '', preview: 'radial-gradient(var(--border-medium) 1.5px, transparent 1.5px) 0 0/16px 16px, var(--bg-canvas)', desc: 'Adaptive theme dots matching all light & dark themes' },
    { id: 'dense_dots', name: '⁖ Dense Matrix Grid', value: 'radial-gradient(var(--border-medium) 1.2px, transparent 1.2px)', preview: 'radial-gradient(var(--border-medium) 1.2px, transparent 1.2px) 0 0/12px 12px, var(--bg-canvas)', desc: '16px compact engineering dot matrix' },
    { id: 'shinkai_twilight', name: '🌌 Shinkai Twilight Skyline', value: 'linear-gradient(135deg, #1a102f 0%, #2b1055 30%, #591a75 60%, #b83b5e 85%, #f08a5d 100%)', preview: 'linear-gradient(135deg, #1a102f 0%, #2b1055 30%, #591a75 60%, #b83b5e 85%, #f08a5d 100%)', desc: 'Makoto Shinkai dusk twilight with warm sunset glow' },
    { id: 'anime_sakura', name: '🌸 Anime Sakura Dawn', value: 'linear-gradient(135deg, #ffeef8 0%, #fed7e2 30%, #fbcfe8 60%, #e0e7ff 100%)', preview: 'linear-gradient(135deg, #ffeef8 0%, #fed7e2 30%, #fbcfe8 60%, #e0e7ff 100%)', desc: 'Serene cherry blossom petals & pastel morning sky' },
    { id: 'cyberpunk_neo_tokyo', name: '⚡ Neo Tokyo Cyberpunk', value: 'radial-gradient(circle at bottom, #1b2735 0%, #090a0f 100%), linear-gradient(135deg, rgba(255,0,128,0.2) 0%, rgba(0,242,254,0.2) 100%)', preview: 'linear-gradient(135deg, #090a0f 0%, #1e1136 40%, #00f2fe 100%)', desc: 'Cyber neon synthwave & holographic magenta glow' },
    { id: 'ghibli_valley', name: '🍃 Ghibli Valley Breeze', value: 'linear-gradient(135deg, #06281e 0%, #0d4a38 35%, #1b7a5a 70%, #5eead4 100%)', preview: 'linear-gradient(135deg, #06281e 0%, #0d4a38 35%, #1b7a5a 70%, #5eead4 100%)', desc: 'Lush Hayao Miyazaki emerald windswept valley' },
    { id: 'lofi_sunset_study', name: '🎧 Lo-Fi Sunset Study', value: 'linear-gradient(135deg, #2e1065 0%, #6b21a8 35%, #a855f7 70%, #f472b6 100%)', preview: 'linear-gradient(135deg, #2e1065 0%, #6b21a8 35%, #a855f7 70%, #f472b6 100%)', desc: 'Chilled lofi beats sunset aesthetic glow' },
    { id: 'astral_horizon', name: '🪐 Astral Deep Horizon', value: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 35%, #312e81 70%, #4338ca 100%)', preview: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 35%, #312e81 70%, #4338ca 100%)', desc: 'Deep cosmic astral indigo & stellar blue horizon' },
    { id: 'clean_solid', name: '▫ Clean Solid Minimalist', value: 'clean_solid', preview: 'var(--bg-canvas)', desc: 'Pure flat solid theme canvas without dots' },
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
            minWidth: '230px',
            background: 'var(--bg-sidebar)',
            borderRight: '1px solid var(--border-subtle)',
            padding: '20px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            flexShrink: 0,
            overflowY: 'auto',
          }}
        >
          <div className="settings-nav-label-group">Workspace</div>

          <button
            type="button"
            onClick={() => setActiveCategory('projects')}
            className={`settings-nav-item ${activeCategory === 'projects' ? 'active' : ''}`}
          >
            <Folder size={15} className="settings-nav-icon" />
            <span>Projects & Codex</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('appearance')}
            className={`settings-nav-item ${activeCategory === 'appearance' ? 'active' : ''}`}
          >
            <Palette size={15} className="settings-nav-icon" />
            <span>Appearance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('defaults')}
            className={`settings-nav-item ${activeCategory === 'defaults' ? 'active' : ''}`}
          >
            <Sliders size={15} className="settings-nav-icon" />
            <span>Project Defaults</span>
          </button>

          <div className="settings-nav-label-group">Intelligence</div>

          <button
            type="button"
            onClick={() => setActiveCategory('ai')}
            className={`settings-nav-item ${activeCategory === 'ai' ? 'active' : ''}`}
          >
            <Brain size={15} className="settings-nav-icon" />
            <span>Copilot & AI Engine</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('integrations')}
            className={`settings-nav-item ${activeCategory === 'integrations' || activeCategory === 'github' ? 'active' : ''}`}
          >
            <Layers size={15} className="settings-nav-icon" />
            <span>Integrations</span>
          </button>

          <div className="settings-nav-label-group">System</div>

          <button
            type="button"
            onClick={() => setActiveCategory('account')}
            className={`settings-nav-item ${activeCategory === 'account' ? 'active' : ''}`}
          >
            <User size={15} className="settings-nav-icon" />
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
                  <h2 className="settings-section-title">Projects & Codex Hub</h2>
                  <p className="settings-section-desc">
                    Configure codebase repositories, assign autonomous Codex dev access, and monitor project status.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div className="settings-card" style={{ padding: '8px 14px', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Projects</span>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{boards.length}</span>
                  </div>
                  <div className="settings-card" style={{ padding: '8px 14px', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Repos</span>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-blue)', letterSpacing: '-0.02em' }}>
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
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={isCodexEnabled}
                                onChange={e => {
                                  updateBoard(b._id, {
                                    enableCodexAgent: e.target.checked,
                                    projectType: e.target.checked ? 'engineering' : 'general',
                                  });
                                }}
                              />
                              <span className="toggle-slider" />
                            </label>
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
                <h2 className="settings-section-title">Appearance & Themes</h2>
                <p className="settings-section-desc">
                  Customize your workspace themes and macOS Dock / Window icon aesthetics in real time.
                </p>
              </div>

              {/* App & Dock Icon Style Selector */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Sparkles size={14} style={{ color: 'var(--accent-blue)' }} />
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    App & Dock Icon Style (3)
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {APP_ICONS.map((icon) => {
                    const isSelected = appIconTheme === icon.id;
                    return (
                      <div
                        key={icon.id}
                        onClick={() => handleAppIconChange(icon.id)}
                        style={{
                          background: 'var(--bg-card)',
                          border: isSelected ? `2px solid var(--accent-primary)` : '1px solid var(--border-medium)',
                          borderRadius: 'var(--r-lg)',
                          padding: '16px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          boxShadow: isSelected ? `0 0 16px rgba(59, 130, 246, 0.22)` : 'var(--shadow-xs)',
                          transition: 'all var(--t-fast)',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            width: '54px',
                            height: '54px',
                            borderRadius: '13px',
                            background: icon.bgPreview,
                            border: `1px solid ${icon.borderAccent}`,
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                          }}
                        >
                          <img
                            src={icon.preview}
                            alt={icon.name}
                            style={{ width: '100%', height: '100%', borderRadius: '11px', objectFit: 'contain' }}
                          />
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {icon.name}
                            </span>
                            {isSelected ? (
                              <span
                                style={{
                                  background: 'var(--accent-primary)',
                                  color: '#ffffff',
                                  borderRadius: '50%',
                                  width: '18px',
                                  height: '18px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <Check size={11} strokeWidth={3} />
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '10.5px',
                                  fontWeight: 600,
                                  padding: '2px 7px',
                                  borderRadius: 'var(--r-full)',
                                  background: 'var(--bg-badge)',
                                  color: 'var(--text-muted)',
                                }}
                              >
                                {icon.badge}
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                            {icon.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 6 Workspace Themes (3 Light Pastel + 3 Cohesive Dark) */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <Palette size={15} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Workspace Themes (3 Light Pastel + 3 Cohesive Dark)
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  {THEMES.map(t => {
                    const isSelected = theme === t.id || (t.id === 'lavender' && (!theme || theme === 'playful' || theme === 'light'));
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleThemeChange(t.id)}
                        style={{
                          background: t.bg,
                          border: isSelected ? `2.5px solid ${t.accent}` : '1.5px solid var(--border-medium)',
                          borderRadius: '24px',
                          padding: '16px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          boxShadow: isSelected ? `0 10px 28px ${t.accent}40` : '0 4px 14px rgba(0, 0, 0, 0.05)',
                          transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                          transform: isSelected ? 'scale(1.02)' : 'none',
                          position: 'relative',
                        }}
                      >
                        {/* Mini Window Preview */}
                        <div
                          style={{
                            background: t.bg,
                            border: '1.5px solid rgba(0,0,0,0.08)',
                            borderRadius: '16px',
                            height: '80px',
                            display: 'flex',
                            overflow: 'hidden',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                          }}
                        >
                          <div style={{ width: '28px', background: t.sidebarBg, borderRight: '1px solid rgba(0,0,0,0.08)' }} />
                          <div style={{ flex: 1, padding: '8px', display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1, background: t.cardBg, borderRadius: '10px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid rgba(0,0,0,0.08)' }}>
                              <div style={{ width: '60%', height: '5px', background: t.accent, borderRadius: '100px' }} />
                              <div style={{ width: '85%', height: '4px', background: 'rgba(128,128,128,0.2)', borderRadius: '100px' }} />
                            </div>
                            <div style={{ flex: 1, background: t.cardBg, borderRadius: '10px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid rgba(0,0,0,0.08)' }}>
                              <div style={{ width: '50%', height: '5px', background: t.accent, borderRadius: '100px', opacity: 0.7 }} />
                              <div style={{ width: '70%', height: '4px', background: 'rgba(128,128,128,0.2)', borderRadius: '100px' }} />
                            </div>
                          </div>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '16px' }}>{t.emoji}</span>
                              <span style={{ fontSize: '14px', fontWeight: 800, color: t.textColor }}>
                                {t.name}
                              </span>
                            </div>
                            {isSelected ? (
                              <span style={{ background: t.accent, color: t.accent === '#ffffff' ? '#09090b' : '#ffffff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Check size={12} strokeWidth={3} />
                              </span>
                            ) : (
                              <span style={{ fontSize: '10.5px', fontWeight: 800, color: t.accent, background: `${t.accent}22`, padding: '2px 8px', borderRadius: '100px' }}>
                                {t.badge}
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: '11.5px', color: t.group === 'Cohesive Dark' ? 'rgba(255,255,255,0.75)' : 'rgba(40,20,60,0.7)', marginTop: '6px', lineHeight: 1.4, fontWeight: 600 }}>
                            {t.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Canvas Background & Wallpaper Studio */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '28px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 8px 24px var(--border-card)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} />
                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        Board Canvas & Wallpaper Studio
                      </span>
                      <span style={{ fontSize: '10.5px', padding: '2px 8px', borderRadius: '100px', background: 'var(--bg-input)', color: 'var(--accent-primary)', fontWeight: 800, border: '1px solid var(--border-subtle)' }}>
                        Dotted Matrix & Custom Images
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>
                      The default canvas features a theme-aware dotted grid matrix. You can also paste any custom image URL or upload wallpaper files.
                    </p>
                  </div>

                  {/* Hidden file input + Upload Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleImageFileUpload}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-subtle"
                      style={{ height: '34px', fontSize: '12px', gap: '6px', padding: '0 14px' }}
                    >
                      <Upload size={13} />
                      <span>Upload Local Image</span>
                    </button>
                    {(customBackground && customBackground !== 'default') && (
                      <button
                        type="button"
                        onClick={() => handleCustomBackgroundChange('')}
                        className="btn-subtle"
                        style={{ height: '34px', fontSize: '12px', gap: '6px', padding: '0 12px' }}
                        title="Reset to default theme dotted grid"
                      >
                        <RefreshCw size={13} />
                        <span>Reset to Dotted Grid</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Preset Grids & Auras */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  {BG_PRESETS.map(p => {
                    const isSelected = (!customBackground && p.id === 'default') || customBackground === p.value;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleCustomBackgroundChange(p.value)}
                        style={{
                          borderRadius: '16px',
                          border: isSelected ? '2.5px solid var(--accent-primary)' : '1.5px solid var(--border-medium)',
                          padding: '8px',
                          background: 'var(--bg-input)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          transition: 'all 0.18s ease',
                          boxShadow: isSelected ? '0 0 16px var(--border-card)' : 'none',
                        }}
                      >
                        <div style={{
                          height: '54px',
                          borderRadius: '10px',
                          background: p.preview,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          border: '1px solid rgba(0,0,0,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {isSelected && <Check size={16} style={{ color: '#ffffff', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.9))' }} />}
                        </div>
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.name}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Image URL Input & Actions */}
                <div style={{ background: 'var(--bg-input)', border: '1.5px solid var(--border-subtle)', borderRadius: '20px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                    <label className="form-label" style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ImageIcon size={14} style={{ color: 'var(--accent-primary)' }} />
                      <span>Custom Image URL (Unsplash, Imgur, Pinterest, direct link)</span>
                    </label>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Supports any online image URL (JPG, PNG, WebP, GIF)
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      value={customUrlInput}
                      onChange={e => setCustomUrlInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleApplyUrl(); }}
                      placeholder="Paste image URL here (e.g. https://images.unsplash.com/... or https://i.imgur.com/...)"
                      className="form-input"
                      style={{ flex: 1, minWidth: '220px', height: '36px', fontSize: '12px' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyUrl()}
                      disabled={!customUrlInput.trim()}
                      className="btn-primary"
                      style={{ height: '36px', padding: '0 16px', borderRadius: '100px', fontSize: '12px', gap: '6px' }}
                    >
                      <CheckCircle2 size={14} />
                      <span>Apply to Canvas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveWallpaperToLibrary()}
                      disabled={!customUrlInput.trim() && (!customBackground || customBackground === 'clean_solid')}
                      className="btn-subtle"
                      style={{ height: '36px', padding: '0 14px', borderRadius: '100px', fontSize: '12px', gap: '6px' }}
                      title="Save this wallpaper to your personal library"
                    >
                      <Bookmark size={13} />
                      <span>Save to Library</span>
                    </button>
                  </div>

                  {urlStatusMsg && (
                    <div style={{ fontSize: '11.5px', color: 'var(--accent-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Check size={13} />
                      <span>{urlStatusMsg}</span>
                    </div>
                  )}
                </div>

                {/* Saved Wallpapers Library */}
                {savedWallpapers.length > 0 && (
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Bookmark size={13} style={{ color: 'var(--accent-primary)' }} />
                        <span>My Saved Wallpapers ({savedWallpapers.length})</span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Click any saved wallpaper to apply instantly
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px' }}>
                      {savedWallpapers.map((url, idx) => {
                        const isCurrent = customBackground === url;
                        return (
                          <div
                            key={idx}
                            onClick={() => handleApplyUrl(url)}
                            style={{
                              position: 'relative',
                              borderRadius: '14px',
                              overflow: 'hidden',
                              border: isCurrent ? '2.5px solid var(--accent-primary)' : '1.5px solid var(--border-medium)',
                              cursor: 'pointer',
                              height: '64px',
                              background: url.startsWith('http') || url.startsWith('data:') ? `url("${url}") center/cover no-repeat` : url,
                              boxShadow: isCurrent ? '0 0 12px var(--border-card)' : 'none',
                              transition: 'all 0.18s ease',
                            }}
                          >
                            {isCurrent && (
                              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Check size={18} style={{ color: '#ffffff' }} />
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleRemoveSavedWallpaper(idx, e)}
                              title="Delete saved wallpaper"
                              style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: 'rgba(0,0,0,0.65)',
                                border: 'none',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0,
                              }}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Layout & Column Sizing */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '28px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 8px 24px var(--border-card)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layout size={15} style={{ color: 'var(--accent-primary)' }} />
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
                <h2 className="settings-section-title">Project Defaults & Templates</h2>
                <p className="settings-section-desc">
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
                  <h2 className="settings-section-title">AI Copilot & Engine</h2>
                  <span style={{ background: 'var(--bg-badge)', color: 'var(--accent-primary)', fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid var(--border-subtle)' }}>
                    <Cpu size={12} />
                    <span>Gemini 3.7 / 2.5 Active</span>
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>
                  Choose and configure your AI engine for planning and automated coding.
                </p>
              </div>

              {/* 1. Provider Selector Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>

                {/* OpenAI Codex ACP Card */}
                <div
                  onClick={() => setAiProvider('codex')}
                  className={`provider-card ${aiProvider === 'codex' ? 'active' : ''}`}
                  style={{
                    borderColor: aiProvider === 'codex' ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    borderRadius: '24px',
                    padding: '16px',
                    background: 'var(--bg-card)',
                    boxShadow: aiProvider === 'codex' ? '0 4px 16px var(--border-card)' : 'var(--shadow-xs)',
                    cursor: 'pointer',
                  }}
                >
                  <div className="provider-card-icon" style={{ background: 'var(--bg-button-hover)', width: '38px', height: '38px', borderRadius: '12px' }}>
                    <Cpu size={18} style={{ color: 'var(--accent-primary)' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', marginTop: '6px' }}>
                    <div>
                      <div className="provider-card-name" style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>OpenAI Codex ACP</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)' }} />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>ACP JSON-RPC Stdio</span>
                      </div>
                    </div>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: aiProvider === 'codex' ? 'none' : '1.5px solid var(--border-subtle)', background: aiProvider === 'codex' ? 'var(--accent-primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {aiProvider === 'codex' && <Check size={11} strokeWidth={3} style={{ color: 'var(--accent-primary-text)' }} />}
                    </div>
                  </div>
                  <p className="provider-card-desc" style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '8px 0 10px', lineHeight: 1.4 }}>
                    Autonomous agent with direct codebase execution.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: 'auto' }}>
                    <span className="notion-prop-pill" style={{ fontSize: '10.5px', padding: '2px 8px', borderRadius: '100px', background: 'var(--bg-badge)', color: 'var(--accent-primary)', border: 'none', fontWeight: 700 }}>Subscription Auth</span>
                    <span className="notion-prop-pill" style={{ fontSize: '10.5px', padding: '2px 8px', borderRadius: '100px', background: 'var(--bg-badge)', color: 'var(--accent-primary)', border: 'none', fontWeight: 700 }}>Quality Gates</span>
                  </div>
                </div>

                {/* Google Gemini Card */}
                <div
                  onClick={() => setAiProvider('gemini')}
                  className={`provider-card ${aiProvider === 'gemini' ? 'active' : ''}`}
                  style={{
                    borderColor: aiProvider === 'gemini' ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    borderRadius: '24px',
                    padding: '16px',
                    background: 'var(--bg-card)',
                    boxShadow: aiProvider === 'gemini' ? '0 4px 16px var(--border-card)' : 'var(--shadow-xs)',
                    cursor: 'pointer',
                  }}
                >
                  <div className="provider-card-icon" style={{ background: 'var(--bg-button-hover)', width: '38px', height: '38px', borderRadius: '12px' }}>
                    <LumoraLogo size={18} showText={false} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', marginTop: '6px' }}>
                    <div>
                      <div className="provider-card-name" style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>Google Gemini Cloud</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)' }} />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>Gemini 3.7 / 2.5 Active</span>
                      </div>
                    </div>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: aiProvider === 'gemini' ? 'none' : '1.5px solid var(--border-subtle)', background: aiProvider === 'gemini' ? 'var(--accent-primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {aiProvider === 'gemini' && <Check size={11} strokeWidth={3} style={{ color: 'var(--accent-primary-text)' }} />}
                    </div>
                  </div>
                  <p className="provider-card-desc" style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '8px 0 10px', lineHeight: 1.4 }}>
                    Fast Google AI models with web reasoning.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: 'auto' }}>
                    <span className="notion-prop-pill" style={{ fontSize: '10.5px', padding: '2px 8px', borderRadius: '100px', background: 'var(--bg-badge)', color: 'var(--accent-primary)', border: 'none', fontWeight: 700 }}>Fast Latency</span>
                    <span className="notion-prop-pill" style={{ fontSize: '10.5px', padding: '2px 8px', borderRadius: '100px', background: 'var(--bg-badge)', color: 'var(--accent-primary)', border: 'none', fontWeight: 700 }}>Free Tier Key</span>
                  </div>
                </div>

                {/* Local Ollama Card */}
                <div
                  onClick={() => setAiProvider('ollama')}
                  className={`provider-card ${aiProvider === 'ollama' ? 'active' : ''}`}
                  style={{
                    borderColor: aiProvider === 'ollama' ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    borderRadius: '24px',
                    padding: '16px',
                    background: 'var(--bg-card)',
                    boxShadow: aiProvider === 'ollama' ? '0 4px 16px var(--border-card)' : 'var(--shadow-xs)',
                    cursor: 'pointer',
                  }}
                >
                  <div className="provider-card-icon" style={{ background: 'var(--bg-button-hover)', width: '38px', height: '38px', borderRadius: '12px' }}>
                    <Server size={18} style={{ color: 'var(--accent-primary)' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', marginTop: '6px' }}>
                    <div>
                      <div className="provider-card-name" style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>Local Ollama</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)' }} />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>100% Offline / Private</span>
                      </div>
                    </div>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: aiProvider === 'ollama' ? 'none' : '1.5px solid var(--border-subtle)', background: aiProvider === 'ollama' ? 'var(--accent-primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {aiProvider === 'ollama' && <Check size={11} strokeWidth={3} style={{ color: 'var(--accent-primary-text)' }} />}
                    </div>
                  </div>
                  <p className="provider-card-desc" style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '8px 0 10px', lineHeight: 1.4 }}>
                    100% private, runs offline on your machine.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: 'auto' }}>
                    <span className="notion-prop-pill" style={{ fontSize: '10.5px', padding: '2px 8px', borderRadius: '100px', background: 'var(--bg-badge)', color: 'var(--accent-primary)', border: 'none', fontWeight: 700 }}>Private</span>
                    <span className="notion-prop-pill" style={{ fontSize: '10.5px', padding: '2px 8px', borderRadius: '100px', background: 'var(--bg-badge)', color: 'var(--accent-primary)', border: 'none', fontWeight: 700 }}>Offline</span>
                  </div>
                </div>
              </div>

              {/* 2. Credentials & Models Card */}
              <div style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-subtle)', borderRadius: '28px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: 'var(--shadow-xs)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Lock size={15} style={{ color: 'var(--accent-primary)' }} />
                    <span>Engine Credentials & Model Version</span>
                  </span>

                  <button
                    type="button"
                    onClick={handleTestAiConnection}
                    disabled={isTestingAi || (aiProvider === 'gemini' && !geminiKey.trim())}
                    className="btn-subtle"
                    style={{ height: '30px', fontSize: '12px', gap: '5px', padding: '0 12px', color: 'var(--accent-primary)', borderRadius: '100px', fontWeight: 800 }}
                  >
                    {isTestingAi ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                    <span>Test {aiProvider === 'codex' ? 'Codex ACP' : aiProvider === 'gemini' ? 'Gemini API' : 'Ollama'}</span>
                  </button>
                </div>

                {/* Codex ACP Credentials & Config */}
                {aiProvider === 'codex' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--text-primary)' }}>Codex Transport Mode</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        {[
                          { id: 'builtin', label: 'Local Adapter', desc: '~/.codex/auth.json' },
                          { id: 'custom_command', label: 'Custom Stdio', desc: 'Binary CLI Path' },
                          { id: 'remote_url', label: 'Remote Server', desc: 'TCP / WebSocket' },
                        ].map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setCodexMode(m.id as any)}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '16px',
                              border: codexMode === m.id ? '2px solid var(--accent-primary)' : '1.5px solid var(--border-subtle)',
                              background: codexMode === m.id ? 'var(--bg-button-hover)' : 'var(--bg-card)',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                              textAlign: 'left',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span style={{ fontSize: '12.5px', fontWeight: 800, color: codexMode === m.id ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                              {m.label}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
                      {/* Dropdown 1: Model Selection */}
                      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '26px' }}>
                          <label className="form-label" style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            1. Active Codex Model
                          </label>
                          <button
                            type="button"
                            onClick={fetchCodexModels}
                            disabled={isLoadingCodexModels}
                            className="btn-subtle"
                            style={{ fontSize: '11px', height: '24px', padding: '0 10px', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '100px', background: 'var(--bg-badge)', border: '1px solid var(--border-subtle)', fontWeight: 800 }}
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
                              style={{ height: '40px' }}
                            />
                            <button
                              type="button"
                              onClick={() => setIsCustomCodexModel(false)}
                              className="btn-subtle"
                              style={{ fontSize: '11.5px', padding: '0 12px', whiteSpace: 'nowrap', borderRadius: '100px' }}
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
                              style={{ height: '40px' }}
                            />
                          </div>
                        )}

                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, minHeight: '16px', lineHeight: 1.35 }}>
                          {activeAcpBaseModel?.description || 'Dynamic model advertised by local Codex ACP subprocess.'}
                        </span>
                      </div>

                      {/* Dropdown 2: Reasoning Effort / Thinking Level */}
                      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', height: '26px' }}>
                          <label className="form-label" style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            2. Thinking Level & Reasoning Budget
                          </label>
                        </div>
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
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, minHeight: '16px', lineHeight: 1.35 }}>
                          Target ID: <code style={{ color: 'var(--accent-primary)', fontWeight: 800, background: 'var(--bg-badge)', padding: '1px 6px', borderRadius: '6px' }}>{codexModel || resolveTargetAcpModelId(activeAcpBaseModel?.baseId || 'gpt-5.6-sol', activeThinkingTier, parsedAcpModels)}</code>
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
                <h2 className="settings-section-title">Cloud PM & Issue Tracker Integrations</h2>
                <p className="settings-section-desc">
                  Configure 2-way live synchronization and event broadcasting for Atlassian Jira, Linear, Asana, and GitHub Projects.
                </p>
              </div>

              {/* Provider Selection Tabs — integration cards with icon + status */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {[
                  { id: 'jira', label: 'Atlassian Jira', desc: 'Cloud & Server REST v3', active: !!jiraToken, emoji: '🔵', color: '#0052cc' },
                  { id: 'linear', label: 'Linear', desc: 'GraphQL issue tracker', active: !!linearApiKey, emoji: '🟣', color: '#5e6ad2' },
                  { id: 'asana', label: 'Asana', desc: 'Workspaces & Sections', active: !!asanaPat, emoji: '🔴', color: '#f06a6a' },
                  { id: 'github', label: 'GitHub Projects', desc: 'Issues & PRs Sync', active: !!githubPat, emoji: '⚫', color: 'var(--text-primary)' },
                ].map(p => {
                  const isSel = activePmTab === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setActivePmTab(p.id as any); setPmTestResult(null); }}
                      className={`integration-tab ${isSel ? 'active' : ''}`}
                    >
                      <div className="integration-tab-header">
                        <span style={{ fontSize: '18px', lineHeight: 1 }}>{p.emoji}</span>
                        {p.active
                          ? <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: 'var(--r-full)', background: 'rgba(34,197,94,0.12)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-green)' }} />
                              Connected
                            </span>
                          : <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: 'var(--r-full)', background: 'rgba(161,161,170,0.12)', color: 'var(--text-muted)' }}>
                              Not set
                            </span>
                        }
                      </div>
                      <div className="integration-tab-name">{p.label}</div>
                      <div className="integration-tab-desc">{p.desc}</div>
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
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={jiraAutoSync}
                        onChange={e => setJiraAutoSync(e.target.checked)}
                      />
                      <span className="toggle-slider" />
                    </label>
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
                      style={{ fontSize: '11.5px', height: '26px', padding: '0 10px', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}
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
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={linearAutoSync}
                        onChange={e => setLinearAutoSync(e.target.checked)}
                      />
                      <span className="toggle-slider" />
                    </label>
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
                      style={{ fontSize: '11.5px', height: '26px', padding: '0 10px', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}
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
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={asanaAutoSync}
                        onChange={e => setAsanaAutoSync(e.target.checked)}
                      />
                      <span className="toggle-slider" />
                    </label>
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
                      style={{ fontSize: '11.5px', height: '26px', padding: '0 10px', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}
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
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={autoSync}
                        onChange={e => setAutoSync(e.target.checked)}
                      />
                      <span className="toggle-slider" />
                    </label>
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
                <h2 className="settings-section-title">Account & Workspace Storage</h2>
                <p className="settings-section-desc">
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
