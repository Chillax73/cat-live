import { WORLD, clamp } from './game.js';

const INK = '#655440';
function ellipse(c, x, y, rx, ry, fill, stroke = null, rotation = 0) {
  c.beginPath(); c.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.stroke(); }
}
function rect(c, x, y, w, h, r, fill, stroke = null) {
  c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.stroke(); }
}
function line(c, points, color, width = 2) {
  c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.strokeStyle = color; c.lineWidth = width; c.stroke();
}
function fish(c, x, y, scale = 1, color = '#e5b968') {
  c.save(); c.translate(x, y); c.scale(scale, scale); c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(-6, 0); c.lineTo(-14, -6); c.lineTo(-14, 6); c.closePath(); c.fillStyle = color; c.fill();
  ellipse(c, 0, 0, 10, 5, color, '#ba914f'); ellipse(c, 5, -1, 1.2, 1.2, '#785d39'); c.restore();
}

export function drawCat(c, x, y, { scale = 1, time = 0, walk = 0, moving = false, face = { x: 0, y: 1 }, dash = false, eating = false, hurt = false, claw = false, pose = '', invincible = false } = {}) {
  c.save(); c.translate(x, y);
  if (pose === 'lost') { c.rotate(-0.14); c.scale(1, 0.73); }
  c.scale(scale, scale); c.lineWidth = 1.8; c.lineJoin = 'round'; c.lineCap = 'round';
  ellipse(c, 0, 34, 35, 9, '#564c3424');
  if (invincible) c.globalAlpha = 0.55 + Math.sin(time * 35) * 0.2;
  const bob = moving ? Math.sin(walk * 2) * 2 : Math.sin(time * 2.4) * 1.1;
  if (dash) { c.rotate(Math.atan2(face.y, face.x) - Math.PI / 2); c.scale(0.82, 1.28); }
  c.translate(moving ? Math.sin(walk) * 1.5 : 0, bob);
  // 弯尾巴、短腿、奶油肚皮。
  c.save(); c.rotate(Math.sin(time * 3) * 0.1);
  c.beginPath(); c.moveTo(18, 21); c.bezierCurveTo(52, 18, 47, -6, 36, -3); c.strokeStyle = INK; c.lineWidth = 12; c.stroke();
  c.strokeStyle = '#d9a252'; c.lineWidth = 9; c.stroke(); line(c, [[40, 5], [46, 7]], '#ba8545', 3); c.restore();
  ellipse(c, 0, 18, 24, 22, '#e9b56b', INK); ellipse(c, 0, 19, 16, 17, '#fae6b6');
  const step = moving ? Math.sin(walk) * 4 : 0;
  ellipse(c, -14, 33 + step, 9, 6, '#eabb77', INK); ellipse(c, 14, 33 - step, 9, 6, '#eabb77', INK);
  line(c, [[-17, 32 + step], [-17, 35 + step]], '#b38952', 1); line(c, [[12, 32 - step], [12, 35 - step]], '#b38952', 1);
  // 大头与耳朵。
  c.beginPath(); c.moveTo(-30, -12); c.lineTo(-29, -38); c.quadraticCurveTo(-27, -43, -13, -24); c.lineTo(14, -24); c.quadraticCurveTo(28, -43, 30, -37); c.lineTo(31, -10); c.closePath(); c.fillStyle = '#dfad62'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.8; c.stroke();
  c.beginPath(); c.moveTo(-25, -29); c.lineTo(-24, -18); c.lineTo(-16, -23); c.closePath(); c.fillStyle = '#e3b2a0'; c.fill();
  c.beginPath(); c.moveTo(25, -29); c.lineTo(24, -18); c.lineTo(16, -23); c.closePath(); c.fill();
  ellipse(c, 0, -6, 35, 29, '#edbf7b', INK);
  ellipse(c, -17, 4, 15, 14, '#f5d9a0'); ellipse(c, 17, 4, 15, 14, '#f5d9a0');
  line(c, [[-9, -30], [-6, -20]], '#c4914b', 3); line(c, [[0, -32], [0, -22]], '#c4914b', 3); line(c, [[9, -30], [6, -20]], '#c4914b', 3);
  line(c, [[-31, -4], [-24, -1]], '#cc9958', 2.5); line(c, [[31, -4], [24, -1]], '#cc9958', 2.5);
  const look = dash ? 0 : face.x * 2;
  if (eating || pose === 'won') {
    c.beginPath(); c.arc(-13, -6, 6, Math.PI + 0.25, Math.PI * 2 - 0.25); c.strokeStyle = INK; c.lineWidth = 2.6; c.stroke();
    c.beginPath(); c.arc(13, -6, 6, Math.PI + 0.25, Math.PI * 2 - 0.25); c.stroke();
  } else if (hurt || pose === 'lost') {
    line(c, [[-18, -10], [-10, -5], [-18, 0]], INK, 2.2); line(c, [[18, -10], [10, -5], [18, 0]], INK, 2.2);
  } else {
    ellipse(c, -13, -6, 7, 8, '#fff5d9', INK); ellipse(c, 13, -6, 7, 8, '#fff5d9', INK);
    ellipse(c, -13 + look, -5, 4.5, 6.3, '#718f6d'); ellipse(c, 13 + look, -5, 4.5, 6.3, '#718f6d');
    ellipse(c, -13 + look, -5, 2.2, 5.2, '#343e32'); ellipse(c, 13 + look, -5, 2.2, 5.2, '#343e32');
    ellipse(c, -15 + look, -9, 1.7, 2, '#fff'); ellipse(c, 11 + look, -9, 1.7, 2, '#fff');
  }
  ellipse(c, -21, 6, 5, 2.5, '#d998785b'); ellipse(c, 21, 6, 5, 2.5, '#d998785b');
  ellipse(c, -6, 6, 7, 5, '#fff0ce'); ellipse(c, 6, 6, 7, 5, '#fff0ce');
  c.beginPath(); c.moveTo(-3.5, 2); c.lineTo(3.5, 2); c.lineTo(0, 6); c.closePath(); c.fillStyle = '#ad796a'; c.fill();
  line(c, [[0, 6], [0, 9], [-4, 11]], INK, 1.4); line(c, [[0, 9], [4, 11]], INK, 1.4);
  line(c, [[-21, 8], [-37, 4]], '#877052', 1); line(c, [[-20, 12], [-35, 14]], '#877052', 1); line(c, [[21, 8], [37, 4]], '#877052', 1); line(c, [[20, 12], [35, 14]], '#877052', 1);
  if (eating || pose === 'won') { ellipse(c, 2, 13, 3, 4, '#d68e87'); }
  if (claw || pose === 'won') { ellipse(c, -27, 11, 10, 7, '#f3d39c', INK, -0.7); ellipse(c, -29, 10, 4, 3, '#d59f87'); }
  else { ellipse(c, -23, 18 + step * 0.4, 7, 5, '#ebbc77', INK); ellipse(c, 23, 18 - step * 0.4, 7, 5, '#ebbc77', INK); }
  if (hurt) for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; line(c, [[Math.cos(a) * 35, Math.sin(a) * 32 - 5], [Math.cos(a) * 43, Math.sin(a) * 40 - 5]], '#bd8560', 2); }
  c.restore();
}

function plant(c, x, y, scale = 1) {
  c.save(); c.translate(x, y); c.scale(scale, scale); ellipse(c, 0, 40, 42, 12, '#665d3a18');
  rect(c, -25, 5, 50, 36, [4, 4, 14, 14], '#cda17b', '#a27d5c'); ellipse(c, 0, 6, 25, 7, '#8c7858');
  line(c, [[0, 9], [0, -56]], '#497363', 4);
  for (let i = 0; i < 7; i++) { const side = i % 2 ? -1 : 1, yy = -i * 9; ellipse(c, side * 18, yy - 8, 12, 25, i % 3 ? '#6f9479' : '#497664', null, side * 0.85); }
  c.restore();
}
function makeRoom() {
  const canvas = document.createElement('canvas'); canvas.width = WORLD.width; canvas.height = WORLD.height;
  const c = canvas.getContext('2d'); c.lineWidth = 2;
  c.fillStyle = '#ede4d2'; c.fillRect(0, 0, WORLD.width, WORLD.height);
  for (let row = 0; row < 15; row++) {
    const y = row * 84;
    for (let col = -1; col < 6; col++) {
      const x = col * 355 + (row % 2) * 175;
      c.fillStyle = (row + col) % 3 === 0 ? '#e6dcc8' : (row + col) % 3 === 1 ? '#eee5d4' : '#eae0cd'; c.fillRect(x + 1, y + 1, 353, 82);
      c.strokeStyle = '#d6c7ad66'; c.strokeRect(x, y, 355, 84);
      line(c, [[x + 70, y + 27], [x + 240, y + 27]], '#dfd2bb70', 1);
    }
  }
  // 北面的墙、窗户和暖阳。
  c.fillStyle = '#f5eddd'; c.fillRect(0, 0, WORLD.width, 150); rect(c, 0, 147, WORLD.width, 12, 0, '#c7b599');
  rect(c, 735, 15, 280, 120, 12, '#c6d7cd', '#b4bfac'); rect(c, 745, 23, 260, 104, 7, '#e8eee0');
  line(c, [[875, 23], [875, 127]], '#c0cfbd', 8); line(c, [[745, 75], [1005, 75]], '#c0cfbd', 8);
  c.save(); c.globalAlpha = 0.22; c.fillStyle = '#fff9d0'; c.beginPath(); c.moveTo(745, 160); c.lineTo(1010, 160); c.lineTo(1450, 1050); c.lineTo(1020, 1050); c.closePath(); c.fill(); c.restore();
  // 柔软的编织地毯。
  rect(c, 652, 480, 830, 470, 90, '#9bafa0'); rect(c, 668, 495, 800, 440, 78, '#b2c0aa');
  c.save(); c.beginPath(); c.roundRect(674, 501, 788, 428, 74); c.clip();
  for (let y = 510; y < 932; y += 13) line(c, [[670, y], [1480, y]], '#d4ddc125', 2);
  for (let x = 685; x < 1470; x += 18) line(c, [[x, 500], [x, 940]], '#748b7d12', 1);
  c.restore(); rect(c, 699, 527, 738, 375, 53, '#ffffff00', '#c7d1b8');
  // 沙发：层次来自轮廓和材质。
  ellipse(c, 1190, 412, 249, 33, '#786e4120'); rect(c, 948, 256, 474, 164, 35, '#486b5d', '#385447');
  rect(c, 961, 225, 450, 126, 35, '#769483', '#526e5b');
  rect(c, 992, 320, 192, 83, 18, '#829c88', '#56745d'); rect(c, 1190, 320, 192, 83, 18, '#829c88', '#56745d');
  rect(c, 945, 278, 48, 139, 19, '#60806d', '#486451'); rect(c, 1383, 278, 48, 139, 19, '#60806d', '#486451');
  rect(c, 1007, 260, 68, 61, 13, '#ddcda5', '#b6a883'); rect(c, 1291, 260, 70, 61, 13, '#c2916e', '#a57e5e');
  line(c, [[1036, 263], [1036, 318]], '#bca67f', 2); line(c, [[1297, 284], [1355, 284]], '#deb68a', 2);
  rect(c, 990, 414, 18, 14, 2, '#8c7859'); rect(c, 1370, 414, 18, 14, 2, '#8c7859');
  plant(c, 1550, 283, 1.6); plant(c, 180, 294, 1.2);
  // 小边桌与杯子。
  ellipse(c, 1580, 760, 83, 25, '#51452e19'); rect(c, 1518, 698, 10, 65, 4, '#a98a60'); rect(c, 1630, 698, 10, 65, 4, '#a98a60');
  rect(c, 1498, 652, 161, 65, 29, '#c6a574', '#a38962'); rect(c, 1508, 648, 143, 47, 25, '#dec29b', '#b29976');
  rect(c, 1537, 640, 27, 23, 6, '#faf3db', '#b8a789'); ellipse(c, 1550, 640, 13, 5, '#947d5d');
  rect(c, 1580, 634, 43, 32, 4, '#729487'); line(c, [[1585, 641], [1617, 641]], '#b4c1a5', 2);
  // 猫窝、猫碗、玩具。
  ellipse(c, 265, 855, 115, 66, '#bda081'); ellipse(c, 265, 840, 112, 66, '#d8c0a0', '#b59d7b'); ellipse(c, 265, 843, 79, 39, '#ad9a7c');
  for (let i = 0; i < 5; i++) line(c, [[180 + i * 42, 855], [186 + i * 42, 892]], '#c4ac8d', 2);
  ellipse(c, 533, 969, 39, 13, '#99886b23'); ellipse(c, 533, 959, 35, 16, '#b88968', '#937451'); ellipse(c, 533, 953, 30, 11, '#efe3be', '#b29974'); fish(c, 533, 952, 1.1);
  c.save(); c.translate(1411, 1011); c.rotate(-0.3); rect(c, -42, -4, 80, 8, 4, '#b99c74'); line(c, [[38, 0], [57, -25], [70, -9]], '#ab9274', 1.5); ellipse(c, 70, -9, 8, 17, '#bc856e', null, 0.5); c.restore();
  ellipse(c, 623, 334, 19, 18, '#cba78b', '#b49073'); line(c, [[608, 321], [635, 343]], '#e0c6a4', 2); line(c, [[605, 334], [638, 334]], '#e0c6a4', 2);
  // 边界。
  rect(c, 5, 160, WORLD.width - 10, WORLD.height - 166, 16, '#ffffff00', '#cfbea0');
  return canvas;
}
function drawEnemy(c, e, time) {
  c.save(); c.translate(e.x, e.y); c.lineWidth = 1.7;
  ellipse(c, 0, e.r * 0.7, e.r * 1.1, e.r * 0.4, '#51493620');
  if (e.flash > 0) c.globalAlpha = 0.55;
  if (e.kind === 'robot') {
    ellipse(c, 0, 0, 23, 20, '#a4b4ae', '#60756c'); ellipse(c, 0, -3, 20, 17, '#d7ded2', '#7c9085');
    ellipse(c, 0, -5, 6, 5, '#8fa79b', '#60756c'); rect(c, -9, 6, 18, 5, 3, '#526f63');
    ellipse(c, -5, 8, 1.4, 1.4, '#e8d88d'); ellipse(c, 5, 8, 1.4, 1.4, '#e8d88d');
    line(c, [[-24, 10], [-29, 12]], '#87958b', 2); line(c, [[24, 10], [29, 12]], '#87958b', 2);
  } else if (e.kind === 'car') {
    c.rotate(Math.atan2(e.attack.y || 0, e.attack.x || 1) + Math.PI / 2);
    rect(c, -23, -15, 9, 14, 3, '#625a4f'); rect(c, 14, -15, 9, 14, 3, '#625a4f'); rect(c, -23, 9, 9, 14, 3, '#625a4f'); rect(c, 14, 9, 9, 14, 3, '#625a4f');
    rect(c, -18, -27, 36, 54, 12, e.mode === 'warning' ? '#d38663' : '#cba578', '#a0805a'); rect(c, -13, -12, 26, 19, 6, '#a8c3b5', '#857b65');
    line(c, [[-10, 16], [10, 16]], '#e8d7b0', 3); ellipse(c, -10, -19, 3, 2, '#fff1bd'); ellipse(c, 10, -19, 3, 2, '#fff1bd');
  } else if (e.kind === 'toy') {
    const bob = Math.sin(e.phase) * 2;
    ellipse(c, -14, -18 + bob, 8, 12, '#c9b3cc', '#927993'); ellipse(c, 14, -18 + bob, 8, 12, '#c9b3cc', '#927993');
    ellipse(c, 0, 0 + bob, 23, 23, '#c9b3cc', '#927993'); ellipse(c, 0, 6 + bob, 15, 12, '#e7dce0');
    ellipse(c, -7, -4 + bob, 2.3, 3, '#655466'); ellipse(c, 7, -4 + bob, 2.3, 3, '#655466'); ellipse(c, 0, 4 + bob, 3, 2, '#9d798c');
  } else {
    rect(c, -45, -38, 90, 77, 22, '#9d7065', '#73554a'); rect(c, -39, -34, 78, 59, 18, '#c99a84', '#9d7065');
    rect(c, -29, -13, 58, 32, 10, '#dfba98', '#a07961');
    for (let i = 0; i < 5; i++) line(c, [[-21 + i * 10, -6], [-21 + i * 10, 12]], '#a67e64', 3);
    c.beginPath(); c.moveTo(20, -33); c.bezierCurveTo(50, -68, 68, -30, 58, -10); c.strokeStyle = '#826552'; c.lineWidth = 12; c.stroke(); c.strokeStyle = '#b39179'; c.lineWidth = 8; c.stroke();
    rect(c, 45, -13, 30, 13, 4, '#7c6d5b'); ellipse(c, -30, 33, 10, 12, '#746c5d'); ellipse(c, 30, 33, 10, 12, '#746c5d');
    rect(c, -21, -26, 42, 7, 3, '#8e6658'); ellipse(c, 0, -23, 3, 2, '#f5c97b');
  }
  if (e.hp < e.maxHp && e.kind !== 'boss') { rect(c, -18, -e.r - 12, 36, 4, 2, '#786e4d30'); rect(c, -18, -e.r - 12, 36 * Math.max(0, e.hp / e.maxHp), 4, 2, '#a98861'); }
  c.restore();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.room = makeRoom(); this.camera = { x: 0, y: 0 }; this.lastMode = '';
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resize();
  }
  resize() {
    const bounds = this.canvas.getBoundingClientRect(); this.width = bounds.width; this.height = bounds.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2); this.canvas.width = Math.round(this.width * dpr); this.canvas.height = Math.round(this.height * dpr); this.dpr = dpr;
  }
  draw(game, time, preview = false) {
    const c = this.ctx, w = this.width, h = this.height;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.clearRect(0, 0, w, h);
    if (preview) {
      const zoom = Math.max(w / WORLD.width, h / WORLD.height) * 1.17;
      c.save(); c.translate(w * 0.73, h * (w <= 700 ? 0.81 : 0.61)); c.scale(zoom, zoom); c.translate(-1130, -700);
      c.drawImage(this.room, 0, 0); drawCat(c, 1130, 704, { scale: 2.9, time, pose: Math.sin(time * 0.5) > 0.96 ? 'won' : '' });
      fish(c, 1050, 814, 1.7); fish(c, 1089, 833, 1.3); c.restore(); this.lastMode = 'preview'; return;
    }
    const zoom = Math.max(0.7, Math.min(w / 1240, h / 700));
    const vw = w / zoom, vh = h / zoom;
    const target = { x: clamp(game.player.x - vw / 2, -20, Math.max(-20, WORLD.width - vw + 20)), y: clamp(game.player.y - vh / 2, -20, Math.max(-20, WORLD.height - vh + 20)) };
    if (this.lastMode !== 'game') this.camera = target;
    else { this.camera.x += (target.x - this.camera.x) * 0.13; this.camera.y += (target.y - this.camera.y) * 0.13; }
    this.lastMode = 'game';
    const shake = !this.reduced && game.player.hurtAnimation > 0 ? Math.sin(time * 97) * 3 : 0;
    c.save(); c.translate(shake, 0); c.scale(zoom, zoom); c.translate(-this.camera.x, -this.camera.y); c.fillStyle = '#ede4d2'; c.fillRect(this.camera.x, this.camera.y, vw, vh); c.drawImage(this.room, 0, 0);
    for (const e of game.enemies) if (e.mode === 'warning') {
      c.save(); c.translate(e.x, e.y); c.rotate(Math.atan2(e.attack.y, e.attack.x));
      rect(c, 0, -e.r, e.kind === 'boss' ? 460 : 280, e.r * 2, 10, '#b75c3e25', '#b75c3e45'); line(c, [[25, 0], [220, 0]], '#b75c3e70', 2); c.restore();
    }
    for (const d of game.drops) {
      if (d.kind === 'xp') { ellipse(c, d.x, d.y + 4, 13, 4, '#b59a6425'); fish(c, d.x, d.y + Math.sin(time * 4 + d.phase) * 2, 0.85 + Math.min(d.value, 6) * 0.035); }
      else { rect(c, d.x - 11, d.y - 10, 22, 22, 7, '#e3a08b', '#b9735e'); c.fillStyle = '#fff0dc'; c.fillRect(d.x - 2, d.y - 6, 4, 14); c.fillRect(d.x - 7, d.y - 1, 14, 4); }
    }
    for (const b of game.projectiles) { ellipse(c, b.x, b.y, b.r, b.r, '#b5a0b3', '#877086'); line(c, [[b.x - 5, b.y - 2], [b.x + 5, b.y + 3]], '#dac9d4', 1.4); }
    const entities = game.enemies.filter(e => e.hp > 0).map(e => ({ y: e.y, draw: () => drawEnemy(c, e, time) }));
    const p = game.player;
    entities.push({ y: p.y, draw: () => drawCat(c, p.x, p.y, { time, walk: p.walk, moving: p.moving && game.state === 'playing', face: p.face, dash: p.dash > 0, eating: p.eating > 0, hurt: p.hurtAnimation > 0, claw: p.clawAnimation > 0, pose: game.state === 'won' ? 'won' : game.state === 'lost' ? 'lost' : '', invincible: p.invincible > 0 && game.state === 'playing' }) });
    entities.sort((a, b) => a.y - b.y).forEach(e => e.draw());
    for (const e of game.effects) {
      const progress = 1 - e.life / e.duration; c.save(); c.globalAlpha = Math.max(0, 1 - progress);
      if (e.type === 'slash') {
        c.translate(e.x, e.y); c.rotate(e.angle); c.strokeStyle = '#fff9e3'; c.lineCap = 'round';
        for (let i = 0; i < 3; i++) { c.beginPath(); c.lineWidth = 5 - i; c.arc(0, 0, e.radius - i * 14, -0.85 + progress * 0.2, 0.85 + progress * 0.2); c.stroke(); }
      } else if (e.type === 'ring') { c.beginPath(); c.arc(e.x, e.y, e.radius * (0.2 + progress * 0.8), 0, Math.PI * 2); c.strokeStyle = e.color; c.lineWidth = 5 * (1 - progress); c.stroke(); }
      else if (e.type === 'trail') ellipse(c, e.x, e.y, e.radius * (1 - progress), e.radius * 0.7, e.color);
      else if (e.type === 'text') { c.font = 'bold 16px ui-rounded, system-ui, sans-serif'; c.textAlign = 'center'; c.strokeStyle = '#80634066'; c.lineWidth = 3; c.strokeText(e.text, e.x, e.y - progress * 28); c.fillStyle = e.color; c.fillText(e.text, e.x, e.y - progress * 28); }
      else if (e.type === 'burst') for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ellipse(c, e.x + Math.cos(a) * progress * 40, e.y + Math.sin(a) * progress * 40, 4 * (1 - progress), 4 * (1 - progress), e.color); }
      c.restore();
    }
    if (p.dashCooldown <= 0 && game.state === 'playing') { c.beginPath(); c.ellipse(p.x, p.y + 37, 28, 7, 0, 0, Math.PI * 2); c.strokeStyle = '#f5f1ca88'; c.lineWidth = 2; c.stroke(); }
    c.restore();
  }
}
