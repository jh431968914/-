const { GameView } = require('../../utils/view');
const { AudioManager } = require('../../utils/audio');

Page({
  data: { safeBottom: 0 },
  onLoad() {
    this._visible = false;
    this._destroyed = false;
    this._frame = null;
    this._touchStart = null;
  },
  onReady() {
    this._audio = new AudioManager(name => {
      const sound = wx.createInnerAudioContext();
      sound.src = '/assets/audio/' + name + '.wav';
      return sound;
    });
    this._audio.setVisible(this._visible);
    this.updateSafeArea(() => this.createSelectorQuery().select('#gameCanvas').fields({ node: true, size: true }).exec(result => {
      if (this._destroyed) return;
      const info = result[0];
      if (!info || !info.node) {
        wx.showToast({ title: '请升级微信后重试', icon: 'none' }); return;
      }
      this._canvas = info.node;
      this._ctx = info.node.getContext('2d');
      this._view = new GameView({ ctx: this._ctx, width: info.width, height: info.height,
        storage: { read: key => wx.getStorageSync(key), write: (key, value) => wx.setStorageSync(key, value) },
        onChange: view => this._audio.setEnabled(view.sound),
        playSound: name => {
          this._audio.playSound(name);
          if (name === 'match') wx.vibrateShort({ type: 'light' });
        }
      });
      this._audio.setEnabled(this._view.sound);
      this.resizeCanvas(info.width, info.height);
      this.updateCanvasBounds();
      this.startFrames();
    }));
  },
  updateSafeArea(done) {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const safeBottom = info.safeArea ? Math.max(0, info.screenHeight - info.safeArea.bottom) : 0;
    this.setData({ safeBottom }, done);
  },
  resizeCanvas(width, height) {
    if (!this._canvas || !this._view) return;
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const dpr = Math.min(info.pixelRatio || 1, 3);
    this._canvas.width = Math.round(width * dpr);
    this._canvas.height = Math.round(height * dpr);
    this._ctx.scale(dpr, dpr);
    this._view.resize(width, height);
  },
  updateCanvasBounds() {
    this.createSelectorQuery().select('#gameCanvas').boundingClientRect().exec(result => {
      this._bounds = result[0];
    });
  },
  startFrames() {
    if (!this._canvas || !this._view || !this._visible || this._frame != null) return;
    const tick = () => {
      if (!this._visible) { this._frame = null; return; }
      this._view.draw(Date.now());
      this._frame = this._canvas.requestAnimationFrame(tick);
    };
    tick();
  },
  stopFrames() {
    if (this._canvas && this._frame != null) this._canvas.cancelAnimationFrame(this._frame);
    this._frame = null;
  },
  touchPoint(touch) {
    if (!touch) return null;
    if (typeof touch.x === 'number' && typeof touch.y === 'number') return { x: touch.x, y: touch.y };
    if (this._bounds && typeof touch.clientX === 'number' && typeof touch.clientY === 'number') {
      return { x: touch.clientX - this._bounds.left, y: touch.clientY - this._bounds.top };
    }
    return null;
  },
  onTouchStart(event) {
    this._touchStart = event.touches && event.touches.length === 1 ? this.touchPoint(event.touches[0]) : null;
  },
  onTouchCancel() { this._touchStart = null; },
  onTouchEnd(event) {
    const start = this._touchStart;
    this._touchStart = null;
    if (!this._view || !start || !event.changedTouches || event.changedTouches.length !== 1) return;
    const point = this.touchPoint(event.changedTouches[0]);
    if (!point || Math.hypot(point.x - start.x, point.y - start.y) > 12) return;
    this._view.pointer(point.x, point.y);
    this._audio.activate(this._view.sound);
  },
  onShow() { this._visible = true; if (this._audio) this._audio.setVisible(true); this.startFrames(); },
  onHide() {
    this._visible = false; this._touchStart = null; this.stopFrames();
    if (this._audio) this._audio.setVisible(false);
  },
  onResize() {
    if (!this._view) return;
    this.updateSafeArea(() => this.createSelectorQuery().select('#gameCanvas').fields({ size: true }).exec(result => {
      if (this._destroyed) return;
      if (result[0]) { this.resizeCanvas(result[0].width, result[0].height); this.updateCanvasBounds(); }
    }));
  },
  onUnload() {
    this._destroyed = true; this._visible = false; this._touchStart = null; this.stopFrames();
    if (this._audio) this._audio.destroy();
  }
});
