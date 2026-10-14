'use strict';
// Isolated chapter-four playthrough and ending checks; never uses player saves.
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createCampaignLevel, LEVELS, TYPES } = require('../utils/game');
const { KEY } = require('../utils/progress');
const { attachLocalFixture } = require('./browser-fixture');
const sizes = { mobile: { width: 390, height: 844 }, small: { width: 320, height: 640 }, desktop: { width: 1280, height: 960 } };
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true }), errors = [];
  try {
    for (const [size, viewport] of Object.entries(sizes)) {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
      await attachLocalFixture(context);
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', event => { if (event.type() === 'error') errors.push(event.text()); });
      await page.clock.install({ time: new Date('2026-10-14T08:00:00Z') });
      await page.clock.pauseAt(new Date('2026-10-14T08:00:01Z'));
      await page.goto('http://127.0.0.1:4173', { waitUntil: 'load' });
      const click = async action => { await page.locator('[data-key="action-' + action + '"]').click(); await page.clock.runFor(20); };
      const status = () => page.locator('#live-status').textContent();
      const shot = async name => { await page.clock.runFor(20); await page.screenshot({ path: path.resolve(__dirname, '../tests/ending-v13-' + name + '-' + size + '.png'), fullPage: true }); };
      const seed = async value => {
        await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: KEY, value });
        await page.reload({ waitUntil: 'load' });
      };
      if (size === 'mobile') {
        await seed({ version: 1, completed: Array.from({ length: 15 }, (_, i) => i + 1), currentLevel: 15, sound: false });
        assert.match(await status(), /晨光露台/);
        assert.equal(await page.locator('[data-key="action-level-16"]').isEnabled(), true);
        assert.equal(await page.locator('[data-key="action-level-17"]').isDisabled(), true);
        await shot('chapter-4'); await click('resume');
        for (const info of LEVELS.slice(15)) {
          const level = createCampaignLevel(info.number);
          assert.equal(await page.locator('[data-key^="tile-"]').count(), 60);
          assert.equal(await page.locator('[data-key^="action-locked-slot-"]').count(), 2);
          assert.ok(await page.getByRole('button', { name: new RegExp(TYPES[info.newKind].name) }).count());
          await shot('level-' + info.number);
          for (const id of level.solution) {
            await page.locator('[data-key="tile-' + id + '"]').click(); await page.clock.runFor(500);
            assert.equal(await page.locator('#interaction-layer').getAttribute('aria-busy'), 'false');
          }
          const completed = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).completed, KEY);
          assert.equal(completed.length, info.number);
          if (info.number === LEVELS.length) assert.match(await status(), /感谢界面：谢谢你/);
          else {
            await click('bring-home'); await click('skip-arrival');
            assert.match(await status(), new RegExp('已收集 ' + (info.number - 15) + ' / 5 件装饰'));
            await click('close'); await click('next');
          }
          console.log('第' + info.number + '关完成60次真实取牌，' + info.kinds + '种图案。');
        }
      } else {
        const level = createCampaignLevel(20);
        await seed({ version: 1, completed: Array.from({ length: 19 }, (_, i) => i + 1), currentLevel: 20, sound: false,
          runs: { 20: level.solution.slice(0, -1) }, runRevisions: { 20: level.revision } });
        await click('resume'); await page.locator('[data-key="tile-' + level.solution.at(-1) + '"]').click();
        await page.clock.runFor(500);
      }
      assert.match(await status(), /感谢界面：谢谢你，把小屋变成了家/);
      assert.match(await status(), /已完成 20 \/ 20 关，收到 20 份心意/);
      assert.equal(await page.locator('[data-key^="action-"]').count(), 3);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const saved = await page.evaluate(key => localStorage.getItem(key), KEY);
      await shot('thanks');
      // Escape returns to the result without losing the last ceremony or repeating thanks.
      await page.keyboard.press('Escape'); await page.clock.runFor(500);
      assert.doesNotMatch(await status(), /感谢界面/);
      assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), saved);
      await click('thanks');
      await page.locator('[data-key="action-thank-room"]').focus(); await page.keyboard.press('Enter');
      await page.clock.runFor(1200);
      assert.match(await status(), /晨光露台/); assert.match(await status(), /小猫来欢迎啦/);
      await shot('welcome'); await click('skip-arrival'); await click('levels');
      assert.doesNotMatch(await status(), /感谢界面/);
      await click('thanks'); await click('thank-levels');
      assert.doesNotMatch(await status(), /感谢界面/);
      await page.reload({ waitUntil: 'load' });
      assert.doesNotMatch(await status(), /感谢界面/);
      await click('thanks'); await click('thank-room');
      assert.match(await status(), /已收集 5 \/ 5 件装饰/);
      assert.doesNotMatch(await status(), /新家具入屋/);
      assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), saved);
      await shot('terrace'); await click('close'); await click('level-20');
      for (const id of createCampaignLevel(20).solution) { await page.locator('[data-key="tile-' + id + '"]').click(); await page.clock.runFor(500); }
      assert.doesNotMatch(await status(), /感谢界面/);
      assert.equal(await page.locator('[data-key="action-thanks"]').isEnabled(), true);
      console.log(size + '：感谢页、键盘返回、最后奖励、选关和重开不重播通过。');
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log('第四章与感谢页验证通过，三种尺寸无浏览器错误。');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
