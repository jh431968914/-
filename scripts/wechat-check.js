'use strict';
const automator = require('miniprogram-automator');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const { createCampaignLevel } = require('../utils/game');
const { Progress, KEY } = require('../utils/progress');
async function main() {
  const configured = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../project.config.json'), 'utf8'));
  if (configured.compileType !== 'miniprogram') {
    throw new Error('此脚本只验证小程序页面，当前工程为小游戏。请在微信开发者工具中编译 game.js 并使用“预览”进行真机验证。');
  }
  const cliPath = process.argv[2] || process.env.WECHAT_DEVTOOLS_CLI;
  if (!cliPath || !fs.existsSync(cliPath)) throw new Error('请提供微信开发者工具 cli.bat 的完整路径。');
  let mini, original, replaced = false, page, canvas;
  const errors = [];
  try {
    const endpoint = process.argv[3] || process.env.WECHAT_AUTOMATION_WS;
    if (endpoint) mini = await automator.connect({ wsEndpoint: endpoint });
    else if (process.platform === 'win32') {
      // Recent Node versions cannot spawn .bat files directly. Use the tool's own runtime.
      const toolNode = path.join(path.dirname(cliPath), 'node.exe');
      const toolCli = path.join(path.dirname(cliPath), 'cli.js');
      if (!fs.existsSync(toolNode) || !fs.existsSync(toolCli)) throw new Error('找不到开发者工具自带的 Node / CLI 入口。');
      const child = spawn(toolNode, [toolCli, 'auto', '--project', path.resolve(__dirname, '..'),
        '--auto-port', '9420', '--trust-project', '--lang', 'zh'], { stdio: 'inherit' });
      let failure; child.on('error', error => { failure = error; });
      child.on('exit', code => { if (code) failure = new Error('开发者工具启动失败，退出码 ' + code); });
      const deadline = Date.now() + 60000;
      while (!mini && Date.now() < deadline) {
        if (failure) throw failure;
        try { mini = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' }); }
        catch (_) { await new Promise(resolve => setTimeout(resolve, 500)); }
      }
      if (!mini) throw new Error('自动化接口连接超时，请确认开发者工具已登录并开启服务端口。');
    } else mini = await automator.launch({ cliPath, projectPath: path.resolve(__dirname, '..'),
      port: 9420, timeout: 60000, trustProject: true, args: ['--lang', 'zh'] });
    mini.on('exception', error => errors.push(JSON.stringify(error)));
    let account;
    const bootDeadline = Date.now() + 30000;
    while (!account && Date.now() < bootDeadline) {
      try {
        if (await mini.currentPage()) account = await mini.callWxMethod('getAccountInfoSync');
      } catch (_) { /* The IDE can accept connections before the app service finishes compiling. */ }
      if (!account) await new Promise(resolve => setTimeout(resolve, 200));
    }
    if (!account) throw new Error('小程序编译初始化超时：' + errors.join('\n'));
    assert.equal(account.miniProgram.appId, configured.appid, '自动化接口必须属于当前 AppID');
    original = await mini.callWxMethod('getStorageSync', KEY);
    await mini.callWxMethod('setStorageSync', KEY, JSON.stringify(new Progress().state));
    replaced = true;
    async function state() {
      return mini.evaluate(() => {
        const current = getCurrentPages().slice(-1)[0];
        const view = current && current._view;
        if (!view) return { screen: 'loading' };
        return { screen: view.screen, level: view.game.level.number, status: view.game.status,
          steps: view.game.steps, remaining: view.game.remaining(), tray: view.game.tray.length,
          matches: view.game.matches, animating: !!view.animation, modal: view.modal,
          safeBottom: current.data.safeBottom, width: view.width, height: view.height,
          visible: current._visible, frameActive: current._frame != null };
      });
    }
    async function until(predicate, label) {
      const deadline = Date.now() + 20000;
      let latest;
      while (Date.now() < deadline) {
        latest = await state(); if (predicate(latest)) return latest;
        await page.waitFor(80);
      }
      throw new Error(label + ' 超时：' + JSON.stringify(latest));
    }
    async function open() {
      page = await mini.reLaunch('/pages/game/game'); assert.ok(page);
      await until(value => value.screen !== 'loading', '画布初始化');
      canvas = await page.$('#gameCanvas'); assert.ok(canvas);
    }
    async function point(kind, value) {
      const local = await mini.evaluate((which, item) => {
        const current = getCurrentPages().slice(-1)[0], view = current._view;
        let x, y;
        if (which === 'action') {
          const control = view.controls().find(entry => entry.action === item);
          if (!control || control.disabled) throw new Error('操作不可用：' + item);
          x = control.x + control.w / 2; y = control.y + control.h / 2;
        } else {
          const tile = view.game.level.tiles[item];
          if (!view.game.isAvailable(item)) throw new Error('图块被遮挡：' + item);
          x = 48 + tile.x + 27; y = 287 + tile.y + 27;
        }
        return { x: view.offsetX + x * view.scale, y: view.offsetY + y * view.scale };
      }, kind, value);
      const offset = await canvas.offset();
      return { identifier: 0, pageX: Number(offset.left) + local.x, pageY: Number(offset.top) + local.y,
        clientX: Number(offset.left) + local.x, clientY: Number(offset.top) + local.y };
    }
    async function touch(contact) {
      await canvas.touchstart({ touches: [contact], changeTouches: [contact] });
      await canvas.touchend({ touches: [], changeTouches: [contact] });
    }
    async function action(name) { await touch(await point('action', name)); }
    async function pick(id) {
      const before = await state(); await touch(await point('tile', id));
      await until(value => value.steps === before.steps + 1 && !value.animating, '取牌 ' + id);
    }
    await open(); assert.equal((await state()).screen, 'levels');
    await mini.screenshot({ path: path.resolve(__dirname, '../tests/wechat-levels.png') });
    await action('help'); await until(value => value.modal === 'help', '玩法说明');
    await action('close'); await action('resume'); await until(value => value.screen === 'game', '进入第一关');
    const level = createCampaignLevel(1);
    for (const id of level.solution.slice(0, 6)) await pick(id);
    assert.equal((await state()).matches, 1);
    await action('undo'); const undone = await state(); assert.equal(undone.steps, 5); assert.equal(undone.matches, 0);
    await page.callMethod('onHide'); const hidden = await state(); assert.equal(hidden.visible, false); assert.equal(hidden.frameActive, false);
    await page.callMethod('onShow'); assert.equal((await state()).frameActive, true);
    await open(); await action('resume'); await until(value => value.screen === 'game', '恢复局面');
    assert.equal((await state()).steps, 5);
    await mini.screenshot({ path: path.resolve(__dirname, '../tests/wechat-game.png') });
    for (const id of level.solution.slice(5)) await pick(id);
    await until(value => value.status === 'won', '第一关通关');
    await mini.screenshot({ path: path.resolve(__dirname, '../tests/wechat-victory.png') });
    await action('next'); await until(value => value.level === 2, '进入第二关');
    assert.equal((await state()).remaining, 45);
    // Temporarily unlock the last level to verify all eight icons and the five-layer board.
    const lastState = new Progress().state; lastState.completed = [1, 2, 3, 4]; lastState.currentLevel = 5;
    await mini.callWxMethod('setStorageSync', KEY, JSON.stringify(lastState));
    await open(); await action('resume'); await until(value => value.level === 5 && value.screen === 'game', '进入第五关');
    assert.equal((await state()).remaining, 60);
    await mini.screenshot({ path: path.resolve(__dirname, '../tests/wechat-level-5.png') });
    for (const id of createCampaignLevel(5).solution.slice(0, 9)) await pick(id);
    assert.equal((await state()).steps, 9);
    assert.deepEqual(errors, []);
    console.log('微信模拟器验证通过：工程编译、Canvas 2D、实际触摸事件、三张消除、撤回、后台暂停、进度恢复、第一关通关、下一关和第五关绘制。');
    console.log('测试结束后恢复原微信存档，开发者工具保持打开。');
  } finally {
    if (mini) {
      try {
        if (replaced) {
          if (original === '' || original == null) await mini.callWxMethod('removeStorageSync', KEY);
          else await mini.callWxMethod('setStorageSync', KEY, original);
          await mini.reLaunch('/pages/game/game');
        }
      } finally { mini.disconnect(); }
    }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
