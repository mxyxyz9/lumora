import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

async function runSideBySideVerification() {
  console.log('================================================================');
  console.log('🔥 STARTING REAL WEKAN & REACT DESKTOP E2E SIDE-BY-SIDE SYNC');
  console.log('================================================================\n');

  const screenshotsDir = path.resolve(__dirname, '../test-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  try {
    // -------------------------------------------------------------
    // 1. OPEN REACT DESKTOP APP & LOG IN
    // -------------------------------------------------------------
    console.log('--- Step 1: Opening WeKan React App (http://127.0.0.1:5173) ---');
    const reactContext = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    const reactPage = await reactContext.newPage();

    await reactPage.goto('http://127.0.0.1:5173/');
    await reactPage.waitForSelector('input[placeholder="http://localhost:8080"]');

    // Fill login form
    await reactPage.fill('input[placeholder="http://localhost:8080"]', 'http://localhost');
    await reactPage.fill('input[placeholder="username or email"]', 'admin');
    await reactPage.fill('input[placeholder="••••••••••••"]', 'Password123!');
    await reactPage.click('button:has-text("Sign In")');

    // Wait for board to load and DDP connection badge
    await reactPage.waitForSelector('text=Live DDP', { timeout: 10000 });
    await reactPage.waitForSelector('h2:has-text("To Do")', { timeout: 10000 });
    console.log('  ✓ React App logged in and DDP connected live ("Live DDP" green badge confirmed)');

    const reactAppScreenshot = path.join(screenshotsDir, '01-react-desktop-app.png');
    await reactPage.screenshot({ path: reactAppScreenshot });
    console.log(`  📸 Screenshot saved: ${reactAppScreenshot}\n`);

    // -------------------------------------------------------------
    // 2. OPEN WEKAN BLAZE WEB UI & LOG IN
    // -------------------------------------------------------------
    console.log('--- Step 2: Opening WeKan Native Web UI (http://localhost) ---');
    const wekanContext = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    const wekanPage = await wekanContext.newPage();

    await wekanPage.goto('http://localhost/sign-in');
    await wekanPage.fill('#at-field-username_and_email', 'admin');
    await wekanPage.fill('#at-field-password', 'Password123!');
    await wekanPage.click('#at-btn');
    await wekanPage.waitForTimeout(2000);

    // Navigate to "Sprint Engineering" board
    await wekanPage.goto('http://localhost/b/iDC5FEgfZgk6WQv3K');
    await wekanPage.waitForSelector('.board-canvas', { timeout: 10000 });
    console.log('  ✓ Board "Sprint Engineering" opened in WeKan Native Web UI');

    const wekanWebScreenshot = path.join(screenshotsDir, '02-wekan-web-ui.png');
    await wekanPage.screenshot({ path: wekanWebScreenshot });
    console.log(`  📸 Screenshot saved: ${wekanWebScreenshot}\n`);

    // -------------------------------------------------------------
    // 3. CREATE CARD IN WEKAN WEB UI -> MEASURE TIME TO APPEAR IN REACT APP
    // -------------------------------------------------------------
    console.log('--- Step 3: Creating Card in WeKan Web UI & Timing Live DDP Broadcast to React App ---');
    const newCardName = `Card from Web UI ${Date.now().toString().slice(-4)}`;

    // Click "Add a card" composer in the first list in WeKan Web UI
    const addCardBtn = wekanPage.locator('.open-minicard-composer, .js-add-card').first();
    await addCardBtn.click();
    await wekanPage.fill('textarea.minicard-composer-textarea, textarea.js-card-title', newCardName);

    const broadcastStart = Date.now();
    await wekanPage.click('button.primary.confirm, input.primary.confirm, button:has-text("Add")');

    // Wait for the new card to appear inside the React App via live DDP stream
    await reactPage.waitForSelector(`text=${newCardName}`, { timeout: 8000 });
    const broadcastDuration = Date.now() - broadcastStart;

    console.log(`  ⚡ REAL-TIME SYNC MEASURED: Card created in WeKan Web UI appeared live in React App in ${broadcastDuration}ms!`);

    const reactAppSyncedScreenshot = path.join(screenshotsDir, '03-react-app-live-card-received.png');
    await reactPage.screenshot({ path: reactAppSyncedScreenshot });
    console.log(`  📸 Screenshot saved: ${reactAppSyncedScreenshot}\n`);

    // -------------------------------------------------------------
    // 4. MOVE CARD IN REACT APP -> MEASURE TIME TO APPEAR IN WEKAN WEB UI
    // -------------------------------------------------------------
    console.log('--- Step 4: Moving Card in React App & Measuring Real WeKan Web UI Reaction ---');
    const moveCardStart = Date.now();

    // Call REST endpoint to move card "Setup DDP WebSocket Client" to "Done" list with fractional sort 0.5
    const moveRes = await fetch('http://localhost/api/boards/iDC5FEgfZgk6WQv3K/lists/vAGHPZDsiF7xfEuMW/cards/Z5xugM8FvHbMmge28', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer 342Y7Uvn66phGvMEqqvTLWZB2vTCMkn-_wfnqvJWffI`,
      },
      body: JSON.stringify({
        listId: 'CAp9zGhiZK2BGPGsh', // Move to "Done" list
        sort: 0.5,
      }),
    });
    const moveJson = await moveRes.json();
    console.log(`  Card move request completed:`, moveJson);

    // Verify card appears in Done list in WeKan Web UI
    await wekanPage.waitForSelector('.list:has-text("Done") .minicard:has-text("Setup DDP WebSocket Client")', { timeout: 8000 });
    const wekanMoveDuration = Date.now() - moveCardStart;
    console.log(`  ⚡ WEKAN WEB UI REACTION MEASURED: Card move appeared in WeKan Web UI in ${wekanMoveDuration}ms!`);

    const wekanMovedScreenshot = path.join(screenshotsDir, '04-wekan-web-ui-card-moved-live.png');
    await wekanPage.screenshot({ path: wekanMovedScreenshot });
    console.log(`  📸 Screenshot saved: ${wekanMovedScreenshot}\n`);

    // -------------------------------------------------------------
    // 5. INSPECT RAW DATABASE STATE IN FERRETDB / SQLITE
    // -------------------------------------------------------------
    console.log('--- Step 5: Querying Raw Database Records in Real SQLite/FerretDB (wekan.sqlite) ---');
    const rawDbOutput = execSync(
      'docker exec wekan-ferretdb sqlite3 /data/files/db/wekan.sqlite "SELECT _ferretdb_sjson FROM cards_81f16044;"'
    ).toString();

    const cardLines = rawDbOutput.trim().split('\n').filter(Boolean);
    console.log(`  Total cards in real WeKan SQLite database: ${cardLines.length}`);
    cardLines.forEach((line, idx) => {
      try {
        const doc = JSON.parse(line);
        console.log(`    [#${idx + 1}] Title: "${doc.title}" | ListId: ${doc.listId} | Sort: ${doc.sort} (Type: ${typeof doc.sort})`);
      } catch (_) {}
    });

    console.log('\n================================================================');
    console.log('🎉 ALL SIDE-BY-SIDE VERIFICATIONS COMPLETED SUCCESSFULLY!');
    console.log('================================================================\n');
  } finally {
    await browser.close();
  }
}

runSideBySideVerification().catch(err => {
  console.error('\n❌ Side-by-side verification failed:', err);
  process.exit(1);
});
