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
// Look at up to three legal picks, including tiles revealed by those picks.
// This policy has no access to level.solution and does not call the hint solver.
function lookaheadPick(game, rng, depth, nodeLimit) {
  const tiles = game.level.tiles, alive = game.alive.slice();
  const held = Array(TYPES.length).fill(0); game.tray.forEach(tile => held[tile.kind]++);
  const blockers = tiles.map(tile => tile.blockers.filter(id => alive[id]).length);
  const below = tiles.map(() => []);
  tiles.forEach(tile => tile.blockers.forEach(id => below[id].push(tile.id)));
  const tie = tiles.map(() => rng());
  depth = depth == null ? 3 : depth;
  nodeLimit = nodeLimit == null ? 160 : nodeLimit;
  function available() { return tiles.filter(tile => alive[tile.id] && blockers[tile.id] === 0); }
  function value(matches, size) {
    const visible = Array(TYPES.length).fill(0);
    available().forEach(tile => visible[tile.kind]++);
    let nextMatches = 0, matchingOptions = 0, kinds = 0;
    visible.forEach((count, kind) => {
      if (!count) return;
      kinds++;
      if (count >= 3 - held[kind]) nextMatches += held[kind] === 2 ? 12 : held[kind] === 1 ? 8 : 5;
      matchingOptions += Math.min(count, 3 - held[kind]) * held[kind];
    });
    return matches * 1000 - size * 24 + nextMatches * 2 + matchingOptions + kinds * 0.1;
  }
  function pick(tile, size) {
    alive[tile.id] = false; below[tile.id].forEach(id => blockers[id]--);
    const before = held[tile.kind]; held[tile.kind] = (before + 1) % 3;
    return { before, size: size + (before === 2 ? -2 : 1), matched: before === 2 ? 1 : 0 };
  }
  function restore(tile, before) {
    held[tile.kind] = before; alive[tile.id] = true; below[tile.id].forEach(id => blockers[id]++);
  }
  function search(left, matches, size, budget) {
    if (!left || --budget.left < 0) return value(matches, size);
    const candidates = available().sort((a, b) => held[b.kind] - held[a.kind] || tie[b.id] - tie[a.id]);
    let best = -Infinity;
    for (const tile of candidates) {
      const next = pick(tile, size);
      if (next.size < game.capacity) best = Math.max(best, search(left - 1, matches + next.matched, next.size, budget));
      restore(tile, next.before);
      if (budget.left < 0) break;
    }
    // Removing the final triple ends the game before the requested search depth.
    return candidates.length ? best : value(matches, size);
  }
  let best = -Infinity, chosen = null;
  for (const tile of available()) {
    const next = pick(tile, game.tray.length);
    const score = next.size < game.capacity ? search(depth - 1, next.matched, next.size, { left: nodeLimit }) : -Infinity;
    restore(tile, next.before);
    if (chosen == null || score > best || (score === best && tie[tile.id] > tie[chosen.id])) { best = score; chosen = tile; }
  }
  return chosen;
}
function measureLookahead(level, attempts, options) {
  attempts = attempts || 100; options = options || {};
  let wins = 0, peakSum = 0, stepsSum = 0;
  for (let attempt = 0; attempt < attempts; attempt++) {
    let value = attempt + 137;
    function rng() { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; }
    const game = new Game(level);
    let peak = 0;
    while (game.status === 'playing') {
      const tile = lookaheadPick(game, rng, options.depth, options.nodeLimit);
      game.pick(tile.id); peak = Math.max(peak, game.tray.length);
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
  console.log('三步前瞻策略：每个候选首步最多搜索160个节点，优先消除并保留下一组配对机会；无提示、撤回，不读取通关路线。');
  LEVELS.forEach(info => {
    const result = measureLookahead(createCampaignLevel(info.number));
    console.log('第' + info.number + '关：前瞻模拟通关 ' + result.wins + '/' + result.attempts + '；平均取牌 ' + result.averageSteps.toFixed(1) + '/' + info.total);
  });
}
module.exports = { measure, measureLookahead };
