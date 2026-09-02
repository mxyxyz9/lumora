# Lumora Desktop Application ⚡

Standalone Electron desktop application for **Lumora** — modern AI-powered Kanban workspace with autonomous engineering pipelines.

## 📦 Features
- **Modern UI & Themes**: Obsidian, Dark, Light, and OLED themes with theme-adaptive logo.
- **Lumora Voice & Speech-To-Text**: Global hotkey dictation (`⌥ Space` / `Alt+Space`), live waveform visualizer, Whisper speech-to-text, and AI candidate task extraction.
- **Custom Project Emojis**: Differentiate projects at a glance in the 68px collapsed dock and dropdowns.
- **Accidental Exit Protection**: Prompts before quitting (`Cmd+Q`) to safeguard active notes and cards.
- **Direct Task Deletion**: One-click quick delete on hover and inside task details modal.
- **Codex ACP & Gemini Fallback**: Multimodal AI breakdown and autonomous bug diagnosis.
- **Jira, Linear, Asana & GitHub 2-Way Sync**: Synchronize board state across external issue trackers.

## 🎙️ Speech Recognition & Audio Attribution
- **Speech-to-Text Base**: Forked architecture and integration patterns from [OpenWhispr](https://github.com/OpenWhispr/openwhispr) — MIT License. Local transcription via `whisper.cpp` and BYOK cloud Whisper endpoints.
- **Text-to-Speech Base**: Model integration based on [Kokoro-82M](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX) — Apache-2.0 License. Real-time CPU speech synthesis for candidate notes and board cards.

## 🛠️ Scripts
- `npm run dev` — Start Vite dev server & Electron desktop window
- `npm run build` — Build renderer bundle
- `npm run build:electron` — Transpile Electron main and preload TypeScript scripts
- `npm test` — Run Vitest unit & integration test suites
- `npm run dist:mac` — Package `.dmg` installer for macOS Apple Silicon (arm64)
