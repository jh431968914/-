(function (root, factory) {
  const api = typeof module === 'object' && module.exports ? factory(require('./game')) : factory(root.MeowGame);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MeowProgress = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Core) {
  'use strict';
  const KEY = 'meow-match-progress-v1';
  const DECORATIONS = [
    { number: 1, id: 'cushion', name: '暖暖软垫', note: '给小猫一个软软的落脚处' },
    { number: 2, id: 'basket', name: '毛线小篮', note: '把喜欢的小玩具收在一起' },
    { number: 3, id: 'plant', name: '窗边绿植', note: '让窗边多一点清新的绿意' },
    { number: 4, id: 'picture', name: '猫爪相框', note: '把一起度过的时光挂起来' },
    { number: 5, id: 'lamp', name: '暖光小灯', note: '天暗了，小屋也暖暖亮着' }
  ];
  function empty() { return { version: 1, completed: [], currentLevel: 1, runs: {}, runRevisions: {}, runToolsUsed: {}, runUnlockedSlots: {}, sound: true }; }
  function unlockedSlots(value, level) {
    return Number.isInteger(value) && value >= 0 ? Math.min(Core.CAPACITY - Core.levelCapacity(level), value) : 0;
  }
  function toolsUsed(value) {
    const used = {};
    Object.keys(Core.TOOL_LIMITS).forEach(name => {
      const count = value && value[name];
      used[name] = Number.isInteger(count) && count >= 0 ? Math.min(Core.TOOL_LIMITS[name], count) : 0;
    });
    return used;
  }
  class Progress {
    constructor(storage) {
      this.storage = storage || {};
      this.state = empty();
      this.storageError = false;
      this.updatedRuns = false;
      try {
        const raw = this.storage.read ? this.storage.read(KEY) : null;
        const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (data && data.version === 1) {
          if (Array.isArray(data.completed)) {
            for (let number = 1; number <= Core.LEVELS.length; number++) {
              if (data.completed.indexOf(number) === -1) break;
              this.state.completed.push(number);
            }
          }
          if (typeof data.sound === 'boolean') this.state.sound = data.sound;
          if (this.canOpen(data.currentLevel)) this.state.currentLevel = data.currentLevel;
          if (data.runs && typeof data.runs === 'object') {
            for (let number = 1; number <= this.unlocked(); number++) {
              const moves = data.runs[number];
              if (!Array.isArray(moves)) continue;
              const revision = data.runRevisions && data.runRevisions[number] != null ? data.runRevisions[number] : 1;
              if (revision !== Core.LEVELS[number - 1].revision) {
                if (moves.length) this.updatedRuns = true;
                continue;
              }
              try {
                const level = Core.createCampaignLevel(number);
                const slots = unlockedSlots(data.runUnlockedSlots && data.runUnlockedSlots[number], level);
                Core.Game.fromMoves(level, moves, slots);
                this.state.runs[number] = moves.slice();
                this.state.runRevisions[number] = revision;
                this.state.runToolsUsed[number] = toolsUsed(data.runToolsUsed && data.runToolsUsed[number]);
                this.state.runUnlockedSlots[number] = slots;
              } catch (_) { /* Keep unlocked progress; discard only the damaged board. */ }
            }
          }
        }
      } catch (_) { this.storageError = true; }
    }
    unlocked() { return Math.min(Core.LEVELS.length, this.state.completed.length + 1); }
    canOpen(number) { return Number.isInteger(number) && number >= 1 && number <= this.unlocked(); }
    isComplete(number) { return this.state.completed.indexOf(number) !== -1; }
    // Completion is the source of truth, including awards for older saves.
    decorations() { return DECORATIONS.filter(item => this.isComplete(item.number)); }
    nextDecoration() { return DECORATIONS.find(item => !this.isComplete(item.number)) || null; }
    gameFor(number, fresh) {
      if (!this.canOpen(number)) return null;
      const level = Core.createCampaignLevel(number);
      if (!fresh && this.state.runs[number]) {
        const game = Core.Game.fromMoves(level, this.state.runs[number], this.state.runUnlockedSlots[number]);
        if (game.status !== 'won') {
          game.toolsUsed = toolsUsed(this.state.runToolsUsed[number]);
          return game;
        }
      }
      return new Core.Game(level);
    }
    hasActiveRun(number) {
      const moves = this.state.runs[number], used = this.state.runToolsUsed[number];
      return Array.isArray(moves) && moves.length < Core.LEVELS[number - 1].total &&
        (moves.length > 0 || !!(used && (used.undo || used.hint)) || !!this.state.runUnlockedSlots[number]);
    }
    resumeNumber() {
      const number = this.state.currentLevel;
      if (this.hasActiveRun(number)) return number;
      return this.state.completed.length < Core.LEVELS.length ? this.unlocked() : 1;
    }
    save(game, sound) {
      const number = game.level.number;
      if (!this.canOpen(number)) return false;
      this.state.currentLevel = number;
      this.state.runs[number] = game.moves.slice();
      this.state.runRevisions[number] = game.level.revision;
      this.state.runToolsUsed[number] = toolsUsed(game.toolsUsed);
      this.state.runUnlockedSlots[number] = unlockedSlots(game.unlockedSlots, game.level);
      if (game.status === 'won' && !this.isComplete(number) && number === this.unlocked()) this.state.completed.push(number);
      if (typeof sound === 'boolean') this.state.sound = sound;
      try {
        if (this.storage.write) this.storage.write(KEY, JSON.stringify(this.state));
        this.storageError = false; return true;
      } catch (_) { this.storageError = true; return false; }
    }
  }
  return { Progress, KEY, DECORATIONS };
});
