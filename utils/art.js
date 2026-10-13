(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MeowArt = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const INK = '#36594f';
  function rounded(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function box(ctx, x, y, w, h, r, fill, stroke) {
    rounded(ctx, x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  function ellipse(ctx, x, y, rx, ry, fill, rotation) {
    ctx.beginPath();
    if (typeof ctx.ellipse === 'function') ctx.ellipse(x, y, rx, ry, rotation || 0, 0, Math.PI * 2);
    else {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rotation || 0); ctx.scale(rx, ry);
      ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.restore();
    }
    ctx.fillStyle = fill; ctx.fill();
  }
  function stroke(ctx, points, color, width) {
    ctx.strokeStyle = color || INK; ctx.lineWidth = width || 2;
    ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(p => ctx.lineTo(p[0], p[1])); ctx.stroke();
  }
  function face(ctx, kind, sleepy) {
    const fur = kind === 0 ? '#efb267' : kind === 1 ? '#596762' : '#f8f0dc';
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-23, -7);
    ctx.lineTo(-26, -27); ctx.quadraticCurveTo(-25, -31, -21, -28);
    ctx.lineTo(-10, -20); ctx.quadraticCurveTo(0, -23, 10, -20);
    ctx.lineTo(21, -28); ctx.quadraticCurveTo(26, -31, 26, -26);
    ctx.lineTo(23, -6); ctx.bezierCurveTo(30, 8, 24, 24, 0, 24);
    ctx.bezierCurveTo(-24, 24, -30, 8, -23, -7); ctx.closePath();
    ctx.fillStyle = fur; ctx.fill(); ctx.strokeStyle = kind === 2 ? '#c9b894' : fur; ctx.stroke();
    ctx.fillStyle = kind === 1 ? '#cfaba7' : '#eab0a0';
    ctx.beginPath(); ctx.moveTo(-21, -23); ctx.lineTo(-19, -11); ctx.lineTo(-13, -18); ctx.fill();
    ctx.beginPath(); ctx.moveTo(21, -23); ctx.lineTo(19, -11); ctx.lineTo(13, -18); ctx.fill();
    if (kind === 1) {
      ctx.beginPath(); ctx.moveTo(0, -14); ctx.bezierCurveTo(-5, 2, -21, 0, -20, 13);
      ctx.bezierCurveTo(-17, 24, 17, 24, 20, 13); ctx.bezierCurveTo(21, 0, 5, 2, 0, -14);
      ctx.fillStyle = '#fff9ed'; ctx.fill();
    }
    if (kind === 0) {
      stroke(ctx, [[-8, -18], [-5, -12]], '#cd8a44', 3);
      stroke(ctx, [[0, -19], [0, -12]], '#cd8a44', 3);
      stroke(ctx, [[8, -18], [5, -12]], '#cd8a44', 3);
    }
    if (sleepy) {
      ctx.strokeStyle = '#41463d'; ctx.lineWidth = 2.3;
      [-10, 10].forEach(x => { ctx.beginPath(); ctx.moveTo(x - 4, 3); ctx.quadraticCurveTo(x, 6, x + 4, 2); ctx.stroke(); });
    } else {
      ellipse(ctx, -10, 3, 2.6, 3.6, '#3f443c'); ellipse(ctx, 10, 3, 2.6, 3.6, '#3f443c');
      ellipse(ctx, -10.7, 1.5, 0.8, 1.1, '#ffffff'); ellipse(ctx, 9.3, 1.5, 0.8, 1.1, '#ffffff');
    }
    ellipse(ctx, -17, 10, 4.5, 2.5, kind === 1 ? '#ecc3b7' : '#eab5a2');
    ellipse(ctx, 17, 10, 4.5, 2.5, kind === 1 ? '#ecc3b7' : '#eab5a2');
    ctx.beginPath(); ctx.moveTo(-3, 8); ctx.lineTo(3, 8); ctx.lineTo(0, 11); ctx.closePath();
    ctx.fillStyle = '#ba8275'; ctx.fill();
    stroke(ctx, [[0, 11], [0, 13], [-3, 15]], '#725c4b', 1.4);
    stroke(ctx, [[0, 13], [3, 15]], '#725c4b', 1.4);
    [[-27, 7, -19, 8], [-27, 12, -19, 11], [19, 8, 27, 7], [19, 11, 27, 12]]
      .forEach(p => stroke(ctx, [[p[0], p[1]], [p[2], p[3]]], kind === 1 ? '#98a49a' : '#bb9470', 1.2));
  }
  function icon(ctx, kind, x, y, size) {
    ctx.save(); ctx.translate(x, y); ctx.scale(size / 64, size / 64);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (kind < 3) face(ctx, kind, false);
    if (kind === 3) {
      ctx.fillStyle = '#71aaa7'; ctx.beginPath(); ctx.moveTo(-13, 0);
      ctx.bezierCurveTo(0, -21, 20, -18, 29, 0); ctx.bezierCurveTo(20, 18, 0, 21, -13, 0);
      ctx.lineTo(-28, 13); ctx.quadraticCurveTo(-23, 0, -28, -13); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#43837d'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(7, -12); ctx.quadraticCurveTo(2, 0, 7, 12); ctx.stroke();
      stroke(ctx, [[-20, -5], [-15, 0], [-20, 5]], '#51918a', 2);
      ellipse(ctx, 18, -2, 2.5, 2.5, '#35584f'); ellipse(ctx, 19, -3, 0.8, 0.8, '#ffffff');
      ellipse(ctx, 0, -3, 2, 2, '#b4d5cd'); ellipse(ctx, -2, 5, 2, 2, '#b4d5cd');
    }
    if (kind === 4) {
      ellipse(ctx, 0, 0, 23, 23, '#c58fab');
      ctx.strokeStyle = '#a8668a'; ctx.lineWidth = 2.5;
      [[-20, -10, 15, 20], [-13, -19, 23, 8], [-22, 1, 9, 23], [-2, -23, 21, -9]].forEach(p => {
        ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.quadraticCurveTo(-8, 4, p[2], p[3]); ctx.stroke();
      });
      ctx.strokeStyle = '#e8bfd5'; ctx.beginPath(); ctx.moveTo(-18, -13); ctx.quadraticCurveTo(1, -5, 18, 13); ctx.stroke();
      ctx.strokeStyle = '#ae7696'; ctx.beginPath(); ctx.moveTo(15, 19); ctx.bezierCurveTo(27, 15, 16, 34, 31, 26); ctx.stroke();
    }
    if (kind === 5) {
      [[-19, -5, -0.5], [-7, -18, -0.2], [8, -18, 0.2], [20, -5, 0.5]]
        .forEach(p => ellipse(ctx, p[0], p[1], 6, 8, '#b29bc4', p[2]));
      ctx.beginPath(); ctx.moveTo(-18, 14); ctx.bezierCurveTo(-21, 5, -8, -7, 0, -7);
      ctx.bezierCurveTo(8, -7, 21, 5, 18, 14); ctx.bezierCurveTo(14, 24, 6, 14, 0, 16);
      ctx.bezierCurveTo(-6, 14, -14, 24, -18, 14); ctx.fillStyle = '#b29bc4'; ctx.fill();
      ellipse(ctx, -6, 5, 3.5, 2, '#d1bedc');
    }
    if (kind === 6) {
      ctx.strokeStyle = '#b9924e'; ctx.lineWidth = 2.3;
      ctx.beginPath(); ctx.arc(0, -24, 5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-17, 11); ctx.quadraticCurveTo(-14, 5, -14, -7);
      ctx.bezierCurveTo(-14, -24, 14, -24, 14, -7); ctx.quadraticCurveTo(14, 5, 17, 11);
      ctx.closePath(); ctx.fillStyle = '#e4bb65'; ctx.fill();
      ellipse(ctx, 0, 11, 18, 5, '#c9a158'); ellipse(ctx, 0, 17, 5, 4, '#b28a46');
      ctx.strokeStyle = '#f5d791'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-8, -10); ctx.quadraticCurveTo(-10, -2, -10, 4); ctx.stroke();
      box(ctx, -23, -22, 46, 7, 3, '#d6a69b');
      ellipse(ctx, 0, -18, 4, 4, '#bd887d');
    }
    if (kind === 7) {
      ctx.beginPath(); ctx.moveTo(-27, -5); ctx.lineTo(27, -5);
      ctx.quadraticCurveTo(24, 22, 12, 22); ctx.lineTo(-12, 22); ctx.quadraticCurveTo(-24, 22, -27, -5);
      ctx.closePath(); ctx.fillStyle = '#82a8c7'; ctx.fill();
      ellipse(ctx, 0, -5, 27, 9, '#588aab'); ellipse(ctx, 0, -6, 23, 6, '#fff6e6');
      ellipse(ctx, 0, 12, 5, 4, '#dce9f2');
      [[-6, 5], [-1, 3], [4, 4], [8, 7]].forEach(p => ellipse(ctx, p[0], p[1], 2, 2.4, '#dce9f2'));
      stroke(ctx, [[-19, 8], [-17, 14]], '#b6d0e2', 2);
    }
    ctx.restore();
  }
  function companion(ctx, x, y, size, happy, pose) {
    pose = pose || {};
    const rest = pose.rest || 0, reach = pose.reach || 0, wave = pose.wave || 0;
    ctx.save(); ctx.translate(x, y); ctx.scale(size / 100, size / 100);
    ellipse(ctx, 0, 29, 44, 7, '#dadfc9');
    ctx.strokeStyle = '#dfa461'; ctx.lineWidth = 13; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(17, 20); ctx.bezierCurveTo(62, 40, 57 + wave * 6, -4 + rest * 20, 43, 6 + rest * 15); ctx.stroke();
    ellipse(ctx, rest * 4, 9 + rest * 10, 30 + rest * 9, 25 - rest * 9, '#f0b774');
    ellipse(ctx, 0, 15 + rest * 8, 16 + rest * 8, 18 - rest * 9, '#ffe6b7');
    ellipse(ctx, -18, 28, 11, 6, '#f4c48a'); ellipse(ctx, 18, 28, 11, 6, '#f4c48a');
    ctx.save(); ctx.translate(-rest * 13, -20 + rest * 29);
    ctx.rotate(pose.tilt || 0); ctx.scale(1.2 - rest * 0.2, 1.2 - rest * 0.2); face(ctx, 0, happy); ctx.restore();
    if (reach) {
      stroke(ctx, [[-17, 12], [-21 - reach * 18, 20 - reach * 7]], '#f4c48a', 12);
      ellipse(ctx, -21 - reach * 18, 20 - reach * 7, 9, 6, '#f8ce97', -0.2);
    }
    if (wave) {
      stroke(ctx, [[22, 14], [32, 10 - wave * 26]], '#f4c48a', 12);
      ellipse(ctx, 32, 10 - wave * 26, 8, 9, '#f8ce97');
      ellipse(ctx, 32, 12 - wave * 26, 3.5, 3, '#dfa79b');
    }
    ctx.restore();
  }
  function plant(ctx, x, y, scale) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale || 1, scale || 1);
    stroke(ctx, [[0, -4], [0, -40]], '#658f72', 2.2);
    ellipse(ctx, -8, -23, 6, 12, '#87a88a', -0.7);
    ellipse(ctx, 8, -31, 6, 12, '#abc098', 0.7);
    ellipse(ctx, -5, -40, 5, 10, '#87a88a', -0.5);
    ctx.beginPath(); ctx.moveTo(-15, -7); ctx.lineTo(15, -7); ctx.lineTo(11, 17); ctx.lineTo(-11, 17); ctx.closePath();
    ctx.fillStyle = '#d8b994'; ctx.fill(); box(ctx, -17, -8, 34, 7, 3, '#e6cba9');
    ctx.restore();
  }
  function decoration(ctx, id, x, y, size) {
    ctx.save(); ctx.translate(x, y); ctx.scale((size || 64) / 64, (size || 64) / 64);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 1.5;
    if (id === 'cushion') {
      ellipse(ctx, 0, 12, 31, 5, '#dcd4bf');
      box(ctx, -31, -11, 62, 24, 11, '#d4a597', '#bd8f83');
      box(ctx, -26, -8, 52, 15, 8, '#e8bfb1');
      stroke(ctx, [[-22, 4], [22, 4]], '#f3d8c8', 1.2);
      icon(ctx, 5, 0, -1, 13);
    }
    if (id === 'basket') {
      ellipse(ctx, 0, 25, 29, 5, '#ddd6c1');
      ctx.beginPath(); ctx.arc(0, -5, 23, Math.PI, 0);
      ctx.strokeStyle = '#c8a47b'; ctx.lineWidth = 4; ctx.stroke();
      icon(ctx, 4, -9, -5, 30);
      ctx.save(); ctx.translate(12, -7); ctx.rotate(0.4); icon(ctx, 4, 0, 0, 23); ctx.restore();
      box(ctx, -28, 0, 56, 24, 8, '#d9bc94', '#c4a780');
      box(ctx, -30, -2, 60, 6, 3, '#edcfaa');
      [-18, -6, 6, 18].forEach(px => stroke(ctx, [[px, 6], [px, 21]], '#c7a67e', 1.2));
      stroke(ctx, [[-25, 11], [25, 11]], '#ebd2b3', 1.2);
      stroke(ctx, [[-25, 17], [25, 17]], '#ebd2b3', 1.2);
    }
    if (id === 'plant') plant(ctx, 0, 12, 0.95);
    if (id === 'picture') {
      stroke(ctx, [[-12, -24], [0, -33], [12, -24]], '#bda685', 1.5);
      box(ctx, -26, -25, 52, 53, 8, '#d5b38f', '#bf9f7e');
      box(ctx, -21, -20, 42, 43, 5, '#fff7e7');
      ellipse(ctx, 0, 1, 18, 17, '#e8edde');
      icon(ctx, 5, 0, 1, 30);
      star(ctx, 16, -14, 3, '#d5b875');
    }
    if (id === 'lamp') {
      ellipse(ctx, 0, -5, 33, 35, '#f5ecd3');
      stroke(ctx, [[0, -3], [0, 24]], '#b79b73', 4);
      ellipse(ctx, 0, 26, 21, 5, '#cdb18b');
      ctx.beginPath(); ctx.moveTo(-13, -28); ctx.lineTo(13, -28); ctx.lineTo(25, 0);
      ctx.quadraticCurveTo(0, 8, -25, 0); ctx.closePath(); ctx.fillStyle = '#e6c68e'; ctx.fill();
      stroke(ctx, [[-7, -24], [-14, -3]], '#f5dfb4', 3);
      ellipse(ctx, 0, 1, 25, 4, '#f4dca4');
      star(ctx, 5, -12, 5, '#fff3ca');
    }
    ctx.restore();
  }
  function roomLayout(x, y, width, height) {
    const sx = Math.min((width - 24) / 11.6, (height - 16) / 9.8);
    const sy = sx * 0.52, sz = sx * 1.26;
    const ox = x + width / 2 - sx * 0.5;
    const oy = y + (height - sx * 9.73) / 2 + sz * 3;
    const project = (u, v, z) => [ox + (u - v) * sx, oy + (u + v) * sy - (z || 0) * sz];
    // Separate touch areas share the drawing projection. The cushion includes the cat.
    const target = (id, u, v, z, dx, dy, w, h) => {
      const p = project(u, v, z);
      return { id, x: p[0] + dx * sx, y: p[1] + dy * sx, w: w * sx, h: h * sx };
    };
    return { sx, sy, sz, project, targets: [
      target('picture', 0.08, 3.07, 1.61, -0.95, -1.05, 1.9, 1.9),
      target('plant', 0.83, 3.53, 0, -0.82, -1.66, 1.6, 1.85),
      target('basket', 2.27, 3.37, 0, -0.87, -1.12, 1.9, 1.9),
      target('cushion', 4.13, 3.15, 0.24, -0.8, -2.6, 2.65, 3.15),
      target('lamp', 5, 0.95, 0, -0.8, -2.35, 1.9, 2.55)
    ] };
  }
  function isometricRoom(ctx, x, y, width, height, owned, reaction, arrival) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 1;
    const { sx, sy, sz, project } = roomLayout(x, y, width, height);
    const elapsed = reaction ? reaction.elapsed : 0;
    const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
    const strength = reaction ? smooth(elapsed / 450) * smooth((reaction.duration - elapsed) / 550) : 0;
    const active = id => reaction && reaction.id === id ? strength : 0;
    const pulse = Math.sin(elapsed / 190);
    const landing = arrival ? smooth(arrival.elapsed / arrival.landAt) : 1;
    function beginFurniture(id) {
      ctx.save();
      if (arrival && arrival.id === id) {
        ctx.translate(0, -sx * 1.05 * (1 - landing));
        ctx.globalAlpha = landing;
      }
    }
    function endFurniture(id, u, v, z) {
      ctx.restore();
      if (!arrival || arrival.id !== id) return;
      const sparkle = Math.max(0, 1 - Math.abs(arrival.elapsed - arrival.landAt) / 650);
      if (!sparkle) return;
      const p = project(u, v, z);
      ctx.save(); ctx.globalAlpha = sparkle;
      [-1, 1].forEach((side, index) => star(ctx, p[0] + side * sx * (0.65 + sparkle * 0.2),
        p[1] - sx * (0.6 + index * 0.25), sx * 0.16, '#dfb969'));
      ctx.restore();
    }
    function polygon(points, fill, edge) {
      ctx.beginPath(); points.forEach((point, index) => { if (index) ctx.lineTo(point[0], point[1]); else ctx.moveTo(point[0], point[1]); });
      ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
      if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = 0.8; ctx.stroke(); }
    }
    function block(u, v, z, w, d, h, top, front, side) {
      polygon([project(u, v + d, z), project(u + w, v + d, z), project(u + w, v + d, z + h), project(u, v + d, z + h)], front);
      polygon([project(u + w, v, z), project(u + w, v + d, z), project(u + w, v + d, z + h), project(u + w, v, z + h)], side);
      polygon([project(u, v, z + h), project(u + w, v, z + h), project(u + w, v + d, z + h), project(u, v + d, z + h)], top);
    }
    function floorRound(u, v, z, w, d, r, fill) {
      ctx.beginPath(); ctx.moveTo(...project(u + r, v, z)); ctx.lineTo(...project(u + w - r, v, z));
      ctx.quadraticCurveTo(...project(u + w, v, z), ...project(u + w, v + r, z));
      ctx.lineTo(...project(u + w, v + d - r, z)); ctx.quadraticCurveTo(...project(u + w, v + d, z), ...project(u + w - r, v + d, z));
      ctx.lineTo(...project(u + r, v + d, z)); ctx.quadraticCurveTo(...project(u, v + d, z), ...project(u, v + d - r, z));
      ctx.lineTo(...project(u, v + r, z)); ctx.quadraticCurveTo(...project(u, v, z), ...project(u + r, v, z));
      ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    }
    function shadow(u, v, rx, ry) {
      const point = project(u, v, 0.01); ellipse(ctx, point[0], point[1], sx * rx, sy * ry, 'rgba(115, 103, 74, 0.13)');
    }
    const base = project(3, 2.6, -0.1);
    ellipse(ctx, base[0], base[1], sx * 5.8, sy * 5.8, 'rgba(123, 113, 84, 0.10)');
    block(0, 0, -0.18, 6, 5, 0.18, '#e7d0aa', '#cbb28b', '#d9bd95');
    for (let v = 0.5; v < 5; v += 0.5) {
      stroke(ctx, [project(0, v, 0.01), project(6, v, 0.01)], '#d8bf98', 0.65);
      const u = (Math.round(v * 2) % 3) + 1;
      stroke(ctx, [project(u, v - 0.5, 0.01), project(u, v, 0.01)], '#dac29c', 0.6);
    }
    polygon([project(0, 0), project(0, 5), project(0, 5, 3), project(0, 0, 3)], '#eee9da', '#ddd7c6');
    polygon([project(0, 0), project(6, 0), project(6, 0, 3), project(0, 0, 3)], '#f7efdf', '#e3dac5');
    stroke(ctx, [project(0, 5, 0.06), project(0, 0, 0.06), project(6, 0, 0.06)], '#d9ceba', 3);
    function windowPane(u1, u2, z1, z2, fill) {
      polygon([project(u1, 0.02, z1), project(u2, 0.02, z1), project(u2, 0.02, z2), project(u1, 0.02, z2)], fill);
    }
    windowPane(1.2, 3.95, 1.03, 2.65, '#fff9e8'); windowPane(1.38, 3.77, 1.18, 2.5, '#cddfc5');
    windowPane(1.38, 3.77, 1.18, 1.6, '#c1d7bb');
    stroke(ctx, [project(2.58, 0.04, 1.15), project(2.58, 0.04, 2.53)], '#fff9e8', 3.5);
    stroke(ctx, [project(1.35, 0.04, 1.82), project(3.8, 0.04, 1.82)], '#fff9e8', 3.5);
    block(1.04, 0, 0.94, 3.07, 0.28, 0.1, '#e2caa2', '#cbb28c', '#d3ba95');
    block(0.65, 0.58, 0, 0.19, 0.42, 0.64, '#b8c59e', '#98ad88', '#a7b794');
    block(0.91, 0.58, 0, 0.15, 0.42, 0.48, '#e3cb9f', '#c7b18a', '#d4c096');
    if (owned.has('picture')) {
      beginFurniture('picture');
      stroke(ctx, [project(0.04, 2.45, 2.15), project(0.04, 3.08, 2.49), project(0.04, 3.7, 2.15)], '#cbb794', 1);
      polygon([project(0.04, 2.45, 1.06), project(0.04, 3.7, 1.06), project(0.04, 3.7, 2.15), project(0.04, 2.45, 2.15)], '#c6a681');
      polygon([project(0.06, 2.55, 1.15), project(0.06, 3.6, 1.15), project(0.06, 3.6, 2.06), project(0.06, 2.55, 2.06)], '#fff8e7');
      const center = project(0.08, 3.07, 1.61);
      ctx.save(); ctx.translate(center[0], center[1]); ctx.transform(sx, -sy, 0, sz, 0, 0);
      icon(ctx, 5, 0, 0, 0.78); ctx.restore();
      if (active('picture')) star(ctx, center[0] + sx * 0.7, center[1] - sx * 0.7, sx * 0.18 * strength, '#dfb85f');
      endFurniture('picture', 0.08, 3.07, 1.61);
    }
    // Furniture is painted from the back of the room towards the cat in front.
    if (owned.has('plant')) {
      beginFurniture('plant');
      shadow(0.85, 3.55, 0.52, 0.4);
      const u = 0.5, v = 3.2, d = 0.66, h = 0.45, inset = 0.1;
      polygon([project(u + inset, v + d - inset), project(u + d - inset, v + d - inset), project(u + d, v + d, h), project(u, v + d, h)], '#d8b990');
      polygon([project(u + d - inset, v + inset), project(u + d - inset, v + d - inset), project(u + d, v + d, h), project(u + d, v, h)], '#c2a17b');
      polygon([project(u, v, h), project(u + d, v, h), project(u + d, v + d, h), project(u, v + d, h)], '#ebcfaa');
      const p = project(0.83, 3.53, h);
      ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(active('plant') * pulse * 0.08); ctx.translate(-p[0], -p[1]);
      stroke(ctx, [[p[0], p[1]], [p[0], p[1] - sx * 1.22]], '#789a76', 1.8);
      ellipse(ctx, p[0] - sx * 0.15, p[1] - sx * 0.56, sx * 0.14, sx * 0.3, '#88a986', -0.65);
      ellipse(ctx, p[0] + sx * 0.14, p[1] - sx * 0.86, sx * 0.14, sx * 0.28, '#a8c092', 0.65);
      ellipse(ctx, p[0] - sx * 0.09, p[1] - sx * 1.12, sx * 0.12, sx * 0.25, '#88a986', -0.4);
      ctx.restore();
      endFurniture('plant', 0.83, 3.53, 1);
    }
    if (owned.has('lamp')) {
      beginFurniture('lamp');
      const bottom = project(5.0, 0.95), top = project(5.0, 0.95, 1.43);
      const warmth = active('lamp');
      ellipse(ctx, top[0], top[1], sx * (0.72 + warmth * 0.6), sx * (0.78 + warmth * 0.55), 'rgba(240, 206, 136, 0.22)');
      if (warmth) {
        const light = project(4.6, 2.35);
        ellipse(ctx, light[0], light[1], sx * 1.6, sy * 1.1, 'rgba(255, 223, 148, ' + warmth * 0.3 + ')');
      }
      shadow(5.0, 0.95, 0.65, 0.43);
      stroke(ctx, [bottom, top], '#b59b74', 3);
      ellipse(ctx, bottom[0], bottom[1], sx * 0.45, sy * 0.38, '#cbb18a');
      polygon([[top[0] - sx * 0.26, top[1] - sx * 0.43], [top[0] + sx * 0.26, top[1] - sx * 0.43],
        [top[0] + sx * 0.5, top[1] + sx * 0.19], [top[0] - sx * 0.5, top[1] + sx * 0.19]], '#e0bf80');
      stroke(ctx, [[top[0] - sx * 0.15, top[1] - sx * 0.34], [top[0] - sx * 0.3, top[1] + sx * 0.08]], '#f0dba9', 2.4);
      ellipse(ctx, top[0], top[1] + sx * 0.19, sx * 0.5, sy * 0.16, '#f7dda4');
      star(ctx, top[0] + sx * 0.04, top[1] - sx * 0.09, sx * 0.1, '#fff4cf');
      endFurniture('lamp', 5, 0.95, 1.43);
    }
    if (owned.has('basket')) {
      beginFurniture('basket');
      shadow(2.28, 3.35, 0.78, 0.47);
      block(1.7, 2.9, 0, 1.14, 0.94, 0.35, '#e1c7a0', '#d4b68d', '#c2a179');
      const p = project(2.27, 3.37, 0.38);
      ellipse(ctx, p[0], p[1], sx * 0.63, sy * 0.5, '#b9956e');
      ctx.beginPath(); ctx.moveTo(p[0] - sx * 0.55, p[1]);
      ctx.bezierCurveTo(p[0] - sx * 0.5, p[1] - sx * 0.95, p[0] + sx * 0.5, p[1] - sx * 0.95, p[0] + sx * 0.55, p[1]);
      ctx.strokeStyle = '#c5a47b'; ctx.lineWidth = 2.5; ctx.stroke();
      icon(ctx, 4, p[0] - sx * 0.24, p[1] - sx * 0.12, sx * 0.65);
      icon(ctx, 4, p[0] + sx * 0.25, p[1] - sx * 0.09, sx * 0.53);
      for (let i = 0; i < 4; i++) stroke(ctx, [project(1.8 + i * 0.28, 3.85, 0.03), project(1.8 + i * 0.28, 3.85, 0.28)], '#bd9d76', 0.8);
      stroke(ctx, [project(1.72, 3.85, 0.14), project(2.82, 3.85, 0.14)], '#ecd2ad', 0.9);
      endFurniture('basket', 2.27, 3.37, 0.38);
    }
    shadow(4.13, 3.15, 1.03, 0.88);
    if (owned.has('cushion')) {
      beginFurniture('cushion');
      floorRound(3.15, 2.4, 0.02, 1.98, 1.5, 0.24, '#bf9283');
      floorRound(3.15, 2.4, 0.21, 1.98, 1.5, 0.24, '#d8a697');
      floorRound(3.27, 2.51, 0.24, 1.74, 1.28, 0.2, '#e9c1b0');
      endFurniture('cushion', 4.13, 3.15, 0.24);
    }
    const sniff = active('plant'), play = active('basket'), pose = {
      rest: active('cushion') * (0.96 + 0.04 * Math.sin(elapsed / 380)) + active('lamp') * 0.3,
      reach: play * (0.65 + 0.35 * pulse), wave: active('picture') * (0.8 + 0.2 * pulse),
      tilt: sniff * (-0.16 + 0.03 * pulse) + play * 0.06 * pulse
    };
    // Walk over to sniff the plant, then return along the same route.
    const cushionHeight = arrival && arrival.id === 'cushion' ? landing : 1;
    const cat = project(4.13 - sniff * 2.1, 3.15 + sniff * 1.38, owned.has('cushion') ? 0.24 * (1 - sniff) * cushionHeight : 0.01);
    if (play) {
      const ball = project(3.12 + 0.22 * pulse * play, 3.96, 0.14);
      ctx.save(); ctx.globalAlpha = play;
      ctx.translate(ball[0], ball[1]); ctx.rotate(pulse * 0.7); icon(ctx, 4, 0, 0, sx * 0.67); ctx.restore();
    }
    companion(ctx, cat[0], cat[1] - sx * 0.9 - sniff * Math.sin(elapsed / 140) * sx * 0.025, sx * 2.9, !play && !sniff, pose);
    if (active('cushion')) {
      ctx.save(); ctx.globalAlpha = strength;
      ctx.fillStyle = '#91a084'; ctx.font = '600 ' + sx * 0.49 + 'px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('z', cat[0] + sx * 1.25, cat[1] - sx * (1.8 + elapsed % 1100 / 2200)); ctx.restore();
    }
    ctx.restore();
  }
  function tool(ctx, name, x, y, size, color) {
    ctx.save(); ctx.translate(x, y); ctx.scale((size || 20) / 24, (size || 20) / 24);
    ctx.strokeStyle = color || INK; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (name === 'undo' || name === 'restart') {
      ctx.beginPath(); ctx.arc(1, 1, 8, -Math.PI * 0.78, Math.PI * 0.75); ctx.stroke();
      stroke(ctx, [[-7, -9], [-7, -3], [-1, -3]], color, 1.8);
      if (name === 'restart') stroke(ctx, [[8, 10], [8, 4], [2, 4]], color, 1.8);
    }
    if (name === 'hint') {
      ctx.beginPath(); ctx.arc(0, -3, 6, Math.PI * 0.15, Math.PI * 0.85, true); ctx.lineTo(-3, 5); ctx.lineTo(3, 5); ctx.closePath(); ctx.stroke();
      stroke(ctx, [[-2, 9], [2, 9]], color, 1.8);
      [[0, -14, 0, -12], [-10, -9, -8, -7], [10, -9, 8, -7]].forEach(p => stroke(ctx, [[p[0], p[1]], [p[2], p[3]]], color, 1.6));
    }
    if (name === 'sound' || name === 'mute') {
      ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(-4, -3); ctx.lineTo(1, -8); ctx.lineTo(1, 8); ctx.lineTo(-4, 3); ctx.lineTo(-8, 3); ctx.closePath(); ctx.stroke();
      if (name === 'sound') { ctx.beginPath(); ctx.arc(0, 0, 10, -0.65, 0.65); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 6, -0.65, 0.65); ctx.stroke(); }
      else stroke(ctx, [[5, -4], [11, 4]], color, 1.8);
    }
    if (name === 'help') {
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-3, -4); ctx.bezierCurveTo(-3, -8, 5, -8, 4, -3); ctx.quadraticCurveTo(4, -1, 0, 1); ctx.lineTo(0, 3); ctx.stroke();
      ellipse(ctx, 0, 6, 1, 1, color || INK);
    }
    ctx.restore();
  }
  function star(ctx, x, y, size, color) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? size * 0.46 : size;
      const angle = i * Math.PI / 5 - Math.PI / 2;
      const px = x + Math.cos(angle) * r, py = y + Math.sin(angle) * r;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  }
  return { INK, rounded, box, ellipse, stroke, icon, companion, plant, decoration, roomLayout, isometricRoom, tool, star };
});
