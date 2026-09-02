# Kanso AI-Agent Dev Pipeline Continuity Log: Progress

## Timeline & Step Summary

### [2026-08-29 09:10:00] - Initialization & Environment Audit
- **Action**: Audited workspace root (`/Users/rushil.dev/Desktop/wekan-main`) and Kanso desktop client (`desktop/`).
- **Discovery**:
  - Global system has `codex-cli` v0.149.0 and `@agentclientprotocol/codex-acp` v1.7.0 available.
  - Active Codex configuration and ChatGPT login session exist at `~/.codex/auth.json` and `~/.codex/config.toml`.
  - Kanso is an Electron + React + TypeScript desktop application running on a Wekan backend with REST and DDP protocols.

### [2026-08-29 09:11:14] - Step 0: Reference Architecture Analysis & Cleanup
- **Action**: Cloned `https://github.com/UrRhb/agentflow.git` into `reference/agentflow`.
- **Analysis**:
  - Inspected `conventions.md`, `prompts/` (`build.md`, `review.md`, `research.md`, `test.md`), and `skills/` (`sdlc-orchestrate.md`).
  - Extracted core patterns:
    1. Kanban board as the primary state machine.
    2. Explicit stage gates: Backlog -> Diagnosis/Research -> Execution/Build -> Review -> Done.
    3. Adversarial reviewer requiring at least 3 concrete findings.
    4. Deterministic quality gates (tsc, lint, tests) before review.
    5. Per-role persistent memory (`LEARNINGS.md`) capped to prevent unbounded context growth.
    6. Human approval safety valves (no auto-advancing past Diagnosis or Review).
- **Cleanup**: Executed `rm -rf reference` — zero reference files committed or left in git tracking.

### [2026-08-29 09:11:43] - Step 0.5: Web Search & Live ACP Protocol Validation
- **Action**: Performed live web research and direct JSON-RPC testing against `@agentclientprotocol/codex-acp`.
- **Validation Results**:
  - Confirmed `@agentclientprotocol/codex-acp` (version 1.7.0) communicates via JSON-RPC 2.0 over standard I/O.
  - Validated protocol handshake: `initialize` -> `authenticate` (with `methodId: "chat-gpt"`) -> `session/new` -> `session/prompt` -> streaming `session/update` notifications -> final response.
  - Validated multi-session model: A single `codex-acp` adapter process supports multiple concurrent sessions (`sessionId`), with notifications multiplexed cleanly by `sessionId`.
  - Validated authentication: Successfully authenticated via local ChatGPT login token without prompt or API key requirement.

### [2026-08-29 09:13:00] - Step 1: Kanso Architectural Deep-Dive
- **Action**: Inspected `desktop/src/main/`, `desktop/src/preload/`, `desktop/src/renderer/lib/` (`ddpClient.ts`, `githubSync.ts`, `wekanApi.ts`, `aiService.ts`, `types.ts`), and `desktop/src/renderer/store/boardStore.ts`.
- **Findings**:
  - DDP real-time events (`changed`, `added`, `removed`) are handled in `boardStore.ts` in renderer.
  - GitHub issue sync exists in `githubSync.ts`, but lacks dedicated PR creation/status methods needed for the execution completion phase.
  - Search gap confirmed: Wekan backend supports `Board.searchCards(term)` in `models/lib/cardSearch.js` and `models/boards.js`, but Kanso desktop client lacks UI integration (Cmd+K / search bar) and archive toggle.

### [2026-08-29 09:14:00] - Implementation Plan & Deliverables Formulated
- Complete architecture plan drafted and approved covering subprocess lifecycle, IPC bridges, state machine stages, memory management, and search dialog.

### [2026-08-29 09:16:00] - Core Pipeline Implementation & Build
- **Electron Main Process Service**:
  - Created `desktop/src/main/codexAcpService.ts` managing the persistent `codex-acp` child process, session multiplexing, diagnosis/execution prompts, deterministic quality gates (`tsc`/`lint`/`test`), and streaming IPC notifications.
  - Updated `desktop/src/main/main.ts` and `desktop/src/preload/preload.ts` with typed IPC handlers.
- **Renderer Pipeline & Client**:
  - Created `desktop/src/renderer/lib/codexAcpClient.ts` for diagnosis, execution, and Wekan card comment posting.
  - Created `desktop/src/renderer/lib/pipelineOrchestrator.ts` providing autonomous state transitions based on DDP card updates and enforcing human gates at Diagnosis and Review.
  - Updated `desktop/src/renderer/lib/githubSync.ts` with `createPullRequest` and `getPullRequestStatus`.
  - Updated `desktop/src/renderer/store/boardStore.ts` to hook `pipelineOrchestrator` on card moves and DDP updates.
- **Search & Archive UI**:
  - Created `desktop/src/renderer/components/GlobalSearchModal.tsx` implementing regex card search over titles, descriptions, and custom fields with an "Include archived cards" toggle.
  - Mounted search dialog and `Cmd+K` keyboard shortcut in `BoardView.tsx`.
  - Added live pipeline status banners to `KanbanCard.tsx`.

### [2026-08-29 09:19:00] - Automated Testing & Verification
- Created unit tests in `desktop/tests/pipeline-orchestrator.test.ts` and `desktop/tests/global-search.test.ts`.
- Ran `npx vitest run`: **11 tests passed (100% pass rate)**.
- Ran `npm run build` and `npm run build:electron`: **All Vite and Electron bundles built cleanly with zero errors**.

### [2026-08-29 12:40:00] - Lumora Rebrand, Multimodal AI Vision & UI Polish
- **Lumora Brand Identity**: Officially rebranded application to **Lumora** across all touchpoints (Lumora Kanban, Lumora Copilot, Lumora Board Search, `LumoraLogo.tsx`, electron window titles, package manifests).
- **Multimodal AI Vision Ingestion**:
  - `CardDetailModal` passes all attached screenshots directly to `AiService` as `AttachedImage[]`.
  - AI vision model synthesizes detailed technical specifications from visual errors, mockups, and stack traces while preserving draft notes.
- **Spacious Editor & Undo Revert**:
  - Expanded description editor with monospace typography and generous padding.
  - Added instant **Revert to Original** button (`<Undo2 />`) to undo AI enhancements.
- **Native Drag & Drop**:
  - Enabled drag-and-drop file and image uploads directly onto card modals and drop zones.
- **Fixed Broken UI Selectors**:
  - Removed 30px height squash from `.btn-subtle` and added `.selector-card-btn` to prevent text overlapping in Reasoning Depth and Model Version cards.
- **Codex Quota Limit Handling & Fallback**:
  - Unpacked `msg.error.data.message` (`usageLimitExceeded`) from `@agentclientprotocol/codex-acp`.
  - Added automatic seamless fallback to Google Gemini when OpenAI usage limits are reached.
- **Verification**:
  - **30 unit and parser tests passed** with 100% pass rate (`npx vitest run`).
  - Production build completed with **0 errors** (`npm run build`).

### [2026-08-29 09:35:00] - Multi-Provider External PM Synchronization (Jira, Linear, Asana, GitHub)
- **Engines**:
  - Created `desktop/src/renderer/lib/jiraSync.ts` for Jira Cloud REST API v3 transitions, ADF comments, and ticket syncing.
  - Created `desktop/src/renderer/lib/linearSync.ts` for Linear GraphQL workflow state mutations and issue syncing.
  - Created `desktop/src/renderer/lib/asanaSync.ts` for Asana REST API section placement, stories, and task synchronization.
  - Created `desktop/src/renderer/lib/pmSyncManager.ts` centralizing multi-provider event distribution and status mapping.
- **UI & Modals**:
  - Created `desktop/src/renderer/components/IntegrationsModal.tsx` for multi-provider API credential management, project mapping, auto-sync toggles, and live connection testing.
  - Mounted integrations modal in `BoardView.tsx` project tools menu.

### [2026-08-29 09:41:00] - Custom Pluggable Codex ACP Configuration in Settings
- Updated `desktop/src/main/codexAcpService.ts` to support custom commands, arguments, server URLs, and model selection.
- Added 3rd AI Provider card for **OpenAI Codex ACP** in `desktop/src/renderer/components/SettingsView.tsx` with transport mode selection (Built-in Local, Custom Stdio Command, Remote ACP Server), model selector, and live connection testing.
- Added 8 unit tests in `desktop/tests/integrations-sync.test.ts`. Total: **19/19 Vitest tests passing**.
- Full TypeScript & Vite build verified with zero errors.

### [2026-08-31 13:07:00] - Step 0.5: Web Research & Upstream Architecture Analysis (OpenWhispr & Kokoro-82M)
- **OpenWhispr Research**:
  - Confirmed canonical repository: `github.com/OpenWhispr/openwhispr` (active, MIT License, Electron 41 + React + TS).
  - Engine architecture: Relies on `whisper.cpp` / `sherpa-onnx` for local GPU/CPU accelerated transcription and BYOK cloud Whisper endpoints.
  - Investigated macOS known issues: Microphone/Accessibility permissions, architecture mismatch between Node.js and Electron arm64 native binaries, and audio cache paths.
- **Kokoro-82M Research**:
  - Model weights: ~327MB Apache-2.0 checkpoint (`Kokoro-82M-v1.0-ONNX`).
  - Serving architecture: Lightweight ONNX runtime (`kokoro-onnx` / `pykokoro`) running real-time on CPU.
- **Attribution & Licensing**:
  - Preserved license attributions in `desktop/README.md` and UI footers for OpenWhispr (MIT) and Kokoro-82M (Apache-2.0).

### [2026-08-31 13:35:00] - OpenWhispr Permissions & Focused-Window Text Injection Implementation
- **Permission Handling (b)**:
  - Wired Electron `systemPreferences.getMediaAccessStatus('microphone')` and `systemPreferences.isTrustedAccessibilityClient(false)` in `lumoraVoiceService.ts` matching OpenWhispr's `ipcHandlers.js:5262`.
  - Added `voiceCheckPermissions` and `voiceRequestMicPermission` IPC handlers.
- **Focused Window Text Injection (c)**:
  - Wired cross-platform text injection in `lumoraVoiceService.ts` based on OpenWhispr's `ClipboardManager` (`src/helpers/clipboard.js`):
    - macOS: AppleScript keystroke simulation via `osascript` (`keystroke "v" using command down`).
    - Windows: PowerShell SendKeys `^v`.
    - Linux: `xdotool key ctrl+v`.
    - Automatically preserves and restores original user clipboard contents after 500ms.
- **Global Hotkey Capture (a)**:
  - Documented use of Electron's standard `globalShortcut` module (`Option+Space` / `Alt+Space` and `Cmd+Shift+V`) matching OpenWhispr's `main.js:1662-1930` registration pattern.
### [2026-08-31 13:45:00] - Full Pipeline Implementation Complete (Steps 4–7)
- **Step 4: Route (Wekan Board Cards Integration)**:
  - Implemented note-to-card transformation and routing via `useBoardStore.getState().createCard()`.
  - Added single card routing ("Send to Board" icon) and batch routing ("Route All to Board") in `VoicePanel.tsx`.
  - Maps `suggestedList` to board lists with fallback to the first active list, formatting task descriptions, urgency, and hashtag labels.
  - Linked candidate note status updates (`accepted`) and audit logs in dictation history.
- **Step 5: History (Searchable Dictation Session Audit)**:
  - Created `desktop/src/renderer/lib/voiceHistoryManager.ts` managing persistent local storage for up to 200 sessions.
  - Implemented full-text search across transcripts, note titles, descriptions, and tags.
  - Added dedicated "History" tab in `VoicePanel.tsx` with session cards, timestamps, candidate count, board routing tags, and 1-click session re-loading.
- **Step 6: TTS Output (Kokoro-82M Speech Synthesis)**:
  - Created `desktop/src/main/kokoroTtsService.ts` supporting 54 preset voices (`af_heart`, `af_bella`, `am_adam`, `bf_emma`, etc.) with local ONNX/Python execution on CPU and Web Speech fallback.
  - Added voice picker dropdown and "Speak / Read Aloud" button on candidate notes, transcript editor, and `CardDetailModal.tsx` description viewer.
- **Step 7: Upstream Sync Job (Git Tracking & Model Feeds)**:
  - Created `desktop/src/main/upstreamSyncService.ts` ensuring `upstream` git remotes for `.tools/openwhispr` and `.tools/kokoro`.
  - Implemented `upstream:checkStatus` fetching upstream diff stats without auto-merging.
  - Implemented model checkpoint version checker for Whisper, Parakeet, and Kokoro weights.
  - Created `desktop/src/renderer/components/UpstreamSyncModal.tsx` and mounted it in Board Tools menu.
- **Verification**:
  - 14 test suites with 60/60 passing tests (`bun vitest run`).
  - Production builds (`tsc -p tsconfig.electron.json` and `vite build`) verified with zero errors.


