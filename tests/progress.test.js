'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Game, createLevel, createCampaignLevel, LEVELS, TYPES, SIZE } = require('../utils/game');
const { Progress, KEY } = require('../utils/progress');
const { GameView } = require('../utils/view');
const { measure } = require('../scripts/difficulty-check');
function memory(initial) {
  const values = new Map(initial == null ? [] : [[KEY, initial]]);
  return { read: key => values.get(key), write: (key, value) => values.set(key, value), values };
}
function win(game) { game.level.solution.forEach(id => assert.ok(game.pick(id).ok)); assert.equal(game.status, 'won'); }

test('扩到十五关仍保持前五关生成结果完全一致，旧牌面无需重开', () => {
  const crypto = require('node:crypto');
  const baseline = [
    'ba66c0ebfc91fcfea6992fb02d5d1eac2c9af7d231f6c81a88c2c6cb64b1beb3',
    '4119d399861babe2d59abf714500e012b40c10f0ca064969603af83365012a74',
    'ba470afb603ea2f75084d837646e03ade36d3b8c9fb0e32fb8d9260a8e475084',
    '73e6c4b08b99a80abbb7c8fb1d26e3c288ea8e507b3c6fa97bcd6d92429bd31d',
    '1fc972484e186a80bd63c565b665fd65efe8f59ea4cdab36d8e0a092431bf517'
  ];
  assert.deepEqual(LEVELS.slice(0, 5).map(info => crypto.createHash('sha256').update(JSON.stringify(createCampaignLevel(info.number))).digest('hex')), baseline);
});

test('第二章以七格轻松关重新开始，再逐步增加挑战', () => {
  const rates = LEVELS.slice(5, 10).map(info => measure(createCampaignLevel(info.number), 300).rate);
  assert.ok(rates[0] > 0.6);
  for (let i = 1; i < rates.length; i++) assert.ok(rates[i] < rates[i - 1], '本章难度阶梯：' + rates);
  assert.ok(rates[1] > 0.2, '第7关应保留缓冲，避免骤然变难');
});

test('旧五关通关记录解锁第六关，保留旧局面、道具、临时格子与声音', () => {
  const level = createCampaignLevel(3), moves = level.solution.slice(0, 4);
  const storage = memory(JSON.stringify({ version: 1, completed: [1, 2, 3, 4, 5], currentLevel: 5, sound: false,
    runs: { 3: moves }, runRevisions: { 3: level.revision }, runToolsUsed: { 3: { undo: 2, hint: 1 } }, runUnlockedSlots: { 3: 1 } }));
  const progress = new Progress(storage);
  assert.equal(progress.updatedRuns, false); assert.equal(progress.unlocked(), 6); assert.equal(progress.resumeNumber(), 6);
  assert.equal(progress.gameFor(6).capacity, 7); assert.equal(progress.gameFor(7), null);
  assert.equal(progress.decorations(1).length, 5); assert.equal(progress.decorations(2).length, 0);
  assert.equal(progress.nextDecoration().id, 'mat'); assert.equal(progress.state.sound, false);
  const old = progress.gameFor(3); assert.deepEqual(old.moves, moves);
  assert.equal(old.remainingTools('undo'), 1); assert.equal(old.remainingTools('hint'), 0); assert.equal(old.capacity, 7);
});
test('旧第十关revision1局面只重开当前牌局，通关收藏与其他关道具和声音保留', () => {
  const seventh = createCampaignLevel(7), moves = seventh.solution.slice(0, 4);
  for (const completedCount of [9, 10]) {
    const completed = Array.from({ length: completedCount }, (_, i) => i + 1);
    const storage = memory(JSON.stringify({ version: 1, completed, currentLevel: 10, sound: false,
      runs: { 7: moves, 10: [59, 57, 55] }, runRevisions: { 7: seventh.revision, 10: 1 },
      runToolsUsed: { 7: { undo: 2, hint: 1 }, 10: { undo: 3, hint: 1 } }, runUnlockedSlots: { 7: 1, 10: 2 } }));
    const progress = new Progress(storage), tenth = progress.gameFor(10), preserved = progress.gameFor(7);
    assert.ok(progress.updatedRuns); assert.equal(tenth.level.revision, 2);
    assert.equal(tenth.remaining(), 60); assert.equal(tenth.steps, 0); assert.equal(tenth.capacity, 5);
    assert.equal(tenth.remainingTools('undo'), 3); assert.equal(tenth.remainingTools('hint'), 1);
    assert.deepEqual(preserved.moves, moves); assert.equal(preserved.remainingTools('undo'), 1);
    assert.equal(preserved.remainingTools('hint'), 0); assert.equal(preserved.capacity, 7);
    assert.deepEqual(progress.state.completed, completed); assert.equal(progress.state.sound, false);
    assert.equal(progress.decorations().length, completedCount);
    assert.equal(progress.isComplete(10), completedCount === 10);
    assert.equal(progress.resumeNumber(), completedCount + 1);
    progress.save(tenth);
    const reloaded = new Progress(storage);
    assert.equal(reloaded.gameFor(10).steps, 0); assert.equal(reloaded.state.runRevisions[10], 2);
    assert.deepEqual(reloaded.gameFor(7).moves, moves); assert.equal(reloaded.gameFor(7).remainingTools('hint'), 0);
  }
});
test('旧十关通关自动解锁第十一关，第三章只收藏新奖励且不能跳到第十二关', () => {
  const completed = Array.from({ length: 10 }, (_, i) => i + 1);
  const view = new GameView({ ctx: {}, storage: memory(JSON.stringify({ version: 1, completed, currentLevel: 10 })) });
  assert.equal(view.progress.unlocked(), 11); assert.equal(view.progress.resumeNumber(), 11);
  assert.equal(view.chapter, 3); assert.equal(view.game.level.number, 11); assert.equal(view.game.capacity, 5);
  assert.deepEqual(view.progress.decorations(3), []); assert.equal(view.progress.nextDecoration(3).id, 'rug');
  assert.equal(view.progress.decorations(1).length, 5); assert.equal(view.progress.decorations(2).length, 5);
  const levels = view.controls().filter(item => item.action.startsWith('level-'));
  assert.deepEqual(levels.map(item => item.action), ['level-11', 'level-12', 'level-13', 'level-14', 'level-15']);
  assert.equal(levels[0].disabled, false); assert.ok(levels.slice(1).every(item => item.disabled));
  view.press('level-12'); assert.equal(view.screen, 'levels');
  view.press('room'); assert.equal(view.roomChapter, 3); assert.deepEqual(view.roomDecorations(), []);
  view.press('furniture-stand'); assert.equal(view.roomReaction, null); view.press('close');
  view.press('level-11'); win(view.game); view.progress.save(view.game);
  assert.deepEqual(view.progress.decorations(3).map(item => item.id), ['rug']);
  assert.equal(view.progress.nextDecoration(3).id, 'books');
  assert.deepEqual(view.progress.decorations(2).map(item => item.id), ['mat', 'can', 'flowers', 'chime', 'stand']);
});
test('第三章固定六十张，每关逐步引入一种新图案，共新增五种样式', () => {
  assert.equal(TYPES.length, 13);
  assert.equal(new Set(TYPES.map(type => type.name)).size, 13);
  LEVELS.slice(10).forEach((info, index) => {
    assert.equal(info.total, 60); assert.equal(info.kinds, 9 + index); assert.equal(info.newKind, 8 + index);
    for (let seed = 0; seed < 20; seed++) {
      const game = new Game(createCampaignLevel(info.number, seed));
      const kinds = [...new Set(game.level.tiles.map(tile => tile.kind))].sort((a, b) => a - b);
      assert.deepEqual(kinds, Array.from({ length: info.kinds }, (_, kind) => kind));
      assert.equal(game.capacity, 5);
      const firstMove = game.level.solution[0]; game.pick(firstMove);
      const route = game.hint(); assert.ok(route);
      assert.ok(route.some(id => game.level.tiles[id].kind === info.newKind));
      route.forEach(id => assert.ok(game.pick(id).ok)); assert.equal(game.status, 'won');
    }
  });
});

test('选关分页只展示本章五关，锁定章节可预览但不能越关，收藏各归各屋', () => {
  const view = new GameView({ ctx: {}, storage: memory(JSON.stringify({ version: 1, completed: [1, 2] })) });
  view.press('chapter-2');
  const levels = view.controls().filter(item => item.action.startsWith('level-'));
  assert.deepEqual(levels.map(item => item.action), ['level-6', 'level-7', 'level-8', 'level-9', 'level-10']);
  assert.ok(levels.every(item => item.disabled && item.y + item.h < 710));
  view.press('level-6'); assert.equal(view.screen, 'levels');
  view.press('room'); assert.equal(view.roomChapter, 2); assert.deepEqual(view.roomDecorations(), []);
  view.press('furniture-cushion'); assert.equal(view.roomReaction, null);
  view.press('close'); view.press('chapter-1'); view.press('room');
  assert.deepEqual(view.roomDecorations().map(item => item.id), ['cushion', 'basket']);
});
test('第一关30张，十五关布局各不相同且不存在同层重叠', () => {
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
  assert.equal(shapes.size, 15);
  assert.throws(() => createCampaignLevel(16), RangeError);
});
test('十五种布局各验证100个种子，均能在初始容量下通关且不占锁格', () => {
  LEVELS.forEach(info => {
    for (let seed = 0; seed < 100; seed++) {
      const game = new Game(createCampaignLevel(info.number, seed));
      game.level.solution.forEach(id => { assert.ok(game.pick(id).ok); assert.ok(game.tray.length < game.capacity); });
      assert.equal(game.status, 'won'); assert.equal(game.matches, info.total / 3);
    }
  });
});
test('同一套不使用道具的模拟策略下，固定五关的难度逐步上升', () => {
  const rates = LEVELS.slice(0, 5).map(info => measure(createCampaignLevel(info.number), 300).rate);
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

test('三章各五关牌量、图案数与实际遮挡深度符合配置', () => {
  assert.deepEqual(LEVELS.map(info => info.total), [30, 45, 48, 54, 60, 36, 42, 48, 54, 60, 60, 60, 60, 60, 60]);
  assert.deepEqual(LEVELS.map(info => info.kinds), [6, 6, 7, 8, 8, 6, 6, 7, 7, 8, 9, 10, 11, 12, 13]);
  assert.deepEqual(LEVELS.map(info => info.layers), [3, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 8, 9, 9, 10]);
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
    assert.equal(progress.unlocked(), Math.min(LEVELS.length, info.number + 1));
  });
  assert.deepEqual(progress.state.completed, LEVELS.map(info => info.number));
  const replay = progress.gameFor(1); assert.equal(replay.steps, 0);
  win(replay); progress.save(replay); assert.equal(progress.state.completed.length, LEVELS.length);
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
