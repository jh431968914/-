'use strict';
const { Game, createCampaignLevel, LEVELS, TYPES, levelCapacity } = require('../utils/game');
function measure(level, attempts) {
  attempts = attempts || 300;
  let wins = 0, peakSum = 0, stepsSum = 0;
  for (let attempt = 0; attempt < attempts; attempt++) {
    let value = attempt + 137;
    function rng() { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; }
    const game = new Game(level);
    let peak = 0;
    while (game.status === 'playing') {
      const held = Array(TYPES.length).fill(0); game.tray.forEach(tile => held[tile.kind]++);
      const available = game.available();
      const best = Math.max.apply(null, available.map(tile => held[tile.kind]));
      const choices = available.filter(tile => held[tile.kind] === best);
      game.pick(choices[Math.floor(rng() * choices.length)].id);
      peak = Math.max(peak, game.tray.length);
    }
    if (game.status === 'won') wins++;
    peakSum += peak; stepsSum += game.steps;
  }
  return { wins, attempts, rate: wins / attempts, averagePeak: peakSum / attempts, averageSteps: stepsSum / attempts };
}
if (require.main === module) {
  console.log('固定模拟策略：优先凑三，其次凑对，其余随机选；无提示、撤回或前瞻。模拟数据用于对比，不代表真实玩家通关率。');
  LEVELS.forEach(info => {
    const result = measure(createCampaignLevel(info.number));
    console.log('第' + info.number + '关：' + info.total + '张 / ' + info.kinds + '种 / ' + info.layers + '层 / 可用' + levelCapacity(info) + '格；模拟通关 ' + result.wins + '/' + result.attempts);
  });
}
module.exports = { measure };
