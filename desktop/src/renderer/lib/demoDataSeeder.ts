import { wekanApi } from './wekanApi';
import { AuthSession } from './types';

export const seedSprintEngineeringData = async (
  session: AuthSession,
  boardId: string
) => {
  const { serverUrl, token, userId } = session;

  // 1. Fetch current lists and swimlanes
  const lists = await wekanApi.getLists(serverUrl, token, boardId);
  const swimlanes = await wekanApi.getSwimlanes(serverUrl, token, boardId);

  // Ensure standard columns: Backlog, To Do, In Progress, Review / QA, Done
  const listMap: Record<string, string> = {};
  for (const l of lists) {
    listMap[l.title.toLowerCase()] = l._id;
  }

  const desiredLists = ['Backlog', 'To Do', 'In Progress', 'Review / QA', 'Done'];
  for (const title of desiredLists) {
    if (!listMap[title.toLowerCase()]) {
      const created = await wekanApi.createList(serverUrl, token, boardId, title);
      listMap[title.toLowerCase()] = created._id;
    }
  }

  // Ensure subfolders / swimlanes: Frontend & UI, Backend & APIs, Infrastructure & DevOps, Design System
  const swimlaneMap: Record<string, string> = {};
  for (const s of swimlanes) {
    swimlaneMap[s.title.toLowerCase()] = s._id;
  }

  const desiredSwimlanes = [
    'Frontend & UI',
    'Backend & APIs',
    'Infrastructure & DevOps',
    'Design System',
  ];

  for (const title of desiredSwimlanes) {
    if (!swimlaneMap[title.toLowerCase()]) {
      const created = await wekanApi.createSwimlane(serverUrl, token, boardId, title);
      swimlaneMap[title.toLowerCase()] = created._id;
    }
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const getDate = (day: number) => new Date(currentYear, currentMonth, day).toISOString();

  // Rich Task Seed Specifications
  const demoTasks = [
    // Frontend & UI
    {
      title: 'Implement Interactive Calendar Timeline View',
      description: '### Objective\nProvide a full month calendar grid mapping Kanban cards to their due dates and timelines.\n\n### Key Requirements\n- Month navigation (Prev/Next/Today)\n- Click-to-schedule card creator\n- Seamless view switching',
      swimlane: 'Frontend & UI',
      list: 'Done',
      dueAt: getDate(14),
      checklists: [
        { title: 'Implementation Checklist', items: [{ title: 'Design calendar grid CSS', done: true }, { title: 'Map cards by dateKey', done: true }, { title: 'Wire month navigation', done: true }] }
      ]
    },
    {
      title: 'Pragmatic Drag-and-Drop Hitbox Precision Overhaul',
      description: '### Objective\nUpgrade drag-and-drop adapters with closest-edge indicator for pixel-perfect card reordering.',
      swimlane: 'Frontend & UI',
      list: 'Done',
      dueAt: getDate(18),
      checklists: [
        { title: 'Verification', items: [{ title: 'Column drop target', done: true }, { title: 'Card-over-card insertion', done: true }] }
      ]
    },
    {
      title: 'Client-Side Offline Caching & IndexedDB Sync',
      description: 'Cache active board snapshots in browser IndexedDB to allow zero-latency startup and offline reading.',
      swimlane: 'Frontend & UI',
      list: 'In Progress',
      dueAt: getDate(28),
      checklists: [
        { title: 'Tasks', items: [{ title: 'Setup idb wrapper', done: true }, { title: 'Background snapshot worker', done: false }] }
      ]
    },
    {
      title: 'Accessibility & Keyboard Navigation (WCAG 2.1)',
      description: 'Add ARIA attributes and arrow-key focus traversal across Kanban lists and cards.',
      swimlane: 'Frontend & UI',
      list: 'To Do',
      dueAt: getDate(30),
      checklists: []
    },

    // Backend & APIs
    {
      title: 'High-Throughput WebSocket DDP Connection Gateway',
      description: 'Ensure low-latency DDP subscription and reliable reconnection for live card mutations.',
      swimlane: 'Backend & APIs',
      list: 'Done',
      dueAt: getDate(10),
      checklists: [
        { title: 'Tasks', items: [{ title: 'Handshake protocol', done: true }, { title: 'Heartbeat ping/pong', done: true }] }
      ]
    },
    {
      title: 'Gemini 1.5 & Local Ollama AI Copilot Integration',
      description: 'Connect LLM service with workspace context for natural language querying and task specs.',
      swimlane: 'Backend & APIs',
      list: 'Done',
      dueAt: getDate(22),
      checklists: [
        { title: 'Endpoints', items: [{ title: 'Gemini generateContent', done: true }, { title: 'Ollama local client', done: true }] }
      ]
    },
    {
      title: 'Bi-Directional GitHub Webhook Event Dispatcher',
      description: 'Sync issue comments and state transitions between GitHub repository and WeKan cards in real-time.',
      swimlane: 'Backend & APIs',
      list: 'Review / QA',
      dueAt: getDate(27),
      checklists: [
        { title: 'Acceptance Criteria', items: [{ title: 'HMAC signature verification', done: true }, { title: 'Card label mapper', done: false }] }
      ]
    },

    // Infrastructure & DevOps
    {
      title: 'Embedded FerretDB v1 SQLite Database Engine',
      description: 'Package lightweight embedded solo desktop database using FerretDB SQLite backend.',
      swimlane: 'Infrastructure & DevOps',
      list: 'Done',
      dueAt: getDate(8),
      checklists: [
        { title: 'Milestones', items: [{ title: 'Compile FerretDB sqlite', done: true }, { title: 'Lifecycle port allocator', done: true }] }
      ]
    },
    {
      title: 'Bun 1.3 Toolchain & Fast Bundler Pipeline',
      description: 'Standardize on Bun runtime for instant compilation, Vitest test runs, and dev server execution.',
      swimlane: 'Infrastructure & DevOps',
      list: 'Done',
      dueAt: getDate(20),
      checklists: []
    },
    {
      title: 'Multi-Arch Docker Compose Production Deployment',
      description: 'Produce arm64 and amd64 Docker containers for high-availability self-hosted team setups.',
      swimlane: 'Infrastructure & DevOps',
      list: 'To Do',
      dueAt: getDate(29),
      checklists: []
    },

    // Design System
    {
      title: 'Architectural Obsidian Dark & Minimalist Light Palettes',
      description: 'Implement curated HSL tokens for deep obsidian dark mode, pure OLED black, and editorial light theme.',
      swimlane: 'Design System',
      list: 'Done',
      dueAt: getDate(12),
      checklists: []
    },
    {
      title: 'Bespoke Dual-Column Architectural Vector Mark',
      description: 'Replace standard monogram box with custom SVG geometric logo mark for Kanso Kanban.',
      swimlane: 'Design System',
      list: 'Done',
      dueAt: getDate(16),
      checklists: []
    },
  ];

  // Seed tasks sequentially
  for (const item of demoTasks) {
    const listId = listMap[item.list.toLowerCase()] || Object.values(listMap)[0];
    const swimlaneId = swimlaneMap[item.swimlane.toLowerCase()] || Object.values(swimlaneMap)[0];

    try {
      const createdCard = await wekanApi.createCard(serverUrl, token, boardId, listId, swimlaneId, item.title, item.description, userId);
      if (createdCard?._id) {
        // Update due date
        await wekanApi.updateCard(serverUrl, token, boardId, listId, createdCard._id, {
          dueAt: item.dueAt,
        });

        // Add checklists if any
        for (const cl of item.checklists) {
          const createdCl = await wekanApi.createChecklist(serverUrl, token, boardId, createdCard._id, cl.title);
          if (createdCl?._id) {
            for (const clItem of cl.items) {
              const createdItem = await wekanApi.createChecklistItem(serverUrl, token, boardId, createdCard._id, createdCl._id, clItem.title);
              if (createdItem?._id && clItem.done) {
                await wekanApi.updateChecklistItem(serverUrl, token, boardId, createdCard._id, createdCl._id, createdItem._id, { isFinished: true });
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Seeding card error:', e);
    }
  }
};
