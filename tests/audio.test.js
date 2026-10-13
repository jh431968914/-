'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { AudioManager } = require('../utils/audio');
function player() {
  const sounds = {}, manager = new AudioManager(name => {
    const sound = { playing: false, plays: 0, stops: 0, pauses: 0, destroyed: false,
      play() { this.plays++; this.playing = true; }, stop() { this.stops++; this.playing = false; },
      pause() { this.pauses++; this.playing = false; }, destroy() { this.destroyed = true; }, onError() {} };
    sounds[name] = sound; return sound;
  });
  return { manager, sounds };
}
test('音乐等首次操作，重复状态同步不重播，切后台与静音暂停且不重置', () => {
  const { manager, sounds } = player(), music = sounds.bgm;
  assert.equal(music.plays, 0); manager.activate(true); manager.activate(true); manager.setEnabled(true);
  assert.equal(music.plays, 1); assert.equal(music.loop, true);
  manager.setVisible(false); assert.equal(music.playing, false); assert.equal(music.stops, 0);
  manager.setVisible(true); assert.equal(music.plays, 2);
  manager.setEnabled(false); manager.setVisible(false); manager.setVisible(true);
  assert.equal(music.playing, false); assert.equal(music.plays, 2);
  manager.setEnabled(true); assert.equal(music.plays, 3);
  manager.destroy(); assert.ok(Object.values(sounds).every(sound => sound.destroyed));
  manager.activate(true); assert.equal(music.plays, 3);
});
test('音乐与音效同用声音开关，后台或静音不能播放音效', () => {
  const { manager, sounds } = player(); manager.activate(false); manager.playSound('tap');
  assert.equal(sounds.tap.plays, 0); assert.equal(sounds.bgm.plays, 0);
  manager.setEnabled(true); manager.playSound('match'); assert.equal(sounds.match.playing, true);
  manager.setVisible(false); assert.ok(Object.values(sounds).every(sound => !sound.playing));
  manager.playSound('win'); assert.equal(sounds.win.plays, 0);
});
test('浏览器拒绝播放时能在下一次操作重试，暂停期间不会偷偷补播', async () => {
  const { manager, sounds } = player(); let reject;
  sounds.bgm.play = () => new Promise((_, fail) => { reject = fail; });
  manager.activate(true); manager.setVisible(false); reject(Error('autoplay blocked'));
  await Promise.resolve(); assert.equal(manager.musicPlaying, false);
  sounds.bgm.play = () => { sounds.bgm.plays++; };
  manager.setVisible(true); assert.equal(sounds.bgm.plays, 1);
  manager.setEnabled(false); assert.equal(manager.musicPlaying, false);
});
test('本地原创音乐为有效 PCM，时长约 21 秒，音量不削波且循环接点连续', () => {
  const data = fs.readFileSync(path.resolve(__dirname, '../assets/audio/bgm.wav'));
  assert.equal(data.toString('ascii', 0, 4), 'RIFF'); assert.equal(data.toString('ascii', 8, 12), 'WAVE');
  assert.equal(data.readUInt16LE(20), 1); assert.equal(data.readUInt16LE(22), 1);
  const rate = data.readUInt32LE(24), count = data.readUInt32LE(40) / 2;
  assert.ok(count / rate > 20 && count / rate < 22); assert.equal(data.length, 44 + count * 2);
  let peak = 0, power = 0;
  for (let i = 0; i < count; i++) { const value = data.readInt16LE(44 + i * 2) / 32768; peak = Math.max(peak, Math.abs(value)); power += value * value; }
  assert.ok(peak <= 0.43); assert.ok(Math.sqrt(power / count) > 0.04);
  const seam = Math.abs(data.readInt16LE(44) - data.readInt16LE(data.length - 2)) / 32768;
  assert.ok(seam < 0.04, '接点变化过大：' + seam);
});
