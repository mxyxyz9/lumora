# Lumora v1.0.1 — Official Release ⚡

### Simplified Quit Modal & Dynamic App / macOS Dock Icon Customizer

Lumora v1.0.1 introduces dynamic App & macOS Dock Icon theme customization, allowing users to choose between **Midnight Dark**, **Studio Light**, and **Liquid Glass** icon aesthetics, and delivers a sleek, simplified Quit Lumora confirmation experience.

---

## 🌟 What's New in v1.0.1

### 🎨 1. Dynamic App & macOS Dock Icon Switcher
- **Studio Light Icon**: Crisp Apple silver & platinum squircle designed for light macOS dock setups.
- **Liquid Glass Icon**: Translucent glassmorphic squircle with iridescent refraction borders, glossy specular sheen, and caustic neon bloom.
- **Midnight Dark Icon**: Deep obsidian squircle with luminous white and cobalt blue pills.
- **Real-Time Dock Sync**: Switch icon styles instantly in **Settings → Appearance & Curated Themes** with live macOS dock (`app.dock.setIcon`) and window icon updates.

### 🛡️ 2. Redesigned, Simplified Quit Modal
- **Clean Minimal Layout**: Removed clutter and extra callout boxes for a distraction-free dialog.
- **High-Contrast Theme-Adaptive Action Buttons**: Fixed white-on-white button contrast issues in dark themes.
- **Instant Keyboard Navigation**: Press `Esc` to stay or `Enter` to confirm exit.

---

# Lumora v1.0.0 — Official macOS Release ⚡

### AI-Powered Kanban Workspace & Autonomous Engineering Pipeline

Lumora is a modern desktop workspace engineered for developers, engineering leads, and agile product teams. Combining the visual clarity of Notion-style kanban boards with real-time AI copilots and autonomous issue-solving pipelines (Codex ACP & Google Gemini), Lumora enables you to plan, track, diagnose, and execute code changes seamlessly.

---

## 📦 Downloads

| Platform | Architecture | Installer | Size |
|---|---|---|---|
| **macOS** | Apple Silicon (`arm64` - M1 / M2 / M3 / M4) | [**Lumora-1.0.0-Mac-arm64.dmg**](https://github.com/mxyxyz9/lumora/releases/download/v1.0.0/Lumora-1.0.0-Mac-arm64.dmg) | `~108 MB` |

---

## 🌟 Key Highlights & Features

### 🎯 1. Notion-Grade Aesthetic & Custom Project Emojis
- **Adaptive High-Contrast Themes**: Curated Obsidian, Sleek Dark, Pure Light, and OLED themes with dynamic theme-adaptive branding.
- **Custom Project Emojis**: Assign customized emojis (`🎯`, `🚀`, `💻`, `⚡`, `📦`, `🎨`, `💡`) to easily differentiate between active repositories and task boards.
- **Collapsible Sidebar Dock (68px)**: Collapse the navigation panel into a clean icon dock with centered project emojis and quick-switcher dropdown.

### 🤖 2. Autonomous Codex ACP Dev Pipeline & Multimodal AI
- **Automated Root-Cause Diagnosis**: Analyzes card specs, local repository files, and reproduction steps using Codex ACP.
- **Multi-Model AI Copilot**: Generate acceptance criteria, technical task breakdowns, and test plans with automatic fallback between Codex ACP and Google Gemini.
- **Automated Worktrees & Quality Gates**: Create isolated git worktrees, inspect live diffs, and run test suites before merging.

### 🗂️ 3. Multi-Subfolder Workstreams & Milestones
- **Workstream Segmentation**: Divide complex boards into organized subfolders (e.g. *Frontend Core*, *API Services*, *DevOps & Infra*) with independent swimlanes and metrics.
- **Calendar & Timeline View**: Visualize sprint deliverables and critical deadlines with dynamic status badges (`overdue`, `today`, `due soon`).

### 🔄 4. Bidirectional 2-Way Issue Sync
- Seamlessly synchronize tasks and updates with **GitHub Issues**, **Jira Cloud / Server**, **Linear**, and **Asana**.

### 🔒 5. Privacy-Preserving Offline-First Architecture & Safety
- **Zero-Config Instant Launch**: Works out-of-the-box in local offline mode backed by persistent local storage and embedded SQLite/FerretDB.
- **Accidental Exit Protection**: Built-in "Confirm Before Quitting" prompt with `Cmd+Q` interception and configurable settings.
- **Intuitive Task Management**: One-click hover task deletion with confirmation modals and dedicated danger-zone controls.

---

## 🙏 Acknowledgements & Inspiration

Special thanks to the open-source projects that inspired Lumora:
- **[WeKan](https://github.com/wekan/wekan)** — For pioneering open-source collaborative Kanban architectures.
- **[Notion](https://notion.so)** — For inspiring the modern aesthetic and property workflow design.
- **[Atlassian Pragmatic Drag and Drop](https://atlassian.design/components/pragmatic-drag-and-drop)** — For 60fps drag-and-drop mechanics.
- **[Codex Agent Control Protocol (ACP)](https://github.com/features/copilot)** & **[Google Gemini](https://ai.google.dev/)** — For autonomous AI agent orchestration.
- **[Electron](https://www.electronjs.org/) & [Vite](https://vite.dev/)** — For the fast desktop runtime.
