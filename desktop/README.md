# Lumora Desktop Application ⚡

Standalone Electron desktop application for **Lumora** — modern AI-powered Kanban workspace with autonomous engineering pipelines.

## 📦 Features
- **Modern UI & Themes**: Obsidian, Dark, Light, and OLED themes with theme-adaptive logo.
- **Custom Project Emojis**: Differentiate projects at a glance in the 68px collapsed dock and dropdowns.
- **Accidental Exit Protection**: Prompts before quitting (`Cmd+Q`) to safeguard active notes and cards.
- **Direct Task Deletion**: One-click quick delete on hover and inside task details modal.
- **Codex ACP & Gemini Fallback**: Multimodal AI breakdown and autonomous bug diagnosis.
- **Jira, Linear, Asana & GitHub 2-Way Sync**: Synchronize board state across external issue trackers.

## 🛠️ Scripts
- `npm run dev` — Start Vite dev server & Electron desktop window
- `npm run build` — Build renderer bundle
- `npm run build:electron` — Transpile Electron main and preload TypeScript scripts
- `npm test` — Run Vitest unit & integration test suites
- `npm run dist:mac` — Package `.dmg` installer for macOS Apple Silicon (arm64)
