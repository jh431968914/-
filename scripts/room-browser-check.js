'use strict';
// Isolated browser saves for collection states, old-save backfill and visual QA.
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createCampaignLevel, CHAPTERS } = require('../utils/game');
const { KEY, chapterDecorations } = require('../utils/progress');
const { attachLocalFixture } = require('./browser-fixture');
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  const sizes = { desktop: { width: 1280, height: 960 }, mobile: { width: 390, height: 844 }, small: { width: 320, height: 640 } };
  try {
    for (const [size, viewport] of Object.entries(sizes)) {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
      await attachLocalFixture(context);
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', event => { if (event.type() === 'error') errors.push(event.text()); });
      await page.clock.install({ time: new Date('2026-10-14T08:00:00Z') });
      await page.clock.pauseAt(new Date('2026-10-14T08:00:01Z'));
      const click = async action => { await page.locator('[data-key="action-' + action + '"]').click(); await page.clock.runFor(20); };
      const shot = async name => { await page.clock.runFor(20); await page.screenshot({ path: path.resolve(__dirname, '../tests/room-v12-' + name + '-' + size + '.png'), fullPage: true }); };
      await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
      for (const chapter of CHAPTERS) {
        const decorations = chapterDecorations(chapter.number);
        for (const count of [0, 1, 3, 5]) {
          const data = { version: 1, completed: Array.from({ length: chapter.first - 1 + count }, (_, index) => index + 1), sound: false };
          await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: KEY, value: data });
          await page.reload({ waitUntil: 'networkidle' });
          if (chapter.number > 1 && count === 0) {
            assert.match(await page.locator('#live-status').textContent(), new RegExp(chapter.name));
            assert.equal(await page.locator('[data-key="action-level-' + chapter.first + '"]').isEnabled(), true);
          }
          await click('chapter-' + chapter.number);
          assert.match(await page.locator('#live-status').textContent(), new RegExp('已收集 ' + count + ' / 5 件装饰'));
          if (count === 5) await shot('levels-' + chapter.number);
          await click('room');
          const status = await page.locator('#live-status').textContent();
          assert.match(status, chapter.theme === 'study' ? /月光书房有夜蓝窗、暖木地板/ : /等距视角的小屋有两面墙、木地板/);
          for (const item of decorations.slice(0, count)) assert.ok(status.includes(item.name));
          for (const other of CHAPTERS.filter(item => item.number !== chapter.number)) {
            for (const item of chapterDecorations(other.number)) assert.ok(!status.includes(item.name));
          }
          assert.equal(await page.locator('[data-key^="action-"]').count(), count * 2 + 1);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
          const state = count === 5 ? 'complete' : count === 0 ? 'empty' : count === 1 ? 'first' : 'three';
          await shot(chapter.number + '-' + state);
          const saved = await page.evaluate(key => localStorage.getItem(key), KEY);
          if (count === 1) {
            await click('furniture-' + decorations[0].id);
            assert.match(await page.locator('#live-status').textContent(), /小猫回应/);
          }
          if (count === 5) {
            for (const item of decorations) {
              const target = page.locator('[data-key="action-furniture-' + item.id + '"]');
              await target.click();
              assert.match(await page.locator('#live-status').textContent(), /小猫回应/);
              assert.equal(await target.isDisabled(), true);
              await page.clock.runFor(950);
              await shot('react-' + item.id);
              await page.clock.runFor(2700);
              assert.doesNotMatch(await page.locator('#live-status').textContent(), /小猫回应/);
              const card = page.locator('[data-key="action-collection-' + item.id + '"]');
              await card.focus(); await page.keyboard.press('Enter');
              assert.match(await page.locator('#live-status').textContent(), /小猫回应/);
              await click('close'); await click('room');
              assert.doesNotMatch(await page.locator('#live-status').textContent(), /小猫回应/);
            }
          }
          assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), saved);
          await click('close');
        }
      }
      if (size === 'mobile') {
        const level = createCampaignLevel(5);
        const data = { version: 1, completed: [1, 2, 3, 4], currentLevel: 5, sound: false,
          runs: { 5: level.solution.slice(0, -1) }, runRevisions: { 5: level.revision } };
        await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: KEY, value: data });
        await page.reload({ waitUntil: 'networkidle' });
        await page.locator('[data-key="action-resume"]').click();
        await page.locator('[data-key="tile-' + level.solution.at(-1) + '"]').click();
        await page.clock.runFor(500);
        await page.waitForFunction(() => document.getElementById('interaction-layer').getAttribute('aria-busy') === 'false');
        assert.match(await page.locator('#live-status').textContent(), /获得暖光小灯，点击带回小屋/);
        await shot('chapter-1-victory');
        await click('bring-home'); await click('skip-arrival');
        assert.match(await page.locator('#live-status').textContent(), /五件装饰已全部收集/);
        await click('next');
        assert.match(await page.locator('#live-status').textContent(), /棋盘剩余 36 张，小窝 0 \/ 7 格，已锁定 0 格/);
        await click('levels'); await click('room');
        assert.match(await page.locator('#live-status').textContent(), /已收集 0 \/ 5 件装饰/);
        await click('close'); await click('chapter-1'); await click('room');
        assert.match(await page.locator('#live-status').textContent(), /已收集 5 \/ 5 件装饰/);
      }
      console.log(size + '：' + CHAPTERS.length + ' 间小屋的收藏、家具互动与章节切换验证通过。');
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log('家具互动验证通过：三种尺寸、每章 0/1/3/5 件收藏、十五种动画、家具点击与卡片键盘操作、关闭清理、存档不变、旧通关记录开启新章；无浏览器错误。');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
