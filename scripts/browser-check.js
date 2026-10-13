'use strict';
// Optional visual QA. Pass a path to an already installed Playwright module.
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { Game, createCampaignLevel, LEVELS } = require('../utils/game');
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 1 });
  let page;
  const errors = [];
  async function openPage(viewport) {
    page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', event => { if (event.type() === 'error') errors.push(event.text()); });
    if (viewport) await page.setViewportSize(viewport);
    await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  }
  async function click(action) { await page.locator('[data-key="action-' + action + '"]').click(); }
  async function statusMatches(pattern) { assert.match(await page.locator('#live-status').textContent(), pattern); }
  async function screenshot(name) { await page.screenshot({ path: path.resolve(__dirname, '../tests/' + name + '.png'), fullPage: true }); }
  async function pick(id) {
    await page.waitForFunction(key => {
      const el = document.querySelector('[data-key="' + key + '"]'); return el && !el.disabled;
    }, 'tile-' + id);
    await page.locator('[data-key="tile-' + id + '"]').click();
    await page.waitForFunction(() => {
      return document.querySelector('#interaction-layer').getAttribute('aria-busy') === 'false';
    });
  }
  try {
    await openPage();
    assert.ok(await page.locator('#background-music').evaluate(music => music.paused && music.loop));
    assert.equal(await page.title(), '喵喵消消屋 · 5 关体验版');
    await statusMatches(/已通关 0 \/ 5 关，已解锁 1 关/);
    await statusMatches(/已收集 0 \/ 5 件装饰。下一件奖励：暖暖软垫/);
    for (let number = 2; number <= 5; number++) assert.ok(await page.locator('[data-key="action-level-' + number + '"]').isDisabled());
    await screenshot('desktop-levels');
    await click('help');
    assert.ok(await page.getByRole('button', { name: '知道啦，开始收拾', exact: true }).isVisible());
    await click('close');
    await page.setViewportSize({ width: 390, height: 844 }); await screenshot('mobile-levels');
    await click('room'); await statusMatches(/小屋还在等待第一件装饰/);
    assert.equal(await page.locator('[data-key^="action-"]').count(), 1);
    await screenshot('room-empty'); await click('close');
    await click('resume');
    await page.waitForFunction(() => { const music = document.getElementById('background-music'); return !music.paused && music.currentTime > 0; });
    await page.evaluate(() => { const music = document.getElementById('background-music'); music.currentTime = music.duration - 0.15; });
    await page.waitForFunction(() => { const music = document.getElementById('background-music'); return !music.paused && music.currentTime < 2; });
    assert.ok(await page.locator('[data-key^="tile-"][disabled]').count() > 0);
    await click('hint');
    const first = createCampaignLevel(1);
    for (const id of first.solution.slice(0, 6)) await pick(id);
    await statusMatches(/已消除 1 组/);
    await click('undo'); await statusMatches(/棋盘剩余 25 张/); await statusMatches(/已消除 0 组/);
    // Open a new document to verify exact board and undo-history restoration.
    await page.close(); await openPage({ width: 390, height: 844 });
    assert.ok(await page.getByRole('button', { name: '继续第 1 关', exact: true }).isVisible());
    await click('resume'); await statusMatches(/棋盘剩余 25 张/);
    assert.match(await page.locator('[data-key="action-undo"]').getAttribute('aria-label'), /剩余 2 次/);
    assert.ok(await page.locator('[data-key="action-hint"]').isDisabled());
    await pick(first.solution[5]); await statusMatches(/已消除 1 组/);
    await click('undo'); await click('undo');
    await statusMatches(/棋盘剩余 26 张/);
    assert.ok(await page.locator('[data-key="action-undo"]').isDisabled());
    await page.keyboard.press('Control+z'); await statusMatches(/棋盘剩余 26 张/);
    await page.reload({ waitUntil: 'networkidle' }); await click('resume');
    assert.ok(await page.locator('[data-key="action-undo"]').isDisabled());
    assert.ok(await page.locator('[data-key="action-hint"]').isDisabled());
    await screenshot('tools-exhausted');
    await click('restart'); await statusMatches(/棋盘剩余 30 张/);
    assert.match(await page.locator('[data-key="action-undo"]').getAttribute('aria-label'), /剩余 3 次/);
    assert.ok(await page.locator('[data-key="action-hint"]').isEnabled());
    for (const info of LEVELS) {
      const level = createCampaignLevel(info.number);
      if (info.number > 1) {
        for (const id of level.solution.slice(0, 3)) await pick(id);
        await click('levels');
        await statusMatches(new RegExp('已通关 ' + (info.number - 1) + ' / 5'));
        if (info.number < 5) assert.ok(await page.locator('[data-key="action-level-' + (info.number + 1) + '"]').isDisabled());
        await page.reload({ waitUntil: 'networkidle' });
        assert.ok(await page.getByRole('button', { name: '继续第 ' + info.number + ' 关', exact: true }).isVisible());
        await click('resume');
        await statusMatches(new RegExp('棋盘剩余 ' + (level.tiles.length - 3) + ' 张'));
        await click('restart');
      }
      const locks = page.locator('[data-key^="action-locked-slot-"]');
      assert.equal(await locks.count(), info.lockedSlots);
      await statusMatches(new RegExp('小窝 0 / ' + (7 - info.lockedSlots) + ' 格，已锁定 ' + info.lockedSlots + ' 格'));
      if (info.lockedSlots) {
        await locks.first().click();
        await statusMatches(new RegExp('小窝 0 / ' + (7 - info.lockedSlots) + ' 格'));
        const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('meow-match-progress-v1')));
        assert.equal(saved.runUnlockedSlots[info.number], 0);
      }
      await screenshot('level-' + info.number);
      for (const id of level.solution) await pick(id);
      await statusMatches(new RegExp('第 ' + info.number + ' 关过关啦'));
      const reward = ['暖暖软垫', '毛线小篮', '窗边绿植', '猫爪相框', '暖光小灯'][info.number - 1];
      await statusMatches(new RegExp('获得' + reward + '，已自动摆进小屋'));
      await page.locator('[data-key="action-' + (info.number < 5 ? 'next' : 'finish') + '"]').waitFor({ state: 'visible' });
      await screenshot('victory-' + info.number);
      if (info.number < 5) {
        await click('room');
        await statusMatches(new RegExp('我的小屋，已收集 ' + info.number + ' / 5 件装饰'));
        await statusMatches(new RegExp('已摆放：.*' + reward));
        if (info.number === 1) await screenshot('room-first');
        await click('close');
      }
      console.log('已通过第 ' + info.number + ' 关：' + info.name + '，完成 ' + info.total + ' 次真实取牌。');
      if (info.number < 5) {
        assert.ok(await page.getByRole('button', { name: '进入第' + (info.number + 1) + '关：' + LEVELS[info.number].name, exact: true }).isVisible());
        await click('next');
        await statusMatches(new RegExp('棋盘剩余 ' + LEVELS[info.number].total + ' 张'));
      } else {
        await click('finish'); await statusMatches(/已通关 5 \/ 5 关/);
        await statusMatches(/五件装饰已全部收集/);
        await screenshot('room-complete'); await click('close');
      }
    }
    await screenshot('all-completed');
    await page.close(); await openPage({ width: 390, height: 844 });
    await statusMatches(/已通关 5 \/ 5 关，已解锁 5 关/);
    await click('room'); await statusMatches(/已收集 5 \/ 5 件装饰/); await click('close');
    for (let number = 1; number <= 5; number++) assert.ok(await page.locator('[data-key="action-level-' + number + '"]').isEnabled());
    await click('level-1'); await statusMatches(/棋盘剩余 30 张/);
    const losing = new Game(first), loseRoute = [];
    while (losing.status === 'playing') {
      const held = [0, 0, 0, 0, 0, 0]; losing.tray.forEach(tile => held[tile.kind]++);
      const candidates = losing.available().sort((a, b) => held[a.kind] - held[b.kind]);
      const tile = candidates.find(item => held[item.kind] < 2) || candidates[0];
      losing.pick(tile.id); loseRoute.push(tile.id);
    }
    assert.equal(losing.status, 'lost');
    for (const id of loseRoute) await pick(id);
    await statusMatches(/暂存槽已满/);
    await page.reload({ waitUntil: 'networkidle' }); await click('resume');
    await statusMatches(/暂存槽已满/);
    await page.getByRole('button', { name: /撤回一步继续玩，剩余 3 次/ }).click();
    await statusMatches(/小窝 6 \/ 7 格/);
    await click('restart'); await click('sound');
    assert.ok(await page.locator('#background-music').evaluate(music => music.paused));
    assert.ok(await page.getByRole('button', { name: '开启声音', exact: true }).isVisible());
    await page.reload({ waitUntil: 'networkidle' });
    assert.ok(await page.getByRole('button', { name: '开启声音', exact: true }).isVisible());
    assert.ok(await page.locator('#background-music').evaluate(music => music.paused));
    await click('sound');
    await page.waitForFunction(() => !document.getElementById('background-music').paused);
    await click('sound'); assert.ok(await page.locator('#background-music').evaluate(music => music.paused));
    await page.setViewportSize({ width: 320, height: 640 }); await screenshot('small-mobile-levels');
    await click('room'); await screenshot('small-mobile-room'); await click('close');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await click('level-5'); await screenshot('small-mobile-game');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const fifth = new Game(createCampaignLevel(5)), smallLoseRoute = [];
    while (fifth.status === 'playing') {
      const held = Array(8).fill(0); fifth.tray.forEach(tile => held[tile.kind]++);
      const choices = fifth.available().sort((a, b) => held[a.kind] - held[b.kind]);
      const tile = choices.find(item => held[item.kind] < 2) || choices[0];
      fifth.pick(tile.id); smallLoseRoute.push(tile.id);
    }
    assert.equal(fifth.status, 'lost'); assert.equal(fifth.tray.length, 5);
    for (const id of smallLoseRoute) await pick(id);
    await statusMatches(/暂存槽已满/);
    await page.getByRole('button', { name: /撤回一步继续玩，剩余 3 次/ }).click();
    await statusMatches(/小窝 4 \/ 5 格，已锁定 2 格/);
    assert.equal(await page.locator('[data-key^="action-locked-slot-"]').count(), 2);
    assert.deepEqual(errors, []);
    console.log('浏览器验证通过：五关首次奖励、小屋自动摆放与重开保留、收藏弹窗、三种屏幕布局，以及原有锁格、失败撤回、背景音乐和限次道具；无浏览器错误。');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
