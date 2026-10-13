const { MiniGameRuntime } = require('./utils/minigame');

const runtime = new MiniGameRuntime(wx, {
  requestAnimationFrame: callback => requestAnimationFrame(callback),
  cancelAnimationFrame: id => cancelAnimationFrame(id)
});

module.exports = { runtime };
