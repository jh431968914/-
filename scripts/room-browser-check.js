'use strict';
// Isolated browser saves for collection states, old-save backfill and visual QA.
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createCampaignLevel } = require('../utils/game');
const { KEY, DECORATIONS } = require('../utils/progress');
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  const sizes = { desktop: { width: 1280, height: 960 }, mobile: { width: 390, height: 844 }, small: { width: 320, height: 640 } };
  try {
    for (const [size, viewport] of Object.entries(sizes)) {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', event => { if (event.type() === 'error') errors.push(event.text()); });
      await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
      for (const count of [0, 1, 3, 5]) {
        const data = { version: 1, completed: Array.from({ length: count }, (_, index) => index + 1), sound: false };
        await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: KEY, value: data });
        await page.reload({ waitUntil: 'networkidle' });
        assert.match(await page.locator('#live-status').textContent(), new RegExp('已收集 ' + count + ' / 5 件装饰'));
        if (count === 5) await page.screenshot({ path: path.resolve(__dirname, '../tests/room-v8-levels-' + size + '.png'), fullPage: true });
        await page.locator('[data-key="action-room"]').click();
        const status = await page.locator('#live-status').textContent();
        assert.match(status, /等距视角的小屋有两面墙、木地板/);
        for (const item of DECORATIONS.slice(0, count)) assert.ok(status.includes(item.name));
        assert.equal(await page.locator('[data-key^="action-"]').count(), 1);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        const state = count === 5 ? 'complete' : count === 0 ? 'empty' : count === 1 ? 'first' : 'three';
        await page.screenshot({ path: path.resolve(__dirname, '../tests/room-v8-' + state + '-' + size + '.png'), fullPage: true });
        await page.locator('[data-key="action-close"]').click();
      }
      if (size === 'mobile') {
        const level = createCampaignLevel(5);
        const data = { version: 1, completed: [1, 2, 3, 4], currentLevel: 5, sound: false,
          runs: { 5: level.solution.slice(0, -1) }, runRevisions: { 5: level.revision } };
        await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: KEY, value: data });
        await page.reload({ waitUntil: 'networkidle' });
        await page.locator('[data-key="action-resume"]').click();
        await page.locator('[data-key="tile-' + level.solution.at(-1) + '"]').click();
        await page.waitForFunction(() => document.getElementById('interaction-layer').getAttribute('aria-busy') === 'false');
        assert.match(await page.locator('#live-status').textContent(), /获得暖光小灯，已自动摆进小屋/);
        await page.screenshot({ path: path.resolve(__dirname, '../tests/room-v8-victory-mobile.png'), fullPage: true });
        await page.locator('[data-key="action-finish"]').click();
        assert.match(await page.locator('#live-status').textContent(), /五件装饰已全部收集/);
      }
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log('等距小屋专项验证通过：三种尺寸、0/1/3/5 件收藏状态、旧存档奖励补齐、最后一件首次奖励与小屋入口；无浏览器错误。');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
