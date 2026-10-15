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
    // v0.16 simplifies only levels 11-20. Both older revisions restart without losing completed rooms.
    const oldRuns = { 11: [55, 56, 50, 59], 12: [52, 57, 50, 58], 13: [57, 54, 49, 52], 14: [58, 54, 55, 59],
      15: [51, 53, 59, 57], 16: [59, 58, 54, 53], 17: [58, 51, 59, 57], 18: [54, 50, 53, 51], 19: [55, 52, 59, 58], 20: [52, 59, 49, 58] };
    for (const number of Object.keys(oldRuns).map(Number)) {
      for (const oldRevision of [1, 2]) {
        const completed = Array.from({ length: number - 1 }, (_, i) => i + 1);
        const save = { version: 1, completed, currentLevel: number, sound: false,
          runs: { 9: ninth.solution.slice(0, 4), [number]: oldRuns[number] }, runRevisions: { 9: ninth.revision, [number]: oldRevision },
          runToolsUsed: { 9: { undo: 2, hint: 1 }, [number]: { undo: 3, hint: 1 } }, runUnlockedSlots: { 9: 1, [number]: 2 } };
        await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: KEY, value: save });
        await page.reload({ waitUntil: 'networkidle' }); await page.locator('[data-key="action-resume"]').click();
        assert.match(await page.locator('#live-status').textContent(), /棋盘剩余 60 张，小窝 0 \/ 5 格，已锁定 2 格/);
        assert.match(await page.locator('#live-status').textContent(), /撤回剩余 3 次，提示剩余 1 次/);
        if (oldRevision === 2 && [11, 15, 16, 20].includes(number)) await page.screenshot({ path: path.resolve(__dirname, '../tests/patterns-v16-level-' + number + '.png'), fullPage: true });
        const level = createCampaignLevel(number);
        await page.locator('[data-key="tile-' + level.solution[0] + '"]').click();
        const migrated = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
        assert.equal(migrated.runRevisions[number], 3); assert.deepEqual(migrated.runs[number], [level.solution[0]]);
        assert.deepEqual(migrated.completed, completed); assert.equal(migrated.sound, false);
        assert.deepEqual(migrated.runs[9], save.runs[9]); assert.deepEqual(migrated.runToolsUsed[9], save.runToolsUsed[9]);
        assert.equal(migrated.runUnlockedSlots[9], 1);
        await page.reload({ waitUntil: 'networkidle' }); await page.locator('[data-key="action-resume"]').click();
        assert.match(await page.locator('#live-status').textContent(), /棋盘剩余 59 张/);
      }
    }
    assert.deepEqual(errors, []);
    console.log('浏览器存档迁移通过：旧第一关、第十关及第11～20关revision1/2安全重开，通关、收藏、声音与其他牌局道具保留，revision3牌局可继续恢复。');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
