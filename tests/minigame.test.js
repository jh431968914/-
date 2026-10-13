'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { MiniGameRuntime } = require('../utils/minigame');
const { KEY } = require('../utils/progress');
const { BOARD_X, BOARD_Y } = require('../utils/view');
function mock(options) {
  options = options || {};
  const callbacks = {}, pending = new Map(), sounds = [], storage = options.storage || new Map();
  const info = { windowWidth: 390, windowHeight: 844, screenHeight: 844, pixelRatio: 3,
    statusBarHeight: 44, safeArea: { top: 44, bottom: 810 } };
  const ctx = new Proxy({}, { get(target, key) {
    if (key === 'ellipse' && options.noEllipse) return undefined;
    return key in target ? target[key] : function () {};
  } });
  const canvas = { getContext: () => ctx };
  const api = { createCanvas: () => canvas, getWindowInfo: () => info, getSystemInfoSync: () => info,
    getMenuButtonBoundingClientRect: () => ({ bottom: 80 }), getStorageSync: key => storage.get(key),
    setStorageSync: (key, value) => storage.set(key, value), vibrateShort() {},
    createInnerAudioContext() {
      const sound = { playing: false, destroyed: false, playCount: 0, onError() {}, play() { this.playing = true; this.playCount++; },
        pause() { this.playing = false; }, stop() { this.playing = false; }, destroy() { this.destroyed = true; this.playing = false; } };
      sounds.push(sound); return sound;
    }
  };
  for (const name of ['TouchStart', 'TouchEnd', 'TouchCancel', 'Hide', 'Show', 'WindowResize']) {
    api['on' + name] = fn => { callbacks[name] = fn; };
    api['off' + name] = fn => { if (callbacks[name] === fn) delete callbacks[name]; };
  }
  let id = 0;
  const runtime = new MiniGameRuntime(api, { requestAnimationFrame(fn) { pending.set(++id, fn); return id; }, cancelAnimationFrame(value) { pending.delete(value); } });
  function contact(x, y) { return { clientX: runtime.view.offsetX + x * runtime.view.scale,
    clientY: runtime.top + runtime.view.offsetY + y * runtime.view.scale }; }
  function tap(x, y) { const touch = contact(x, y); callbacks.TouchStart({ touches: [touch] }); callbacks.TouchEnd({ changedTouches: [touch] }); }
  return { runtime, callbacks, canvas, storage, sounds, pending, info, contact, tap };
}
test('小游戏画布避开状态栏、微信胶囊和底部安全区域', () => {
  const dev = mock(); assert.equal(dev.runtime.top, 88); assert.equal(dev.runtime.bottom, 34);
  assert.equal(dev.runtime.view.height, 722); assert.equal(dev.canvas.width, 1170);
  dev.tap(195, 737); assert.equal(dev.runtime.view.screen, 'game'); dev.runtime.destroy();
});
test('小游戏全局触摸能准确取牌并恢复设备存档', () => {
  const dev = mock(); dev.runtime.view.press('resume');
  const tile = dev.runtime.view.game.available()[0]; dev.tap(BOARD_X + tile.x + 27, BOARD_Y + tile.y + 27);
  assert.equal(dev.runtime.view.game.steps, 1); assert.equal(JSON.parse(dev.storage.get(KEY)).runs[1].length, 1);
  dev.runtime.destroy(); const next = mock({ storage: dev.storage }); next.runtime.view.press('resume');
  assert.equal(next.runtime.view.game.steps, 1); next.runtime.destroy();
});
test('小游戏拖动、取消和多指触摸不误取牌，后台停帧和音效', () => {
  const dev = mock(); dev.runtime.view.press('resume');
  const tile = dev.runtime.view.game.available()[0], point = dev.contact(BOARD_X + tile.x + 27, BOARD_Y + tile.y + 27);
  dev.callbacks.TouchStart({ touches: [point] }); dev.callbacks.TouchEnd({ changedTouches: [{ clientX: point.clientX + 30, clientY: point.clientY }] });
  dev.callbacks.TouchStart({ touches: [point] }); dev.callbacks.TouchCancel(); dev.callbacks.TouchEnd({ changedTouches: [point] });
  dev.callbacks.TouchStart({ touches: [point, point] }); dev.callbacks.TouchEnd({ changedTouches: [point] });
  assert.equal(dev.runtime.view.game.steps, 0);
  dev.tap(BOARD_X + tile.x + 27, BOARD_Y + tile.y + 27); assert.ok(dev.sounds.some(sound => sound.playing));
  dev.callbacks.Hide(); assert.equal(dev.pending.size, 0); assert.ok(dev.sounds.every(sound => !sound.playing));
  dev.callbacks.Show(); assert.equal(dev.pending.size, 1); dev.runtime.destroy();
  assert.equal(dev.pending.size, 0); assert.equal(Object.keys(dev.callbacks).length, 0);
});
test('小游戏尺寸变化重算触摸位置，缺少 ellipse 时仍可绘制全部图案', () => {
  const dev = mock({ noEllipse: true }); dev.runtime.view.press('resume');
  dev.info.windowWidth = 320; dev.info.windowHeight = 640; dev.info.screenHeight = 640; dev.info.safeArea.bottom = 640;
  dev.callbacks.WindowResize(); assert.equal(dev.runtime.bottom, 0); assert.equal(dev.runtime.view.width, 320);
  const tile = dev.runtime.view.game.available()[0]; dev.tap(BOARD_X + tile.x + 27, BOARD_Y + tile.y + 27);
  assert.equal(dev.runtime.view.game.steps, 1); dev.runtime.destroy();
});

test('微信旧存档自动显示全部装饰，缺少 ellipse 时仍能绘制等距小屋和关闭收藏', () => {
  const storage = new Map([[KEY, JSON.stringify({ version: 1, completed: [1, 2, 3, 4, 5], sound: false })]]);
  const dev = mock({ storage, noEllipse: true });
  assert.equal(dev.runtime.view.progress.decorations().length, 5);
  dev.tap(307, 231); assert.equal(dev.runtime.view.modal, 'room');
  dev.runtime.view.draw(Date.now());
  dev.tap(195, 715); assert.equal(dev.runtime.view.modal, null);
  assert.equal(dev.runtime.view.screen, 'levels'); dev.runtime.destroy();
});

test('小游戏背景音乐首次操作启动，切换与通知不重播，静音、后台和卸载正确处理', () => {
  const dev = mock(), music = dev.sounds.find(sound => sound.loop);
  assert.equal(music.playing, false); dev.tap(195, 737); assert.equal(music.playing, true);
  assert.equal(music.playCount, 1); dev.runtime.view.notify(); dev.runtime.view.press('levels');
  assert.equal(music.playCount, 1);
  dev.tap(314, 34); assert.equal(music.playing, false);
  dev.callbacks.Hide(); dev.callbacks.Show(); assert.equal(music.playing, false);
  dev.tap(314, 34); assert.equal(music.playing, true);
  dev.callbacks.Hide(); assert.equal(music.playing, false); dev.callbacks.Show(); assert.equal(music.playing, true);
  dev.runtime.destroy(); assert.ok(dev.sounds.every(sound => sound.destroyed));
  const muted = mock({ storage: new Map([[KEY, JSON.stringify({ version: 1, sound: false })]]) });
  muted.tap(195, 737); assert.ok(muted.sounds.every(sound => !sound.playing)); muted.runtime.destroy();
});
