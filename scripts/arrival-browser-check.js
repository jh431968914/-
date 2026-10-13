'use strict';
// First-clear presentation uses isolated saves and a controlled clock, never player data.
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createCampaignLevel } = require('../utils/game');
const { KEY, DECORATIONS } = require('../utils/progress');
const SIZES = { desktop: { width: 1280, height: 960 }, mobile: { width: 390, height: 844 }, small: { width: 320, height: 640 } };

async function main() {
  if (process.argv[3] && !SIZES[process.argv[3]]) throw new Error('尺寸参数须为 desktop、mobile 或 small');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  try {
    for (const [size, viewport] of Object.entries(SIZES)) {
      if (process.argv[3] && process.argv[3] !== size) continue;
      const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', event => { if (event.type() === 'error') errors.push(event.text()); });
      await page.clock.install({ time: new Date('2026-10-13T08:00:00Z') });
      await page.clock.pauseAt(new Date('2026-10-13T08:00:01Z'));
      const click = action => page.locator('[data-key="action-' + action + '"]').click();
      const status = () => page.locator('#live-status').textContent();
      const shot = name => page.screenshot({ path: path.resolve(__dirname, '../tests/arrival-v10-' + name + '-' + size + '.png'), fullPage: true });
      await page.goto('http://127.0.0.1:4173', { waitUntil: 'load' });
      for (const item of DECORATIONS) {
        const level = createCampaignLevel(item.number);
        const save = { version: 1, completed: Array.from({ length: item.number - 1 }, (_, i) => i + 1), currentLevel: item.number, sound: false,
          runs: { [item.number]: level.solution.slice(0, -1) }, runRevisions: { [item.number]: level.revision } };
        await page.evaluate(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), { key: KEY, save });
        await page.reload({ waitUntil: 'load' });
        await click('resume');
        await page.locator('[data-key="tile-' + level.solution.at(-1) + '"]').click();
        await page.clock.runFor(500);
        assert.match(await status(), /点击带回小屋/);
        const saved = await page.evaluate(key => localStorage.getItem(key), KEY);
        assert.ok(JSON.parse(saved).completed.includes(item.number));
        if (item.number === 1) await shot('reward');
        await click('bring-home');
        assert.match(await status(), /正在轻轻落位/);
        assert.equal(await page.locator('[data-key="action-collection-' + item.id + '"]').isDisabled(), true);
        await page.clock.runFor(400); await shot(item.id + '-landing');
        await page.clock.runFor(900);
        assert.match(await status(), /小猫来欢迎啦/);
        assert.match(await status(), /小猫回应/);
        await shot(item.id + '-welcome');
        if (item.number % 2) {
          await page.clock.runFor(2100);
        } else {
          await page.locator('[data-key="action-skip-arrival"]').focus(); await page.keyboard.press('Enter');
          await page.clock.runFor(20);
          assert.equal(await page.evaluate(() => document.activeElement.dataset.key), 'action-next');
        }
        assert.doesNotMatch(await status(), /新家具入屋|小猫回应/);
        assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), saved);
        assert.equal(await page.locator('[data-key="action-collection-' + item.id + '"]').isEnabled(), true);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        if (item.number === 1) {
          // A completed presentation can close and reopen without replaying.
          await click('close'); await click('room');
          assert.doesNotMatch(await status(), /新家具入屋/);
          await click('close'); await click('next');
        } else await click(item.number < 5 ? 'next' : 'levels');
        if (item.number < 5) assert.match(await status(), /棋盘剩余/);
        else assert.match(await status(), /已通关 5 \/ 5/);
        await page.reload({ waitUntil: 'load' }); await click('room');
        assert.doesNotMatch(await status(), /新家具入屋/);
        assert.match(await status(), new RegExp('已收集 ' + item.number + ' / 5'));
      }
      console.log(size + '：五件家具落位、欢迎、跳过、续关和重开验证通过。');
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log('首次奖励入屋验证通过；所测尺寸无浏览器错误，存档与收藏正常。');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
