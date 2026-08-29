# Kanso AI-Agent Dev Pipeline Continuity Log: Decisions & Web Search Findings

## Web Search Findings (Step 0.5 & Native Packaging)

### 1. `codex-acp` Repository & Ecosystem
- **Official Home**: `@agentclientprotocol/codex-acp` (under `agentclientprotocol/codex-acp`, formerly `zed-industries/codex-acp`).
- **Adapter Nature**: It is a Node-based stdio JSON-RPC 2.0 server bridging ACP-compatible clients (IDEs, desktop apps) with the underlying Codex App Server / Codex CLI.
- **Current Version Verified**: `1.7.0` running against `codex-cli 0.149.0`.

### 2. Protocol & Session Model
- **Multiplexed Single-Process Model**: A single running instance of `codex-acp` supports multiple concurrent sessions initiated via `session/new`.
- **Session Identification**: Every `session/new` returns a unique `sessionId` (UUID v7, e.g. `01a04b9d-...`).
- **Updates & Streaming**: Updates arrive as asynchronous JSON-RPC notifications (`method: "session/update"`) with `params.sessionId` identifying the originating session.
- **Session Turn Completion**: Prompts sent via `session/prompt` complete with a result containing `stopReason: "end_turn"` and cumulative `usage` metrics.

### 3. Authentication Flow
- **Supported Methods Advertised by Adapter**:
  - `api-key` (OpenAI / Codex API Key)
  - `chat-gpt` (ChatGPT subscription login)
- **ChatGPT-Login Flow**:
  - When `authenticate` is sent with `{ methodId: "chat-gpt" }`, the adapter reads existing OAuth/session credentials from `~/.codex/auth.json`.
  - If a session is already present, it returns `{}` immediately with status OK, requiring zero user intervention or metered API keys.
  - Non-interactive mode works reliably with `NO_BROWSER=1` if re-auth is needed.

---

## Architectural & Design Decisions

### Decision 1: Main Process vs Renderer Process Division
- **Decision**: Manage the `codex-acp` subprocess exclusively within the Electron **Main Process** (`desktop/src/main/codexAcpService.ts`), exposing clean, promise-based and streaming IPC handlers through `preload.ts` to `desktop/src/renderer/lib/codexAcpClient.ts`.
- **Rationale**:
  - Web browsers / Electron renderers cannot directly spawn long-running Node subprocesses or access raw stdio streams when `nodeIntegration: false` and `contextIsolation: true` are enabled.
  - The main process can persist the singleton `codex-acp` process across board switches and window reloads.
  - Streaming updates and tool outputs can be pushed to the renderer via IPC (`ipcMain` -> `webContents.send` -> `ipcRenderer.on`).

### Decision 2: Board State Machine & DDP Event Triggering
- **Decision**: Trigger pipeline stages automatically from `ddpClient.ts`'s `changed` event in the renderer, filtered on `card.listId` transitions to designated pipeline lists.
- **Stage Mapping Strategy**:
  - Stage 1: **Reported Issues & Backlog** (`/backlog|reported|to\s*do/i`) — Entry / Human.
  - Stage 2: **Gathering Context & Diagnosis** (`/diagnos|context|investigat/i`) — Triggers `codexAcpClient.runDiagnosis(card)`. Auto-posts diagnosis findings comment. Stays in list for human gate.
  - Stage 3: **In Progress / Codex Execution** (`/in\s*progress|execut|build/i`) — Triggers `codexAcpClient.runExecution(card, diagnosisFindings)`. Runs deterministic lint/test check. Creates PR via `githubSync` and auto-advances to Review list.
  - Stage 4: **Code Review & PR Verification** (`/review|verif/i`) — Human gate. Displays PR/CI state on card.
  - Stage 5: **Shipped & Closed** (`/shipped|closed|done/i`) — Terminal stage.
- **Safety Valve Rule**: No auto-advance past human-approval lists (Diagnosis -> In Progress and Review -> Shipped).

### Decision 3: Separation of Concerns from Existing Copilot
- **Decision**: Create independent modules `desktop/src/main/codexAcpService.ts` and `desktop/src/renderer/lib/codexAcpClient.ts` without modifying or mixing with `desktop/src/renderer/lib/aiService.ts`.
- **Rationale**: Keeps existing Gemini/Ollama board copilot chat fully functional while isolating the autonomous Codex pipeline logic.

### Decision 4: Deterministic Quality Gate & Isolated Worktree Execution
- **Decision**: In the Execution stage, Codex operates on a dedicated branch / worktree (`feat/<issue-id>-<slug>`), and executes deterministic quality gates (`tsc`, `lint`, `test`) before auto-opening the PR and moving to Review.

### Decision 5: Lightweight Role Memory (`LEARNINGS.md`)
- **Decision**: Store accumulated diagnosis and execution insights in a capped `LEARNINGS.md` file (max 50 lines / 30 patterns) read by diagnosis and execution sessions.

### Decision 6: Full Search & Archive Gap Resolution
- **Decision**: Build a modern Command Palette / Global Search bar (Cmd+K) in Kanso, querying card titles, descriptions, and custom fields across active and archived cards (`archived: true` toggle).

### Decision 7: Standalone Electron Packaging & Cross-Platform CI/CD
- **Decision**: Configure `electron-builder` with multi-target packaging (`.dmg`/`.zip` for macOS, `.exe` NSIS for Windows, `.AppImage`/`.deb` for Linux), high-resolution generated squircle artwork (`icon.icns`, `icon.ico`, `icon.png`), and GitHub Actions release automation in `.github/workflows/desktop-release.yml`.

### Decision 8: Pluggable Multi-Provider External PM Synchronization
- **Decision**: Support 2-way event-driven sync across **Jira Cloud**, **Linear**, **Asana**, and **GitHub Projects** using a normalized stage abstraction (`todo`, `inprogress`, `review`, `done`) in `desktop/src/renderer/lib/pmSyncManager.ts`.
- **Rationale**:
  - Automatically translates board stage movements into remote provider transitions (Jira workflow IDs, Linear state IDs, Asana section placements).
  - Broadcasts autonomous Codex diagnosis summaries and execution PR links to external ticket activity feeds without vendor lock-in.

### Decision 9: Configurable Custom Codex ACP Subprocess & Transports
- **Decision**: Provide user-configurable transport modes for Codex ACP in Settings (`builtin` local ChatGPT token, `custom_command` stdio binary path, and `remote_url` network endpoint).
- **Rationale**: Gives full flexibility for developers to point Kanso to custom fine-tuned agents, self-hosted ACP endpoints, or enterprise proxy servers.

### Decision 10: 100% Dynamic Model Discovery (Zero Hardcoded Model Names)
- **Decision**: Zero hardcoded model names in the codebase. All Codex model names, descriptions, and capabilities are discovered dynamically through ACP protocol negotiation (`session/new` returning `models.availableModels` and `configOptions[id=model].options`).
- **Rationale**:
  - Exactly adheres to OpenAI and Agent Client Protocol (ACP) standard specifications.
  - Automatically surfaces newly released OpenAI models as soon as Codex CLI / ACP updates without requiring application recompilation.
  - Allows seamless switching of models and reasoning effort in active sessions via `session/set_config_option`.



