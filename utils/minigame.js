const { GameView } = require('./view');
const { AudioManager } = require('./audio');

class MiniGameRuntime {
  constructor(api, frames) {
    this.wx = api;
    this.frames = frames;
    this.canvas = api.createCanvas();
    this.ctx = this.canvas.getContext('2d');
    this.visible = true;
    this.destroyed = false;
    this.frame = null;
    this.touchStart = null;
    this.audio = new AudioManager(name => {
      const sound = api.createInnerAudioContext();
      sound.src = 'assets/audio/' + name + '.wav';
      return sound;
    });
    this.view = new GameView({ ctx: this.ctx,
      storage: { read: key => api.getStorageSync(key), write: (key, value) => api.setStorageSync(key, value) },
      onChange: view => this.audio.setEnabled(view.sound),
      playSound: name => {
        this.audio.playSound(name);
        if (name === 'match' && api.vibrateShort) api.vibrateShort({ type: 'light' });
      }
    });
    this.audio.setEnabled(this.view.sound);
    this.resize();
    this.handlers = {
      TouchStart: event => { this.touchStart = event.touches && event.touches.length === 1 ? this.point(event.touches[0]) : null; },
      TouchEnd: event => {
        const start = this.touchStart; this.touchStart = null;
        if (!start || !this.visible || !event.changedTouches || event.changedTouches.length !== 1) return;
        const point = this.point(event.changedTouches[0]);
        if (point && Math.hypot(point.x - start.x, point.y - start.y) <= 12) {
          this.view.pointer(point.x, point.y); this.audio.activate(this.view.sound);
        }
      },
      TouchCancel: () => { this.touchStart = null; },
      Hide: () => this.pause(), Show: () => this.resume(), WindowResize: () => this.resize()
    };
    Object.keys(this.handlers).forEach(name => { if (typeof api['on' + name] === 'function') api['on' + name](this.handlers[name]); });
    this.resume();
  }
  point(touch) {
    if (!touch) return null;
    const x = typeof touch.clientX === 'number' ? touch.clientX : touch.x;
    const y = typeof touch.clientY === 'number' ? touch.clientY : touch.y;
    return typeof x === 'number' && typeof y === 'number' ? { x, y: y - this.top } : null;
  }
  resize() {
    if (this.destroyed) return;
    const info = this.wx.getWindowInfo ? this.wx.getWindowInfo() : this.wx.getSystemInfoSync();
    const width = info.windowWidth, height = info.windowHeight;
    let menu;
    try { if (this.wx.getMenuButtonBoundingClientRect) menu = this.wx.getMenuButtonBoundingClientRect(); } catch (_) {}
    const status = info.statusBarHeight || 0;
    this.top = Math.max(info.safeArea ? info.safeArea.top || 0 : status, menu && menu.bottom ? menu.bottom + 8 : status + 40);
    this.bottom = info.safeArea ? Math.max(0, info.screenHeight - info.safeArea.bottom) : 0;
    const availableHeight = Math.max(1, height - this.top - this.bottom);
    const dpr = Math.min(info.pixelRatio || 1, 3);
    this.canvas.width = Math.round(width * dpr); this.canvas.height = Math.round(height * dpr);
    this.ctx.scale(dpr, dpr);
    this.ctx.fillStyle = '#f8f5ed'; this.ctx.fillRect(0, 0, width, height);
    this.view.resize(width, availableHeight); this.touchStart = null;
  }
  draw() {
    if (!this.visible || this.destroyed) { this.frame = null; return; }
    this.ctx.save(); this.ctx.translate(0, this.top); this.view.draw(Date.now()); this.ctx.restore();
    this.frame = this.frames.requestAnimationFrame(() => this.draw());
  }
  pause() {
    this.visible = false; this.touchStart = null;
    if (this.frame != null) this.frames.cancelAnimationFrame(this.frame);
    this.frame = null;
    this.audio.setVisible(false);
  }
  resume() {
    if (this.destroyed) return;
    this.visible = true;
    this.audio.setVisible(true);
    if (this.frame == null) this.draw();
  }
  destroy() {
    if (this.destroyed) return;
    this.pause(); this.destroyed = true;
    this.audio.destroy();
    Object.keys(this.handlers).forEach(name => { if (typeof this.wx['off' + name] === 'function') this.wx['off' + name](this.handlers[name]); });
  }
}

module.exports = { MiniGameRuntime };
