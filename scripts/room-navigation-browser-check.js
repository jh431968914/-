'use strict';
// Room navigation uses isolated browser contexts and never the player's saved progress.
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { KEY } = require('../utils/progress');
const { attachLocalFixture } = require('./browser-fixture');
const sizes = { desktop: { width: 1280, height: 960 }, mobile: { width: 390, height: 844 }, small: { width: 320, height: 640 } };

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  try {
    for (const [size, viewport] of Object.entries(sizes)) {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: true });
      await attachLocalFixture(context);
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', event => { if (event.type() === 'error') errors.push(event.text()); });
      await page.clock.install({ time: new Date('2026-10-15T08:00:00Z') });
      await page.clock.pauseAt(new Date('2026-10-15T08:00:01Z'));
      await page.goto('http://127.0.0.1:4173/', { waitUntil: 'load' });
      const click = async action => { await page.locator('[data-key="action-' + action + '"]').click(); await page.clock.runFor(20); };
      const status = () => page.locator('#live-status').textContent();
      const saved = () => page.evaluate(key => localStorage.getItem(key), KEY);
      const load = async count => {
        await page.evaluate(({ key, count }) => localStorage.setItem(key, JSON.stringify({ version: 1,
          completed: Array.from({ length: count }, (_, i) => i + 1), sound: false })), { key: KEY, count });
        await page.reload({ waitUntil: 'load' });
      };
      const room = async name => { assert.match(await status(), new RegExp(name + '，第')); };
      const point = async (x, y) => {
        const box = await page.locator('#game').boundingBox();
        return { x: box.x + x * box.width / 390, y: box.y + y * box.height / 824 };
      };
      const drag = async (x, y, endX, endY) => {
        const start = await point(x, y), end = await point(endX, endY);
        await page.mouse.move(start.x, start.y); await page.mouse.down();
        await page.mouse.move(end.x, end.y, { steps: 8 }); await page.mouse.up(); await page.clock.runFor(20);
      };
      const shot = async name => {
        await page.clock.runFor(20);
        await page.screenshot({ path: path.resolve(__dirname, '../tests/room-navigation-v14-' + name + '-' + size + '.png'), fullPage: true });
      };
      const session = await context.newCDPSession(page);
      const touch = async (type, points) => session.send('Input.dispatchTouchEvent', { type, touchPoints: points });
      const swipe = async (x, y, endX, endY) => {
        const start = await point(x, y), end = await point(endX, endY);
        await touch('touchStart', [{ ...start, id: 1 }]);
        await touch('touchMove', [{ ...end, id: 1 }]); await touch('touchEnd', []); await page.clock.runFor(20);
      };

      await load(0); await click('room');
      assert.equal(await page.locator('[data-key^="action-room-"]').count(), 0);
      await shot('single');
      await load(10); await click('chapter-1'); await click('room');
      const before = await saved();
      assert.ok(await page.locator('[data-key="action-room-prev"]').isDisabled());
      assert.ok(await page.locator('[data-key="action-room-next"]').isEnabled());
      await shot('living');
      await click('room-next'); await room('阳光花房');
      assert.match(await status(), /第 2 \/ 3 间已解锁小屋/); await shot('garden');
      await drag(280, 250, 100, 250); await room('月光书房');
      assert.match(await status(), /已收集 0 \/ 5 件装饰/);
      assert.ok(await page.locator('[data-key="action-room-next"]').isDisabled());
      await shot('study-empty');
      await drag(280, 250, 100, 250); await room('月光书房');
      await swipe(100, 250, 280, 250); await room('阳光花房');
      // This starts on a furniture card; it must switch rooms without clicking the card.
      await swipe(103, 468, 285, 472); await room('暖暖客厅');
      assert.doesNotMatch(await status(), /小猫回应/);
      await click('collection-cushion'); assert.match(await status(), /小猫回应/);
      await drag(280, 468, 100, 468); await room('阳光花房');
      assert.doesNotMatch(await status(), /小猫回应/);
      for (const coordinates of [[280, 468, 247, 468], [280, 468, 280, 550], [280, 250, 180, 450]]) {
        await drag(...coordinates); await room('阳光花房'); assert.doesNotMatch(await status(), /小猫回应/);
      }
      const start = await point(280, 468), end = await point(100, 468);
      await touch('touchStart', [{ ...start, id: 1 }]); await touch('touchMove', [{ ...end, id: 1 }]); await touch('touchCancel', []);
      await page.clock.runFor(20); await room('阳光花房'); assert.doesNotMatch(await status(), /小猫回应/);
      await touch('touchStart', [{ ...start, id: 1 }]);
      await touch('touchStart', [{ ...start, id: 1 }, { ...end, id: 2 }]);
      await touch('touchMove', [{ ...end, id: 1 }, { ...start, id: 2 }]); await touch('touchEnd', []);
      await page.clock.runFor(20); await room('阳光花房'); assert.doesNotMatch(await status(), /小猫回应/);
      await page.keyboard.press('ArrowRight'); await page.clock.runFor(20); await room('月光书房');
      await page.keyboard.press('ArrowLeft'); await page.clock.runFor(20); await room('阳光花房');
      await page.locator('[data-key="action-room-prev"]').focus(); await page.keyboard.press('Enter'); await page.clock.runFor(20); await room('暖暖客厅');
      assert.equal(await saved(), before);
      await click('close');
      assert.match(await page.locator('[data-key="action-room"]').getAttribute('aria-label'), /暖暖客厅/);
      // Locked chapter previews still open from the chapter tabs; navigation returns to an unlocked room.
      await click('chapter-4'); await click('room'); await room('晨光露台');
      await click('room-prev'); await room('月光书房');
      assert.ok(await page.locator('[data-key="action-room-next"]').isDisabled());
      assert.equal(await saved(), before);

      await load(20); await click('chapter-2'); await click('room');
      await click('room-next'); await room('月光书房'); await shot('study');
      await swipe(280, 250, 100, 250); await room('晨光露台'); await shot('terrace');
      assert.match(await status(), /第 4 \/ 4 间已解锁小屋/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      // The new browser gesture handler also keeps drags from selecting board tiles.
      await load(0); await click('resume');
      const tile = page.locator('[data-key^="tile-"]:not([disabled])').first(), box = await tile.boundingBox();
      await page.mouse.move(box.x + box.width / 2 - 30, box.y + box.height / 2); await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 }); await page.mouse.up(); await page.clock.runFor(20);
      assert.match(await status(), /棋盘剩余 30 张/);
      await tile.click(); await page.clock.runFor(500); assert.match(await status(), /棋盘剩余 29 张/);
      console.log(size + '：箭头、真实触屏与鼠标滑动、键盘、解锁边界、家具点击防误触、存档保留通过。');
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log('三种尺寸的小屋导航验证通过，无浏览器错误；截图位于 tests/room-navigation-v14-*.png。');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
