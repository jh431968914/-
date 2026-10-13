'use strict';
const fs = require('node:fs');
const path = require('node:path');
const directory = path.resolve(__dirname, '../assets/audio');
fs.mkdirSync(directory, { recursive: true });
function toneFile(name, notes, noteLength, volume) {
  const rate = 22050, length = Math.ceil((notes.length * noteLength + 0.12) * rate);
  const buffer = Buffer.alloc(44 + length * 2);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + length * 2, 4); buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(length * 2, 40);
  for (let i = 0; i < length; i++) {
    const time = i / rate;
    let sample = 0;
    notes.forEach((hz, n) => {
      const local = time - n * noteLength;
      if (local < 0 || local > noteLength + 0.12) return;
      const envelope = Math.min(1, local / 0.012) * Math.exp(-local * 17);
      sample += (Math.sin(2 * Math.PI * hz * local) + Math.sin(4 * Math.PI * hz * local) * 0.18) * envelope * volume;
    });
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), 44 + i * 2);
  }
  fs.writeFileSync(path.join(directory, name + '.wav'), buffer);
}
toneFile('tap', [660], 0.065, 0.16);
toneFile('match', [659.25, 783.99, 987.77], 0.065, 0.2);
toneFile('win', [523.25, 659.25, 783.99, 1046.5], 0.13, 0.2);
console.log('已生成 3 个本地音效。');
