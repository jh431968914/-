'use strict';
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createCampaignLevel, LEVELS, Game } = require('../utils/game');
const { KEY } = require('../utils/progress');
const { attachLocalFixture } = require('./browser-fixture');
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await attachLocalFixture(context);
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const second = createCampaignLevel(2);
    const data = { version: 1, completed: [1, 2], currentLevel: 2, sound: false,
      runs: { 1: [37, 38, 39], 2: second.solution.slice(0, 5), 3: [36, 37, 38] },
      runRevisions: { 1: 1, 2: second.revision, 3: 3 },
      runToolsUsed: { 1: { undo: 2, hint: 1 }, 2: { undo: 1, hint: 1 } }, runUnlockedSlots: { 2: 1 } };
    await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: KEY, value: JSON.stringify(data) });
    await page.reload({ waitUntil: 'networkidle' });
    assert.match(await page.locator('#live-status').textContent(), new RegExp('已通关 2 / ' + LEVELS.length + ' 关，已解锁 3 关'));
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
    // A v0.11 clear opens chapter three. Only the revised level ten run restarts.
    const ninth = createCampaignLevel(9);
    const previous = { version: 1, completed: Array.from({ length: 10 }, (_, i) => i + 1), currentLevel: 10, sound: false,
      runs: { 9: ninth.solution.slice(0, 4), 10: [59, 57, 55] }, runRevisions: { 9: ninth.revision, 10: 1 },
      runToolsUsed: { 9: { undo: 2, hint: 1 }, 10: { undo: 2, hint: 1 } }, runUnlockedSlots: { 9: 1, 10: 1 } };
    await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: KEY, value: previous });
    await page.reload({ waitUntil: 'networkidle' });
    assert.match(await page.locator('#live-status').textContent(), /月光书房/);
    assert.equal(await page.locator('[data-key="action-level-11"]').isEnabled(), true);
    await page.locator('[data-key="action-room"]').click();
    assert.match(await page.locator('#live-status').textContent(), /已收集 0 \/ 5 件装饰/);
    await page.locator('[data-key="action-close"]').click(); await page.locator('[data-key="action-chapter-2"]').click();
    await page.locator('[data-key="action-level-10"]').click();
    assert.match(await page.locator('#live-status').textContent(), /棋盘剩余 60 张，小窝 0 \/ 5 格，已锁定 2 格/);
    assert.match(await page.locator('#live-status').textContent(), /撤回剩余 3 次，提示剩余 1 次/);
    await page.locator('[data-key="action-levels"]').click(); await page.locator('[data-key="action-level-9"]').click();
    const restoredNinth = Game.fromMoves(ninth, previous.runs[9], 1);
    assert.match(await page.locator('#live-status').textContent(), new RegExp('棋盘剩余 50 张，小窝 ' + restoredNinth.tray.length + ' / 6 格，已锁定 1 格'));
    assert.match(await page.locator('#live-status').textContent(), /撤回剩余 1 次，提示剩余 0 次/);
    const revised = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
    assert.deepEqual(revised.completed, previous.completed); assert.equal(revised.sound, false);
    assert.deepEqual(revised.runs[9], previous.runs[9]); assert.equal(revised.runRevisions[10], 2);
    assert.deepEqual(errors, []);
    console.log('浏览器存档迁移通过：旧第一关与第十关安全重开，通关、收藏、声音及其他牌局道具保留；旧十关通关记录开启第十一关。');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
