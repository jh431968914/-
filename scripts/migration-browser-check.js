'use strict';
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createCampaignLevel } = require('../utils/game');
const { KEY } = require('../utils/progress');
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const second = createCampaignLevel(2);
    const data = { version: 1, completed: [1, 2], currentLevel: 2, sound: false,
      runs: { 1: [37, 38, 39], 2: second.solution.slice(0, 5), 3: [36, 37, 38] },
      runRevisions: { 1: 1, 2: second.revision, 3: 3 },
      runToolsUsed: { 1: { undo: 2, hint: 1 }, 2: { undo: 1, hint: 1 } }, runUnlockedSlots: { 2: 1 } };
    await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: KEY, value: JSON.stringify(data) });
    await page.reload({ waitUntil: 'networkidle' });
    assert.match(await page.locator('#live-status').textContent(), /已通关 2 \/ 10 关，已解锁 3 关/);
    assert.ok(await page.getByRole('button', { name: '开启声音', exact: true }).isVisible());
    await page.locator('[data-key="action-level-1"]').click();
    assert.match(await page.locator('#live-status').textContent(), /棋盘剩余 30 张/);
    await page.screenshot({ path: path.resolve(__dirname, '../tests/first-level-30-mobile.png'), fullPage: true });
    await page.locator('[data-key="action-levels"]').click();
    await page.locator('[data-key="action-level-2"]').click();
    assert.match(await page.locator('#live-status').textContent(), /棋盘剩余 40 张/);
    assert.match(await page.locator('#live-status').textContent(), /撤回剩余 2 次，提示剩余 0 次/);
    assert.equal(await page.locator('[data-key^="action-locked-slot-"]').count(), 0);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('[data-key="action-resume"]').click();
    assert.match(await page.locator('#live-status').textContent(), /棋盘剩余 40 张/);
    await page.locator('[data-key="action-levels"]').click();
    await page.locator('[data-key="action-level-3"]').click();
    assert.match(await page.locator('#live-status').textContent(), /棋盘剩余 48 张/);
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
    assert.deepEqual(saved.completed, [1, 2]); assert.equal(saved.sound, false);
    assert.equal(saved.runRevisions[1], 2); assert.equal(saved.runRevisions[2], 4);
    assert.deepEqual(saved.runs[2], data.runs[2]);
    assert.deepEqual(saved.runToolsUsed[2], data.runToolsUsed[2]); assert.equal(saved.runUnlockedSlots[2], 1);
    assert.deepEqual(errors, []);
    console.log('浏览器存档迁移通过：旧42张第一关重开为30张，通关、装饰、声音及第二关局面、道具、解锁格保留；旧第三关安全重开。');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
