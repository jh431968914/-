(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MeowGame = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const SIZE = 54;
  const CAPACITY = 7;
  const CHAPTERS = [
    { number: 1, name: '暖暖客厅', first: 1, last: 5, theme: 'living' },
    { number: 2, name: '阳光花房', first: 6, last: 10, theme: 'garden' },
    { number: 3, name: '月光书房', first: 11, last: 15, theme: 'study' },
    { number: 4, name: '晨光露台', first: 16, last: 20, theme: 'terrace' }
  ];
  function chapterFor(number) { return CHAPTERS.find(chapter => number >= chapter.first && number <= chapter.last); }
  const LEVELS = [
    { number: 1, name: '猫咪的小屋', difficulty: '轻松 · 入门', total: 30, kinds: 6, layers: 3, lockedSlots: 0, revision: 2, seed: 20261012, note: '从熟悉的小屋开始' },
    { number: 2, name: '窗边的午后', difficulty: '挑战 · 进阶', total: 45, kinds: 6, layers: 5, lockedSlots: 1, revision: 4, seed: 20269956, note: '先看第三张，再动手' },
    { number: 3, name: '毛线小角落', difficulty: '困难 · 深层', total: 48, kinds: 7, layers: 6, lockedSlots: 1, revision: 4, seed: 20262294, note: '多留一个空位' },
    { number: 4, name: '猫爪小花园', difficulty: '困难 · 规划', total: 54, kinds: 8, layers: 7, lockedSlots: 2, revision: 4, seed: 20262877, note: '藏在下面的，才是关键' },
    { number: 5, name: '暖暖猫咪窝', difficulty: '极难 · 挑战', total: 60, kinds: 8, layers: 8, lockedSlots: 2, revision: 4, seed: 20262199, note: '一步一步，揭开猫咪窝' },
    { number: 6, name: '推开花房门', difficulty: '轻松 · 新章', total: 36, kinds: 6, layers: 3, lockedSlots: 0, revision: 1, seed: 20261014, note: '七个空位，慢慢迎接阳光' },
    { number: 7, name: '晨间小水滴', difficulty: '适中 · 观察', total: 42, kinds: 6, layers: 4, lockedSlots: 1, revision: 1, seed: 20261179, note: '先找成对的小伙伴' },
    { number: 8, name: '雏菊开花啦', difficulty: '进阶 · 选择', total: 48, kinds: 7, layers: 5, lockedSlots: 1, revision: 1, seed: 20261112, note: '看看花丛下面藏着什么' },
    { number: 9, name: '风铃轻轻响', difficulty: '困难 · 规划', total: 54, kinds: 7, layers: 6, lockedSlots: 2, revision: 1, seed: 20261122, note: '留好空位，再揭开下一层' },
    { number: 10, name: '满屋好时光', difficulty: '高难 · 收官', total: 60, kinds: 8, layers: 7, lockedSlots: 2, revision: 2, seed: 20262320, note: '看清深层配对，再带回最后一份心意' },
    { number: 11, name: '月光翻书页', difficulty: '高难 · 新图案', total: 60, kinds: 9, layers: 7, lockedSlots: 2, revision: 2, seed: 20262630, newKind: 8, note: '新伙伴：猫咪饼干，先找第三张' },
    { number: 12, name: '睡前小故事', difficulty: '高难 · 取舍', total: 60, kinds: 10, layers: 7, lockedSlots: 2, revision: 2, seed: 20262335, newKind: 9, note: '新伙伴：猫咪牛奶，给配对留出空位' },
    { number: 13, name: '花香伴晚安', difficulty: '高难 · 规划', total: 60, kinds: 11, layers: 8, lockedSlots: 2, revision: 2, seed: 20272431, newKind: 10, note: '新伙伴：蝴蝶结，分清每一组图案' },
    { number: 14, name: '时针轻轻走', difficulty: '高难 · 深层', total: 60, kinds: 12, layers: 8, lockedSlots: 2, revision: 2, seed: 20272140, newKind: 11, note: '新伙伴：羽毛玩具，先想两步再取牌' },
    { number: 15, name: '灯下好梦来', difficulty: '高难 · 收官', total: 60, kinds: 13, layers: 9, lockedSlots: 2, revision: 2, seed: 20285765, newKind: 12, note: '新伙伴：小纸箱，把所有配对带回家' },
    { number: 16, name: '晨光推开窗', difficulty: '极难 · 新图案', total: 60, kinds: 14, layers: 9, lockedSlots: 2, revision: 2, seed: 20292808, newKind: 13, note: '新伙伴：小鼠玩具，先找到完整的一组' },
    { number: 17, name: '小草醒来啦', difficulty: '极难 · 取舍', total: 60, kinds: 15, layers: 9, lockedSlots: 2, revision: 2, seed: 20303800, newKind: 14, note: '新伙伴：猫草盆，给每一组留下空位' },
    { number: 18, name: '把爱抱怀里', difficulty: '极难 · 规划', total: 60, kinds: 16, layers: 10, lockedSlots: 2, revision: 2, seed: 20304046, newKind: 15, note: '新伙伴：爱心抱枕，多看一步再动手' },
    { number: 19, name: '星光挂起来', difficulty: '极难 · 深层', total: 60, kinds: 17, layers: 10, lockedSlots: 2, revision: 2, seed: 20306543, newKind: 16, note: '新伙伴：星星挂饰，把配对的线索连起来' },
    { number: 20, name: '小屋就是家', difficulty: '极难 · 终章', total: 60, kinds: 18, layers: 11, lockedSlots: 2, revision: 2, seed: 20311279, newKind: 17, note: '新伙伴：小铃鼓，带着最后一份心意回家' }
  ];
  const TYPES = [
    { name: '橘猫', color: '#f5b66b', bg: '#fff0d9' },
    { name: '奶牛猫', color: '#616d69', bg: '#eaf0ec' },
    { name: '白猫', color: '#e7c9a5', bg: '#f5eadb' },
    { name: '小鱼', color: '#75aaa8', bg: '#e0f2ef' },
    { name: '毛线球', color: '#c38cab', bg: '#f7e5ef' },
    { name: '猫爪', color: '#b59bc6', bg: '#efe6f6' },
    { name: '铃铛', color: '#d3aa58', bg: '#fff1d0' },
    { name: '猫碗', color: '#83a6c7', bg: '#e3eef7' },
    { name: '猫咪饼干', color: '#d3a565', bg: '#fff0d6' },
    { name: '猫咪牛奶', color: '#83b2c5', bg: '#e7f4f7' },
    { name: '蝴蝶结', color: '#d497a8', bg: '#fbe9ee' },
    { name: '羽毛玩具', color: '#88b59a', bg: '#e8f5e9' },
    { name: '小纸箱', color: '#ba9874', bg: '#f5ebdc' },
    { name: '小鼠玩具', color: '#a09aac', bg: '#eeeaf3' },
    { name: '猫草盆', color: '#86a879', bg: '#edf4df' },
    { name: '爱心抱枕', color: '#dc9b96', bg: '#fbe8e2' },
    { name: '星星挂饰', color: '#d7b56d', bg: '#fff3d9' },
    { name: '小铃鼓', color: '#c69a82', bg: '#f8e9df' }
  ];
  function random(seed) {
    let value = seed >>> 0;
    return function () {
      value += 0x6D2B79F5;
      let n = Math.imul(value ^ value >>> 15, 1 | value);
      n ^= n + Math.imul(n ^ n >>> 7, 61 | n);
      return ((n ^ n >>> 14) >>> 0) / 4294967296;
    };
  }
  function overlaps(a, b) {
    return a.x < b.x + SIZE && a.x + SIZE > b.x &&
      a.y < b.y + SIZE && a.y + SIZE > b.y;
  }
  function levelCapacity(level) {
    const locks = Number.isInteger(level.lockedSlots) ? Math.max(0, Math.min(CAPACITY - 3, level.lockedSlots)) : 0;
    return CAPACITY - locks;
  }
  function mixedKinds(total, kindCount, number, rng, capacity) {
    const groups = total / 3;
    const left = Array.from({ length: kindCount }, (_, kind) => 3 * (Math.floor(groups / kindCount) + (kind < groups % kindCount ? 1 : 0)));
    const held = Array(kindCount).fill(0), result = [];
    const desired = Math.min(6, number + 2);
    while (result.length < total) {
      const size = held.reduce((sum, count) => sum + count, 0);
      const active = held.filter(Boolean).length;
      const choices = [];
      for (let kind = 0; kind < kindCount; kind++) {
        if (!left[kind]) continue;
        const next = held.slice(); next[kind] = (next[kind] + 1) % 3;
        const nextSize = next.reduce((sum, count) => sum + count, 0);
        // At the last free position, keep a pair so a third tile can still clear it.
        if (nextSize >= capacity || (nextSize === capacity - 1 && next.every(count => count < 2))) continue;
        let weight;
        if (held[kind] === 2) weight = size >= capacity - 2 ? 12 : (number === 2 ? 3 : 0.5);
        else if (held[kind] === 1) weight = number === 2 ? 6 : 3;
        else weight = active < desired ? 4 + number * 2 : 1;
        choices.push({ kind, weight });
      }
      let draw = rng() * choices.reduce((sum, choice) => sum + choice.weight, 0);
      let chosen = choices[choices.length - 1].kind;
      for (const choice of choices) { draw -= choice.weight; if (draw < 0) { chosen = choice.kind; break; } }
      result.push(chosen); left[chosen]--; held[chosen] = (held[chosen] + 1) % 3;
    }
    return result;
  }
  function createLevel(seed, number) {
    number = number == null ? 1 : number;
    const info = LEVELS[number - 1];
    if (!Number.isInteger(number) || !info) throw new RangeError('关卡编号必须在 1 到 ' + LEVELS.length + ' 之间');
    seed = seed == null ? info.seed : seed;
    const tiles = [];
    function add(x, y, layer) {
      tiles.push({ id: tiles.length, x, y, layer, kind: 0, blockers: [] });
    }
    if (number > 1) {
      const center = [];
      for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) center.push([60 + col * 60, 60 + row * 60]);
      const base = [[0, 0], [240, 0], [0, 240], [240, 240]].concat(center);
      const base12 = base.filter(p => p[0] !== 120 || p[1] !== 120);
      const shifted = [[30, 30], [210, 30], [30, 210], [210, 210],
        [90, 90], [150, 90], [90, 150], [150, 150], [30, 90], [210, 90], [30, 150], [210, 150]];
      const corners = [[60, 60], [180, 60], [60, 180], [180, 180]];
      const cross = [[60, 60], [180, 60], [120, 120], [60, 180], [180, 180]];
      const inner = [[90, 90], [150, 90], [90, 150], [150, 150]];
      const seven = center.filter(p => !(p[0] === 120 && (p[1] === 120 || p[1] === 180)));
      const staggered = [[90, 30], [30, 150], [150, 90], [90, 210], [210, 150]];
      // Chapter three uses one fewer layer than v0.14 per level; chapter four keeps its shapes.
      const layouts = {
        2: [base, shifted, center, shifted.slice(0, 7), corners],
        3: [base12, shifted.slice(0, 10), center, shifted.slice(0, 8), cross, inner],
        4: [base12, shifted.slice(0, 10), center, shifted.slice(0, 8), seven, staggered, [[60, 60], [180, 120], [60, 180]]],
        5: [base12, shifted.slice(0, 11), center.concat([[0, 120]]), shifted.slice(0, 9), seven, staggered, corners, [[90, 90], [150, 150]]],
        6: [Array.from({ length: 16 }, (_, i) => [30 + i % 4 * 60, 30 + Math.floor(i / 4) * 60]), base12, center.filter(p => p[0] !== 120 || p[1] !== 120)],
        7: [base, shifted, center, shifted.slice(0, 8)],
        8: [base, shifted, center, shifted.slice(0, 9), cross],
        9: [base12, shifted, center, shifted.slice(0, 11), cross, staggered],
        10: [base, shifted, center, shifted.slice(0, 10), center, corners, [[60, 60], [180, 120], [60, 180]]],
        11: [base12, shifted.slice(0, 11), center.concat([[0, 120]]), shifted.slice(0, 9), seven, staggered, corners.concat([[0, 120], [240, 120]])],
        12: [base, shifted.slice(0, 10), center, shifted.slice(0, 8), cross, staggered, seven.concat([[0, 0], [240, 0], [0, 240]])],
        13: [base12, shifted.slice(0, 10), center, shifted.slice(0, 8), cross, inner, corners, staggered.concat([[0, 0], [240, 0], [0, 240]])],
        14: [base, shifted.slice(0, 10), center, shifted.slice(0, 7), seven, corners, inner, cross.concat([[0, 120]])],
        15: [base12, shifted.slice(0, 10), center, shifted.slice(0, 6), cross, inner, corners, staggered, inner.concat([[0, 120]])],
        16: [base, shifted.slice(0, 9), center, shifted.slice(0, 7), seven, corners, inner, staggered, [[120, 60], [120, 180]]],
        17: [base12, shifted.slice(0, 10), center.filter(p => p[0] !== 120 || p[1] !== 120), shifted.slice(0, 8), cross, inner, corners, seven, [[90, 90], [150, 150]]],
        18: [base, shifted.slice(0, 9), center.filter(p => p[0] !== 120 || p[1] !== 120), shifted.slice(0, 7), cross, inner, corners, staggered, inner, [[120, 120]]],
        19: [base12, shifted.slice(0, 9), center, shifted.slice(0, 7), cross, corners, inner, seven, [[90, 90], [150, 150]], [[120, 120]]],
        20: [base12, shifted.slice(0, 8), center.filter(p => p[0] !== 120 || p[1] !== 120), shifted.slice(0, 7), cross, inner, corners, staggered, inner, [[120, 60], [120, 180]], [[90, 90]]]
      };
      layouts[number].forEach((points, layer) => points.forEach(p => number > 5 ? add(240 - p[1], p[0], layer) : add(p[0], p[1], layer)));
    } else {
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
          if (Math.abs(row - 2) + Math.abs(col - 2) > 2) continue;
          add(col * 60, row * 60, 0);
        }
      }
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          if ((row === 0 || row === 3) && (col === 0 || col === 3)) continue;
          add(30 + col * 60, 30 + row * 60, 1);
        }
      }
      [[60, 60], [180, 60], [120, 120], [60, 180], [180, 180]].forEach(p => add(p[0], p[1], 2));
    }
    tiles.forEach(tile => {
      tile.blockers = tiles.filter(other => other.layer > tile.layer && overlaps(tile, other))
        .map(other => other.id);
    });
    // First choose a legal removal order; then assign a sequence that never fills the tray.
    // This removal order is also a certificate that the fixed level can be completed.
    const rng = random(seed);
    const alive = tiles.map(() => true);
    const solution = [];
    while (solution.length < tiles.length) {
      const available = tiles.filter(tile => alive[tile.id] && tile.blockers.every(id => !alive[id]));
      const selected = available[Math.floor(rng() * available.length)];
      alive[selected.id] = false;
      solution.push(selected.id);
    }
    const batches = [[0, 3, 1], [2, 5, 4], [1, 4, 0], [3, 2, 5]];
    const kinds = [];
    if (number === 1) {
      batches.slice(0, 3).forEach(([a, b, c]) => kinds.push(a, b, a, c, b, a, c, b, c));
      kinds.push(2, 2, 2);
    } else if (number === 6) {
      batches.forEach(([a, b, c]) => kinds.push(a, b, a, c, b, a, c, b, c));
    } else kinds.push.apply(kinds, mixedKinds(tiles.length, info.kinds, number >= 10 ? number - 2 : number > 5 ? number - 5 : number, rng, levelCapacity(info)));
    solution.forEach((id, i) => { tiles[id].kind = kinds[i]; });
    return Object.assign({}, info, { tiles, solution, seed });
  }
  function createCampaignLevel(number, seed) { return createLevel(seed, number); }
  const TOOL_LIMITS = { undo: 3, hint: 1 };
  class Game {
    constructor(level) {
      this.level = level || createLevel();
      this.reset();
    }
    reset() {
      this.alive = this.level.tiles.map(() => true);
      this.tray = [];
      this.status = 'playing';
      this.matches = 0;
      this.steps = 0;
      this.history = [];
      this.moves = [];
      this.toolsUsed = { undo: 0, hint: 0 };
      this.unlockedSlots = 0;
    }
    get capacity() { return levelCapacity(this.level) + this.unlockedSlots; }
    get lockedSlots() { return CAPACITY - this.capacity; }
    // Future rewarded-ad callbacks may grant one slot. No player control grants it yet.
    unlockSlot() {
      if (!this.lockedSlots || this.status === 'won') return false;
      this.unlockedSlots++;
      if (this.status === 'lost' && this.tray.length < this.capacity) this.status = 'playing';
      return true;
    }
    isAvailable(id) {
      const tile = this.level.tiles[id];
      return !!tile && this.alive[id] && tile.blockers.every(other => !this.alive[other]);
    }
    available() { return this.level.tiles.filter(tile => this.isAvailable(tile.id)); }
    remaining() { return this.alive.filter(Boolean).length; }
    pick(id) {
      if (this.status !== 'playing') return { ok: false, reason: 'finished' };
      if (!this.isAvailable(id)) return { ok: false, reason: 'blocked' };
      this.history.push({ alive: this.alive.slice(), tray: this.tray.slice(),
        status: this.status, matches: this.matches, steps: this.steps });
      const tile = this.level.tiles[id];
      const previousTray = this.tray.slice();
      let index = this.tray.length;
      for (let i = 0; i < this.tray.length; i++) {
        if (this.tray[i].kind === tile.kind) index = i + 1;
      }
      this.alive[id] = false;
      this.tray.splice(index, 0, tile);
      this.steps++;
      this.moves.push(id);
      const insertedTray = this.tray.slice();
      const matching = this.tray.filter(other => other.kind === tile.kind);
      const matched = matching.length === 3;
      if (matched) {
        this.tray = this.tray.filter(other => other.kind !== tile.kind);
        this.matches++;
      }
      // Resolve a match before checking capacity: a triple in the last usable slot is legal.
      if (this.remaining() === 0 && this.tray.length === 0) this.status = 'won';
      else if (this.tray.length >= this.capacity) this.status = 'lost';
      return { ok: true, tile, index, previousTray, insertedTray, matched,
        matchedIds: matched ? matching.map(other => other.id) : [], status: this.status };
    }
    remainingTools(name) { return Math.max(0, TOOL_LIMITS[name] - this.toolsUsed[name]); }
    undo() {
      if (!this.remainingTools('undo')) return false;
      const previous = this.history.pop();
      if (!previous) return false;
      this.alive = previous.alive;
      this.tray = previous.tray;
      this.status = previous.status;
      this.matches = previous.matches;
      this.steps = previous.steps;
      this.moves.pop();
      this.toolsUsed.undo++;
      return true;
    }
    hint() {
      if (!this.remainingTools('hint')) return null;
      const route = this.solve();
      if (route && route.length) this.toolsUsed.hint++;
      return route;
    }
    static fromMoves(level, moves, unlockedSlots) {
      if (!Array.isArray(moves) || moves.length > level.tiles.length) throw new Error('存档取牌记录无效');
      const game = new Game(level);
      const slots = unlockedSlots == null ? 0 : unlockedSlots;
      if (!Number.isInteger(slots) || slots < 0 || slots > CAPACITY - levelCapacity(level)) throw new Error('存档解锁槽位无效');
      game.unlockedSlots = slots;
      for (const id of moves) {
        if (!Number.isInteger(id) || !game.pick(id).ok) throw new Error('存档取牌顺序无效');
      }
      return game;
    }
    // Try the known route first, then search from the player's actual position.
    solve(nodeLimit) {
      if (this.status !== 'playing') return null;
      const planned = this.level.solution.filter(id => this.alive[id]);
      const probe = new Game(this.level);
      probe.unlockedSlots = this.unlockedSlots;
      probe.alive = this.alive.slice();
      probe.tray = this.tray.slice();
      let valid = true;
      for (const id of planned) {
        if (!probe.pick(id).ok || probe.status === 'lost') { valid = false; break; }
      }
      if (valid && probe.status === 'won') return planned;
      const tiles = this.level.tiles;
      const counts = TYPES.map((_, kind) => this.tray.filter(tile => tile.kind === kind).length);
      const capacity = this.capacity;
      // Use one 32-bit word per block of tiles; high ids must never alias ids 32–63.
      const words = Math.ceil(tiles.length / 32);
      const aliveMask = Array(words).fill(0);
      this.alive.forEach((alive, id) => {
        if (alive) aliveMask[id >>> 5] = (aliveMask[id >>> 5] | (1 << (id & 31))) >>> 0;
      });
      const masks = tiles.map(tile => {
        const mask = Array(words).fill(0);
        tile.blockers.forEach(id => { mask[id >>> 5] = (mask[id >>> 5] | (1 << (id & 31))) >>> 0; });
        return mask;
      });
      const dead = new Set();
      let visited = 0;
      const limit = nodeLimit == null ? 60000 : nodeLimit;
      function search(alive, held) {
        if (++visited > limit) return null;
        if (alive.every(word => word === 0)) return held.every(n => n === 0) ? [] : null;
        const key = alive.join(',') + ':' + held.join('');
        if (dead.has(key)) return null;
        const available = tiles.filter(tile => {
          const exists = (alive[tile.id >>> 5] & (1 << (tile.id & 31))) !== 0;
          return exists && masks[tile.id].every((mask, index) => !(alive[index] & mask));
        });
        available.sort((a, b) => held[b.kind] - held[a.kind] || b.layer - a.layer || a.id - b.id);
        for (const tile of available) {
          const next = held.slice();
          next[tile.kind] = (next[tile.kind] + 1) % 3;
          if (next.reduce((sum, n) => sum + n, 0) >= capacity) continue;
          const nextAlive = alive.slice();
          nextAlive[tile.id >>> 5] = (nextAlive[tile.id >>> 5] & ~(1 << (tile.id & 31))) >>> 0;
          const tail = search(nextAlive, next);
          if (tail) return [tile.id].concat(tail);
          if (visited > limit) return null;
        }
        dead.add(key);
        return null;
      }
      return search(aliveMask, counts);
    }
  }
  return { Game, createLevel, createCampaignLevel, LEVELS, CHAPTERS, chapterFor, TYPES, SIZE, CAPACITY, TOOL_LIMITS, levelCapacity };
});
