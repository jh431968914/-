'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { BOARD_X, BOARD_Y } = require('../utils/view');
const { KEY } = require('../utils/progress');
const pagePath = path.resolve(__dirname, '../pages/game/game.js');
function device(options) {
  options = options || {};
  const storage = options.storage || new Map(), sounds = [], frames = new Map();
  const info = Object.assign({ windowWidth: 390, windowHeight: 756, screenHeight: 844,
    pixelRatio: 3, safeArea: { bottom: 810 } }, options.info);
  const ctx = new Proxy({}, { get(target, key) { return key in target ? target[key] : function () {}; } });
  let nextFrame = 0, page, queuedReady;
  const canvas = { getContext: () => ctx, requestAnimationFrame(callback) {
    const id = ++nextFrame; frames.set(id, callback); return id;
  }, cancelAnimationFrame(id) { frames.delete(id); } };
  const wx = {
    getWindowInfo: () => info, getSystemInfoSync: () => info,
    getStorageSync: key => storage.get(key), setStorageSync: (key, value) => storage.set(key, value),
    vibrateShort() {}, showToast() {},
    createInnerAudioContext() {
      const sound = { playing: false, destroyed: false, onError() {},
        play() { this.playing = true; }, pause() { this.playing = false; }, stop() { this.playing = false; }, destroy() { this.playing = false; this.destroyed = true; } };
      sounds.push(sound); return sound;
    }
  };
  if (options.legacy) delete wx.getWindowInfo;
  vm.runInNewContext(fs.readFileSync(pagePath, 'utf8'), { Page: definition => { page = definition; },
    wx, require: createRequire(pagePath), console });
  page.data = Object.assign({}, page.data);
  page.setData = (value, done) => { Object.assign(page.data, value); if (done) done(); };
  page.createSelectorQuery = () => {
    let fields;
    const query = { select() { return query; }, fields(value) { fields = value; return query; },
      boundingClientRect() { fields = null; return query; },
      exec(callback) {
        const result = fields ? { width: info.windowWidth, height: info.windowHeight - page.data.safeBottom,
          node: fields.node ? canvas : undefined } : { left: 0, top: 88, width: info.windowWidth, height: info.windowHeight - page.data.safeBottom };
        if (options.deferReady && fields && fields.node) queuedReady = () => callback([result]);
        else callback([result]);
      }
    };
    return query;
  };
  page.onLoad(); page.onShow(); page.onReady();
  function point(x, y, client) {
    const view = page._view;
    const px = view.offsetX + x * view.scale, py = view.offsetY + y * view.scale;
    return client ? { clientX: px, clientY: py + 88 } : { x: px, y: py };
  }
  function tap(x, y, client) {
    const touch = point(x, y, client);
    page.onTouchStart({ touches: [touch] }); page.onTouchEnd({ changedTouches: [touch] });
  }
  return { page, storage, sounds, frames, info, canvas, point, tap, finishReady: () => queuedReady && queuedReady() };
}
test('微信页面为底部安全区域留白，游戏按钮仍处于可用画布内', () => {
  const dev = device();
  assert.equal(dev.page.data.safeBottom, 34);
  assert.equal(dev.page._view.height, 722);
  dev.page._view.press('resume');
  const last = dev.page._view.controls().find(control => control.action === 'restart');
  const bottom = dev.page._view.offsetY + (last.y + last.h) * dev.page._view.scale;
  assert.ok(bottom <= dev.info.windowHeight - dev.page.data.safeBottom);
  dev.page.onUnload();
});
test('微信触摸的本地坐标与页面坐标均能正确取牌，并写入微信存储', () => {
  const dev = device(); dev.tap(195, 737);
  assert.equal(dev.page._view.screen, 'game');
  for (const client of [false, true]) {
    const tile = dev.page._view.game.available()[0];
    dev.tap(BOARD_X + tile.x + 27, BOARD_Y + tile.y + 27, client);
    const animation = dev.page._view.animation;
    dev.page._view.draw(animation.start + animation.duration + 1);
  }
  assert.equal(dev.page._view.game.steps, 2);
  assert.equal(JSON.parse(dev.storage.get(KEY)).runs[1].length, 2);
  dev.page.onUnload();
  const reopened = device({ storage: dev.storage }); reopened.page._view.press('resume');
  assert.equal(reopened.page._view.game.steps, 2); reopened.page.onUnload();
});
test('微信拖动、取消触摸、多指操作及没有起点的触摸均不取牌', () => {
  const dev = device(); dev.page._view.press('resume');
  const tile = dev.page._view.game.available()[0], touch = dev.point(BOARD_X + tile.x + 27, BOARD_Y + tile.y + 27);
  dev.page.onTouchEnd({ changedTouches: [touch] });
  dev.page.onTouchStart({ touches: [touch] });
  dev.page.onTouchEnd({ changedTouches: [{ x: touch.x + 30, y: touch.y }] });
  dev.page.onTouchStart({ touches: [touch] }); dev.page.onTouchCancel(); dev.page.onTouchEnd({ changedTouches: [touch] });
  dev.page.onTouchStart({ touches: [touch, touch] }); dev.page.onTouchEnd({ changedTouches: [touch] });
  assert.equal(dev.page._view.game.steps, 0); dev.page.onUnload();
});
test('微信进入后台停止动画和音效，回到前台恢复，卸载释放资源', () => {
  const dev = device(); dev.page._view.press('resume');
  dev.page._view.pick(dev.page._view.game.available()[0].id);
  assert.ok(dev.sounds.some(sound => sound.playing)); assert.equal(dev.frames.size, 1);
  dev.page.onHide(); assert.equal(dev.frames.size, 0); assert.ok(dev.sounds.every(sound => !sound.playing));
  dev.page.onShow(); assert.equal(dev.frames.size, 1);
  dev.page.onUnload(); assert.equal(dev.frames.size, 0); assert.ok(dev.sounds.every(sound => sound.destroyed));
});
test('微信尺寸变化后重算触摸区域，兼容较旧的窗口信息接口', () => {
  const dev = device({ legacy: true }); dev.page._view.press('resume');
  dev.info.windowWidth = 320; dev.info.windowHeight = 560; dev.info.screenHeight = 648; dev.info.safeArea.bottom = 648;
  dev.page.onResize(); assert.equal(dev.page.data.safeBottom, 0); assert.equal(dev.page._view.width, 320);
  const tile = dev.page._view.game.available()[0]; dev.tap(BOARD_X + tile.x + 27, BOARD_Y + tile.y + 27, true);
  assert.equal(dev.page._view.game.steps, 1); dev.page.onUnload();
});
test('微信页面已关闭时不再初始化延迟返回的画布', () => {
  const dev = device({ deferReady: true }); dev.page.onUnload(); dev.finishReady();
  assert.equal(dev.page._view, undefined); assert.equal(dev.frames.size, 0);
});
test('保留的微信页面适配支持滑动和箭头，取消及多指触摸不会切换小屋', () => {
  const storage = new Map([[KEY, JSON.stringify({ version: 1, completed: [1, 2, 3, 4, 5], sound: false })]]);
  const dev = device({ storage }), view = dev.page._view;
  view.press('chapter-1'); view.press('room');
  const saved = storage.get(KEY);
  dev.tap(340, 310, true); assert.equal(view.roomChapter, 2);
  const start = dev.point(100, 468, true), end = dev.point(280, 468, true);
  dev.page.onTouchStart({ touches: [start] }); dev.page.onTouchMove({ touches: [end] }); dev.page.onTouchEnd({ changedTouches: [end] });
  assert.equal(view.roomChapter, 1); assert.equal(view.roomReaction, null);
  const leftStart = dev.point(280, 310), leftEnd = dev.point(100, 310);
  dev.page.onTouchStart({ touches: [leftStart] }); dev.page.onTouchCancel(); dev.page.onTouchEnd({ changedTouches: [leftEnd] });
  dev.page.onTouchStart({ touches: [leftStart] }); dev.page.onTouchMove({ touches: [leftStart, leftEnd] }); dev.page.onTouchEnd({ changedTouches: [leftEnd] });
  dev.page.onTouchStart({ touches: [leftStart] }); dev.page.onResize(); dev.page.onTouchEnd({ changedTouches: [leftEnd] });
  assert.equal(view.roomChapter, 1); assert.equal(storage.get(KEY), saved); dev.page.onUnload();
});

test('微信工程已配置用户 AppID，音效有效且开发辅助文件不参与打包', () => {
  const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../project.config.json'), 'utf8'));
  assert.equal(config.appid, 'wx2b599f1da3db748d'); assert.equal(config.compileType, 'game');
  const ignored = config.packOptions.ignore.map(item => item.value);
  for (const value of ['pages', 'app.js', 'app.json', 'app.wxss', 'sitemap.json',
    'node_modules', 'web', 'scripts', 'tests', 'package-lock.json',
    '.git', '.gitignore', '.gitattributes', 'CHANGELOG.md']) assert.ok(ignored.includes(value), value + ' 不应进入小游戏包');
  for (const name of ['tap', 'match', 'win']) {
    const audio = fs.readFileSync(path.resolve(__dirname, '../assets/audio/' + name + '.wav'));
    assert.equal(audio.toString('ascii', 0, 4), 'RIFF'); assert.equal(audio.toString('ascii', 8, 12), 'WAVE');
  }
});
