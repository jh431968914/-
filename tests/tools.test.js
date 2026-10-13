'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Game, createCampaignLevel } = require('../utils/game');
const { Progress, KEY } = require('../utils/progress');
const { GameView } = require('../utils/view');

function memory(initial) {
  const values = new Map(initial == null ? [] : [[KEY, JSON.stringify(initial)]]);
  return { read: key => values.get(key), write: (key, value) => values.set(key, value) };
}
function pick(view, id) { view.pick(id); view.animation = null; }
function view(storage) { const game = new GameView({ ctx: {}, storage }); game.press('resume'); return game; }
function win(game) { game.level.solution.forEach(id => assert.ok(game.pick(id).ok)); }

test('每局最多成功撤回三次，空历史不扣次，取牌后也不能补回次数', () => {
  const game = new Game();
  assert.equal(game.undo(), false); assert.equal(game.remainingTools('undo'), 3);
  game.level.solution.slice(0, 6).forEach(id => game.pick(id));
  assert.equal(game.matches, 1);
  for (let i = 0; i < 3; i++) assert.ok(game.undo());
  assert.equal(game.matches, 0); assert.equal(game.steps, 3);
  const board = game.alive.slice();
  assert.equal(game.undo(), false); assert.deepEqual(game.alive, board); assert.equal(game.history.length, 3);
  game.pick(game.level.solution[3]); assert.equal(game.remainingTools('undo'), 0); assert.equal(game.undo(), false);
  game.reset(); assert.equal(game.remainingTools('undo'), 3); assert.equal(game.remainingTools('hint'), 1);
});

test('提示只有找到路线才扣一次；普通求解不扣次，撤回不退还提示', () => {
  const game = new Game(); assert.ok(game.solve()); assert.equal(game.remainingTools('hint'), 1);
  const route = game.hint(); assert.ok(route && game.isAvailable(route[0]));
  assert.equal(game.remainingTools('hint'), 0); assert.equal(game.hint(), null);
  game.pick(route[0]); assert.ok(game.undo()); assert.equal(game.remainingTools('hint'), 0);
  const impossible = new Game({ tiles: [0, 1].map((kind, id) => ({ id, kind, blockers: [] })), solution: [0, 1] });
  assert.equal(impossible.hint(), null); assert.equal(impossible.remainingTools('hint'), 1);
});

test('道具次数与棋盘一起恢复，声音切换和回到选关都不补次', () => {
  const storage = memory(), current = view(storage);
  pick(current, current.game.level.solution[0]); current.press('hint'); current.press('undo');
  assert.equal(current.game.steps, 0);
  current.press('sound'); current.press('levels'); current.press('level-1');
  assert.equal(current.game.remainingTools('undo'), 2); assert.equal(current.game.remainingTools('hint'), 0);
  const restored = view(storage);
  assert.equal(restored.resumeLabel(), '继续第 1 关'); assert.equal(restored.game.steps, 0);
  assert.equal(restored.game.remainingTools('undo'), 2); assert.equal(restored.game.remainingTools('hint'), 0);
  assert.equal(restored.sound, false);
  restored.press('restart');
  const fresh = view(storage); assert.equal(fresh.game.remainingTools('undo'), 3); assert.equal(fresh.game.remainingTools('hint'), 1);
});

test('每个关卡独立保存次数，通关后再玩与进入下一关都获得新额度', () => {
  const progress = new Progress(memory());
  const first = progress.gameFor(1); first.hint(); win(first); progress.save(first);
  const second = progress.gameFor(2); second.pick(second.level.solution[0]); second.undo(); second.hint(); progress.save(second);
  const replay = progress.gameFor(1); assert.equal(replay.remainingTools('hint'), 1);
  replay.pick(replay.level.solution[0]); replay.undo(); progress.save(replay);
  const loaded = new Progress(progress.storage);
  assert.equal(loaded.gameFor(1).remainingTools('undo'), 2);
  assert.equal(loaded.gameFor(2).remainingTools('undo'), 2); assert.equal(loaded.gameFor(2).remainingTools('hint'), 0);
  const fresh = loaded.gameFor(2, true); assert.equal(fresh.remainingTools('undo'), 3); assert.equal(fresh.remainingTools('hint'), 1);
});

test('重玩已通关的关卡，只用过提示但还没取牌，重新进入仍继续该局', () => {
  const storage = memory(), current = view(storage); win(current.game); current.notify(true);
  current.press('level-1'); current.press('hint');
  const restored = new GameView({ ctx: {}, storage });
  assert.equal(restored.resumeLabel(), '继续第 1 关'); restored.press('resume');
  assert.equal(restored.game.level.number, 1); assert.equal(restored.game.steps, 0);
  assert.equal(restored.game.remainingTools('hint'), 0); assert.ok(restored.progress.canOpen(2));
});

test('旧存档保留原局面并获得初始额度，损坏次数有边界且旧布局不继承次数', () => {
  const first = createCampaignLevel(1), data = { version: 1, completed: [1], currentLevel: 1,
    runs: { 1: first.solution.slice(0, 4), 2: [37, 38, 39] }, runRevisions: { 1: first.revision } };
  let progress = new Progress(memory(data));
  assert.equal(progress.gameFor(1).steps, 4); assert.equal(progress.gameFor(1).remainingTools('undo'), 3);
  assert.equal(progress.gameFor(1).remainingTools('hint'), 1);
  data.runToolsUsed = { 1: { undo: 100, hint: -1 }, 2: { undo: 3, hint: 1 } };
  progress = new Progress(memory(data));
  assert.equal(progress.gameFor(1).remainingTools('undo'), 0); assert.equal(progress.gameFor(1).remainingTools('hint'), 1);
  assert.equal(progress.gameFor(2).steps, 0); assert.equal(progress.gameFor(2).remainingTools('undo'), 3);
  assert.equal(progress.gameFor(2).remainingTools('hint'), 1);
});

test('视图所有入口遵守额度，动画、说明弹窗及通关后不会消耗道具', () => {
  const current = view(memory());
  current.press('undo'); assert.equal(current.game.remainingTools('undo'), 3);
  current.pick(current.game.level.solution[0]); current.press('undo'); current.press('hint');
  assert.equal(current.game.remainingTools('undo'), 3); assert.equal(current.game.remainingTools('hint'), 1);
  current.animation = null; current.press('help'); current.undo(); current.hint();
  assert.equal(current.game.remainingTools('undo'), 3); assert.equal(current.game.remainingTools('hint'), 1);
  current.press('close'); current.press('hint');
  assert.ok(current.controls().find(control => control.action === 'hint').disabled);
  current.press('hint'); assert.equal(current.game.remainingTools('hint'), 0);
  for (let i = 0; i < 3; i++) {
    current.press('undo'); if (i < 2) pick(current, current.game.level.solution[0]);
  }
  pick(current, current.game.level.solution[0]);
  assert.ok(current.controls().find(control => control.action === 'undo').disabled);
  current.undo(); assert.equal(current.game.steps, 1);
  current.press('restart'); win(current.game); current.undo(); current.hint();
  assert.equal(current.game.status, 'won'); assert.equal(current.game.remainingTools('undo'), 3);
  assert.equal(current.game.remainingTools('hint'), 1);
});

test('失败时撤回能继续，但用满三次后结算入口禁用，重来恢复额度', () => {
  const current = view(memory()), game = current.game;
  while (game.status === 'playing') {
    const held = Array(8).fill(0); game.tray.forEach(tile => held[tile.kind]++);
    const candidates = game.available().sort((a, b) => held[a.kind] - held[b.kind]);
    pick(current, (candidates.find(tile => held[tile.kind] < 2) || candidates[0]).id);
  }
  assert.equal(game.status, 'lost');
  const last = game.moves[game.moves.length - 1];
  for (let i = 0; i < 3; i++) {
    assert.equal(current.controls().find(control => control.action === 'undo').disabled, false);
    current.press('undo'); assert.equal(game.status, 'playing'); assert.equal(game.tray.length, 6);
    pick(current, last); assert.equal(game.status, 'lost');
  }
  assert.ok(current.controls().find(control => control.action === 'undo').disabled);
  current.press('undo'); assert.equal(game.status, 'lost');
  current.press('restart'); assert.equal(game.status, 'playing'); assert.equal(game.remainingTools('undo'), 3);
  assert.equal(game.remainingTools('hint'), 1);
});
