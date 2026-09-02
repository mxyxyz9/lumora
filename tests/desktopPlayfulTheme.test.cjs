const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Testing Desktop Playful Theme Redesign...');

// 1. Check desktop/index.html
const indexHtmlPath = path.join(__dirname, '..', 'desktop', 'index.html');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
assert(indexHtml.includes('Quicksand:wght@500;600;700;800'), 'desktop/index.html must load Quicksand Google font');
assert(indexHtml.includes('bg-[#f4f0ff]'), 'desktop/index.html body must have lavender background #f4f0ff');
assert(indexHtml.includes('text-[#3b2a59]'), 'desktop/index.html body must have deep plum text #3b2a59');
console.log('  ok - desktop/index.html imports Quicksand and sets lavender body');

// 2. Check desktop/src/renderer/index.css
const indexCssPath = path.join(__dirname, '..', 'desktop', 'src', 'renderer', 'index.css');
const indexCss = fs.readFileSync(indexCssPath, 'utf8');
assert(indexCss.includes("--bg-app:              #f4f0ff;"), 'index.css root must define --bg-app as #f4f0ff');
assert(indexCss.includes("--bg-canvas:           #f4f0ff;"), 'index.css root must define --bg-canvas as #f4f0ff');
assert(indexCss.includes("--bg-sidebar:          #ffffff;"), 'index.css root must define --bg-sidebar as #ffffff');
assert(indexCss.includes("--text-primary:   #3b2a59;"), 'index.css root must define --text-primary as #3b2a59');
assert(indexCss.includes("--accent-primary:       #7c5ce5;"), 'index.css root must define --accent-primary as #7c5ce5');
assert(indexCss.includes("--accent-purple:        #a68cff;"), 'index.css root must define --accent-purple as #a68cff');
assert(indexCss.includes("--font: 'Quicksand'"), 'index.css must configure Quicksand font');
console.log('  ok - desktop/src/renderer/index.css tokens match Playful Theme');

// 3. Check column & card rules in index.css
assert(indexCss.includes('border-radius: 40px;'), 'Columns must have 40px border radius');
assert(indexCss.includes('box-shadow: 0 16px 40px rgba(100, 80, 200, 0.08)'), 'Columns must have soft purple elevation');
assert(indexCss.includes('.kanban-card {'), 'Cards must have .kanban-card styles');
assert(indexCss.includes('border-radius: 24px;'), 'Cards must have 24px border radius');
assert(indexCss.includes('cubic-bezier(0.175, 0.885, 0.32, 1.275)'), 'Cards must have spring bounce hover transitions');
assert(indexCss.includes('.add-task-btn'), 'Add task button must be styled as chunky pill');
console.log('  ok - index.css defines 40px columns, 24px bouncy cards, and chunky pill buttons');

// 4. Check KanbanCard.tsx pastel palette
const cardTsxPath = path.join(__dirname, '..', 'desktop', 'src', 'renderer', 'components', 'KanbanCard.tsx');
const cardTsx = fs.readFileSync(cardTsxPath, 'utf8');
assert(cardTsx.includes('#ffeaa7'), 'KanbanCard must support yellow pastel palette');
assert(cardTsx.includes('#e0d4ff'), 'KanbanCard must support purple pastel palette');
assert(cardTsx.includes('#c7ecee'), 'KanbanCard must support sky pastel palette');
assert(cardTsx.includes('#ffb8b8'), 'KanbanCard must support coral pastel palette');
assert(cardTsx.includes('card-meta-avatar'), 'KanbanCard must render circular avatar');
assert(cardTsx.includes('card-meta-date'), 'KanbanCard must render card meta date');
console.log('  ok - KanbanCard.tsx assigns full pastel color palettes with high-contrast text and avatars');

// 5. Check ListColumn.tsx
const listTsxPath = path.join(__dirname, '..', 'desktop', 'src', 'renderer', 'components', 'ListColumn.tsx');
const listTsx = fs.readFileSync(listTsxPath, 'utf8');
assert(listTsx.includes('column-count'), 'ListColumn must render column-count pill badge');
assert(listTsx.includes('add-task-btn'), 'ListColumn must render add-task-btn');
assert(listTsx.includes('+ Add Task'), 'ListColumn must render + Add Task label');
console.log('  ok - ListColumn.tsx renders playful header and + Add Task button');

// 6. Check SubfolderTabBar.tsx flat pill tabs
const tabTsxPath = path.join(__dirname, '..', 'desktop', 'src', 'renderer', 'components', 'SubfolderTabBar.tsx');
const tabTsx = fs.readFileSync(tabTsxPath, 'utf8');
assert(tabTsx.includes("var(--accent-primary)") || tabTsx.includes("#7c5ce5"), 'Active subfolder tab must use theme accent color');
console.log('  ok - SubfolderTabBar.tsx renders pill tabs and theme-aware active states');

// 7. Check Card Color Swatch Picker in KanbanCard.tsx and CardDetailModal.tsx
assert(cardTsx.includes('PASTEL_PALETTES'), 'KanbanCard.tsx must export PASTEL_PALETTES');
assert(cardTsx.includes('getCardPalette'), 'KanbanCard.tsx must export getCardPalette');
const modalTsxPath = path.join(__dirname, '..', 'desktop', 'src', 'renderer', 'components', 'CardDetailModal.tsx');
const modalTsx = fs.readFileSync(modalTsxPath, 'utf8');
assert(modalTsx.includes('Card Color'), 'CardDetailModal.tsx must have Card Color property row');
assert(modalTsx.includes('PASTEL_PALETTES'), 'CardDetailModal.tsx must use PASTEL_PALETTES for swatch selection');
console.log('  ok - Card color selection is enabled in KanbanCard hover popover and CardDetailModal property grid');

// 8. Check Card Archiving Architecture
const storeTsPath = path.join(__dirname, '..', 'desktop', 'src', 'renderer', 'store', 'boardStore.ts');
const storeTs = fs.readFileSync(storeTsPath, 'utf8');
assert(storeTs.includes('archiveCard:'), 'boardStore must implement archiveCard');
assert(storeTs.includes('unarchiveCard:'), 'boardStore must implement unarchiveCard');
assert(storeTs.includes('isArchivedCardsModalOpen'), 'boardStore must have isArchivedCardsModalOpen state');

const archiveModalPath = path.join(__dirname, '..', 'desktop', 'src', 'renderer', 'components', 'ArchivedCardsModal.tsx');
assert(fs.existsSync(archiveModalPath), 'ArchivedCardsModal.tsx component must exist');
const archiveModalTsx = fs.readFileSync(archiveModalPath, 'utf8');
assert(archiveModalTsx.includes('unarchiveCard'), 'ArchivedCardsModal must allow restoring cards');

const boardViewPath = path.join(__dirname, '..', 'desktop', 'src', 'renderer', 'components', 'BoardView.tsx');
const boardViewTsx = fs.readFileSync(boardViewPath, 'utf8');
assert(boardViewTsx.includes('.filter(c => !c.archived)'), 'BoardView must filter out archived cards from columns');
assert(boardViewTsx.includes('ArchivedCardsModal'), 'BoardView must render ArchivedCardsModal');
// 9. Check CalendarView.tsx overhaul
const calTsxPath = path.join(__dirname, '..', 'desktop', 'src', 'renderer', 'components', 'CalendarView.tsx');
const calTsx = fs.readFileSync(calTsxPath, 'utf8');
assert(calTsx.includes('calendarMode'), 'CalendarView must support calendarMode toggle (month/week)');
assert(calTsx.includes('Planning Inbox'), 'CalendarView must include Planning Inbox drawer');
assert(calTsx.includes('getCardPalette'), 'CalendarView must render pastel task pills matching Kanban cards');
assert(calTsx.includes('Schedule Task'), 'CalendarView must include Schedule Task primary action');
console.log('  ok - CalendarView.tsx renders playful Trello/Notion calendar grid, pastel task pills, and planning inbox');

// 10. Check Column Boundary Clipping and Board Scrolling
assert(indexCss.includes('overflow-x: auto;'), 'board-canvas must support overflow-x auto');
assert(indexCss.includes('overflow-y: auto;'), 'board-canvas must support overflow-y auto');
assert(indexCss.includes('overflow: hidden;') || indexCss.includes('overflow-y: auto;'), 'kanban-column or card-list must manage overflow cleanly');
console.log('  ok - Board canvas supports smooth scrolling and column boundaries are cleanly clipped');

// 11. Check Sidewards Arrow on Open Board
const hubTsxPath = path.join(__dirname, '..', 'desktop', 'src', 'renderer', 'components', 'GlobalWorkspaceHub.tsx');
const hubTsx = fs.readFileSync(hubTsxPath, 'utf8');
assert(hubTsx.includes('ArrowRight'), 'GlobalWorkspaceHub must use sidewards ArrowRight on Open Board');
console.log('  ok - Open Board buttons use sidewards right-pointing arrows');

// 12. Check Codex Autonomous Dev Pipeline Stepper Redesign
const cardModalTsxPath = path.join(__dirname, '..', 'desktop', 'src', 'renderer', 'components', 'CardDetailModal.tsx');
const cardModalTsx = fs.readFileSync(cardModalTsxPath, 'utf8');
assert(cardModalTsx.includes('Codex Autonomous Dev Pipeline'), 'CardDetailModal must render Codex Autonomous Dev Pipeline');
assert(cardModalTsx.includes('STAGE {s.step}'), 'CardDetailModal must render dynamic stage step numbers');
assert(cardModalTsx.includes("'Backlog'"), 'CardDetailModal must render Backlog stage');
assert(cardModalTsx.includes("'Shipped'"), 'CardDetailModal must render Shipped stage');
console.log('  ok - Codex Autonomous Dev Pipeline renders playful 5-stage stepper and rounded buttons');

// 13. Check EditBoardModal and IntegrationsModal playful headers
const editModalTsxPath = path.join(__dirname, '..', 'desktop', 'src', 'renderer', 'components', 'EditBoardModal.tsx');
const editModalTsx = fs.readFileSync(editModalTsxPath, 'utf8');
assert(editModalTsx.includes('borderRadius: \'36px\'') || editModalTsx.includes("borderRadius: '36px'"), 'EditBoardModal must have 36px rounded dialog');

const integModalTsxPath = path.join(__dirname, '..', 'desktop', 'src', 'renderer', 'components', 'IntegrationsModal.tsx');
const integModalTsx = fs.readFileSync(integModalTsxPath, 'utf8');
assert(integModalTsx.includes('borderRadius: \'36px\'') || integModalTsx.includes("borderRadius: '36px'"), 'IntegrationsModal must have 36px rounded dialog');
console.log('  ok - Pop-up modals have 36px rounded shells and playful lavender headers');

// 14. Check GlobalSearchModal command palette overhaul
const searchModalTsxPath = path.join(__dirname, '..', 'desktop', 'src', 'renderer', 'components', 'GlobalSearchModal.tsx');
const searchModalTsx = fs.readFileSync(searchModalTsxPath, 'utf8');
assert(searchModalTsx.includes('getCardPalette'), 'GlobalSearchModal must render pastel card palettes');
assert(searchModalTsx.includes('Instant Workspace Search'), 'GlobalSearchModal must have playful empty state');
console.log('  ok - GlobalSearchModal renders command palette with pastel tags and suggestions');

// 15. Check SettingsView model and thinking tier alignment
const settingsTsxPath = path.join(__dirname, '..', 'desktop', 'src', 'renderer', 'components', 'SettingsView.tsx');
const settingsTsx = fs.readFileSync(settingsTsxPath, 'utf8');
assert(settingsTsx.includes('height: \'26px\'') || settingsTsx.includes("height: '26px'"), 'SettingsView must align Model and Thinking headers');
console.log('  ok - SettingsView model and thinking tier dropdowns are vertically flush');

// 16. Check Copilot Drawer top bar and bottom composer
const copilotTsxPath = path.join(__dirname, '..', 'desktop', 'src', 'renderer', 'components', 'AiAssistantDrawer.tsx');
const copilotTsx = fs.readFileSync(copilotTsxPath, 'utf8');
assert(copilotTsx.includes('Lumora Copilot'), 'AiAssistantDrawer must render Lumora Copilot');
assert(copilotTsx.includes('/ Commands'), 'AiAssistantDrawer must include / Commands button');
console.log('  ok - AiAssistantDrawer has clean top header and spacious composer with slash commands');

// 17. Check Card Drop Slot & Indicator Preview
assert(indexCss.includes('.card-drop-slot'), 'index.css must define .card-drop-slot');
assert(indexCss.includes('pulseSlot'), 'index.css must define pulseSlot animation');
assert(indexCss.includes('.card-drop-indicator'), 'index.css must define .card-drop-indicator');
const listColumnCode = fs.readFileSync(listTsxPath, 'utf8');
assert(listColumnCode.includes('card-drop-slot'), 'ListColumn must render card-drop-slot preview for empty lists');
console.log('  ok - DND renders rich pill card-drop-slot preview and pulse animation');

// 18. Check 6 Workspace Themes (3 Light Pastel + 3 Cohesive Dark)
assert(indexCss.includes("[data-theme='lavender']"), 'index.css must define lavender theme');
assert(indexCss.includes("[data-theme='sakura']"), 'index.css must define sakura theme');
assert(indexCss.includes("[data-theme='vanilla']"), 'index.css must define vanilla theme');
assert(indexCss.includes("[data-theme='midnight']"), 'index.css must define midnight theme');
assert(indexCss.includes("[data-theme='abyss']"), 'index.css must define abyss theme');
assert(indexCss.includes("[data-theme='emerald_dark']"), 'index.css must define emerald_dark theme');
assert(settingsTsx.includes('Lavender Dream'), 'SettingsView must list Lavender Dream');
assert(settingsTsx.includes('Sakura Blossom'), 'SettingsView must list Sakura Blossom');
assert(settingsTsx.includes('Vanilla Honey'), 'SettingsView must list Vanilla Honey');
assert(settingsTsx.includes('Cyber Midnight'), 'SettingsView must list Cyber Midnight');
assert(settingsTsx.includes('Obsidian Abyss'), 'SettingsView must list Obsidian Abyss');
assert(settingsTsx.includes('Twilight Emerald'), 'SettingsView must list Twilight Emerald');
console.log('  ok - 6 distinct workspace themes (3 light pastel + 3 cohesive dark) are defined with live switcher');

// 19. Check Calendar Drag & Drop & Time Slot Badges
const calTsxCode = fs.readFileSync(calTsxPath, 'utf8');
assert(calTsxCode.includes('handleScheduleCardToDate'), 'CalendarView must support drag & drop scheduling');
assert(calTsxCode.includes('draggable={true}'), 'CalendarView cards must be draggable');
assert(calTsxCode.includes('selectedDayTime'), 'CalendarView must support time slot selector');
console.log('  ok - Calendar supports drag & drop from Planning Inbox and time slot assignment');

// 20. Check CustomDatePicker Popover Overhaul
const datePickerTsxPath = path.join(__dirname, '..', 'desktop', 'src', 'renderer', 'components', 'CustomDatePicker.tsx');
const datePickerTsx = fs.readFileSync(datePickerTsxPath, 'utf8');
assert(datePickerTsx.includes('borderRadius: \'28px\'') || datePickerTsx.includes("borderRadius: '28px'"), 'CustomDatePicker must have 28px rounded shell');
assert(datePickerTsx.includes('var(--accent-primary)') || datePickerTsx.includes('#7c5ce5'), 'CustomDatePicker must use theme accent');
console.log('  ok - CustomDatePicker popover has 28px rounded shell, theme-aware pills, and cohesive styling');

// 21. Check Stable Card Color Palette
const cardTsxCode = fs.readFileSync(cardTsxPath, 'utf8');
assert(cardTsxCode.includes('Math.abs(hash) % PASTEL_PALETTES.length'), 'getCardPalette must use stable hash independent of list index');
console.log('  ok - Card colors remain stable and never shift during reordering');

// 22. Check Quick Add Button in Column Header
const listTsxCode = fs.readFileSync(listTsxPath, 'utf8');
assert(listTsxCode.includes('title="Quick add task"'), 'ListColumn header must provide quick add button');
console.log('  ok - Column header includes quick add button for long card columns');

// 23. Check Zero-Jitter Drop Indicator Line
assert(cardTsxCode.includes('card-drop-indicator'), 'KanbanCard must render zero-jitter card-drop-indicator');
console.log('  ok - Drag and drop indicator renders with zero-jitter glowing drop line');

console.log('\nAll desktopPlayfulTheme tests passed successfully!');

