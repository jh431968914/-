(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MeowAudio = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VOLUMES = { tap: 0.28, match: 0.4, win: 0.4, bgm: 0.18 };
  class AudioManager {
    constructor(createSound) {
      this.enabled = true; this.visible = true; this.started = false;
      this.destroyed = false; this.musicPlaying = false; this.playAttempt = 0;
      this.sounds = {};
      Object.keys(VOLUMES).forEach(name => {
        const sound = createSound(name);
        sound.volume = VOLUMES[name]; sound.loop = name === 'bgm';
        const onError = () => { if (name === 'bgm') this.musicPlaying = false; };
        if (sound.onError) sound.onError(onError);
        else if (sound.addEventListener) sound.addEventListener('error', onError);
        this.sounds[name] = sound;
      });
    }
    activate(enabled) { if (this.destroyed) return; this.started = true; this.setEnabled(enabled); }
    setEnabled(enabled) {
      this.enabled = !!enabled;
      if (!this.enabled) this.stopEffects();
      this.syncMusic();
    }
    setVisible(visible) {
      this.visible = !!visible;
      if (!this.visible) this.stopEffects();
      this.syncMusic();
    }
    stopSound(sound) {
      if (sound.stop) sound.stop();
      else { sound.pause(); try { sound.currentTime = 0; } catch (_) {} }
    }
    stopEffects() { ['tap', 'match', 'win'].forEach(name => this.stopSound(this.sounds[name])); }
    syncMusic() {
      const wanted = this.started && this.enabled && this.visible && !this.destroyed;
      if (wanted && !this.musicPlaying) {
        this.musicPlaying = true;
        const attempt = ++this.playAttempt;
        try {
          const pending = this.sounds.bgm.play();
          if (pending && pending.catch) pending.catch(() => { if (attempt === this.playAttempt) this.musicPlaying = false; });
        } catch (_) { this.musicPlaying = false; }
      } else if (!wanted && this.musicPlaying) {
        this.playAttempt++; this.sounds.bgm.pause(); this.musicPlaying = false;
      }
    }
    playSound(name) {
      if (!this.enabled || !this.visible || this.destroyed || name === 'bgm' || !this.sounds[name]) return;
      const sound = this.sounds[name]; this.stopSound(sound);
      try { const pending = sound.play(); if (pending && pending.catch) pending.catch(() => {}); } catch (_) {}
    }
    destroy() {
      if (this.destroyed) return;
      this.setVisible(false); this.destroyed = true;
      Object.keys(this.sounds).forEach(name => { const sound = this.sounds[name]; if (sound.destroy) sound.destroy(); });
    }
  }
  return { AudioManager, VOLUMES };
});
