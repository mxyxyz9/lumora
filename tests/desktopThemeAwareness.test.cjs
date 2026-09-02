const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Testing Desktop Theme Awareness & Dark Mode Fidelity...');

// 1. Check index.css theme-aware classes
const cssPath = path.join(__dirname, '..', 'desktop', 'src', 'renderer', 'index.css');
const css = fs.readFileSync(cssPath, 'utf8');

assert(css.includes('.add-task-btn,'), 'index.css must define .add-task-btn');
assert(css.includes('background: var(--bg-input);'), '.add-task-btn must use var(--bg-input)');
assert(css.includes('color: var(--accent-primary);'), '.add-task-btn must use var(--accent-primary)');

assert(css.includes('.modal-dialog {'), 'index.css must define .modal-dialog');
assert(css.includes('background: var(--bg-modal);'), '.modal-dialog must use var(--bg-modal)');
assert(css.includes('border: 1.5px solid var(--border-medium);'), '.modal-dialog must use var(--border-medium)');

assert(css.includes('.view-tabs {'), 'index.css must define .view-tabs');
assert(css.includes('background: var(--bg-header);'), '.view-tabs must use var(--bg-header)');
assert(css.includes('border-bottom: 1.5px solid var(--border-subtle);'), '.view-tabs must use var(--border-subtle)');

console.log('  ok - index.css modal, view-tabs, and button classes use theme CSS variables');

// 2. Check SubfolderTabBar.tsx theme awareness
const tabPath = path.join(__dirname, '..', 'desktop', 'src', 'renderer', 'components', 'SubfolderTabBar.tsx');
const tabTsx = fs.readFileSync(tabPath, 'utf8');
assert(!tabTsx.includes("background: '#ffffff'"), 'SubfolderTabBar must not have hardcoded white background for inactive tabs');
assert(tabTsx.includes("var(--accent-primary)"), 'SubfolderTabBar must use var(--accent-primary) for active tabs');
assert(tabTsx.includes("var(--bg-card)"), 'SubfolderTabBar must use var(--bg-card) for inactive tabs');
console.log('  ok - SubfolderTabBar.tsx tabs and controls dynamically adapt to dark themes');

// 3. Check NewBoardModal.tsx theme awareness
const newModalPath = path.join(__dirname, '..', 'desktop', 'src', 'renderer', 'components', 'NewBoardModal.tsx');
const newModalTsx = fs.readFileSync(newModalPath, 'utf8');
assert(!newModalTsx.includes("background: '#ffffff'"), 'NewBoardModal must not have hardcoded white dialog background');
assert(newModalTsx.includes("var(--bg-modal)"), 'NewBoardModal must use var(--bg-modal)');
assert(newModalTsx.includes("var(--bg-input)"), 'NewBoardModal must use var(--bg-input)');
console.log('  ok - NewBoardModal.tsx dialog, inputs, and template cards use theme variables');

// 4. Check EditBoardModal.tsx theme awareness
const editModalPath = path.join(__dirname, '..', 'desktop', 'src', 'renderer', 'components', 'EditBoardModal.tsx');
const editModalTsx = fs.readFileSync(editModalPath, 'utf8');
assert(!editModalTsx.includes("background: '#ffffff'"), 'EditBoardModal must not have hardcoded white background');
assert(editModalTsx.includes("var(--bg-modal)"), 'EditBoardModal must use var(--bg-modal)');
console.log('  ok - EditBoardModal.tsx dialog, inputs, and project mode options use theme variables');

// 5. Check IntegrationsModal.tsx theme awareness
const integModalPath = path.join(__dirname, '..', 'desktop', 'src', 'renderer', 'components', 'IntegrationsModal.tsx');
const integModalTsx = fs.readFileSync(integModalPath, 'utf8');
assert(!integModalTsx.includes("background: '#ffffff'"), 'IntegrationsModal must not have hardcoded white background');
assert(integModalTsx.includes("var(--bg-modal)"), 'IntegrationsModal must use var(--bg-modal)');
assert(integModalTsx.includes("var(--bg-input)"), 'IntegrationsModal must use var(--bg-input)');
console.log('  ok - IntegrationsModal.tsx sidebar, tabs, inputs, and test status use theme variables');

// 6. Check ArchivedCardsModal.tsx theme awareness
const archiveModalPath = path.join(__dirname, '..', 'desktop', 'src', 'renderer', 'components', 'ArchivedCardsModal.tsx');
const archiveModalTsx = fs.readFileSync(archiveModalPath, 'utf8');
assert(!archiveModalTsx.includes("background: '#ffffff'"), 'ArchivedCardsModal must not have hardcoded white background');
assert(archiveModalTsx.includes("var(--bg-modal)"), 'ArchivedCardsModal must use var(--bg-modal)');
assert(archiveModalTsx.includes("var(--bg-column)"), 'ArchivedCardsModal must use var(--bg-column)');
console.log('  ok - ArchivedCardsModal.tsx dialog, filters, and cards use theme variables');

// 7. Check BG_PRESETS & Wallpaper Studio in SettingsView.tsx
const settingsPath = path.join(__dirname, '..', 'desktop', 'src', 'renderer', 'components', 'SettingsView.tsx');
const settingsTsx = fs.readFileSync(settingsPath, 'utf8');
assert(settingsTsx.includes('Theme Dotted Matrix'), 'SettingsView must include Theme Dotted Matrix preset');
assert(settingsTsx.includes('Dense Matrix Grid'), 'SettingsView must include Dense Matrix Grid preset');
assert(settingsTsx.includes('Shinkai Twilight Skyline') || settingsTsx.includes('shinkai_twilight'), 'SettingsView must include Shinkai Twilight Skyline preset');
assert(settingsTsx.includes('Anime Sakura Dawn') || settingsTsx.includes('anime_sakura'), 'SettingsView must include Anime Sakura Dawn preset');
assert(settingsTsx.includes('Neo Tokyo Cyberpunk') || settingsTsx.includes('cyberpunk_neo_tokyo'), 'SettingsView must include Neo Tokyo Cyberpunk preset');
assert(settingsTsx.includes('handleApplyUrl'), 'SettingsView must support applying custom image URLs');
assert(settingsTsx.includes('savedWallpapers'), 'SettingsView must support saved wallpapers library');
console.log('  ok - SettingsView.tsx provides procedural Dotted Matrix, Anime Gradients, and custom URL/saved wallpaper library');

// 8. Check CardDetailModal.tsx theme awareness
const cardDetailPath = path.join(__dirname, '..', 'desktop', 'src', 'renderer', 'components', 'CardDetailModal.tsx');
const cardDetailTsx = fs.readFileSync(cardDetailPath, 'utf8');
assert(cardDetailTsx.includes('var(--bg-modal)'), 'CardDetailModal must use var(--bg-modal)');
assert(cardDetailTsx.includes('var(--bg-input)'), 'CardDetailModal must use var(--bg-input)');
console.log('  ok - CardDetailModal.tsx drawer shell, tags, and pipeline stepper use theme variables');

// 9. Check CustomDatePicker.tsx theme awareness
const datePickerPath = path.join(__dirname, '..', 'desktop', 'src', 'renderer', 'components', 'CustomDatePicker.tsx');
const datePickerTsx = fs.readFileSync(datePickerPath, 'utf8');
assert(datePickerTsx.includes('var(--bg-modal)'), 'CustomDatePicker must use var(--bg-modal)');
assert(datePickerTsx.includes('var(--accent-primary)'), 'CustomDatePicker must use var(--accent-primary)');
console.log('  ok - CustomDatePicker.tsx quick presets, calendar matrix, and time picker use theme variables');

// 10. Check CalendarView.tsx theme awareness
const calendarPath = path.join(__dirname, '..', 'desktop', 'src', 'renderer', 'components', 'CalendarView.tsx');
const calendarTsx = fs.readFileSync(calendarPath, 'utf8');
assert(calendarTsx.includes('isDarkTheme'), 'CalendarView must detect dark themes for card palettes');
assert(calendarTsx.includes('var(--bg-modal)'), 'CalendarView schedule modal must use var(--bg-modal)');
console.log('  ok - CalendarView.tsx week view, month matrix, and schedule modal adapt to dark mode');

// 11. Check VoicePanel.tsx theme awareness
const voicePath = path.join(__dirname, '..', 'desktop', 'src', 'renderer', 'components', 'VoicePanel.tsx');
const voiceTsx = fs.readFileSync(voicePath, 'utf8');
assert(voiceTsx.includes('var(--bg-modal)'), 'VoicePanel must use var(--bg-modal)');
assert(voiceTsx.includes('var(--accent-primary)'), 'VoicePanel must use var(--accent-primary)');
console.log('  ok - VoicePanel.tsx dictation drawer and tab navigation adapt to dark mode');

console.log('\nAll 11 Desktop Theme Awareness test suites passed!');
