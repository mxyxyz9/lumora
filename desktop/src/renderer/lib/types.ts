export interface Board {
  _id: string;
  title: string;
  slug?: string;
  permission?: 'private' | 'public';
  color?: string;
  labels?: BoardLabel[];
  members?: BoardMember[];
  subtasksDefaultBoardId?: string;
  allowsCustomFields?: boolean;
  archived?: boolean;
  createdAt?: string | Date;
  modifiedAt?: string | Date;
  projectType?: 'engineering' | 'general' | 'roadmap';
  localRepoPath?: string;
  enableCodexAgent?: boolean;
  icon?: string;
}


export interface BoardLabel {
  _id: string;
  name?: string;
  color: string;
}

export interface BoardMember {
  userId: string;
  username?: string;
  isAdmin?: boolean;
  isActive?: boolean;
  isNoComments?: boolean;
  isCommentOnly?: boolean;
  isWorker?: boolean;
}

export interface List {
  _id: string;
  title: string;
  boardId: string;
  swimlaneId?: string;
  sort?: number;
  archived?: boolean;
  wipLimit?: {
    value: number;
    enabled: boolean;
    soft?: boolean;
  };
}

export interface Swimlane {
  _id: string;
  title: string;
  boardId: string;
  sort?: number;
  archived?: boolean;
}

export interface GitHubCardMetadata {
  repo: string;
  issueNumber: number;
  issueId?: number;
  issueUrl: string;
  state: 'open' | 'closed';
  lastSyncedAt: string;
  syncDirection?: 'inbound' | 'outbound' | 'bidirectional';
}

export interface CardCustomFieldValue {
  _id: string; // customField ID
  value: any;
}

export interface Card {
  _id: string;
  title: string;
  description?: string;
  boardId: string;
  listId: string;
  swimlaneId: string;
  userId?: string;
  sort?: number;
  color?: string;
  archived?: boolean;
  labelIds?: string[];
  dueAt?: string | Date;
  startAt?: string | Date;
  endAt?: string | Date;
  assignees?: string[];
  members?: string[];
  customFields?: CardCustomFieldValue[];
  github?: GitHubCardMetadata;
  createdAt?: string | Date;
  modifiedAt?: string | Date;
}

export interface CardComment {
  _id: string;
  cardId: string;
  boardId?: string;
  userId: string;
  text?: string;
  comment?: string;
  createdAt?: string | Date;
}

export interface Checklist {
  _id: string;
  cardId: string;
  boardId: string;
  title: string;
  sort?: number;
  createdAt?: string | Date;
}

export interface ChecklistItem {
  _id: string;
  checklistId: string;
  cardId: string;
  title: string;
  isFinished: boolean;
  sort?: number;
}

export interface Attachment {
  _id: string;
  attachmentId?: string;
  name: string;
  attachmentName?: string;
  type?: string;
  attachmentType?: string;
  size?: number;
  url?: string;
  urlDownload?: string;
  boardId: string;
  swimlaneId?: string;
  listId?: string;
  cardId: string;
  uploadedAt?: string | Date;
}

export type CustomFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'dropdown'
  | 'checkbox'
  | 'currency'
  | 'stringtemplate';

export interface DropdownItem {
  _id: string;
  name: string;
}

export interface CustomField {
  _id: string;
  name: string;
  type: CustomFieldType;
  boardIds: string[];
  settings?: {
    currencyCode?: string;
    dropdownItems?: DropdownItem[];
    stringtemplateFormat?: string;
    stringtemplateSeparator?: string;
  };
  showOnCard?: boolean;
  automaticallyOnCard?: boolean;
  alwaysOnCard?: boolean;
  showLabelOnMiniCard?: boolean;
}

export interface Activity {
  _id: string;
  userId?: string;
  type?: string;
  activityType: string;
  boardId?: string;
  cardId?: string;
  listId?: string;
  swimlaneId?: string;
  checklistId?: string;
  checklistItemId?: string;
  attachmentId?: string;
  attachmentName?: string;
  commentId?: string;
  customFieldId?: string;
  labelId?: string;
  memberId?: string;
  username?: string;
  createdAt?: string | Date;
  title?: string;
  text?: string;
}

export interface AppSettings {
  theme: 'lavender' | 'ocean' | 'peach' | 'matcha' | 'bubblegum' | 'midnight' | 'dark' | 'light' | 'obsidian' | 'oled' | string;
  fontScale: 'compact' | 'normal' | 'spacious';
  listWidth: number; // 260 - 360 px
  appMode: 'team' | 'solo';
  serverUrl?: string;
  githubPat?: string;
  githubRepo?: string;
  githubSyncEnabled?: boolean;
  githubSyncIntervalSec?: number;
  autoSyncGithub?: boolean;
  syncIntervalSeconds?: number;
  watchLevel?: 'muted' | 'tracking' | 'watching';
  confirmBeforeQuit?: boolean;
  appIcon?: 'dark' | 'light' | 'liquid_glass';
  customBackground?: string;
}

export interface AuthSession {
  userId: string;
  token: string;
  tokenExpires: string;
  serverUrl: string;
  username?: string;
  isGuest?: boolean;
}

export type DDPConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'authenticated'
  | 'subscribed'
  | 'error';

export type PipelineStage =
  | 'backlog'
  | 'diagnosis'
  | 'execution'
  | 'review'
  | 'shipped'
  | 'unknown';

export interface DiagnosisReport {
  title: string;
  reproSteps: string[];
  verdict: 'confirmed' | 'cant_reproduce' | 'already_fixed';
  suggestedSeverity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  rawReport: string;
}

export interface ExecutionResult {
  success: boolean;
  branch: string;
  prUrl?: string;
  prNumber?: number;
  filesChanged?: string[];
  lintPassed: boolean;
  summary: string;
  error?: string;
}

export interface PipelineCardStatus {
  cardId: string;
  stage: PipelineStage;
  isRunning: boolean;
  lastRunAt?: string;
  statusMessage?: string;
  diagnosisReport?: DiagnosisReport;
  executionResult?: ExecutionResult;
}

export interface CodexSessionUpdatePayload {
  sessionId: string;
  cardId?: string;
  stage?: PipelineStage;
  type: string;
  text?: string;
  progress?: string;
}

export interface CodexDiscoveredModel {
  id: string;
  name: string;
  description?: string;
}

export interface CodexDiscoveredConfigOption {
  id: string;
  name: string;
  description?: string;
  category?: string;
  type?: string;
  currentValue?: string;
  options?: Array<{ value: string; name: string; description?: string }>;
}

// ──────────────────────────────────────────────────────────────────────────────
// Lumora Voice & Speech-To-Text (OpenWhispr Base) Types
// ──────────────────────────────────────────────────────────────────────────────
export interface VoiceCandidateNote {
  id: string;
  title: string;
  description?: string;
  suggestedList?: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  status: 'candidate' | 'accepted' | 'discarded';
  acceptedAt?: string;
  discardedAt?: string;
}

export interface VoiceSessionStatus {
  isRecording: boolean;
  isTranscribing: boolean;
  activeHotkey: string;
  localWhisperAvailable: boolean;
  whisperCliPath?: string;
  modelsFound: string[];
  supportedWhisperModels?: Array<{ id: string; name: string; size: string; fileName: string; downloadUrl?: string }>;
  lastTranscript?: string;
  lastError?: string;
}

export interface VoiceTranscribeOptions {
  mimeType?: string;
  engine?: 'local' | 'gemini' | 'openai' | 'groq' | 'auto';
  apiKey?: string;
  model?: string;
  prompt?: string;
}

export interface VoiceStructureResult {
  transcript: string;
  notes: VoiceCandidateNote[];
  rawAiOutput?: string;
}

declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      version: string;
      openFileDialog: (options?: { filters?: { name: string; extensions: string[] }[] }) => Promise<{
        name: string;
        type: string;
        size: number;
        base64: string;
      } | null>;
      openDirectoryDialog?: (title?: string) => Promise<string | null>;
      verifyDirectoryExists?: (dirPath: string) => Promise<{ exists: boolean; isGit: boolean }>;
      openExternal: (url: string) => Promise<boolean>;

      startSoloBackend?: () => Promise<{ success: boolean; port?: number; error?: string }>;
      stopSoloBackend?: () => Promise<{ success: boolean }>;
      getSoloStatus?: () => Promise<{ running: boolean; port?: number }>;
      // Codex ACP Integration
      codexInit?: (config?: { command?: string; args?: string[]; serverUrl?: string; model?: string }) => Promise<{ success: boolean; error?: string; agentInfo?: any }>;
      codexGetStatus?: () => Promise<{ isReady: boolean; activeSessions: number; model?: string; command?: string; error?: string }>;
      codexListModels?: () => Promise<{
        models: CodexDiscoveredModel[];
        currentModelId?: string;
        configOptions?: CodexDiscoveredConfigOption[];
      }>;
      codexSetConfigOption?: (sessionId: string, configId: string, value: string) => Promise<boolean>;
      codexRunDiagnosis?: (cardContext: any) => Promise<{ success: boolean; diagnosis?: DiagnosisReport; report?: string; error?: string }>;
      codexRunExecution?: (params: any) => Promise<ExecutionResult>;
      codexCancelSession?: (cardId: string) => Promise<boolean>;
      onCodexUpdate?: (callback: (update: CodexSessionUpdatePayload) => void) => () => void;

      // Lumora Voice / OpenWhispr STT
      voiceGetStatus?: () => Promise<VoiceSessionStatus>;
      voiceSetRecording?: (isRecording: boolean) => Promise<boolean>;
      voiceSetHotkey?: (hotkey: string) => Promise<boolean>;
      voiceTranscribeAudio?: (audioBase64: string, options?: VoiceTranscribeOptions) => Promise<{ success: boolean; text?: string; duration?: number; error?: string }>;
      voiceCheckWhisperInstalled?: () => Promise<{ installed: boolean; path?: string; models: string[] }>;
      voiceCheckPermissions?: () => Promise<{ mic: string; accessibility: boolean }>;
      voiceRequestMicPermission?: () => Promise<boolean>;
      voiceInjectText?: (text: string) => Promise<{ success: boolean; error?: string }>;
      onVoiceStatusChange?: (callback: (status: VoiceSessionStatus) => void) => () => void;
      onVoiceHotkeyTriggered?: (callback: (data: { action: 'start' | 'stop' | 'toggle'; timestamp: number }) => void) => () => void;

      // Kokoro-82M Text-To-Speech (TTS)
      ttsGetStatus?: () => Promise<{
        isReady: boolean;
        modelsDir: string;
        modelFound: boolean;
        voicesBinFound: boolean;
        activeVoice: string;
        voices: Array<{ id: string; name: string; gender: 'female' | 'male'; language: string; languageCode: string; isDefault?: boolean }>;
        downloadUrlModel: string;
        downloadUrlVoices: string;
      }>;
      ttsSetVoice?: (voiceId: string) => Promise<boolean>;
      ttsSynthesize?: (text: string, options?: { voice?: string; speed?: number }) => Promise<{ success: boolean; audioBase64?: string; mimeType?: string; error?: string; fallback?: boolean }>;

      // Upstream Companion Git Tracking & Model Checkpoint Feed
      upstreamCheckStatus?: (repoKey: 'openwhispr' | 'kokoro') => Promise<{
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
      }>;
      upstreamCheckModelCheckpoints?: () => Promise<Array<{
        modelId: string;
        name: string;
        category: 'STT' | 'TTS';
        currentVersion: string;
        latestVersion: string;
        isUpdateAvailable: boolean;
        downloadUrl: string;
        size: string;
        releaseNotesUrl?: string;
      }>>;

      // Worktree / Git / CLI utilities
      gitCreateBranch?: (repoPath: string, branchName: string) => Promise<{ success: boolean; branch?: string; error?: string }>;
      gitGetDiff?: (repoPath: string, baseBranch?: string) => Promise<{ success: boolean; diff?: string; filesChanged?: string[]; error?: string }>;
      runQualityGates?: (repoPath: string) => Promise<{ passed: boolean; details?: string }>;
      readLearningsFile?: (repoPath?: string) => Promise<string>;
      writeLearningsFile?: (content: string, repoPath?: string) => Promise<boolean>;
      setConfirmBeforeQuit?: (enabled: boolean) => Promise<boolean>;
      setAppIcon?: (iconTheme: string) => Promise<boolean>;
      quitApp?: () => Promise<void>;
      onRequestClosePrompt?: (callback: () => void) => () => void;
    };
  }
}
