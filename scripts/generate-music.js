'use strict';
// Original eight-bar melody, warm electric-piano arpeggios and a quiet bass.
const fs = require('node:fs');
const path = require('node:path');
const rate = 22050, beat = 60 / 92;
const length = Math.round(32 * beat * rate), duration = length / rate;
const events = [];
const chords = [[48, 52, 55, 59], [45, 48, 52, 55], [50, 53, 57, 60], [43, 47, 50, 53],
  [48, 52, 55, 59], [41, 45, 48, 52], [50, 53, 57, 60], [43, 47, 50, 53]];
const melody = [[76, 79, 83], [76, 72, 74], [77, 81, 79], [74, 71, 74],
  [76, 79, 84], [81, 79, 76], [77, 76, 74], [74, 79, 71]];
function note(time, midi, volume, decay, harmonics) {
  const event = { time, frequency: 440 * Math.pow(2, (midi - 69) / 12), volume, decay, harmonics };
  events.push(event, Object.assign({}, event, { time: time + beat * 0.45, volume: volume * 0.18 }));
}
chords.forEach((chord, bar) => {
  note(bar * 4 * beat, chord[0] - 12, 0.11, 2.2, 0.12);
  note((bar * 4 + 2) * beat, chord[0] - 12, 0.075, 2.2, 0.12);
  [0, 1, 2, 3, 2, 1, 3, 1].forEach((degree, index) => note((bar * 4 + index / 2) * beat, chord[degree] + 12, 0.07, 3, 0.2));
  [0, 1.5, 3].forEach((offset, index) => note((bar * 4 + offset) * beat, melody[bar][index], 0.095, 2.5, 0.3));
});
const samples = new Float64Array(length);
// Wrap note tails into the next cycle instead of adding silence at the seam.
for (const event of events) {
  for (const shift of [-duration, 0]) {
    const onset = event.time + shift;
    const start = Math.max(0, Math.ceil(onset * rate)), end = Math.min(length, Math.ceil((onset + 5) * rate));
    for (let i = start; i < end; i++) {
      const t = i / rate - onset;
      const envelope = (1 - Math.exp(-t * 160)) * Math.exp(-t * event.decay);
      const phase = 2 * Math.PI * event.frequency * t;
      samples[i] += (Math.sin(phase) + event.harmonics * Math.sin(phase * 2) + 0.05 * Math.sin(phase * 3)) * envelope * event.volume;
    }
  }
}
let peak = 0; for (const value of samples) peak = Math.max(peak, Math.abs(value));
const buffer = Buffer.alloc(44 + length * 2);
buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + length * 2, 4); buffer.write('WAVEfmt ', 8);
buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28);
buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(length * 2, 40);
for (let i = 0; i < length; i++) buffer.writeInt16LE(Math.round(samples[i] / peak * 0.42 * 32767), 44 + i * 2);
const file = path.resolve(__dirname, '../assets/audio/bgm.wav'); fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, buffer);
console.log('原创背景音乐已生成：' + duration.toFixed(2) + ' 秒，循环播放，' + buffer.length + ' 字节。');
