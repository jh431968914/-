(function (root, factory) {
  const api = typeof module === 'object' && module.exports
    ? factory(require('./game'), require('./art'), require('./progress')) : factory(root.MeowGame, root.MeowArt, root.MeowProgress);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MeowView = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Core, Art, Saved) {
  'use strict';
  const W = 390, H = 824, BOARD_X = 48, BOARD_Y = 287;
  const SLOT_X = 36.5, SLOT_Y = 662, SLOT_STEP = 46, SLOT_SIZE = 41;
  const INK = Art.INK;
  const ROOM = { x: 36, y: 175, w: 318, h: 243 };
  const REACTIONS = {
    cushion: { label: '让小猫趴下休息', message: '软乎乎的，陪我歇一会儿喵～', duration: 3400 },
    basket: { label: '陪小猫玩毛线球', message: '抓到啦！再陪我玩一会儿～', duration: 3000 },
    plant: { label: '让小猫闻闻绿植', message: '闻一闻，是窗边清新的味道～', duration: 3400 },
    picture: { label: '和小猫一起举爪', message: '这是我的小爪印，和你击个掌！', duration: 2800 },
    lamp: { label: '陪小猫享受暖光', message: '灯光暖暖的，有你在真好～', duration: 3200 },
    mat: { label: '陪小猫晒晒太阳', message: '阳光落在肚皮上，暖洋洋的～', duration: 3400 },
    can: { label: '和小猫看看小水滴', message: '滴答，伸出小爪接住啦！', duration: 3000 },
    flowers: { label: '让小猫闻闻雏菊', message: '花开啦，今天也有好心情～', duration: 3400 },
    chime: { label: '和小猫听听风铃', message: '风轻轻来了，我也挥挥爪～', duration: 2800 },
    stand: { label: '陪小猫看看花架', message: '每一盆绿意，都有自己的小家啦～', duration: 3200 },
    rug: { label: '让小猫在月光里歇歇', message: '窝在软软的月光里，做一个甜甜的梦～', duration: 3400 },
    books: { label: '陪小猫翻翻睡前书', message: '这一页的故事，想和你一起听喵～', duration: 3000 },
    vase: { label: '让小猫闻闻晚香花', message: '轻轻闻一闻，晚上的花也很温柔～', duration: 3400 },
    clock: { label: '和小猫听听时钟', message: '滴答，滴答，陪你的时间慢慢走～', duration: 2800 },
    readingLamp: { label: '陪小猫读一会儿书', message: '留一盏小灯，等你回来一起读故事～', duration: 3200 },
    sunMat: { label: '陪小猫迎接晨光', message: '新的一天，从暖暖的肚皮开始喵～', duration: 3400 },
    picnicBasket: { label: '和小猫看看野餐篮', message: '小篮子装好啦，今天也想陪着你～', duration: 3000 },
    herbPot: { label: '让小猫闻闻薄荷', message: '晨风带来薄荷香，轻轻吸一口～', duration: 3400 },
    bunting: { label: '和小猫看看小挂旗', message: '小旗子在招手，我也和你挥挥爪～', duration: 2800 },
    welcomeSign: { label: '陪小猫看看纪念牌', message: '这里是我们的家，随时欢迎你回来～', duration: 3200 }
  };
  function text(ctx, value, x, y, size, color, weight, align) {
    ctx.font = (weight || '400') + ' ' + size + 'px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = color || INK; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(value, x, y);
  }
  class GameView {
    constructor(options) {
      this.ctx = options.ctx;
      this.progress = new Saved.Progress(options.storage);
      this.game = this.progress.gameFor(this.progress.resumeNumber());
      this.chapter = Core.chapterFor(this.game.level.number).number;
      this.roomChapter = this.chapter;
      this.screen = 'levels';
      this.playSound = options.playSound || function () {};
      this.onChange = options.onChange || function () {};
      this.sound = this.progress.state.sound;
      this.modal = null;
      this.roomReaction = null;
      this.roomArrival = null;
      this.roomGift = null;
      this.pendingArrival = null;
      this.newDecoration = null;
      this.toast = null;
      if (this.progress.updatedRuns) this.say('关卡已更新，通关和小屋收藏已保留', 4500);
      this.animation = null;
      this.hintId = null;
      this.hintUntil = 0;
      this.startedAt = Date.now();
      this.width = options.width || W;
      this.height = options.height || H;
      this.resize(this.width, this.height);
    }
    resize(width, height) {
      this.width = width; this.height = height;
      this.scale = Math.min(width / W, height / H);
      this.offsetX = (width - W * this.scale) / 2;
      this.offsetY = (height - H * this.scale) / 2;
    }
    say(message, duration) { this.toast = { message, until: Date.now() + (duration || 2100) }; }
    notify(persist) {
      if (persist && !this.progress.save(this.game, this.sound) && !this.warnedStorage) {
        this.warnedStorage = true;
        this.say('进度暂时无法保存，本次仍可继续', 3000);
      }
      this.onChange(this);
    }
    audio(name) { if (this.sound) this.playSound(name); }
    chapterInfo(number) { return Core.CHAPTERS.find(item => item.number === (number == null ? this.chapter : number)); }
    chapterLevels() { const chapter = this.chapterInfo(); return Core.LEVELS.slice(chapter.first - 1, chapter.last); }
    roomDecorations() { return this.progress.decorations(this.roomChapter); }
    clearRoom() { this.roomReaction = null; this.roomArrival = null; this.roomGift = null; }
    reset() {
      this.game.reset(); this.animation = null; this.hintId = null; this.modal = null;
      this.newDecoration = null; this.pendingArrival = null; this.clearRoom();
      this.startedAt = Date.now(); this.say('新的一局，小猫准备好啦'); this.notify(true);
    }
    startLevel(number, fresh) {
      const firstVisit = !this.progress.isComplete(number) && !this.progress.hasActiveRun(number);
      const game = this.progress.gameFor(number, fresh);
      if (!game) return;
      this.game = game; this.screen = 'game'; this.animation = null; this.hintId = null;
      this.chapter = Core.chapterFor(number).number;
      this.newDecoration = null; this.pendingArrival = null; this.clearRoom();
      this.modal = null; this.toast = null; this.startedAt = Date.now();
      if (firstVisit && game.level.newKind != null) this.say('新图案 · ' + Core.TYPES[game.level.newKind].name + '，三张相同就能消除', 3000);
      this.notify(true);
    }
    showLevels() {
      this.screen = 'levels'; this.animation = null; this.hintId = null; this.modal = null;
      this.chapter = Core.chapterFor(this.game.level.number).number;
      this.pendingArrival = null; this.clearRoom(); this.notify();
    }
    nextLevel() {
      if (this.game.status !== 'won' || this.animation) return;
      if (this.game.level.number < Core.LEVELS.length) this.startLevel(this.game.level.number + 1);
      else this.showLevels();
    }
    resumeLabel() {
      const number = this.progress.resumeNumber();
      if (this.progress.hasActiveRun(number)) return '继续第 ' + number + ' 关';
      if (this.progress.state.completed.length === Core.LEVELS.length) return '再陪小猫玩一局';
      return '开始第 ' + number + ' 关';
    }
    undo() {
      if (this.screen !== 'game' || this.modal || this.animation || this.game.status === 'won') return;
      if (!this.game.remainingTools('undo')) { this.say('本局撤回已用完，重来可恢复'); return; }
      if (!this.game.undo()) { this.say('还没有可以撤回的一步喵'); return; }
      this.hintId = null; this.audio('tap'); this.say('已撤回上一步'); this.notify(true);
    }
    hint() {
      if (this.screen !== 'game' || this.modal || this.game.status !== 'playing' || this.animation) return;
      if (!this.game.remainingTools('hint')) { this.say('本局提示已用完，重来可恢复'); return; }
      const route = this.game.hint();
      if (route && route.length) {
        this.hintId = route[0]; this.hintUntil = Date.now() + 5000;
        this.say('试试这张亮起来的图块');
      } else {
        this.say('暂时没找到路线，本次不扣提示', 2800);
      }
      this.audio('tap'); this.notify(!!(route && route.length));
    }
    pick(id) {
      if (this.screen !== 'game' || this.modal || this.animation || this.game.status !== 'playing') return;
      const result = this.game.pick(id);
      if (!result.ok) { this.say('这张被盖住了，先取走上面的图块'); return; }
      if (result.status === 'won' && !this.progress.isComplete(this.game.level.number)) {
        this.newDecoration = Saved.DECORATIONS[this.game.level.number - 1];
        this.pendingArrival = this.newDecoration;
      }
      this.hintId = null;
      this.animation = { event: result, start: Date.now(), duration: result.matched ? 430 : 190, sounded: false };
      this.audio('tap'); this.notify(true);
    }
    openRoom(chapterNumber) {
      if (this.roomArrival) return;
      this.clearRoom(); this.modal = 'room';
      this.roomChapter = this.pendingArrival ? Core.chapterFor(this.pendingArrival.number).number :
        chapterNumber || (this.screen === 'game' ? Core.chapterFor(this.game.level.number).number : this.chapter);
      if (this.pendingArrival && this.game.status === 'won' && !this.animation) {
        this.roomGift = this.pendingArrival;
        // The reward was saved on winning. This ceremony is only a transient presentation.
        this.pendingArrival = null;
        this.roomArrival = { id: this.roomGift.id, start: Date.now(), landAt: 800, duration: 3200, welcomed: false };
      }
      this.notify();
    }
    openThanks() {
      if (this.animation || this.progress.state.completed.length !== Core.LEVELS.length) return;
      this.clearRoom(); this.modal = 'thanks'; this.notify();
    }
    skipArrival() {
      if (!this.roomArrival) return;
      this.roomArrival = null; this.roomReaction = null; this.notify();
    }
    roomExitControls() {
      if (!this.roomGift) return [{ action: 'close', label: this.screen === 'levels' ? '回到选关，继续收拾' : '回到通关画面', x: 67, y: 709, w: 256, h: 46 }];
      return [
        { action: this.roomArrival ? 'skip-arrival' : this.game.level.number < Core.LEVELS.length ? 'next' : 'levels',
          label: this.roomArrival ? '跳过动画' : this.game.level.number < Core.LEVELS.length ? '继续第 ' + (this.game.level.number + 1) + ' 关' : '回到选关', x: 67, y: 709, w: 256, h: 46 },
        { action: 'close', label: '返回通关画面', x: 115, y: 758, w: 160, h: 25 }
      ];
    }
    interactFurniture(id) {
      const item = this.roomDecorations().find(item => item.id === id);
      if (this.modal !== 'room' || !item || this.roomArrival) return;
      const now = Date.now();
      // One short response at a time; repeated taps never queue sounds or animations.
      if (this.roomReaction && now < this.roomReaction.start + this.roomReaction.duration) return;
      this.roomReaction = Object.assign({ id, start: now }, REACTIONS[id]);
      this.audio('tap'); this.notify();
    }
    press(action) {
      if (action === 'thanks') { this.openThanks(); return; }
      if (action === 'thank-room') {
        if (this.modal !== 'thanks') return;
        this.chapter = Core.CHAPTERS[Core.CHAPTERS.length - 1].number;
        this.openRoom(this.chapter); return;
      }
      if (action === 'thank-levels') { if (this.modal === 'thanks') this.showLevels(); return; }
      if (action.indexOf('chapter-') === 0) {
        const number = Number(action.slice(8));
        if (this.screen === 'levels' && !this.modal && this.chapterInfo(number)) { this.chapter = number; this.notify(); }
        return;
      }
      if (action === 'bring-home') { if (this.pendingArrival && !this.animation && this.game.status === 'won') this.openRoom(); return; }
      if (action === 'skip-arrival') { this.skipArrival(); return; }
      if (action.indexOf('furniture-') === 0) { this.interactFurniture(action.slice(10)); return; }
      if (action.indexOf('collection-') === 0) { this.interactFurniture(action.slice(11)); return; }
      if (action.indexOf('locked-slot-') === 0) { this.say('这个空位暂未开放'); this.notify(); return; }
      if (action === 'sound') { this.sound = !this.sound; this.say(this.sound ? '声音已开启' : '声音已关闭'); this.notify(true); return; }
      if (action === 'help') { this.modal = 'help'; this.clearRoom(); this.notify(); return; }
      if (action === 'room') { this.openRoom(); return; }
      if (action === 'close') { this.modal = null; this.clearRoom(); this.notify(); return; }
      if (action === 'levels') { this.showLevels(); return; }
      if (action === 'finish') { if (this.pendingArrival) this.openRoom(); else { this.showLevels(); this.openRoom(); } return; }
      if (action === 'resume') { this.startLevel(this.progress.resumeNumber()); return; }
      if (action === 'next') { this.nextLevel(); return; }
      if (action.indexOf('level-') === 0) { this.startLevel(Number(action.slice(6))); return; }
      if (action === 'restart') { this.reset(); return; }
      if (action === 'undo') this.undo();
      if (action === 'hint') this.hint();
    }
    controls() {
      if (this.modal === 'thanks') return [
        { action: 'thank-room', label: this.pendingArrival ? '带回最后一份心意' : '回到晨光露台', x: 67, y: 584, w: 256, h: 46 },
        { action: 'thank-levels', label: '回到选关', x: 67, y: 640, w: 256, h: 40 },
        { action: 'close', label: this.screen === 'levels' ? '返回选关页面' : '返回通关画面', x: 115, y: 692, w: 160, h: 25 }
      ];
      if (this.modal === 'help') return [{ action: 'close', label: '知道啦，开始收拾', x: 67, y: 535, w: 256, h: 46 }];
      if (this.modal === 'room') {
        const owned = this.roomDecorations(), disabled = !!(this.roomReaction || this.roomArrival);
        const targets = Art.roomLayout(ROOM.x, ROOM.y, ROOM.w, ROOM.h).targets;
        return owned.map(item => Object.assign({}, targets.find(target => target.id === (item.spot || item.id)), {
          action: 'furniture-' + item.id, label: '点击' + item.name + '，' + REACTIONS[item.id].label, disabled
        })).concat(owned.map(item => ({ action: 'collection-' + item.id,
          label: item.name + '，' + REACTIONS[item.id].label, x: 42, y: 449 + (item.number - this.chapterInfo(this.roomChapter).first) * 44, w: 306, h: 38, disabled })),
        this.roomExitControls());
      }
      const common = [
        { action: 'sound', label: this.sound ? '关闭声音' : '开启声音', x: 297, y: 17, w: 34, h: 34 },
        { action: 'help', label: '玩法说明', x: 341, y: 17, w: 34, h: 34 }
      ];
      if (this.screen === 'levels') {
        return common.concat(this.chapterLevels().map((level, index) => ({ action: 'level-' + level.number,
          label: '第' + level.number + '关：' + level.name + (this.progress.isComplete(level.number) ? '，已通关，已获得' : this.progress.canOpen(level.number) ? '，可挑战，通关奖励' : '，未解锁，通关奖励') + Saved.DECORATIONS[level.number - 1].name,
          x: 25, y: 306 + index * 77, w: 340, h: 66, disabled: !this.progress.canOpen(level.number) })),
          Core.CHAPTERS.map((chapter, index) => ({ action: 'chapter-' + chapter.number, label: chapter.name + '，第 ' + chapter.first + ' 至 ' + chapter.last + ' 关' + (this.progress.canOpen(chapter.first) ? '' : '，通过第 ' + (chapter.first - 1) + ' 关开启'), x: 25 + index * 86, y: 214, w: 82, h: 34 })),
          [{ action: 'room', label: '看看我的小屋，' + this.chapterInfo().name + '，已收集 ' + this.progress.decorations(this.chapter).length + ' / 5 件装饰', x: 250, y: 260, w: 115, h: 32 },
            { action: 'resume', label: this.resumeLabel(), x: 25, y: 712, w: 340, h: 50 }],
          this.progress.state.completed.length === Core.LEVELS.length ? [{ action: 'thanks', label: '看看小猫的感谢信', x: 75, y: 773, w: 240, h: 26 }] : []);
      }
      if (this.game.status !== 'playing' && !this.animation) {
        if (this.game.status === 'won') return [
          { action: this.pendingArrival ? 'bring-home' : this.game.level.number < Core.LEVELS.length ? 'next' : 'finish',
            label: this.pendingArrival ? '带回小屋' : this.game.level.number < Core.LEVELS.length ? '进入第' + (this.game.level.number + 1) + '关：' + Core.LEVELS[this.game.level.number].name : '看看布置好的小屋', x: 67, y: 515, w: 256, h: 46 },
          { action: 'restart', label: '再玩这一关', x: 67, y: 570, w: 121, h: 38 },
          { action: this.game.level.number === Core.LEVELS.length ? 'levels' : this.pendingArrival ? 'next' : 'room',
            label: this.game.level.number === Core.LEVELS.length ? '选择关卡' : this.pendingArrival ? '先去下一关' : '回小屋看看', x: 202, y: 570, w: 121, h: 38 }
        ].concat(this.game.level.number === Core.LEVELS.length && this.progress.state.completed.length === Core.LEVELS.length ?
          [{ action: 'thanks', label: '再看看小猫的感谢信', x: 85, y: 609, w: 220, h: 25 }] : []);
        return [
          { action: 'restart', label: '重新开始', x: 67, y: 515, w: 256, h: 46 },
          { action: 'undo', label: this.game.remainingTools('undo') ? '撤回一步继续玩，剩余 ' + this.game.remainingTools('undo') + ' 次' : '撤回次数已用完',
            x: 67, y: 570, w: 256, h: 38, disabled: !this.game.remainingTools('undo') || !this.game.history.length },
          { action: 'levels', label: '返回选关', x: 106, y: 615, w: 178, h: 25 }
        ];
      }
      return common.concat([
        { action: 'levels', label: '返回选关', x: 25, y: 211, w: 38, h: 35 },
        { action: 'undo', label: this.game.remainingTools('undo') ? '撤回一步，剩余 ' + this.game.remainingTools('undo') + ' 次' : '撤回次数已用完',
          x: 25, y: 737, w: 101, h: 48, disabled: !this.game.remainingTools('undo') || !this.game.history.length || !!this.animation },
        { action: 'hint', label: this.game.remainingTools('hint') ? '提示，剩余 ' + this.game.remainingTools('hint') + ' 次' : '提示次数已用完',
          x: 144, y: 737, w: 101, h: 48, disabled: !this.game.remainingTools('hint') || !!this.animation || this.game.status !== 'playing' },
        { action: 'restart', label: '重新开始', x: 263, y: 737, w: 101, h: 48 }
      ]).concat(Array.from({ length: this.game.lockedSlots }, (_, index) => {
        const slot = this.game.capacity + index;
        return { action: 'locked-slot-' + slot, label: '第 ' + (slot + 1) + ' 格已锁定，暂未开放',
          x: SLOT_X + slot * SLOT_STEP, y: SLOT_Y, w: SLOT_SIZE, h: SLOT_SIZE + 2 };
      }));
    }
    pointer(px, py) {
      const x = (px - this.offsetX) / this.scale, y = (py - this.offsetY) / this.scale;
      const control = this.controls().find(c => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h);
      if (control) { if (!control.disabled) this.press(control.action); return; }
      if (this.screen !== 'game' || this.modal || this.game.status !== 'playing' || this.animation) return;
      const tiles = this.game.level.tiles;
      // Test front to back so a covered card can never be selected through its cover.
      for (let i = tiles.length - 1; i >= 0; i--) {
        const tile = tiles[i];
        if (!this.game.alive[tile.id]) continue;
        if (x >= BOARD_X + tile.x && x <= BOARD_X + tile.x + Core.SIZE &&
          y >= BOARD_Y + tile.y && y <= BOARD_Y + tile.y + Core.SIZE) {
          this.pick(tile.id); return;
        }
      }
    }
    card(tile, x, y, size, available, highlight, glow) {
      const ctx = this.ctx;
      ctx.save(); ctx.lineWidth = 1;
      Art.box(ctx, x, y + (size > 45 ? 4 : 2), size, size, 11, available ? '#b8c9b5' : '#b0bcae');
      Art.box(ctx, x, y, size, size, 11, available ? '#fffdf6' : '#dfe6d8', available ? '#d1dfca' : '#b9c7b2');
      if (available) Art.box(ctx, x + 3, y + 3, size - 6, size - 6, 8, '#fcfbf1');
      if (!available) ctx.globalAlpha = 0.44;
      Art.icon(ctx, tile.kind, x + size / 2, y + size / 2 - 1, size * 0.78);
      ctx.globalAlpha = 1;
      if (highlight || glow) {
        ctx.lineWidth = highlight ? 2.5 : 2;
        Art.box(ctx, x - 1, y - 1, size + 2, size + 2, 12, null, highlight ? '#d8aa50' : '#eab965');
        if (highlight) Art.star(ctx, x + size - 2, y + 2, 6, '#e8b855');
      }
      ctx.restore();
    }
    drawRoomScene(now) {
      const ctx = this.ctx;
      const chapter = this.screen === 'levels' ? this.chapter : Core.chapterFor(this.game.level.number).number;
      const owned = new Set(this.progress.decorations(chapter).map(item => item.id));
      const theme = this.chapterInfo(chapter).theme;
      const garden = theme === 'garden', study = theme === 'study', terrace = theme === 'terrace';
      Art.box(ctx, 104, 90, 98, 89, 30, study ? '#dce2eb' : '#e7eee0');
      Art.box(ctx, 112, 98, 82, 73, 24, '#f7f5e6');
      ctx.save(); Art.rounded(ctx, 116, 102, 74, 65, 21); ctx.clip();
      ctx.fillStyle = study ? '#8295b3' : '#deeadc'; ctx.fillRect(116, 102, 74, 65);
      if (study) {
        Art.ellipse(ctx, 135, 120, 10, 10, '#fff0c7'); Art.ellipse(ctx, 140, 117, 9, 9, '#8295b3');
        Art.star(ctx, 174, 119, 3, '#eadfb9'); Art.star(ctx, 167, 157, 2, '#eadfb9');
      } else {
        Art.ellipse(ctx, 183, 124, 25, 30, '#c8dbc6'); Art.ellipse(ctx, 137, 164, 31, 19, '#c1d3b8');
      }
      Art.stroke(ctx, [[153, 98], [153, 174]], '#f7f5e6', 5); Art.stroke(ctx, [[112, 135], [194, 135]], '#f7f5e6', 5);
      ctx.restore();
      Art.box(ctx, 98, 176, 110, 8, 3, '#dbcdb1');
      Art.box(ctx, 84, 163, 9, 24, 2, '#c7ba9d'); Art.box(ctx, 94, 167, 8, 20, 2, '#a5bca1');
      const furniture = terrace ? ['bunting', 'herbPot', 'picnicBasket', 'welcomeSign', 'sunMat'] : study ? ['clock', 'vase', 'books', 'readingLamp', 'rug'] : garden ? ['chime', 'flowers', 'can', 'stand', 'mat'] : ['picture', 'plant', 'basket', 'lamp', 'cushion'];
      [[57, 115, 43], [54, 169, 47], [214, 167, 46], [342, 155, 43], [276, 178, 86]].forEach((position, index) => {
        if (owned.has(furniture[index])) Art.decoration(ctx, furniture[index], ...position);
      });
      if (garden) { Art.ellipse(ctx, 143, 120, 10, 10, '#f2deb1'); Art.star(ctx, 342, 95, 5, '#dfc482'); }
      if (study) Art.star(ctx, 342, 95, 5, '#acb8cd');
      if (terrace) { Art.ellipse(ctx, 137, 119, 11, 11, '#f4d295'); Art.star(ctx, 342, 95, 5, '#edbe80'); }
      const bounce = Math.sin(now / 1050) * 1.3;
      Art.companion(ctx, 276, 153 + bounce, 84, this.game.matches > 0 || owned.size > 0);
      Art.ellipse(ctx, 345, 184, 5, 4, '#dbc39b');
      Art.star(ctx, 29, 106, 4, '#d1d6ba'); Art.star(ctx, 357, 112, 5, '#dfcda0');
    }
    drawRoom(now) {
      const ctx = this.ctx;
      this.drawRoomScene(now);
      Art.box(ctx, 224, 80, 116, 25, 12, '#fffdf4', '#e6e6d4');
      text(ctx, this.screen === 'levels' && this.progress.decorations().length ? '小屋越来越暖啦' : this.game.matches > 0 ? '喵～收拾得真棒' : '一起收拾小屋吧', 282, 93, 11, '#7d927b', '400', 'center');
      Art.stroke(ctx, [[25, 200], [365, 200]], '#e2dec9', 1.5);
    }
    draw(now) {
      const ctx = this.ctx;
      if (this.roomArrival) {
        const arrival = this.roomArrival, age = now - arrival.start;
        if (this.modal !== 'room' || age >= arrival.duration) {
          this.roomArrival = null; this.roomReaction = null; this.notify();
        } else if (age >= arrival.landAt && !arrival.welcomed) {
          arrival.welcomed = true;
          this.roomReaction = Object.assign({}, REACTIONS[arrival.id], {
            id: arrival.id, start: arrival.start + arrival.landAt, duration: arrival.duration - arrival.landAt
          });
          this.audio('tap'); this.notify();
        }
      }
      if (this.roomReaction && (this.modal !== 'room' || now >= this.roomReaction.start + this.roomReaction.duration)) {
        this.roomReaction = null; this.notify();
      }
      if (this.animation) {
        const age = now - this.animation.start;
        if (this.animation.event.matched && age >= 190 && !this.animation.sounded) {
          this.animation.sounded = true; this.audio('match');
        }
        if (age >= this.animation.duration) {
          const status = this.game.status; this.animation = null;
          if (status === 'won') this.audio('win');
          if (status === 'won' && this.newDecoration && this.newDecoration.number === Core.LEVELS.length && this.pendingArrival) {
            this.clearRoom(); this.modal = 'thanks';
          }
          this.notify();
        }
      }
      ctx.save(); ctx.clearRect(0, 0, this.width, this.height);
      ctx.fillStyle = '#f8f5ed'; ctx.fillRect(0, 0, this.width, this.height);
      ctx.translate(this.offsetX, this.offsetY); ctx.scale(this.scale, this.scale);
      Art.icon(ctx, 5, 37, 34, 23);
      text(ctx, '喵喵消消屋', 58, 34, 21, INK, '700');
      text(ctx, '把小小烦恼，消成快乐', 25, 67, 11, '#8f9d87');
      Art.box(ctx, 297, 17, 34, 34, 17, '#eeeee2');
      Art.box(ctx, 341, 17, 34, 34, 17, '#eeeee2');
      Art.tool(ctx, this.sound ? 'sound' : 'mute', 314, 34, 18, '#6f8a74');
      Art.tool(ctx, 'help', 358, 34, 18, '#6f8a74');
      this.drawRoom(now);
      if (this.screen === 'levels') {
        this.drawLevels(now);
        if (this.modal === 'help') this.drawHelp();
        else if (this.modal === 'room') this.drawCollection(now);
        else if (this.modal === 'thanks') this.drawThanks();
        ctx.restore(); return;
      }
      const level = this.game.level;
      Art.box(ctx, 25, 214, 34, 29, 9, '#e3ecdc');
      Art.stroke(ctx, [[45, 223], [39, 229], [45, 235]], '#6b8865', 1.8);
      text(ctx, String(level.number).padStart(2, '0') + ' · ' + level.name, 70, 230, 15, INK, '600');
      Art.box(ctx, 280, 217, 85, 24, 12, '#f0ebdb'); text(ctx, level.difficulty, 322.5, 230, 10, '#998b69', '400', 'center');
      const removed = this.game.matches * 3;
      text(ctx, '已收拾 ' + removed + ' / ' + level.tiles.length, 25, 261, 11, '#84917e');
      Art.box(ctx, 132, 258, 194, 5, 2.5, '#e3e6d5');
      if (removed) Art.box(ctx, 132, 258, 194 * removed / level.tiles.length, 5, 2.5, '#88ab83');
      Art.icon(ctx, 5, 349, 261, 16);
      Art.ellipse(ctx, 195, 454, 174, 166, '#f0f0e3');
      const activeHint = this.hintUntil > now ? this.hintId : null;
      this.game.level.tiles.forEach(tile => {
        if (this.game.alive[tile.id]) this.card(tile, BOARD_X + tile.x, BOARD_Y + tile.y,
          Core.SIZE, this.game.isAvailable(tile.id), activeHint === tile.id, false);
      });
      text(ctx, '先取上层，凑齐三张相同图案', 195, 610, 11, '#91a086', '400', 'center');
      text(ctx, this.game.lockedSlots ? '暂存小窝 · 可用 ' + this.game.capacity + ' 格' : '暂存小窝', 25, 638, 12, '#70866c', '600');
      const occupied = this.game.tray.length;
      text(ctx, occupied + ' / ' + this.game.capacity, 365, 638, 12, occupied >= this.game.capacity - 2 ? '#c58b59' : '#8b9c7e', '500', 'right');
      Art.box(ctx, 22, 650, 346, 67, 16, '#e5ecda', '#d9e1cf');
      for (let i = 0; i < Core.CAPACITY; i++) {
        const x = SLOT_X + i * SLOT_STEP;
        if (i >= this.game.capacity) {
          Art.box(ctx, x, SLOT_Y, SLOT_SIZE, SLOT_SIZE + 2, 9, '#ece9df', '#d4d1bf');
          ctx.save(); ctx.strokeStyle = '#aaa88f'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(x + 20.5, SLOT_Y + 14, 5, Math.PI, Math.PI * 2); ctx.stroke();
          Art.box(ctx, x + 13.5, SLOT_Y + 14, 14, 12, 3, '#b7b39c');
          Art.ellipse(ctx, x + 20.5, SLOT_Y + 19, 1.3, 1.3, '#eeece3'); ctx.restore();
          text(ctx, '锁定', x + 20.5, SLOT_Y + 35, 8, '#aaa88f', '400', 'center');
        } else {
          Art.box(ctx, x, SLOT_Y, SLOT_SIZE, SLOT_SIZE + 2, 9, '#d7e0c9');
          if (!occupied && i === Math.floor(this.game.capacity / 2)) Art.icon(ctx, 5, x + 20.5, SLOT_Y + 21, 17);
        }
      }
      let displayTray = this.game.tray;
      const animation = this.animation;
      if (animation) displayTray = animation.event.insertedTray;
      displayTray.forEach((tile, i) => {
        if (animation && tile.id === animation.event.tile.id && now - animation.start < 190) return;
        const matched = animation && animation.event.matchedIds.indexOf(tile.id) !== -1 && now - animation.start >= 190;
        this.card(tile, SLOT_X + i * SLOT_STEP, SLOT_Y, SLOT_SIZE, true, false, matched);
      });
      if (animation) {
        const event = animation.event, age = now - animation.start;
        if (age < 190) {
          const t = Math.min(1, age / 190), ease = 1 - Math.pow(1 - t, 3);
          const size = Core.SIZE + (SLOT_SIZE - Core.SIZE) * ease;
          const x = BOARD_X + event.tile.x + (SLOT_X + event.index * SLOT_STEP - BOARD_X - event.tile.x) * ease;
          const y = BOARD_Y + event.tile.y + (SLOT_Y - BOARD_Y - event.tile.y) * ease - Math.sin(t * Math.PI) * 22;
          this.card(event.tile, x, y, size, true, false, false);
        } else if (event.matched) {
          const t = (age - 190) / 240;
          displayTray.forEach((tile, i) => {
            if (event.matchedIds.indexOf(tile.id) === -1) return;
            for (let s = 0; s < 4; s++) {
              const angle = s * Math.PI / 2 - Math.PI / 4;
              ctx.globalAlpha = 1 - t;
              Art.star(ctx, SLOT_X + i * SLOT_STEP + 20 + Math.cos(angle) * (15 + t * 18),
                SLOT_Y + 20 + Math.sin(angle) * (15 + t * 18), 4 * (1 - t / 2), '#dfae55');
              ctx.globalAlpha = 1;
            }
          });
        }
      }
      ['undo', 'hint', 'restart'].forEach((name, i) => {
        const x = 25 + i * 119;
        const remaining = name === 'restart' ? null : this.game.remainingTools(name);
        const enabled = name === 'restart' || (!!remaining && !this.animation && this.game.status === 'playing' && (name !== 'undo' || this.game.history.length > 0));
        Art.box(ctx, x, 739, 101, 48, 13, '#dfe2ce');
        Art.box(ctx, x, 737, 101, 48, 13, enabled && i === 1 ? '#e2ebd9' : '#f0efdf', enabled && i === 1 ? '#cbdcc1' : '#e2e2ce');
        const color = enabled ? '#68825f' : '#acb4a0';
        Art.tool(ctx, name, x + 26, 761, 19, color);
        text(ctx, ['撤回', '提示', '重来'][i], x + 45, remaining == null ? 761 : 752, 12, color, '500');
        if (remaining != null) text(ctx, remaining ? '剩余 ' + remaining + ' 次' : '已用完', x + 45, 771, 9, color);
      });
      text(ctx, '慢慢来，小猫一直陪着你', 195, 802, 10, '#adb39a', '400', 'center');
      if (this.toast && this.toast.until > now && this.game.status === 'playing' && !this.modal) {
        const message = this.toast.message;
        const width = Math.min(350, Math.max(150, message.length * 12 + 30));
        Art.box(ctx, (W - width) / 2, 593, width, 32, 16, '#5c7966');
        text(ctx, message, W / 2, 609, 11, '#fffdf2', '400', 'center');
      }
      if (this.modal === 'help') this.drawHelp();
      else if (this.modal === 'room') this.drawCollection(now);
      else if (this.modal === 'thanks') this.drawThanks();
      else if (this.game.status !== 'playing' && !animation) this.drawResult();
      ctx.restore();
    }
    drawLevels(now) {
      const ctx = this.ctx, completed = this.progress.decorations(this.chapter).length;
      const next = this.progress.nextDecoration(this.chapter);
      Core.CHAPTERS.forEach((chapter, index) => {
        const selected = chapter.number === this.chapter;
        Art.box(ctx, 25 + index * 86, 214, 82, 34, 12, selected ? '#789970' : '#eeefdf');
        text(ctx, chapter.name, 66 + index * 86, 231, 11, selected ? '#fffdf3' : '#87977d', '600', 'center');
      });
      Art.box(ctx, 250, 260, 115, 32, 12, '#e6edda', '#d6e1c8');
      text(ctx, '我的小屋 ' + completed + '/5 ›', 307.5, 276, 11, '#678460', '600', 'center');
      const chapter = this.chapterInfo();
      text(ctx, !this.progress.canOpen(chapter.first) ? '通过第 ' + (chapter.first - 1) + ' 关，开启' + chapter.name : next ? '下一件心意 · ' + next.name : '五件心意，都摆进小屋啦', 25, 266, 11, '#8b9b7c');
      Art.box(ctx, 25, 283, 207, 4, 2, '#e3e6d5');
      if (completed) Art.box(ctx, 25, 283, 207 * completed / 5, 4, 2, '#88ab83');
      const resume = this.progress.resumeNumber();
      this.chapterLevels().forEach((level, index) => {
        const y = 306 + index * 77;
        const unlocked = this.progress.canOpen(level.number), done = this.progress.isComplete(level.number);
        const selected = level.number === resume;
        const moves = this.progress.state.runs[level.number];
        Art.box(ctx, 25, y + 3, 340, 66, 15, '#e0e3d1');
        Art.box(ctx, 25, y, 340, 66, 15, unlocked ? '#fffdf3' : '#eeeee2', selected ? '#bbcfab' : '#e0e4d2');
        ctx.save(); if (!unlocked) ctx.globalAlpha = 0.42;
        Art.box(ctx, 38, y + 10, 47, 47, 14, selected ? '#edf1de' : '#e9edde');
        Art.icon(ctx, [0, 2, 4, 5, 1][index], 61.5, y + 33, 38);
        ctx.restore();
        text(ctx, level.number + '. ' + level.name, 103, y + 18, 14, unlocked ? INK : '#a4ac95', '600');
        let note = level.total + ' 张 · ' + level.kinds + ' 种图案 · ' + level.layers + ' 层堆叠';
        if (!unlocked) note = level.kinds + ' 种 · ' + level.layers + ' 层 · 通过第 ' + (level.number - 1) + ' 关解锁';
        else if (this.progress.hasActiveRun(level.number)) note = moves.length ? '已取 ' + moves.length + ' 张 · 点这里继续' : '牌局已保留 · 点这里继续';
        else if (done) note = level.total + ' 张 · ' + level.kinds + ' 种 · ' + level.layers + ' 层 · 可重玩';
        else if (level.newKind != null) note = level.total + ' 张 · ' + level.kinds + ' 种 · 新增' + Core.TYPES[level.newKind].name;
        text(ctx, note, 103, y + 35, 10, unlocked ? '#95a181' : '#afb69e');
        text(ctx, (done ? '已摆放 · ' : '通关奖励 · ') + Saved.DECORATIONS[level.number - 1].name, 103, y + 53, 11, done ? '#b59669' : '#8f9e83');
        if (done) Art.star(ctx, 338, y + 27, 7, '#d8b265');
        else if (unlocked) Art.stroke(ctx, [[334, y + 27], [340, y + 33], [334, y + 39]], '#93a47f', 1.6);
        else {
          Art.box(ctx, 331, y + 30, 14, 11, 3, '#c7ceba');
          ctx.beginPath(); ctx.strokeStyle = '#bbc4ad'; ctx.lineWidth = 1.6;
          ctx.arc(338, y + 30, 5, Math.PI, Math.PI * 2); ctx.stroke();
        }
      });
      this.button(25, 712, 340, 50, this.resumeLabel());
      const finished = this.progress.state.completed.length === Core.LEVELS.length;
      const message = finished ? '看看小猫的感谢信 ›' : this.toast && this.toast.until > now ? this.toast.message : '进度会自动记住，随时回来接着玩';
      text(ctx, message, 195, 785, 11, finished ? '#75916a' : '#98a58a', finished ? '600' : '400', 'center');
      text(ctx, completed === 5 ? '小屋装满心意，谢谢你呀' : '每过一关，给小猫添一件小物', 195, 807, 10, '#b0b69f', '400', 'center');
    }
    drawCollection(now) {
      const ctx = this.ctx, owned = this.roomDecorations(), next = this.progress.nextDecoration(this.roomChapter);
      this.overlay(23, 98, 344, 687);
      text(ctx, this.roomGift ? '新家具到家啦' : this.chapterInfo(this.roomChapter).name, 48, 134, 22, INK, '700');
      Art.box(ctx, 280, 119, 60, 28, 14, '#e8eedc');
      text(ctx, owned.length + ' / 5', 310, 133, 12, '#75916a', '600', 'center');
      text(ctx, this.roomGift ? this.roomGift.name + '，让小屋又暖了一点' : '一点点收拾，一点点变成喜欢的样子', 48, 163, 12, '#8c9a80');
      const reaction = this.roomReaction, arrival = this.roomArrival;
      Art.isometricRoom(ctx, ROOM.x, ROOM.y, ROOM.w, ROOM.h, new Set(owned.map(item => item.id)),
        reaction && { id: reaction.id, elapsed: Math.max(0, now - reaction.start), duration: reaction.duration },
        arrival && { id: arrival.id, elapsed: Math.max(0, now - arrival.start), landAt: arrival.landAt }, this.chapterInfo(this.roomChapter).theme);
      if (reaction || arrival) Art.box(ctx, 47, 416, 296, 25, 12, '#f4eedc');
      text(ctx, reaction ? reaction.message : arrival ? '轻轻放好，给小猫一个小惊喜～' : owned.length ? '点点家具或下方小卡，看看小猫的回应' : '小猫等着和你一起，把家布置得暖暖的', 195, 429, 11, reaction || arrival ? '#8a785b' : '#899979', '400', 'center');
      Saved.chapterDecorations(this.roomChapter).forEach((item, index) => {
        const y = 449 + index * 44, collected = this.progress.isComplete(item.number);
        const responding = (reaction && reaction.id === item.id) || (arrival && arrival.id === item.id);
        Art.box(ctx, 42, y, 306, 38, 10, responding ? '#f1e6cd' : collected ? '#edf1df' : '#f5f4e9', responding ? '#d8c197' : null);
        ctx.save(); if (!collected) ctx.globalAlpha = 0.38;
        Art.decoration(ctx, item.id, 73, y + 19, 32); ctx.restore();
        text(ctx, item.name, 103, y + 11, 13, collected ? INK : '#8f9a80', '600');
        text(ctx, collected ? REACTIONS[item.id].label : item.note, 103, y + 27, 11, '#8f9c7f');
        text(ctx, responding ? arrival && !arrival.welcomed ? '正在安放' : '陪伴中' : collected ? '点点我' : '第 ' + item.number + ' 关', 331, y + 11, 10, collected ? '#789267' : '#a3ad94', '400', 'right');
      });
      text(ctx, next ? '下一件：通过第 ' + next.number + ' 关，带回' + next.name : '五件小物都齐啦，随时回来陪小猫', 195, 683, 12, '#879878', '400', 'center');
      const exits = this.roomExitControls();
      this.button(67, 709, 256, 46, exits[0].label, !!arrival);
      if (exits.length > 1) text(ctx, exits[1].label, 195, 770, 11, '#8c9a80', '400', 'center');
    }
    overlay(x, y, w, h) {
      const ctx = this.ctx;
      ctx.fillStyle = 'rgba(54, 75, 53, 0.24)'; ctx.fillRect(0, 0, W, H);
      Art.box(ctx, x, y + 7, w, h, 26, '#ced4bc');
      Art.box(ctx, x, y, w, h, 26, '#fffdf3', '#e4e4d1');
    }
    button(x, y, w, h, label, secondary, disabled) {
      Art.box(this.ctx, x, y, w, h, 14, disabled ? '#efefe5' : secondary ? '#edf0df' : '#75996e');
      text(this.ctx, label, x + w / 2, y + h / 2, 14, disabled ? '#abb29e' : secondary ? '#68805f' : '#fffdf1', '600', 'center');
    }
    drawHelp() {
      const ctx = this.ctx;
      this.overlay(37, 214, 316, 396);
      Art.icon(ctx, 5, 195, 254, 35);
      text(ctx, '欢迎来到猫咪的小屋', 195, 294, 19, INK, '700', 'center');
      const lines = [['取图块', '只能取没有被上层盖住的图块'], ['凑三张', '相同的三张进入小窝后自动消除'], ['留空位', '未锁定的格子填满且没消除就失败']];
      lines.forEach((line, i) => {
        const y = 343 + i * 60;
        Art.box(ctx, 65, y - 11, 25, 25, 8, '#e5eddc'); text(ctx, String(i + 1), 77.5, y + 1, 12, '#6d8e63', '600', 'center');
        text(ctx, line[0], 103, y - 1, 13, INK, '600'); text(ctx, line[1], 103, y + 21, 10, '#8c9880');
      });
      text(ctx, '声音开关同时控制音乐和音效', 195, 497, 10, '#8c9880', '400', 'center');
      text(ctx, '每局撤回 3 次、提示 1 次，重来重置', 195, 516, 10, '#8c9880', '400', 'center');
      this.button(67, 535, 256, 46, '知道啦，开始收拾');
    }
    drawThanks() {
      const ctx = this.ctx;
      this.overlay(28, 182, 334, 545);
      text(ctx, '谢谢你，把小屋变成了家', 195, 224, 21, INK, '700', 'center');
      text(ctx, Core.LEVELS.length + '关的陪伴，每一份心意都记住啦', 195, 255, 12, '#8c9a80', '400', 'center');
      Art.ellipse(ctx, 195, 343, 92, 68, '#f5efd9');
      Art.companion(ctx, 195, 342, 145, true, { wave: 0.75 });
      [[111, 297, 8], [283, 309, 10], [266, 370, 6], [125, 378, 5], [236, 282, 5]].forEach(point => Art.star(ctx, point[0], point[1], point[2], '#e1bd70'));
      [[64, '关卡完成', this.progress.state.completed.length], [204, '收到的心意', this.progress.decorations().length]].forEach(([x, label, count]) => {
        Art.box(ctx, x, 430, 122, 59, 14, '#edf1df');
        text(ctx, count + ' / ' + Core.LEVELS.length, x + 61, 450, 21, '#78916a', '700', 'center');
        text(ctx, label, x + 61, 475, 11, '#8b9a7d', '400', 'center');
      });
      text(ctx, '从暖暖客厅，到晨光露台', 195, 521, 13, '#78916a', '600', 'center');
      text(ctx, '你带来的每一件小物，都让这里更温暖', 195, 545, 11, '#8c9a80', '400', 'center');
      this.button(67, 584, 256, 46, this.pendingArrival ? '带回最后一份心意' : '回到晨光露台');
      this.button(67, 640, 256, 40, '回到选关', true);
      text(ctx, this.screen === 'levels' ? '返回选关页面' : '返回通关画面', 195, 704, 11, '#8c9a80', '400', 'center');
    }
    drawResult() {
      const ctx = this.ctx, won = this.game.status === 'won';
      const level = this.game.level, last = level.number === Core.LEVELS.length;
      this.overlay(37, 217, 316, won ? 418 : 444);
      Art.companion(ctx, 195, 309, 112, won);
      if (won) [-1, 0, 1].forEach((v, i) => Art.star(ctx, 195 + v * 39, 239 - (i === 1 ? 8 : 0), 13, '#e9bc68'));
      const chapter = Core.chapterFor(level.number), nextChapter = this.chapterInfo(chapter.number + 1);
      const completedChapter = level.number === chapter.last && nextChapter;
      text(ctx, won ? (last ? '每间小屋都收拾好啦！' : completedChapter ? nextChapter.name + '开启啦！' : '小屋收拾好啦！') : '小窝有点挤啦', 195, 381, last && won ? 20 : 22, INK, '700', 'center');
      text(ctx, won ? (this.pendingArrival ? '给小猫的新心意，一起带回家吧' : this.newDecoration ? '给小猫的新心意，已经摆进小屋啦' : '熟悉的小屋，又收拾好了一次') : '没关系，换个顺序再试试喵', 195, 419, 12, '#8c9a80', '400', 'center');
      if (won) {
        const reward = Saved.DECORATIONS[level.number - 1];
        Art.box(ctx, 66, 440, 258, 63, 13, '#eef1e1');
        Art.decoration(ctx, reward.id, 100, 472, 49);
        text(ctx, (this.newDecoration ? '新装饰 · ' : '小屋已有 · ') + reward.name, 138, 460, 13, '#789169', '600');
        text(ctx, reward.note, 138, 483, 11, '#8b9a7e');
      } else {
        Art.box(ctx, 78, 447, 234, 43, 13, '#eef1e1');
        text(ctx, '消除 ' + this.game.matches + ' 组', 143, 469, 13, '#789169', '500', 'center');
        text(ctx, '取牌 ' + this.game.steps + ' 次', 252, 469, 13, '#789169', '500', 'center');
      }
      this.button(67, 515, 256, 46, won ? (this.pendingArrival ? '带回小屋' : last ? '回小屋看看' : '下一关：' + Core.LEVELS[level.number].name) : '重新开始');
      if (!won) {
        const remaining = this.game.remainingTools('undo');
        this.button(67, 570, 256, 38, remaining ? '撤回一步（剩余 ' + remaining + ' 次）' : '撤回次数已用完', true, !remaining || !this.game.history.length);
        text(ctx, '返回选关', 195, 628, 11, '#90a07f', '400', 'center');
      } else {
        this.button(67, 570, 121, 38, '再玩这一关', true);
        this.button(202, 570, 121, 38, last ? '选择关卡' : this.pendingArrival ? '先去下一关' : '回小屋看看', true);
        text(ctx, last && this.progress.state.completed.length === Core.LEVELS.length ? '再看看小猫的感谢信 ›' : '第 ' + level.number + ' 关 · 消除 ' + this.game.matches + ' 组 · 取牌 ' + this.game.steps + ' 次', 195, 620, 10, last ? '#78916a' : '#a3ad93', last ? '600' : '400', 'center');
      }
    }
  }
  return { GameView, W, H, BOARD_X, BOARD_Y };
});
