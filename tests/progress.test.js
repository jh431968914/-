'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Game, createLevel, createCampaignLevel, LEVELS, SIZE } = require('../utils/game');
const { Progress, KEY } = require('../utils/progress');
const { GameView } = require('../utils/view');
const { measure } = require('../scripts/difficulty-check');
function memory(initial) {
  const values = new Map(initial == null ? [] : [[KEY, initial]]);
  return { read: key => values.get(key), write: (key, value) => values.set(key, value), values };
}
function win(game) { game.level.solution.forEach(id => assert.ok(game.pick(id).ok)); assert.equal(game.status, 'won'); }
test('第一关减为 30 张，五关布局各不相同且不存在同层重叠', () => {
  assert.deepEqual(createCampaignLevel(1), createLevel());
  assert.equal(createCampaignLevel(1).total, 30);
  const shapes = new Set();
  LEVELS.forEach(info => {
    const level = createCampaignLevel(info.number);
    assert.equal(level.tiles.length, info.total);
    assert.equal(new Set(level.tiles.map(t => t.layer)).size, info.layers);
    const counts = Array(info.kinds).fill(0);
    level.tiles.forEach(a => {
      assert.ok(a.x >= 0 && a.y >= 0 && a.x + SIZE <= 294 && a.y + SIZE <= 294);
      counts[a.kind]++;
      level.tiles.forEach(b => {
        if (a.id >= b.id || a.layer !== b.layer) return;
        const overlap = a.x < b.x + SIZE && a.x + SIZE > b.x && a.y < b.y + SIZE && a.y + SIZE > b.y;
        assert.equal(overlap, false);
      });
    });
    counts.forEach(count => { assert.ok(count > 0); assert.equal(count % 3, 0); });
    shapes.add(JSON.stringify(level.tiles.map(t => [t.x, t.y, t.layer])));
  });
  assert.equal(shapes.size, 5);
  assert.throws(() => createCampaignLevel(6), RangeError);
});
test('五种布局各验证 100 个种子，均能在未解锁的容量下通关且不占锁格', () => {
  LEVELS.forEach(info => {
    for (let seed = 0; seed < 100; seed++) {
      const game = new Game(createCampaignLevel(info.number, seed));
      game.level.solution.forEach(id => { assert.ok(game.pick(id).ok); assert.ok(game.tray.length < game.capacity); });
      assert.equal(game.status, 'won'); assert.equal(game.matches, info.total / 3);
    }
  });
});
test('同一套不使用道具的模拟策略下，固定五关的难度逐步上升', () => {
  const rates = LEVELS.map(info => measure(createCampaignLevel(info.number), 300).rate);
  for (let index = 1; index < rates.length; index++) {
    assert.ok(rates[index - 1] >= rates[index], '锁槽后后续关卡不能更容易：' + rates);
    if (index < 4) assert.ok(rates[index - 1] > rates[index], '前三个难度阶梯应明显：' + rates);
  }
  assert.ok(rates[1] <= 0.25, '第二关应有明显挑战：' + rates);
});
test('后期提示可处理新增图案和高编号图块，并从偏离原路线的局面恢复', () => {
  const samples = [[3, [47, 45, 43, 34]], [4, [51, 53, 47, 42]], [5, [59, 57, 55, 51]]];
  samples.forEach(([number, moves]) => {
    const level = createCampaignLevel(number), game = Game.fromMoves(level, moves);
    const route = game.solve(); assert.ok(route); assert.ok(route.some(id => id >= 32));
    assert.ok(route.some(id => level.tiles[id].kind >= 6));
    assert.deepEqual(game.moves, moves);
    route.forEach(id => assert.ok(game.pick(id).ok)); assert.equal(game.status, 'won');
  });
});
test('新版关卡不套用旧布局局面，旧第一关重开为30张，通关与收藏保留', () => {
  const old = { version: 1, completed: [1, 2], currentLevel: 3, sound: false,
    runs: { 1: [37, 38, 39], 2: [37, 38, 39], 3: [36, 37, 38] } };
  const progress = new Progress(memory(JSON.stringify(old)));
  assert.deepEqual(progress.state.completed, [1, 2]); assert.equal(progress.state.sound, false);
  assert.equal(progress.gameFor(1).steps, 0); assert.equal(progress.gameFor(1).remaining(), 30);
  assert.equal(progress.decorations().length, 2); assert.equal(progress.gameFor(2).steps, 0);
  assert.equal(progress.gameFor(3).steps, 0); assert.ok(progress.updatedRuns);
  const second = progress.gameFor(2); second.pick(second.level.solution[0]); progress.save(second);
  const restored = new Progress(progress.storage);
  assert.equal(restored.gameFor(2).steps, 1); assert.equal(restored.state.runRevisions[2], 4);
});

test('第一关30张，后续牌量保持，五关实际遮挡链深度为 3、5、6、7、8', () => {
  assert.deepEqual(LEVELS.map(info => info.total), [30, 45, 48, 54, 60]);
  assert.deepEqual(LEVELS.map(info => info.kinds), [6, 6, 7, 8, 8]);
  assert.deepEqual(LEVELS.map(info => info.layers), [3, 5, 6, 7, 8]);
  LEVELS.forEach(info => {
    const level = createCampaignLevel(info.number), depths = [];
    for (let id = level.tiles.length - 1; id >= 0; id--) {
      const blockers = level.tiles[id].blockers;
      depths[id] = blockers.length ? 1 + Math.max(...blockers.map(other => depths[other])) : 1;
    }
    assert.equal(Math.max(...depths), info.layers);
  });
});

test('上一版 revision 3 的局面按锁槽版重开，第一关道具、通关和声音设置保留', () => {
  const data = { version: 1, completed: [1, 2], currentLevel: 2, sound: false,
    runs: { 1: createCampaignLevel(1).solution.slice(0, 5), 2: createCampaignLevel(2).solution.slice(0, 3) },
    runRevisions: { 1: LEVELS[0].revision, 2: 3 }, runToolsUsed: { 1: { undo: 2, hint: 1 }, 2: { undo: 3, hint: 1 } } };
  const progress = new Progress(memory(JSON.stringify(data)));
  assert.equal(progress.gameFor(1).steps, 5); assert.equal(progress.gameFor(1).remainingTools('undo'), 1);
  assert.equal(progress.gameFor(1).remainingTools('hint'), 0);
  assert.equal(progress.gameFor(2).steps, 0); assert.equal(progress.gameFor(2).remainingTools('undo'), 3);
  assert.equal(progress.gameFor(2).remainingTools('hint'), 1);
  assert.deepEqual(progress.state.completed, [1, 2]); assert.equal(progress.state.sound, false); assert.ok(progress.updatedRuns);
});
test('42张第一关存档只重开第一关，后续进行中牌局、道具、锁格和小屋奖励保留', () => {
  const second = createCampaignLevel(2), moves = second.solution.slice(0, 4);
  const data = { version: 1, completed: [1], currentLevel: 2, sound: false,
    runs: { 1: [37, 38, 39], 2: moves }, runRevisions: { 1: 1, 2: second.revision },
    runToolsUsed: { 1: { undo: 2, hint: 1 }, 2: { undo: 1, hint: 1 } }, runUnlockedSlots: { 1: 0, 2: 1 } };
  const progress = new Progress(memory(JSON.stringify(data)));
  assert.equal(progress.gameFor(1).remaining(), 30); assert.equal(progress.gameFor(1).steps, 0);
  assert.equal(progress.gameFor(1).remainingTools('undo'), 3);
  const restored = progress.gameFor(2);
  assert.deepEqual(restored.moves, moves); assert.equal(restored.remainingTools('undo'), 2);
  assert.equal(restored.remainingTools('hint'), 0); assert.equal(restored.capacity, 7);
  assert.equal(progress.decorations()[0].id, 'cushion'); assert.equal(progress.state.sound, false);
  progress.save(restored);
  assert.equal(new Progress(progress.storage).gameFor(2).steps, 4);
});
test('逐关通关解锁，存档加载后仍保留解锁结果，不能跳过锁定关卡', () => {
  const storage = memory(); let progress = new Progress(storage);
  assert.equal(progress.unlocked(), 1); assert.equal(progress.gameFor(2), null);
  LEVELS.forEach(info => {
    const game = progress.gameFor(info.number); win(game); assert.ok(progress.save(game));
    progress = new Progress(storage);
    assert.ok(progress.isComplete(info.number));
    assert.equal(progress.unlocked(), Math.min(5, info.number + 1));
  });
  assert.deepEqual(progress.state.completed, [1, 2, 3, 4, 5]);
  const replay = progress.gameFor(1); assert.equal(replay.steps, 0);
  win(replay); progress.save(replay); assert.equal(progress.state.completed.length, 5);
});
test('保存中的棋盘、暂存、消除数和撤回历史可以完整恢复', () => {
  const storage = memory(), progress = new Progress(storage), game = progress.gameFor(1);
  game.level.solution.slice(0, 6).forEach(id => game.pick(id));
  progress.save(game, false);
  const loaded = new Progress(storage), restored = loaded.gameFor(1);
  assert.deepEqual(restored.alive, game.alive); assert.deepEqual(restored.tray, game.tray);
  assert.equal(restored.matches, game.matches); assert.equal(restored.steps, 6);
  assert.equal(loaded.state.sound, false); assert.equal(loaded.resumeNumber(), 1);
  assert.ok(restored.undo()); assert.equal(restored.steps, 5); assert.equal(restored.matches, 0);
  loaded.save(restored);
  assert.equal(new Progress(storage).gameFor(1).steps, 5);
});
test('关卡间切换保存各自局面，重试只重置当前关卡且保留通关记录', () => {
  const progress = new Progress(memory()), first = progress.gameFor(1); win(first); progress.save(first);
  const second = progress.gameFor(2); second.pick(second.level.solution[0]); progress.save(second);
  const replay = progress.gameFor(1); replay.pick(replay.level.solution[0]); progress.save(replay);
  assert.equal(progress.gameFor(2).steps, 1);
  replay.reset(); progress.save(replay);
  assert.equal(progress.gameFor(1).steps, 0); assert.equal(progress.gameFor(2).steps, 1);
  assert.ok(progress.isComplete(1));
});
test('损坏或无效存档安全回退，单个坏局面不影响通关记录', () => {
  for (const raw of ['broken json', 'null', '{"version":99}', '{"version":1,"completed":[4],"currentLevel":99}']) {
    const progress = new Progress(memory(raw)); assert.equal(progress.unlocked(), 1);
    assert.ok(progress.gameFor(1));
  }
  const damaged = { version: 1, completed: [1], currentLevel: 2, runs: { 1: [999], 2: [0, 0] } };
  const progress = new Progress(memory(JSON.stringify(damaged)));
  assert.equal(progress.unlocked(), 2); assert.equal(progress.gameFor(2).steps, 0);
  assert.throws(() => Game.fromMoves(createCampaignLevel(1), [0, 0]));
  assert.throws(() => Game.fromMoves(createCampaignLevel(1), [999]));
});
test('存储不可用时仍可游玩，内存中的通关与继续能力保留', () => {
  const progress = new Progress({ read() { throw new Error('disabled'); }, write() { throw new Error('quota'); } });
  const first = progress.gameFor(1); win(first);
  assert.equal(progress.save(first), false); assert.equal(progress.unlocked(), 2);
  assert.ok(progress.gameFor(2));
});
test('视图从选关进入游戏，完成后可下一关，选关和续玩不会丢失局面', () => {
  const storage = memory(), view = new GameView({ ctx: {}, storage });
  assert.equal(view.screen, 'levels'); view.press('level-2'); assert.equal(view.screen, 'levels');
  view.press('resume'); assert.equal(view.screen, 'game');
  const first = view.game;
  first.level.solution.forEach(id => { view.pick(id); view.animation = null; });
  assert.equal(first.status, 'won'); assert.ok(view.progress.isComplete(1));
  view.press('next'); assert.equal(view.game.level.number, 2);
  view.pick(view.game.level.solution[0]); view.animation = null;
  view.press('levels'); assert.equal(view.screen, 'levels'); assert.equal(view.resumeLabel(), '继续第 2 关');
  const restored = new GameView({ ctx: {}, storage }); restored.press('resume');
  assert.equal(restored.game.level.number, 2); assert.equal(restored.game.steps, 1);
  assert.ok(restored.progress.isComplete(1));
});
