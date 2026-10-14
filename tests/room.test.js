'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Progress, KEY, DECORATIONS } = require('../utils/progress');
const { GameView } = require('../utils/view');
function memory(initial) {
  const values = new Map(initial == null ? [] : [[KEY, JSON.stringify(initial)]]);
  return { read: key => values.get(key), write: (key, value) => values.set(key, value) };
}
function win(view) {
  view.game.level.solution.forEach(id => { view.pick(id); view.animation = null; });
  assert.equal(view.game.status, 'won');
}
test('首次通关才获得对应装饰，五关奖励自动保存且重玩不会重复发放', () => {
  const storage = memory(), view = new GameView({ ctx: {}, storage });
  assert.deepEqual(view.progress.decorations(), []);
  assert.equal(view.progress.nextDecoration().id, 'cushion');
  view.press('resume');
  for (let number = 1; number <= 5; number++) {
    view.pick(view.game.level.solution[0]); view.animation = null;
    assert.equal(view.progress.decorations().length, number - 1);
    assert.equal(view.newDecoration, null);
    view.game.level.solution.slice(1).forEach(id => { view.pick(id); view.animation = null; });
    assert.equal(view.game.status, 'won');
    assert.equal(view.newDecoration.id, DECORATIONS[number - 1].id);
    const restored = new Progress(storage);
    assert.deepEqual(restored.decorations(), DECORATIONS.slice(0, number));
    assert.equal(restored.nextDecoration(), DECORATIONS[number] || null);
    if (number < 5) view.press('next');
  }
  view.press('restart'); assert.equal(view.newDecoration, null);
  win(view); assert.equal(view.newDecoration, null);
  assert.equal(new Progress(storage).decorations().length, 5);
});
test('旧存档按有效通关记录补齐装饰，保留正在玩的局面、道具和声音', () => {
  const original = new Progress(memory()), first = original.gameFor(1);
  first.level.solution.forEach(id => first.pick(id)); original.save(first);
  const second = original.gameFor(2); second.pick(second.level.solution[0]);
  second.hint(); original.save(second, false);
  const old = JSON.parse(original.storage.read(KEY));
  const restored = new Progress(memory(old));
  assert.equal(restored.decorations()[0].id, 'cushion');
  assert.equal(restored.nextDecoration().id, 'basket');
  assert.equal(restored.gameFor(2).steps, 1);
  assert.equal(restored.gameFor(2).remainingTools('hint'), 0);
  assert.equal(restored.state.sound, false);
});
test('失败、重来和查看小屋不会错误发放奖励或修改原局', () => {
  const storage = memory(), view = new GameView({ ctx: {}, storage }); view.press('resume');
  while (view.game.status === 'playing') {
    const held = Array(8).fill(0); view.game.tray.forEach(tile => held[tile.kind]++);
    const tiles = view.game.available().sort((a, b) => held[a.kind] - held[b.kind]);
    view.pick((tiles.find(tile => held[tile.kind] < 2) || tiles[0]).id); view.animation = null;
  }
  assert.equal(view.game.status, 'lost'); assert.deepEqual(view.progress.decorations(), []);
  const saved = storage.read(KEY), moves = view.game.moves.slice();
  view.press('levels'); view.press('room');
  assert.equal(view.modal, 'room');
  assert.deepEqual(view.controls().map(item => item.action), ['close']);
  view.pointer(view.offsetX + 195 * view.scale, view.offsetY + 715 * view.scale);
  assert.equal(view.modal, null); assert.equal(view.screen, 'levels');
  assert.equal(storage.read(KEY), saved); assert.deepEqual(view.game.moves, moves);
  view.press('resume'); view.press('restart'); assert.deepEqual(view.progress.decorations(), []);
});
test('坏局面不丢失已得装饰，无效或跳关的通关记录不会解锁装饰', () => {
  const progress = new Progress(memory({ version: 1, completed: [1, 2, 4, 99], runs: { 1: [999], 3: [0, 0] } }));
  assert.deepEqual(progress.decorations().map(item => item.id), ['cushion', 'basket']);
  assert.equal(progress.nextDecoration().number, 3);
  assert.equal(progress.gameFor(3).steps, 0);
  assert.deepEqual(new Progress(memory({ version: 1, completed: [5] })).decorations(), []);
});
test('通关后可查看小屋、返回结算并进入下一关，集齐后主按钮打开小屋', () => {
  const view = new GameView({ ctx: {}, storage: memory() }); view.press('resume'); win(view);
  assert.ok(view.controls().some(item => item.action === 'bring-home'));
  view.press('bring-home'); view.press('close');
  assert.equal(view.screen, 'game'); assert.equal(view.game.status, 'won');
  view.press('next'); assert.equal(view.game.level.number, 2); assert.equal(view.modal, null);
  for (let number = 2; number <= 10; number++) { win(view); if (number < 10) view.press('next'); }
  assert.deepEqual(view.controls().map(item => item.action), ['bring-home', 'restart', 'levels']);
  view.press('bring-home'); assert.equal(view.screen, 'game'); assert.equal(view.modal, 'room');
  view.press('skip-arrival'); view.press('levels'); view.press('room');
  view.press('close'); assert.equal(view.progress.nextDecoration(), null);
  assert.equal(view.resumeLabel(), '再陪小猫玩一局');
});
test('无法写入存储时奖励在本次游戏仍可显示，页面提示保存失败', () => {
  const view = new GameView({ ctx: {}, storage: { write() { throw new Error('quota'); } } });
  view.press('resume'); win(view);
  assert.equal(view.progress.decorations().length, 1);
  assert.equal(view.newDecoration.id, 'cushion');
  assert.match(view.toast.message, /进度暂时无法保存/);
  view.press('next'); assert.equal(view.progress.decorations().length, 1);
});

test('家具只在小屋内且已收集时可互动，场景与卡片在缩放后均能点中', () => {
  const view = new GameView({ ctx: {}, width: 320, height: 560,
    storage: memory({ version: 1, completed: [1, 2, 3], sound: false }) });
  view.press('furniture-cushion'); assert.equal(view.roomReaction, null);
  view.press('room'); view.press('furniture-lamp'); assert.equal(view.roomReaction, null);
  assert.equal(view.controls().length, 7);
  for (const item of DECORATIONS.slice(0, 3)) {
    for (const prefix of ['furniture-', 'collection-']) {
      const control = view.controls().find(control => control.action === prefix + item.id);
      view.pointer(view.offsetX + (control.x + control.w / 2) * view.scale,
        view.offsetY + (control.y + control.h / 2) * view.scale);
      assert.equal(view.roomReaction.id, item.id);
      view.press('close'); view.press('room');
    }
  }
});

test('家具回应限为一个，尊重静音，结束或关闭会清理且从不写入牌局存档', () => {
  const storage = memory({ version: 1, completed: [1, 2, 3, 4, 5], sound: false });
  const sounds = [], ctx = new Proxy({}, { get(target, key) { return key in target ? target[key] : () => {}; } });
  const view = new GameView({ ctx, storage, playSound: name => sounds.push(name) });
  view.press('resume'); view.pick(view.game.available()[0].id); view.animation = null;
  const saved = storage.read(KEY), moves = view.game.moves.slice(), tools = Object.assign({}, view.game.toolsUsed);
  view.press('levels'); view.press('chapter-1'); view.press('room');
  for (const item of DECORATIONS.slice(0, 5)) {
    view.press('furniture-' + item.id);
    const reaction = view.roomReaction;
    view.press('furniture-' + item.id); view.press('collection-cushion');
    assert.equal(view.roomReaction, reaction, '连续点击不重启动画或排队');
    assert.equal(view.animation, null);
    assert.ok(view.controls().filter(control => control.action !== 'close').every(control => control.disabled));
    view.draw(reaction.start + 850);
    assert.equal(view.roomReaction, reaction);
    view.draw(reaction.start + reaction.duration);
    assert.equal(view.roomReaction, null);
    assert.ok(view.controls().every(control => !control.disabled));
  }
  assert.deepEqual(sounds, []);
  view.sound = true; view.press('collection-basket');
  assert.deepEqual(sounds, ['tap']);
  view.press('close'); assert.equal(view.roomReaction, null);
  view.press('room'); assert.equal(view.roomReaction, null);
  view.press('furniture-picture'); view.press('levels'); assert.equal(view.roomReaction, null);
  assert.equal(storage.read(KEY), saved);
  assert.deepEqual(view.game.moves, moves); assert.deepEqual(view.game.toolsUsed, tools);
});

test('十关首次奖励各播放一次落位和欢迎，动画前已保存，结束后可直接继续', () => {
  const ctx = new Proxy({}, { get(target, key) { return key in target ? target[key] : () => {}; } });
  const storage = memory(), sounds = [], view = new GameView({ ctx, storage, playSound: name => sounds.push(name) });
  view.press('resume');
  for (const item of DECORATIONS) {
    win(view);
    const saved = storage.read(KEY), before = sounds.length;
    assert.equal(new Progress(storage).decorations().length, item.number);
    view.press('bring-home');
    const arrival = view.roomArrival;
    assert.equal(arrival.id, item.id); assert.equal(view.pendingArrival, null);
    view.press('bring-home'); assert.equal(view.roomArrival, arrival);
    view.press('collection-' + item.id); assert.equal(view.roomReaction, null);
    assert.ok(view.controls().some(control => control.action === 'skip-arrival' && !control.disabled));
    view.draw(arrival.start + 400); assert.equal(view.roomReaction, null);
    view.draw(arrival.start + 800); assert.equal(view.roomReaction.id, item.id);
    assert.equal(sounds.length, before + 1);
    view.draw(arrival.start + 1400); assert.equal(sounds.length, before + 1);
    view.draw(arrival.start + 3200);
    assert.equal(view.roomArrival, null); assert.equal(view.roomReaction, null);
    assert.equal(storage.read(KEY), saved);
    assert.ok(view.controls().some(control => control.action === (item.number < 10 ? 'next' : 'levels')));
    view.press('close'); view.press('room'); assert.equal(view.roomArrival, null);
    view.press('close');
    if (item.number < 10) view.press('next');
  }
  view.press('restart'); win(view);
  assert.equal(view.pendingArrival, null);
  assert.ok(!view.controls().some(control => control.action === 'bring-home'));
});

test('跳过、关闭、后台过期和重新打开均不重播欢迎，不丢家具或补播声音', () => {
  const ctx = new Proxy({}, { get(target, key) { return key in target ? target[key] : () => {}; } });
  for (const exit of ['skip-arrival', 'close', 'background', 'reload', 'next']) {
    const storage = memory(), sounds = [], view = new GameView({ ctx, storage, playSound: name => sounds.push(name) });
    view.press('resume'); win(view);
    if (exit === 'next') {
      view.press('next'); assert.equal(view.pendingArrival, null);
      view.press('room'); assert.equal(view.roomArrival, null); continue;
    }
    view.press('bring-home');
    const arrival = view.roomArrival, saved = storage.read(KEY), before = sounds.length;
    if (exit === 'reload') {
      const restored = new GameView({ ctx, storage }); restored.press('room');
      assert.equal(restored.progress.decorations().length, 1); assert.equal(restored.roomArrival, null);
    } else {
      if (exit !== 'background') view.press(exit);
      view.draw(arrival.start + 6000);
      assert.equal(view.roomArrival, null); assert.equal(view.roomReaction, null);
      assert.equal(sounds.length, before);
      view.press('close'); view.press('room'); assert.equal(view.roomArrival, null);
    }
    assert.equal(storage.read(KEY), saved);
    assert.equal(new Progress(storage).decorations().length, 1);
  }
});
