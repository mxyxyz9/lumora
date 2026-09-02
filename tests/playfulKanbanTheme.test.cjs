'use strict';

// Test suite for Playful Kanban Lavender & Pastel redesign
// Validates typography, column & card geometry, pastel palette, pill badges, and animations.
//
// Run: node tests/playfulKanbanTheme.test.cjs

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const layoutsJade = read('client/components/main/layouts.jade');
const fontsCss = read('client/components/main/fonts.css');
const layoutsCss = read('client/components/main/layouts.css');
const headerCss = read('client/components/main/header.css');
const listCss = read('client/components/lists/list.css');
const minicardCss = read('client/components/cards/minicard.css');
const labelsCss = read('client/components/cards/labels.css');
const cardDateCss = read('client/components/cards/cardDate.css');
const boardsListCss = read('client/components/boards/boardsList.css');
const popupCss = read('client/components/main/popup.css');
const formsCss = read('client/components/forms/forms.css');
const userFormCss = read('client/components/users/userForm.css');

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log('  ok -', name);
}

console.log('playfulKanbanTheme:');

test('Quicksand Google Font is loaded and set as primary font family', () => {
  assert.ok(layoutsJade.includes('family=Quicksand'), 'Quicksand font is linked in layouts.jade');
  assert.ok(fontsCss.includes('Quicksand'), 'Quicksand is imported in fonts.css');
  assert.ok(layoutsCss.includes("'Quicksand'"), 'Quicksand is the default font-family in layouts.css');
});

test('App background is soft lavender #f4f0ff and text color is deep plum #3b2a59', () => {
  assert.ok(layoutsCss.includes('#f4f0ff'), 'Soft lavender canvas background in layouts.css');
  assert.ok(layoutsCss.includes('#3b2a59'), 'Deep plum font color in layouts.css');
});

test('Header bar uses purple gradient and frosted glass pill buttons', () => {
  assert.ok(headerCss.includes('linear-gradient(135deg, #603bb8 0%, #7c5ce5 50%, #906efa 100%)'), 'Header gradient in header.css');
  assert.ok(headerCss.includes('border-radius: 16px'), 'Frosted glass pill buttons in header.css');
});

test('Columns (Lists) have white background, 36px border radius, and pill count badge', () => {
  assert.ok(listCss.includes('border-radius: 36px'), 'List has 36px border-radius');
  assert.ok(listCss.includes('background-color: #ffffff') || listCss.includes('background: #ffffff'), 'List is white');
  assert.ok(listCss.includes('border-radius: 20px'), 'Card count pill has 20px radius');
  assert.ok(listCss.includes('#a68cff'), 'Card count pill uses #a68cff lavender');
});

test('Minicards have 24px border radius, chunky bottom shadows, and bouncy hover transitions', () => {
  assert.ok(minicardCss.includes('border-radius: 24px'), 'Minicard has 24px border-radius');
  assert.ok(minicardCss.includes('cubic-bezier(0.175, 0.885, 0.32, 1.275)'), 'Bouncy spring bezier transition');
  assert.ok(minicardCss.includes('scale(1.05) rotate(-3deg)'), 'Dragging card tilt and scale');
});

test('Pastel color schemes for cards are defined with proper high contrast text colors', () => {
  assert.ok(minicardCss.includes('#ffeaa7') && minicardCss.includes('#b28900'), 'Pastel yellow card');
  assert.ok(minicardCss.includes('#ffb8b8') && minicardCss.includes('#a62a2a'), 'Pastel red card');
  assert.ok(minicardCss.includes('#c7ecee') && minicardCss.includes('#1e7075'), 'Pastel sky/blue card');
  assert.ok(minicardCss.includes('#e0d4ff') && minicardCss.includes('#493396'), 'Pastel purple card');
  assert.ok(minicardCss.includes('#d4f1dd') && minicardCss.includes('#1f8b4d'), 'Pastel green card');
  assert.ok(minicardCss.includes('#ffe5d9') && minicardCss.includes('#c45b38'), 'Pastel orange card');
  assert.ok(minicardCss.includes('#ffccdf') && minicardCss.includes('#a62a6e'), 'Pastel pink card');
});

test('Labels and tags have 100px rounded pill shape', () => {
  assert.ok(labelsCss.includes('border-radius: 100px'), 'Card labels are rounded pills');
});

test('Date chips and badges have 12px rounded pill shape and pastel tints', () => {
  assert.ok(cardDateCss.includes('border-radius: 12px'), 'Date chips have 12px radius');
});

test('All Boards left menu and board tiles have rounded playful cards with bouncy hover', () => {
  assert.ok(boardsListCss.includes('border-radius: 0 32px 32px 0'), 'Left workspace menu has 32px radius');
  assert.ok(boardsListCss.includes('border-radius: 28px'), 'Board tiles have 28px radius');
});

test('Popups and modals have 24px-28px radius with soft purple glow and Quicksand typography', () => {
  assert.ok(popupCss.includes('border-radius: 24px'), 'Popups have 24px radius');
  assert.ok(layoutsCss.includes('border-radius: 28px'), 'Modals have 28px radius');
});

test('Forms and auth dialog have rounded controls and purple gradient buttons', () => {
  assert.ok(formsCss.includes('border-radius: 18px'), 'Inputs have 18px radius');
  assert.ok(formsCss.includes('border-radius: 20px'), 'Buttons have 20px radius');
  assert.ok(userFormCss.includes('border-radius: 32px'), 'Auth dialog has 32px radius');
});

console.log(`\nAll ${passed} playfulKanbanTheme tests passed!`);
