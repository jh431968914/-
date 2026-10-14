'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Game, createCampaignLevel, LEVELS } = require('../utils/game');
const { Progress, KEY } = require('../utils/progress');
const { GameView } = require('../utils/view');
function fixture(capacity, kinds, solution) {
  return { lockedSlots: 7 - capacity, tiles: kinds.map((kind, id) => ({ id, kind, blockers: [] })),
    solution: solution || kinds.map((_, id) => id) };
}
function memory(data) {
  const values = new Map(data ? [[KEY, JSON.stringify(data)]] : []);
  return { read: key => values.get(key), write: (key, value) => values.set(key, value) };
}
test('前两章可用槽位按阶梯变化，后两章固定五格且点击不会解锁', () => {
  assert.deepEqual(LEVELS.map(info => new Game(createCampaignLevel(info.number)).capacity), [7, 6, 6, 5, 5, 7, 6, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]);
  LEVELS.forEach(info => {
    const view = new GameView({ ctx: {}, storage: memory({ version: 1,
      completed: Array.from({ length: info.number - 1 }, (_, i) => i + 1), currentLevel: info.number }) });
    view.press('resume');
    const locks = view.controls().filter(control => control.action.startsWith('locked-slot-'));
    assert.equal(locks.length, info.lockedSlots);
    locks.forEach((lock, i) => {
      assert.equal(lock.action, 'locked-slot-' + (view.game.capacity + i));
      view.pointer(lock.x + lock.w / 2, lock.y + lock.h / 2);
      assert.match(view.toast.message, /暂未开放/); assert.equal(view.game.unlockedSlots, 0);
    });
    assert.equal(view.game.steps, 0); assert.equal(view.game.remainingTools('undo'), 3);
    assert.equal(view.game.remainingTools('hint'), 1);
  });
});
test('第 5 或第 6 个可用格凑三时先消除，不能误判为满槽失败', () => {
  for (const capacity of [5, 6]) {
    const kinds = capacity === 5 ? [0, 1, 0, 2, 0, 1, 1, 2, 2] : [0, 1, 0, 2, 3, 0, 1, 1, 2, 2, 3, 3];
    const game = new Game(fixture(capacity, kinds));
    for (let id = 0; id < capacity - 1; id++) assert.ok(game.pick(id).ok);
    assert.equal(game.tray.length, capacity - 1);
    const event = game.pick(capacity - 1);
    assert.ok(event.matched); assert.equal(event.insertedTray.length, capacity);
    assert.equal(game.tray.length, capacity - 3); assert.equal(game.status, 'playing');
  }
});
test('未凑三时填满可用格立即失败，锁格不能放牌，撤回恢复仍保留锁定', () => {
  for (const capacity of [5, 6]) {
    const kinds = Array.from({ length: capacity * 3 }, (_, i) => i % capacity);
    const game = new Game(fixture(capacity, kinds));
    for (let id = 0; id < capacity; id++) assert.ok(game.pick(id).ok);
    assert.equal(game.status, 'lost'); assert.equal(game.tray.length, capacity);
    assert.equal(game.pick(capacity).reason, 'finished');
    assert.ok(game.undo()); assert.equal(game.status, 'playing'); assert.equal(game.tray.length, capacity - 1);
    assert.equal(game.capacity, capacity); assert.equal(game.lockedSlots, 7 - capacity);
  }
});
test('提示搜索遵守较小容量，偏离证书路线后仍能找到不占锁格的解', () => {
  const kinds = Array.from({ length: 18 }, (_, i) => Math.floor(i / 3));
  const planned = Array.from({ length: 15 }, (_, i) => i + 3).concat([0, 1, 2]);
  for (const capacity of [5, 6]) {
    const game = new Game(fixture(capacity, kinds, planned));
    (capacity === 5 ? [0, 1, 3, 6] : [0, 1, 3, 6, 9]).forEach(id => game.pick(id));
    const route = game.hint(); assert.ok(route); assert.equal(route[0], 2);
    route.forEach(id => { assert.ok(game.pick(id).ok); assert.ok(game.tray.length < capacity); });
    assert.equal(game.status, 'won');
  }
});
test('预留奖励回调最多解锁到 7 格，满槽后增加容量可继续，撤回不撤销奖励', () => {
  const kinds = Array.from({ length: 18 }, (_, i) => i % 6);
  const game = new Game(fixture(5, kinds));
  for (let id = 0; id < 5; id++) game.pick(id);
  assert.equal(game.status, 'lost'); assert.ok(game.unlockSlot()); assert.equal(game.capacity, 6);
  assert.equal(game.status, 'playing'); game.pick(5); assert.equal(game.status, 'lost');
  assert.ok(game.unlockSlot()); assert.equal(game.capacity, 7); assert.equal(game.status, 'playing');
  assert.equal(game.unlockSlot(), false); assert.ok(game.undo()); assert.equal(game.capacity, 7);
  const replay = Game.fromMoves(game.level, game.moves, game.unlockedSlots); assert.equal(replay.capacity, 7);
  assert.throws(() => Game.fromMoves(game.level, [], 3));
  game.reset(); assert.equal(game.capacity, 5); assert.equal(new Game(createCampaignLevel(1)).unlockSlot(), false);
});
test('未来解锁状态按局保存，退出恢复不丢失，重来或通关重玩恢复初始锁格', () => {
  const storage = memory({ version: 1, completed: [1, 2, 3], currentLevel: 4 }), progress = new Progress(storage);
  const game = progress.gameFor(4); assert.ok(game.unlockSlot()); progress.save(game);
  const loaded = new Progress(storage), restored = loaded.gameFor(4);
  assert.equal(loaded.resumeNumber(), 4); assert.equal(restored.capacity, 6); assert.equal(restored.lockedSlots, 1);
  restored.reset(); loaded.save(restored); assert.equal(new Progress(storage).gameFor(4).capacity, 5);
  restored.level.solution.forEach(id => assert.ok(restored.pick(id).ok)); loaded.save(restored);
  assert.equal(loaded.gameFor(4).capacity, 5);
});
