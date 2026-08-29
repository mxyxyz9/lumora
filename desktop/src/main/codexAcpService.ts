import { spawn, ChildProcess, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { BrowserWindow } from 'electron';
import { DiagnosisReport, CodexSessionUpdatePayload } from '../renderer/lib/types';

export interface CodexSessionState {
  sessionId: string;
  cardId: string;
  stage: 'diagnosis' | 'execution' | 'review';
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  buffer: string;
  startTime: number;
}

export interface CodexAcpConfig {
  command?: string;
  args?: string[];
  serverUrl?: string;
  model?: string;
  env?: Record<string, string>;
}

export class CodexAcpService {
  private process: ChildProcess | null = null;
  private isInitialized: boolean = false;
  private isAuthenticated: boolean = false;
  private nextRpcId: number = 1;
  private pendingRequests: Map<number | string, { resolve: (val: any) => void; reject: (err: any) => void }> = new Map();
  private activeSessions: Map<string, CodexSessionState> = new Map();
  private cardToSessionId: Map<string, string> = new Map();
  private stdoutBuffer: string = '';
  private mainWindow: BrowserWindow | null = null;
  private defaultCwd: string = process.cwd();
  private config: CodexAcpConfig = {};

  constructor() {
    // Default cwd to repo root or desktop folder
    this.defaultCwd = path.resolve(__dirname, '../../../');
  }

  public setMainWindow(window: BrowserWindow | null) {
    this.mainWindow = window;
  }

  public getStatus() {
    return {
      isReady: this.isInitialized && this.isAuthenticated && this.process !== null && !this.process.killed,
      activeSessions: this.activeSessions.size,
      model: this.config.model || 'default (ChatGPT Subscription)',
      command: this.config.command || 'npx -y @agentclientprotocol/codex-acp',
    };
  }

  /**
   * Start and initialize the persistent codex-acp subprocess
   */
  public async initialize(customConfig?: CodexAcpConfig): Promise<{ success: boolean; error?: string; agentInfo?: any }> {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
      // If config changed and process exists, restart
      if (this.process) {
        try {
          this.process.kill();
        } catch (_) {}
        this.process = null;
        this.isInitialized = false;
        this.isAuthenticated = false;
      }
    }

    if (this.process && this.isInitialized && this.isAuthenticated) {
      return { success: true };
    }

    try {
      await this.spawnProcess();
      const initResult = await this.sendRpc('initialize', {
        protocolVersion: 1,
        clientInfo: { name: 'kanso-desktop', version: '1.0.0' },
        capabilities: {},
      });

      this.isInitialized = true;

      // Authenticate using ChatGPT subscription login flow
      await this.sendRpc('authenticate', {
        methodId: 'chat-gpt',
      });

      this.isAuthenticated = true;
      return { success: true, agentInfo: initResult?.agentInfo };
    } catch (err: any) {
      console.error('[CodexAcpService] Initialization error:', err);
      return { success: false, error: err.message || String(err) };
    }
  }

  private spawnProcess(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.process) {
        try {
          this.process.kill();
        } catch (_) {}
        this.process = null;
      }

      this.isInitialized = false;
      this.isAuthenticated = false;
      this.stdoutBuffer = '';

      const env = {
        ...process.env,
        ...(this.config.env || {}),
        NO_BROWSER: '1',
      };

      const cmd = this.config.command || 'npx';
      const args = this.config.command
        ? (this.config.args || [])
        : ['-y', '@agentclientprotocol/codex-acp'];

      this.process = spawn(cmd, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env,
        cwd: this.defaultCwd,
      });

      this.process.stdout?.on('data', (chunk: Buffer) => {
        this.handleStdoutData(chunk.toString());
      });

      this.process.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        // Log stderr but don't crash
        if (text.includes('error') || text.includes('Error')) {
          console.warn('[CodexAcpService:stderr]', text.trim());
        }
      });


      this.process.on('error', (err) => {
        console.error('[CodexAcpService] Subprocess error:', err);
        reject(err);
      });

      this.process.on('exit', (code, signal) => {
        console.log(`[CodexAcpService] Subprocess exited with code ${code} signal ${signal}`);
        this.isInitialized = false;
        this.isAuthenticated = false;
        this.process = null;
      });

      // Allow a brief moment for subprocess to stabilize
      setTimeout(() => resolve(), 300);
    });
  }

  private handleStdoutData(data: string) {
    this.stdoutBuffer += data;
    const lines = this.stdoutBuffer.split('\n');
    this.stdoutBuffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const msg = JSON.parse(trimmed);
        this.handleRpcMessage(msg);
      } catch (err) {
        console.warn('[CodexAcpService] Non-JSON stdout frame:', trimmed.slice(0, 100));
      }
    }
  }

  private handleRpcMessage(msg: any) {
    // Response to a request
    if (msg.id !== undefined && (msg.result !== undefined || msg.error !== undefined)) {
      const pending = this.pendingRequests.get(msg.id);
      if (pending) {
        this.pendingRequests.delete(msg.id);
        if (msg.error) {
          const detailMsg = msg.error.data?.message || msg.error.message || JSON.stringify(msg.error);
          pending.reject(new Error(detailMsg));
        } else {
          pending.resolve(msg.result);
        }
      }
      return;
    }

    // Server-to-client notifications (e.g. session/update)
    if (msg.method === 'session/update' && msg.params) {
      const { sessionId, update } = msg.params;
      const sessionState = this.activeSessions.get(sessionId);

      if (sessionState && update) {
        let chunkText = '';
        if (update.sessionUpdate === 'agent_message_chunk' && update.content?.text) {
          chunkText = update.content.text;
          sessionState.buffer += chunkText;
        } else if (update.sessionUpdate === 'plan_update' && update.plan) {
          chunkText = update.plan;
        }

        // Forward progress update to Electron Renderer via IPC
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          const payload: CodexSessionUpdatePayload = {
            sessionId,
            cardId: sessionState.cardId,
            stage: sessionState.stage,
            type: update.sessionUpdate || 'update',
            text: chunkText,
            progress: update.message || update.summary,
          };
          this.mainWindow.webContents.send('codex:sessionUpdate', payload);
        }
      }
    }
  }

  private sendRpc(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdin?.writable) {
        return reject(new Error('Codex ACP subprocess is not running or stdin is closed'));
      }

      const id = this.nextRpcId++;
      this.pendingRequests.set(id, { resolve, reject });

      const payload = JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params,
      }) + '\n';

      this.process.stdin.write(payload, (err) => {
        if (err) {
          this.pendingRequests.delete(id);
          reject(err);
        }
      });

      // 60s default timeout for standard RPC calls (prompt has custom timeout)
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Codex ACP method ${method} timed out after 60s`));
        }
      }, 60000);
    });
  }

  /**
   * Dynamically queries the advertised models and config options from the Codex ACP session
   */
  public async listModels(): Promise<{
    models: Array<{ id: string; name: string; description?: string }>;
    currentModelId?: string;
    configOptions?: any[];
  }> {
    await this.initialize();
    try {
      const sessionRes = await this.sendRpc('session/new', {
        cwd: this.defaultCwd,
        mcpServers: [],
      });

      const modelsList: Array<{ id: string; name: string; description?: string }> = [];

      // 1. Parse models.availableModels (from ACP protocol)
      if (sessionRes?.models?.availableModels && Array.isArray(sessionRes.models.availableModels)) {
        for (const m of sessionRes.models.availableModels) {
          modelsList.push({
            id: m.modelId || m.id,
            name: m.name || m.modelId || m.id,
            description: m.description || '',
          });
        }
      }

      // 2. Parse configOptions for model choices if available
      const modelConfig = sessionRes?.configOptions?.find((c: any) => c.id === 'model');
      if (modelConfig?.options && Array.isArray(modelConfig.options)) {
        for (const opt of modelConfig.options) {
          if (!modelsList.some(m => m.id === opt.value)) {
            modelsList.push({
              id: opt.value,
              name: opt.name || opt.value,
              description: opt.description || '',
            });
          }
        }
      }

      if (sessionRes?.sessionId) {
        this.cleanupSession(sessionRes.sessionId);
      }

      return {
        models: modelsList,
        currentModelId: sessionRes?.models?.currentModelId || modelConfig?.currentValue,
        configOptions: sessionRes?.configOptions || [],
      };
    } catch (err: any) {
      console.error('[CodexAcpService] listModels error:', err);
      return { models: [], configOptions: [] };
    }
  }

  /**
   * Sets a configuration option for an active ACP session
   */
  public async setConfigOption(sessionId: string, configId: string, value: string): Promise<boolean> {
    try {
      await this.sendRpc('session/set_config_option', {
        sessionId,
        configId,
        value,
      });
      return true;
    } catch (err) {
      console.warn(`[CodexAcpService] setConfigOption failed for ${configId}=${value}:`, err);
      return false;
    }
  }

  /**
   * Stage 2: Gathering Context & Diagnosis
   */
  public async runDiagnosis(cardContext: {
    cardId: string;
    title: string;
    description: string;
    boardTitle?: string;
    swimlaneTitle?: string;
    repoPath?: string;
    learnings?: string;
  }): Promise<{ success: boolean; report?: string; diagnosis?: DiagnosisReport; error?: string }> {
    await this.initialize();

    const cwd = cardContext.repoPath || this.defaultCwd;
    const learningsContent = cardContext.learnings || (await this.readLearnings(cwd));

    // Create new session
    const sessionRes = await this.sendRpc('session/new', {
      cwd,
      mcpServers: [],
    });

    const sessionId = sessionRes.sessionId;

    // Apply configured model dynamically via ACP
    if (this.config.model) {
      await this.setConfigOption(sessionId, 'model', this.config.model);
    }

    const sessionState: CodexSessionState = {
      sessionId,
      cardId: cardContext.cardId,
      stage: 'diagnosis',
      status: 'running',
      buffer: '',
      startTime: Date.now(),
    };

    this.activeSessions.set(sessionId, sessionState);
    this.cardToSessionId.set(cardContext.cardId, sessionId);

    const diagnosisPrompt = `You are performing the DIAGNOSIS & REPRODUCTION stage for a Kanban task in Kanso.
Your goal is to inspect the codebase, attempt to reproduce the issue or evaluate the requirement, assess severity, check for duplicates/prior fixes, and produce a structured diagnosis report.

## Task Details
- Title: ${cardContext.title}
- Description:
${cardContext.description || 'No description provided.'}
- Board: ${cardContext.boardTitle || 'Development'}
- Subfolder / Workstream: ${cardContext.swimlaneTitle || 'General'}

## Project Knowledge & Known Failure Patterns (LEARNINGS.md)
${learningsContent ? learningsContent : 'No prior learnings recorded.'}

## Instructions:
1. Search and inspect the relevant files in the workspace.
2. Determine if the issue is reproducible, already fixed, or invalid.
3. Pinpoint relevant files and line numbers.
4. Conclude with a clear structured diagnosis verdict.

Format your final answer as Markdown with these exact sections:
### 1. Issue Summary & Root Cause
### 2. Reproduction Steps & Verification
### 3. Verdict: [CONFIRMED | CANT_REPRODUCE | ALREADY_FIXED]
### 4. Suggested Severity: [LOW | MEDIUM | HIGH | CRITICAL]
### 5. Recommended Implementation Plan
- Predicted files to modify
- Dependencies or risks`;

    try {
      const promptRes = await this.sendPromptWithTimeout(sessionId, diagnosisPrompt, 180000);
      sessionState.status = 'completed';

      const fullOutput = sessionState.buffer || promptRes?.text || '';
      const parsed = this.parseDiagnosisReport(fullOutput, cardContext.title);

      return {
        success: true,
        report: fullOutput,
        diagnosis: parsed,
      };
    } catch (err: any) {
      sessionState.status = 'failed';
      return { success: false, error: err.message || String(err) };
    } finally {
      this.cleanupSession(sessionId);
    }
  }

  /**
   * Stage 3: In Progress / Codex Execution
   */
  public async runExecution(params: {
    cardId: string;
    title: string;
    description: string;
    diagnosisReport?: string;
    repoPath?: string;
    branchName?: string;
    learnings?: string;
  }): Promise<{
    success: boolean;
    branch: string;
    summary: string;
    filesChanged: string[];
    lintPassed: boolean;
    lintOutput?: string;
    fixAttempts?: number;
    error?: string;
  }> {
    await this.initialize();


    const cwd = params.repoPath || this.defaultCwd;
    const slug = params.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30).replace(/^-|-$/g, '');
    const branch = params.branchName || `feat/kanso-${params.cardId.slice(-6)}-${slug}`;
    const learningsContent = params.learnings || (await this.readLearnings(cwd));

    // 1. Create and checkout isolated branch
    await this.execCommand(`git checkout -b "${branch}" || git checkout "${branch}"`, cwd).catch(() => {});

    // 2. Open execution session in ACP
    const sessionRes = await this.sendRpc('session/new', {
      cwd,
      mcpServers: [],
    });

    const sessionId = sessionRes.sessionId;

    // Apply configured model dynamically via ACP
    if (this.config.model) {
      await this.setConfigOption(sessionId, 'model', this.config.model);
    }

    const sessionState: CodexSessionState = {

      sessionId,
      cardId: params.cardId,
      stage: 'execution',
      status: 'running',
      buffer: '',
      startTime: Date.now(),
    };

    this.activeSessions.set(sessionId, sessionState);
    this.cardToSessionId.set(params.cardId, sessionId);

    const executionPrompt = `You are the BUILDER AGENT in the Kanso autonomous pipeline.
Your job is to implement the solution for the task on the current git branch (${branch}) and ensure all deterministic quality checks pass.

## Task Details
- Title: ${params.title}
- Description: ${params.description || ''}

## Context & Diagnosis Findings
${params.diagnosisReport || 'No prior diagnosis findings attached.'}

## Project Knowledge (LEARNINGS.md)
${learningsContent ? learningsContent : 'No prior learnings recorded.'}

## Execution Requirements:
1. Implement the required changes cleanly, adhering to existing codebase conventions.
2. Write unit/integration tests for new behavior where applicable.
3. Do NOT commit secrets or broken code.
4. Summarize:
   - What was implemented
   - List of files modified
   - Verification steps taken`;

    try {
      const promptRes = await this.sendPromptWithTimeout(sessionId, executionPrompt, 300000);
      sessionState.status = 'completed';

      // 3. Run deterministic quality gates with self-healing fix loop (up to 3 attempts)
      let gateResult = await this.runQualityGates(cwd);
      let fixAttempts = 0;
      const MAX_FIX_ATTEMPTS = 2;

      while (!gateResult.success && fixAttempts < MAX_FIX_ATTEMPTS) {
        fixAttempts++;
        console.log(`[CodexAcpService] Quality gates / tests failed (attempt ${fixAttempts}). Looping back to Codex to self-heal...`);

        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('codex:sessionUpdate', {
            sessionId,
            cardId: params.cardId,
            stage: 'execution',
            type: 'test_fix_retry',
            text: `\n\n> ⚠️ **Quality Gate / Test Failure (Attempt ${fixAttempts}/${MAX_FIX_ATTEMPTS})**\n> Looping back to Codex to analyze test failure & self-heal...\n`,
            progress: `Self-healing test failure (attempt ${fixAttempts})...`,
          });
        }

        const fixPrompt = `Deterministic quality gates / automated tests failed with the following error output:

\`\`\`
${gateResult.output.slice(0, 3500)}
\`\`\`

Please analyze the exact root cause of this failure, fix the implementation in the codebase, and verify that the tests and compilation pass.`;

        await this.sendPromptWithTimeout(sessionId, fixPrompt, 180000);
        gateResult = await this.runQualityGates(cwd);
      }

      // 4. Inspect git status for changed files
      const changedFiles = await this.getChangedFiles(cwd);

      // 5. If quality gate passed and changes exist, commit them locally
      if (gateResult.success && changedFiles.length > 0) {
        await this.execCommand(
          `git add -A && git commit -m "feat(pipeline): ${params.title.replace(/"/g, '\\"')}"`,
          cwd
        ).catch(() => {});
      }

      return {
        success: gateResult.success,
        branch,
        summary: sessionState.buffer || promptRes?.text || 'Execution finished successfully.',
        filesChanged: changedFiles,
        lintPassed: gateResult.success,
        lintOutput: gateResult.output,
        fixAttempts,
      };

    } catch (err: any) {
      sessionState.status = 'failed';
      return {
        success: false,
        branch,
        summary: '',
        filesChanged: [],
        lintPassed: false,
        error: err.message || String(err),
      };
    } finally {
      this.cleanupSession(sessionId);
    }
  }

  private sendPromptWithTimeout(sessionId: string, text: string, timeoutMs: number = 240000): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdin?.writable) {
        return reject(new Error('Subprocess not ready'));
      }

      const id = this.nextRpcId++;
      let timer: any = null;

      this.pendingRequests.set(id, {
        resolve: (val) => {
          if (timer) clearTimeout(timer);
          resolve(val);
        },
        reject: (err) => {
          if (timer) clearTimeout(timer);
          reject(err);
        },
      });

      const payload = JSON.stringify({
        jsonrpc: '2.0',
        id,
        method: 'session/prompt',
        params: {
          sessionId,
          prompt: [{ type: 'text', text }],
        },
      }) + '\n';

      this.process.stdin.write(payload);

      timer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Session prompt timed out after ${timeoutMs / 1000}s`));
        }
      }, timeoutMs);
    });
  }

  public cancelSession(cardId: string): boolean {
    const sessionId = this.cardToSessionId.get(cardId);
    if (!sessionId) return false;

    const sessionState = this.activeSessions.get(sessionId);
    if (sessionState) {
      sessionState.status = 'cancelled';
    }

    this.sendRpc('session/cancel', { sessionId }).catch(() => {});
    this.cleanupSession(sessionId);
    return true;
  }

  private cleanupSession(sessionId: string) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      this.cardToSessionId.delete(session.cardId);
      this.activeSessions.delete(sessionId);
      this.sendRpc('session/close', { sessionId }).catch(() => {});
    }
  }

  // --- Quality Gates & Git Utilities ---

  public async runQualityGates(cwd: string): Promise<{ success: boolean; output: string }> {
    try {
      // Check if npm test / tsc are configured in repo
      const pkgPath = path.join(cwd, 'package.json');
      let testCommand = 'npm test --if-present';
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          if (pkg.scripts?.['typecheck']) {
            testCommand = 'npm run typecheck && npm test --if-present';
          } else if (pkg.devDependencies?.typescript || pkg.dependencies?.typescript) {
            testCommand = 'npx tsc --noEmit && npm test --if-present';
          }
        } catch (_) {}
      }

      const res = await this.execCommand(testCommand, cwd);
      return { success: true, output: res.stdout };
    } catch (err: any) {
      return { success: false, output: err.stdout || err.stderr || err.message };
    }
  }

  public async getChangedFiles(cwd: string): Promise<string[]> {
    try {
      const res = await this.execCommand('git status --porcelain', cwd);
      return res.stdout
        .split('\n')
        .map((l) => l.trim().slice(3))
        .filter(Boolean);
    } catch (_) {
      return [];
    }
  }

  public async createBranch(repoPath: string, branchName: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.execCommand(`git checkout -b "${branchName}" || git checkout "${branchName}"`, repoPath);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getDiff(repoPath: string, baseBranch: string = 'main'): Promise<string> {
    try {
      const res = await this.execCommand(`git diff ${baseBranch}...HEAD || git diff HEAD~1`, repoPath);
      return res.stdout;
    } catch (e: any) {
      return '';
    }
  }

  // --- LEARNINGS.md Management ---

  public async readLearnings(cwd: string): Promise<string> {
    const filePath = path.join(cwd, 'LEARNINGS.md');
    if (!fs.existsSync(filePath)) return '';
    try {
      const lines = fs.readFileSync(filePath, 'utf8').split('\n');
      // Read most recent 50 lines / 30 patterns from bottom
      return lines.slice(-50).join('\n');
    } catch (_) {
      return '';
    }
  }

  public async writeLearnings(content: string, cwd: string): Promise<boolean> {
    const filePath = path.join(cwd, 'LEARNINGS.md');
    try {
      let existing = '';
      if (fs.existsSync(filePath)) {
        existing = fs.readFileSync(filePath, 'utf8');
      }
      const combined = `${existing.trim()}\n\n${content.trim()}`.trim();
      const lines = combined.split('\n');
      const capped = lines.slice(-50).join('\n');
      fs.writeFileSync(filePath, capped, 'utf8');
      return true;
    } catch (_) {
      return false;
    }
  }

  private execCommand(command: string, cwd: string): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      exec(command, { cwd, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) {
          reject({ err, stdout, stderr, message: err.message });
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }

  private parseDiagnosisReport(text: string, defaultTitle: string): DiagnosisReport {
    let verdict: 'confirmed' | 'cant_reproduce' | 'already_fixed' = 'confirmed';
    if (/cant_reproduce|cannot reproduce|unable to reproduce|can\'t repro/i.test(text)) {
      verdict = 'cant_reproduce';
    } else if (/already_fixed|already fixed|resolved/i.test(text)) {
      verdict = 'already_fixed';
    }

    let suggestedSeverity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    if (/critical/i.test(text)) suggestedSeverity = 'critical';
    else if (/high/i.test(text)) suggestedSeverity = 'high';
    else if (/low/i.test(text)) suggestedSeverity = 'low';

    const reproLines: string[] = [];
    const reproMatch = text.match(/Reproduction Steps[^#]+/i);
    if (reproMatch) {
      reproMatch[0].split('\n').forEach((l) => {
        const clean = l.replace(/^[-*•\d.]+\s*/, '').trim();
        if (clean.length > 3 && !clean.startsWith('Reproduction Steps')) {
          reproLines.push(clean);
        }
      });
    }

    return {
      title: defaultTitle,
      reproSteps: reproLines.slice(0, 5),
      verdict,
      suggestedSeverity,
      details: text,
      rawReport: text,
    };
  }

  public shutdown() {
    if (this.process) {
      try {
        this.process.kill();
      } catch (_) {}
      this.process = null;
    }
  }
}

export const codexAcpService = new CodexAcpService();
