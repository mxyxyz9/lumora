// ─── Data Models & Interfaces ────────────────────────────────────────────────
export * from './types';

// ─── AI Copilot & Codex Intelligence ─────────────────────────────────────────
export { AiService } from './aiService';
export type { AiConfig, AttachedImage } from './aiService';
export { pipelineOrchestrator } from './pipelineOrchestrator';
export { codexAcpClient, CodexAcpClient } from './codexAcpClient';
export { parseAcpModels, resolveTargetAcpModelId } from './acpModelParser';
export type { RawAcpModel, ParsedBaseModel, ParsedThinkingTier } from './acpModelParser';

// ─── Cloud PM & Live Sync ────────────────────────────────────────────────────
export { pmSyncManager } from './pmSyncManager';
export { JiraSyncEngine, jiraSync } from './jiraSync';
export type { JiraIssue } from './jiraSync';
export { LinearSyncEngine, linearSync } from './linearSync';
export type { LinearIssue } from './linearSync';
export { AsanaSyncEngine, asanaSync } from './asanaSync';
export type { AsanaTask } from './asanaSync';
export { GitHubSyncEngine, githubSync } from './githubSync';
export type { GitHubIssue } from './githubSync';
export { ddpClient, DdpClient } from './ddpClient';
export { wekanApi } from './wekanApi';

// ─── Document Parsing & Utilities ────────────────────────────────────────────
export { parseAttachedFile } from './documentParser';
export type { AttachedDocument } from './documentParser';
export { renderMarkdown } from './markdownRenderer';
export { seedSprintEngineeringData } from './demoDataSeeder';
