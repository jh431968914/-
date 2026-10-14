(function () {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const layer = document.getElementById('interaction-layer');
  const status = document.getElementById('live-status');
  const audio = new MeowAudio.AudioManager(name => name === 'bgm' ? document.getElementById('background-music') : new Audio('/assets/audio/' + name + '.wav'));
  let frame = null;
  const targets = new Map();
  const view = new MeowView.GameView({ ctx, onChange: sync,
    storage: { read: key => localStorage.getItem(key), write: (key, value) => localStorage.setItem(key, value) },
    playSound: name => audio.playSound(name) });
  audio.setEnabled(view.sound);
  function sync() {
    audio.setEnabled(view.sound);
    layer.setAttribute('aria-busy', String(!!view.animation));
    const focused = document.activeElement;
    const desired = [];
    if (view.screen === 'game' && !view.modal && view.game.status === 'playing') {
      view.game.level.tiles.forEach(tile => {
        if (!view.game.alive[tile.id]) return;
        const available = view.game.isAvailable(tile.id);
        desired.push({ key: 'tile-' + tile.id, label: MeowGame.TYPES[tile.kind].name + (available ? '，可以取走' : '，被上层遮挡'),
          x: MeowView.BOARD_X + tile.x, y: MeowView.BOARD_Y + tile.y, w: MeowGame.SIZE, h: MeowGame.SIZE,
          z: tile.layer + 1, disabled: !available || !!view.animation, click: () => view.pick(tile.id) });
      });
    }
    view.controls().forEach(control => desired.push({ key: 'action-' + control.action, label: control.label,
      x: control.x, y: control.y, w: control.w, h: control.h, z: 10,
      disabled: !!control.disabled || (!!view.animation && (control.action === 'hint' || control.action === 'undo')), click: () => view.press(control.action) }));
    const retained = new Set();
    desired.forEach(item => {
      retained.add(item.key);
      let button = targets.get(item.key);
      if (!button) { button = document.createElement('button'); button.className = 'hit-target'; button.type = 'button'; layer.appendChild(button); targets.set(item.key, button); }
      button.dataset.key = item.key;
      button.setAttribute('aria-label', item.label); button.title = item.label;
      button.disabled = !!item.disabled;
      button.style.left = (view.offsetX + item.x * view.scale) + 'px';
      button.style.top = (view.offsetY + item.y * view.scale) + 'px';
      button.style.width = item.w * view.scale + 'px'; button.style.height = item.h * view.scale + 'px'; button.style.zIndex = item.z;
      button.onclick = () => { item.click(); audio.activate(view.sound); };
    });
    targets.forEach((button, key) => { if (!retained.has(key)) { button.remove(); targets.delete(key); } });
    if (focused && focused.classList.contains('hit-target') && !focused.isConnected) {
      const continuation = focused.dataset.key === 'action-skip-arrival' && (targets.get('action-next') || targets.get('action-levels'));
      const next = continuation || Array.from(targets.values()).find(button => !button.disabled); if (next) next.focus({ preventScroll: true });
    }
    const menu = view.screen === 'levels';
    status.textContent = menu ? '选关页，已通关 ' + view.progress.state.completed.length + ' / ' + MeowGame.LEVELS.length + ' 关，已解锁 ' + view.progress.unlocked() + ' 关。' : view.game.status === 'won' ? '第 ' + view.game.level.number + ' 关过关啦！小屋收拾好啦。' : view.game.status === 'lost' ?
      (view.game.remainingTools('undo') ? '暂存槽已满，可以撤回或重新开始。' : '暂存槽已满，撤回次数已用完，可重新开始。') :
      '棋盘剩余 ' + view.game.remaining() + ' 张，小窝 ' + view.game.tray.length + ' / ' + view.game.capacity + ' 格，已锁定 ' + view.game.lockedSlots + ' 格，已消除 ' + view.game.matches + ' 组。撤回剩余 ' + view.game.remainingTools('undo') + ' 次，提示剩余 ' + view.game.remainingTools('hint') + ' 次。';
    const chapter = view.chapterInfo(view.modal === 'room' ? view.roomChapter : view.chapter);
    const owned = view.progress.decorations(chapter.number), nextReward = view.progress.nextDecoration(chapter.number);
    status.textContent += ' ' + chapter.name + '，第 ' + chapter.first + ' 至 ' + chapter.last + ' 关。';
    if (view.modal === 'room') {
      status.textContent += ' 我的小屋，已收集 ' + owned.length + ' / 5 件装饰。' +
        '等距视角的小屋有两面墙、木地板和坐在小窝里的猫咪。' +
        (owned.length ? '已摆放：' + owned.map(item => item.name).join('、') + '。' : '小屋还在等待第一件装饰。') +
        (nextReward ? '通过第 ' + nextReward.number + ' 关获得' + nextReward.name + '。' : '五件装饰已全部收集。');
      if (view.roomArrival) status.textContent += ' 新家具入屋：' + view.roomGift.name + (view.roomArrival.welcomed ? '已放好，小猫来欢迎啦。' : '正在轻轻落位，可跳过动画。');
      status.textContent += view.roomReaction ? ' 小猫回应：' + view.roomReaction.message : view.roomArrival ? '' :
        owned.length ? ' 点击家具或下方收藏卡片，陪小猫互动。' : '';
    } else if (menu) {
      status.textContent += ' 已收集 ' + owned.length + ' / 5 件装饰。' + (nextReward ? '下一件奖励：' + nextReward.name + '。' : '小屋装饰已集齐。');
    } else if (view.game.status === 'won') {
      const reward = MeowProgress.DECORATIONS[view.game.level.number - 1];
      status.textContent += view.pendingArrival ? ' 获得' + reward.name + '，点击带回小屋，看看小猫的欢迎。' :
        view.newDecoration ? ' 获得' + reward.name + '，已自动摆进小屋。' : ' 小屋已摆放' + reward.name + '。';
    }
    canvas.setAttribute('aria-label', view.modal === 'room' ? '等距视角猫咪小屋与装饰收藏' : menu ? '猫咪小屋与关卡选择' : '猫咪叠层三消棋盘');
    document.getElementById('chapter-number').textContent = String(menu ? chapter.number : view.game.level.number).padStart(2, '0');
    document.getElementById('chapter-title').textContent = menu ? chapter.name : view.game.level.name;
    document.getElementById('chapter-subtitle').textContent = menu ? '通关添小物 · 已收集 ' + owned.length + ' / 5' : view.game.level.tiles.length + ' 张 · ' + view.game.level.kinds + ' 种图案 · ' + view.game.level.layers + ' 层堆叠';
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    view.resize(rect.width, rect.height); view.draw(Date.now()); sync();
  }
  function tick() { view.draw(Date.now()); frame = requestAnimationFrame(tick); }
  canvas.addEventListener('pointerup', event => {
    const rect = canvas.getBoundingClientRect(); view.pointer(event.clientX - rect.left, event.clientY - rect.top); audio.activate(view.sound);
  });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && view.modal) view.press('close');
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); view.undo(); audio.activate(view.sound); }
  });
  document.addEventListener('visibilitychange', () => {
    audio.setVisible(!document.hidden);
    if (document.hidden) { cancelAnimationFrame(frame); frame = null; }
    else if (frame === null) tick();
  });
  window.addEventListener('pagehide', () => audio.setVisible(false));
  window.addEventListener('pageshow', () => audio.setVisible(!document.hidden));
  new ResizeObserver(resize).observe(canvas);
  resize(); tick();
  const mascot = document.getElementById('mascot');
  const mascotCtx = mascot.getContext('2d');
  mascotCtx.scale(2, 2); MeowArt.companion(mascotCtx, 65, 40, 80, true);
  MeowArt.star(mascotCtx, 118, 19, 4, '#d6c48b');
})();
