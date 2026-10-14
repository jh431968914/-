'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Game, createLevel, TYPES } = require('../utils/game');
const { createServer } = require('../scripts/server');
function fixture(kinds, solution) {
  return { tiles: kinds.map((kind, id) => ({ id, kind, x: id * 60, y: 0, layer: 0, blockers: [] })),
    solution: solution || kinds.map((_, id) => id) };
}
test('第一关有 30 张图块、三层与六种图案，每种数量为三的倍数', () => {
  const level = createLevel();
  assert.equal(level.tiles.length, 30);
  assert.deepEqual([...new Set(level.tiles.map(t => t.layer))], [0, 1, 2]);
  TYPES.slice(0, level.kinds).forEach((_, kind) => {
    const count = level.tiles.filter(t => t.kind === kind).length;
    assert.ok(count > 0); assert.equal(count % 3, 0);
  });
  assert.deepEqual(createLevel(), level);
});
test('100 个种子的合法取牌证书均能通关，暂存槽不会超过 6 格', () => {
  for (let seed = 0; seed < 100; seed++) {
    const level = createLevel(seed), game = new Game(level);
    level.solution.forEach(id => {
      assert.ok(game.isAvailable(id));
      assert.ok(game.pick(id).ok);
      assert.ok(game.tray.length < 7);
    });
    assert.equal(game.status, 'won'); assert.equal(game.matches, 10);
    assert.equal(game.remaining(), 0); assert.equal(game.tray.length, 0);
  }
});
test('被遮挡的图块不可取，且不会改变局面或撤回记录', () => {
  const game = new Game(), blocked = game.level.tiles.find(t => !game.isAvailable(t.id));
  assert.equal(game.pick(blocked.id).reason, 'blocked');
  assert.equal(game.remaining(), 30); assert.equal(game.steps, 0); assert.equal(game.history.length, 0);
});
test('相同图案自动归组，三张消除', () => {
  const game = new Game(fixture([0, 1, 0, 1, 0, 1]));
  [0, 1, 2].forEach(id => game.pick(id));
  assert.deepEqual(game.tray.map(t => t.kind), [0, 0, 1]);
  const event = game.pick(4);
  assert.ok(event.matched); assert.equal(event.matchedIds.length, 3);
  assert.deepEqual(game.tray.map(t => t.kind), [1]);
});
test('第七格凑成三张时先消除，不误判失败', () => {
  const game = new Game(fixture([0, 1, 2, 3, 4, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4]));
  [0, 1, 2, 3, 4, 5].forEach(id => game.pick(id));
  assert.equal(game.tray.length, 6);
  assert.ok(game.pick(6).matched); assert.equal(game.status, 'playing'); assert.equal(game.tray.length, 4);
});
test('七格无消除会失败，失败后撤回能完整恢复', () => {
  const game = new Game(fixture([0, 1, 2, 3, 4, 5, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]));
  [0, 1, 2, 3, 4, 5, 6].forEach(id => game.pick(id));
  assert.equal(game.status, 'lost'); assert.equal(game.tray.length, 7);
  assert.equal(game.pick(7).reason, 'finished');
  assert.ok(game.undo()); assert.equal(game.status, 'playing'); assert.equal(game.tray.length, 6);
  assert.ok(game.alive[6]); assert.equal(game.steps, 6);
});
test('撤回消除能恢复三张图块与匹配计数；重来清空历史', () => {
  const game = new Game(fixture([0, 0, 0]));
  [0, 1, 2].forEach(id => game.pick(id));
  assert.equal(game.status, 'won'); assert.equal(game.matches, 1);
  assert.ok(game.undo()); assert.equal(game.status, 'playing'); assert.equal(game.matches, 0);
  assert.deepEqual(game.tray.map(t => t.id), [0, 1]); assert.ok(game.alive[2]);
  game.reset(); assert.equal(game.history.length, 0); assert.equal(game.remaining(), 3);
  assert.equal(game.tray.length, 0); assert.equal(game.steps, 0);
});
test('提示从玩家实际局面搜索，不依赖原始通关顺序', () => {
  const kinds = Array.from({ length: 18 }, (_, i) => Math.floor(i / 3));
  const solution = Array.from({ length: 15 }, (_, i) => i + 3).concat([0, 1, 2]);
  const game = new Game(fixture(kinds, solution));
  [0, 1, 3, 6, 9, 12].forEach(id => game.pick(id));
  const before = { alive: game.alive.slice(), tray: game.tray.slice(), steps: game.steps };
  const route = game.solve(); assert.ok(route); assert.equal(route[0], 2);
  assert.deepEqual(game.alive, before.alive); assert.deepEqual(game.tray, before.tray); assert.equal(game.steps, before.steps);
  route.forEach(id => assert.ok(game.pick(id).ok)); assert.equal(game.status, 'won');
});
function highIdFixture() {
  const level = fixture(Array.from({ length: 108 }, (_, id) => Math.floor(id / 3) % 13));
  level.lockedSlots = 2;
  level.tiles[0].blockers = [96];
  level.tiles[2].blockers = [98];
  level.tiles[32].blockers = [64];
  level.tiles[64].blockers = [101];
  const firstGroups = [2, 33, 32, 21, 10];
  const groups = firstGroups.concat(Array.from({ length: 36 }, (_, i) => i).filter(i => !firstGroups.includes(i)));
  level.solution = groups.flatMap(group => [group * 3, group * 3 + 1, group * 3 + 2]);
  return level;
}
test('多段位掩码不混淆跨32、64和96的图块或遮挡，偏离证书后提示仍能通关', () => {
  const level = highIdFixture(), certificate = new Game(level);
  level.solution.forEach(id => assert.ok(certificate.pick(id).ok));
  assert.equal(certificate.status, 'won');
  const game = Game.fromMoves(level, [96, 97, 99, 100]);
  assert.equal(game.tray.length, 4); assert.equal(game.capacity, 5);
  assert.equal(game.isAvailable(2), false, '编号98仍遮挡编号2');
  assert.equal(game.isAvailable(32), false, '编号64仍遮挡编号32');
  assert.equal(game.isAvailable(64), false, '编号101仍遮挡编号64');
  const plannedProbe = Game.fromMoves(level, game.moves);
  plannedProbe.pick(level.solution.find(id => plannedProbe.alive[id]));
  assert.equal(plannedProbe.status, 'lost', '原证书剩余顺序无法解决当前局面，必须搜索');
  const before = { alive: game.alive.slice(), moves: game.moves.slice(), tray: game.tray.slice(), toolsUsed: Object.assign({}, game.toolsUsed) };
  const route = game.solve(); assert.ok(route);
  assert.deepEqual(route.slice().sort((a, b) => a - b), level.tiles.filter(tile => before.alive[tile.id]).map(tile => tile.id));
  assert.equal(new Set(route).size, route.length);
  assert.ok(route.includes(32) && route.includes(64) && route.includes(98) && route.includes(101));
  assert.ok(route.some(id => level.tiles[id].kind >= 8), '搜索涵盖第三章新增的图案种类');
  assert.deepEqual(game.alive, before.alive); assert.deepEqual(game.moves, before.moves);
  assert.deepEqual(game.tray, before.tray); assert.deepEqual(game.toolsUsed, before.toolsUsed);
  assert.deepEqual(game.hint(), route); assert.equal(game.remainingTools('hint'), 0);
  route.forEach(id => { assert.ok(game.isAvailable(id)); assert.ok(game.pick(id).ok); assert.ok(game.tray.length < game.capacity); });
  assert.equal(game.status, 'won'); assert.equal(game.matches, 36); assert.equal(game.remaining(), 0);
});
test('提示搜索达到节点限额不扣次数或改动牌局，后续完整搜索仍可给出提示', () => {
  const game = Game.fromMoves(highIdFixture(), [96, 97, 99, 100]);
  const before = { alive: game.alive.slice(), moves: game.moves.slice(), tray: game.tray.slice(), steps: game.steps };
  assert.equal(game.solve(1), null);
  const solve = game.solve;
  game.solve = function () { return solve.call(this, 1); };
  assert.equal(game.hint(), null); assert.equal(game.remainingTools('hint'), 1);
  assert.deepEqual(game.alive, before.alive); assert.deepEqual(game.moves, before.moves);
  assert.deepEqual(game.tray, before.tray); assert.equal(game.steps, before.steps);
  game.solve = solve;
  assert.ok(game.hint()); assert.equal(game.remainingTools('hint'), 0);
});
test('本地试玩服务能返回页面、脚本，并拒绝非预览目录', async t => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = 'http://127.0.0.1:' + server.address().port;
  const page = await fetch(url); assert.equal(page.status, 200); assert.match(await page.text(), /喵喵消消屋/);
  const script = await fetch(url + '/utils/game.js'); assert.equal(script.status, 200);
  assert.equal((await fetch(url + '/package.json')).status, 404);
  assert.equal((await fetch(url + '/web/..%2f..%2fpackage.json')).status, 404);
});
