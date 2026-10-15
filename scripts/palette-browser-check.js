'use strict';
// Source-backed, isolated browser contexts; the player's running tab and save are never used.
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { KEY } = require('../utils/progress');
const { attachLocalFixture } = require('./browser-fixture');
const sizes = { mobile: { width: 390, height: 844 }, small: { width: 320, height: 640 } };
const retained = ['橘猫', '奶牛猫', '白猫', '小鱼', '毛线球', '猫爪'];
const removed = ['猫咪饼干', '猫咪牛奶', '羽毛玩具', '小鼠玩具', '猫草盆', '爱心抱枕', '星星挂饰', '小铃鼓'];

async function main() {
  process.env.MEOW_BROWSER_OFFLINE = '1';
  const browser = await chromium.launch({ channel: 'chrome', headless: true }), errors = [];
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
      for (const number of [11, 12, 15, 16, 17, 20]) {
        const chapter = number < 16 ? '月光书房' : '晨光露台';
        const expected = retained.concat(number < 16 ? ['猫碗', '蝴蝶结'] : ['蝴蝶结', '小纸箱']).sort();
        await page.evaluate(({ key, number }) => localStorage.setItem(key, JSON.stringify({ version: 1,
          completed: Array.from({ length: number - 1 }, (_, i) => i + 1), currentLevel: number, sound: false })), { key: KEY, number });
        await page.reload({ waitUntil: 'load' }); await click('resume');
        await page.clock.runFor(3500);
        assert.equal(await page.locator('#chapter-number').textContent(), String(number));
        assert.match(await page.locator('#chapter-subtitle').textContent(), /60 张 · 8 种图案/);
        assert.match(await status(), /棋盘剩余 60 张，小窝 0 \/ 5 格，已锁定 2 格/);
        const names = await page.locator('[data-key^="tile-"]').evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label').split('，')[0]));
        assert.equal(names.length, 60);
        assert.deepEqual([...new Set(names)].sort(), expected);
        assert.deepEqual(expected.map(name => names.filter(value => value === name).length).sort((a, b) => a - b), [6, 6, 6, 6, 9, 9, 9, 9]);
        for (const name of removed.concat(number < 16 ? ['铃铛', '小纸箱'] : ['铃铛', '猫碗'])) assert.ok(!names.includes(name));
        const newKind = await page.evaluate(number => window.MeowGame.LEVELS[number - 1].newKind ?? null, number);
        assert.equal(newKind, number === 11 ? 8 : number === 16 ? 9 : null);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        if ([11, 15, 16, 20].includes(number)) {
          await page.screenshot({ path: path.resolve(__dirname, '../tests/palette-v16-level-' + number + '-' + size + '.png'), fullPage: true });
        }

        const tile = page.locator('[data-key^="tile-"]:not([disabled])').first();
        const picked = Number((await tile.getAttribute('data-key')).slice(5));
        await tile.click(); await page.clock.runFor(500);
        assert.match(await status(), /棋盘剩余 59 张/);
        const before = await saved(), parsed = JSON.parse(before);
        assert.deepEqual(parsed.runs[number], [picked]); assert.equal(parsed.runRevisions[number], 3);
        assert.equal(parsed.sound, false); assert.equal(parsed.completed.length, number - 1);
        await page.reload({ waitUntil: 'load' }); await click('resume');
        assert.match(await status(), /棋盘剩余 59 张/); assert.equal(await saved(), before);

        await click('levels'); await click('room');
        assert.match(await status(), new RegExp(chapter + '，第'));
        await click('room-prev');
        assert.match(await status(), new RegExp((number < 16 ? '阳光花房' : '月光书房') + '，第'));
        await click('room-next'); assert.match(await status(), new RegExp(chapter + '，第'));
        assert.equal(await saved(), before);
        await click('close'); await click('resume');
        assert.equal(await page.locator('#chapter-number').textContent(), String(number));
        assert.match(await status(), /棋盘剩余 59 张/); assert.equal(await saved(), before);
        console.log(size + ' 第' + number + '关：八类牌、每类6/9张、章首新图案、保存恢复和小屋切换通过。');
      }
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log('两种尺寸共12个关卡场景验证通过，无浏览器错误；截图位于 tests/palette-v16-*.png。');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
