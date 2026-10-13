export const WORLD = { width: 1720, height: 1120, bossAt: 300 };
export const DIFFICULTIES = [
  { name: '悠闲猫', tagline: '晒晒太阳，顺便打架', spawn: 0.72, speed: 0.83, damage: 0.65, warning: 1.25 },
  { name: '标准猫', tagline: '有点挑战，但你可是猫', spawn: 1, speed: 1, damage: 1, warning: 1 },
  { name: '猛猫', tagline: '小短腿，也有大脾气', spawn: 1.32, speed: 1.12, damage: 1.3, warning: 0.82 },
];
export const SKILLS = [
  { id: 'claw', name: '无影猫爪', icon: '爪', subtitle: '猫爪流派', text: '出爪更快，伤害更高。', detail: '伤害 +7 · 攻击间隔 −8%', max: 5 },
  { id: 'reach', name: '肉垫重击', icon: '拍', subtitle: '猫爪流派', text: '爪子这么软，怎么这么疼？', detail: '攻击范围 +18 · 击退增强', max: 4 },
  { id: 'pounce', name: '猛猫飞扑', icon: '扑', subtitle: '扑击流派', text: '一跃而起，落地就是大场面。', detail: '扑击伤害 +15 · 落地冲击增强', max: 5 },
  { id: 'agility', name: '猫咪弹簧', icon: '跃', subtitle: '扑击流派', text: '下一扑，已经准备好了。', detail: '扑击冷却 −0.3 秒 · 速度 +8%', max: 4 },
  { id: 'shock', name: '炸毛警告', icon: '怒', subtitle: '猫的脾气', text: '碰我？那我可要炸毛了！', detail: '受伤触发范围反击 · 升级增强', max: 4 },
  { id: 'purr', name: '呼噜疗愈', icon: '噜', subtitle: '猫的习惯', text: '呼噜呼噜，自己哄好自己。', detail: '每 8 秒恢复 3 点生命 / 级', max: 4 },
  { id: 'magnet', name: '干饭高手', icon: '鱼', subtitle: '猫的习惯', text: '小鱼干，一个都不能少。', detail: '拾取范围 +35 · 立即恢复 8 点生命', max: 4 },
  { id: 'armor', name: '厚厚肉垫', icon: '盾', subtitle: '九条命的底气', text: '软乎乎的肉垫，也能挡一挡。', detail: '生命上限 +15 · 恢复 15 点生命', max: 4 },
];
const SNACK = { id: 'snack', name: '加餐时间', icon: '鱼', subtitle: '满级奖励', text: '今天也是干饭冠军。', detail: '立即恢复 30 点生命', max: Infinity };
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const direction = (x, y) => { const d = Math.hypot(x, y) || 1; return { x: x / d, y: y / d }; };
export const xpNeeded = level => 7 + (level - 1) * 5;

export class Game {
  constructor(random = Math.random) { this.random = random; this.reset(1); this.state = 'ready'; }
  reset(difficulty = 1) {
    this.difficulty = clamp(Math.trunc(difficulty), 0, 2);
    this.initialDifficulty = this.difficulty;
    this.time = 0; this.kills = 0; this.level = 1; this.xp = 0;
    this.state = 'playing'; this.resumeState = 'playing'; this.spawnTimer = 1.2; this.bossSpawned = false;
    this.player = { x: WORLD.width / 2, y: WORLD.height / 2, hp: 100, face: { x: 0, y: 1 }, invincible: 0, dash: 0, dashCooldown: 0, attackCooldown: 0.2, walk: 0, moving: false, eating: 0, clawAnimation: 0, hurtAnimation: 0, healTimer: 8 };
    this.skills = Object.fromEntries(SKILLS.map(s => [s.id, 0]));
    this.enemies = []; this.drops = []; this.projectiles = []; this.effects = []; this.events = []; this.choices = [];
    this.nextId = 1; this.dashHits = new Set(); this.message = '客厅保卫战，开始！'; this.messageTimer = 3;
  }
  get stats() {
    const s = this.skills;
    return { maxHp: 100 + s.armor * 15, damage: 18 + s.claw * 7, attackInterval: 0.7 * (1 - s.claw * 0.08), range: 108 + s.reach * 18, speed: 205 * (1 + s.agility * 0.08), dashDamage: 28 + s.pounce * 15, dashInterval: 2.7 - s.agility * 0.3, pickup: 55 + s.magnet * 35 };
  }
  emit(type, extra = {}) { this.events.push({ type, ...extra }); }
  takeEvents() { const result = this.events; this.events = []; return result; }
  pause(reason = '') {
    if (this.state !== 'playing' && this.state !== 'upgrade') return;
    this.resumeState = this.state; this.state = 'paused'; this.pauseReason = reason;
  }
  resume() { if (this.state === 'paused') this.state = this.resumeState; }
  lowerDifficulty(value) {
    if (this.state !== 'paused' || !Number.isInteger(value) || value < 0 || value > this.difficulty) return false;
    this.difficulty = value; return true;
  }
  pounce() {
    const p = this.player;
    if (this.state !== 'playing' || p.dashCooldown > 0 || p.dash > 0) return false;
    p.dash = 0.23; p.dashCooldown = this.stats.dashInterval; p.invincible = Math.max(p.invincible, 0.4);
    p.dashFace = { ...p.face }; this.dashHits.clear(); this.emit('pounce');
    this.effect('ring', p.x, p.y, { radius: 38, color: '#f9df9b', duration: 0.35 });
    return true;
  }
  effect(type, x, y, props = {}) {
    if (this.effects.length >= 220) this.effects.shift();
    this.effects.push({ type, x, y, life: props.duration ?? 0.4, duration: props.duration ?? 0.4, ...props });
  }
  addXp(value) {
    this.xp += value;
    if (this.state === 'playing' && this.xp >= xpNeeded(this.level)) this.openUpgrade();
  }
  openUpgrade() {
    this.xp -= xpNeeded(this.level); this.level++; this.state = 'upgrade';
    const pool = SKILLS.filter(s => this.skills[s.id] < s.max);
    this.choices = [];
    while (this.choices.length < 3 && pool.length) this.choices.push(pool.splice(Math.floor(this.random() * pool.length), 1)[0]);
    if (!this.choices.length) this.choices = [SNACK, { ...SNACK, id: 'snack2', name: '再来一口' }, { ...SNACK, id: 'snack3', name: '鱼干管够' }];
    else while (this.choices.length < 3) this.choices.push({ ...SNACK, id: `snack${this.choices.length}` });
    this.emit('upgrade');
  }
  chooseUpgrade(index) {
    if (this.state !== 'upgrade' || !this.choices[index]) return false;
    const s = this.choices[index];
    if (s.id.startsWith('snack')) this.heal(30);
    else { this.skills[s.id]++; if (s.id === 'armor') this.heal(15); if (s.id === 'magnet') this.heal(8); }
    this.state = 'playing'; this.choices = []; this.player.invincible = Math.max(this.player.invincible, 0.8);
    this.emit('select');
    if (this.xp >= xpNeeded(this.level)) this.openUpgrade();
    return true;
  }
  heal(amount) {
    this.player.hp = Math.min(this.stats.maxHp, this.player.hp + amount);
    this.player.eating = 0.45; this.effect('text', this.player.x, this.player.y - 55, { text: `+${amount}`, color: '#448677', duration: 0.8 });
  }
  hurt(amount) {
    const p = this.player;
    if (p.invincible > 0 || this.state !== 'playing') return;
    p.hp = Math.max(0, p.hp - Math.ceil(amount * DIFFICULTIES[this.difficulty].damage));
    p.invincible = 1.1; p.hurtAnimation = 0.35; this.emit('hurt');
    this.effect('text', p.x, p.y - 50, { text: '喵！', color: '#bc674c', duration: 0.7 });
    if (this.skills.shock) {
      const radius = 115 + this.skills.shock * 20;
      this.effect('ring', p.x, p.y, { radius, color: '#edb578', duration: 0.5 });
      for (const e of this.enemies) if (distance(p, e) < radius + e.r) this.hitEnemy(e, 18 * this.skills.shock, 55);
    }
    if (p.hp <= 0) { this.state = 'lost'; this.emit('end'); }
  }
  hitEnemy(enemy, damage, knockback = 15) {
    if (enemy.hp <= 0) return;
    enemy.hp -= damage; enemy.flash = 0.12;
    const d = direction(enemy.x - this.player.x, enemy.y - this.player.y);
    enemy.x = clamp(enemy.x + d.x * knockback, 25, WORLD.width - 25);
    enemy.y = clamp(enemy.y + d.y * knockback, 25, WORLD.height - 25);
    this.effect('text', enemy.x, enemy.y - enemy.r, { text: `${damage}`, color: '#fff4cf', duration: 0.5 });
    if (enemy.hp <= 0) {
      this.kills++; this.emit('kill'); this.effect('burst', enemy.x, enemy.y, { color: enemy.kind === 'boss' ? '#e4ac5b' : '#9aafa5', duration: 0.5 });
      if (enemy.kind === 'boss') { this.state = 'won'; this.emit('end'); }
      else {
        if (this.drops.length >= 240) { const old = this.drops.find(d => d.kind === 'xp'); if (old) { const i = this.drops.indexOf(old); this.drops.splice(i, 1); this.drops.push({ x: enemy.x, y: enemy.y, kind: 'xp', value: old.value + (enemy.kind === 'robot' ? 1 : 2), phase: this.random() * 6 }); return; } }
        this.drops.push({ x: enemy.x, y: enemy.y, kind: 'xp', value: enemy.kind === 'robot' ? 1 : 2, phase: this.random() * 6 });
        if (this.random() < (this.difficulty === 0 ? 0.1 : 0.055) && this.drops.length < 260) this.drops.push({ x: enemy.x + 15, y: enemy.y, kind: 'heal', value: 12, phase: 0 });
      }
    }
  }
  spawnEnemy(kind) {
    let x, y;
    for (let attempt = 0; attempt < 16; attempt++) {
      const a = this.random() * Math.PI * 2, radius = 440 + this.random() * 130;
      x = clamp(this.player.x + Math.cos(a) * radius, 50, WORLD.width - 50);
      y = clamp(this.player.y + Math.sin(a) * radius, 50, WORLD.height - 50);
      if (distance(this.player, { x, y }) >= 350) break;
    }
    if (distance(this.player, { x, y }) < 350) {
      x = this.player.x > WORLD.width / 2 ? 50 : WORLD.width - 50;
      y = this.player.y > WORLD.height / 2 ? 50 : WORLD.height - 50;
    }
    const e = { id: this.nextId++, kind, x, y, flash: 0, phase: this.random() * 6, timer: 1.5 + this.random() * 2, mode: 'chase', attack: { x: 0, y: 1 } };
    Object.assign(e, kind === 'boss' ? { hp: 1800, maxHp: 1800, r: 46, speed: 49 } : kind === 'car' ? { hp: 50, maxHp: 50, r: 22, speed: 70 } : kind === 'toy' ? { hp: 38, maxHp: 38, r: 21, speed: 54 } : { hp: 30, maxHp: 30, r: 21, speed: 62 });
    this.enemies.push(e); return e;
  }
  attack() {
    const p = this.player, st = this.stats;
    const candidates = this.enemies.filter(e => e.hp > 0 && distance(p, e) <= st.range + e.r);
    if (!candidates.length) return;
    const nearest = candidates.reduce((a, b) => distance(p, a) < distance(p, b) ? a : b);
    const aim = direction(nearest.x - p.x, nearest.y - p.y);
    for (const e of candidates) {
      const d = direction(e.x - p.x, e.y - p.y);
      if (d.x * aim.x + d.y * aim.y > -0.15) this.hitEnemy(e, st.damage, 16 + this.skills.reach * 6);
    }
    p.clawAnimation = 0.25; p.attackCooldown = st.attackInterval; this.emit('claw');
    this.effect('slash', p.x, p.y, { angle: Math.atan2(aim.y, aim.x), radius: st.range, duration: 0.22 });
  }
  update(dt, input = { x: 0, y: 0 }) {
    if (this.state !== 'playing') return;
    dt = clamp(dt, 0, 0.05); this.time += dt;
    const p = this.player, st = this.stats;
    for (const key of ['invincible', 'dashCooldown', 'attackCooldown', 'eating', 'clawAnimation', 'hurtAnimation']) p[key] = Math.max(0, p[key] - dt);
    this.messageTimer = Math.max(0, this.messageTimer - dt);
    const len = Math.hypot(input.x, input.y);
    p.moving = len > 0;
    if (p.dash > 0) {
      p.dash = Math.max(0, p.dash - dt);
      p.x += p.dashFace.x * 930 * dt; p.y += p.dashFace.y * 930 * dt;
      this.effect('trail', p.x, p.y, { radius: 18, duration: 0.2, color: '#eac681' });
    } else if (len) {
      p.face = direction(input.x, input.y); p.x += p.face.x * st.speed * dt; p.y += p.face.y * st.speed * dt; p.walk += dt * 13;
    }
    p.x = clamp(p.x, 35, WORLD.width - 35); p.y = clamp(p.y, 40, WORLD.height - 35);
    if (p.dash > 0) {
      for (const e of this.enemies) if (e.hp > 0 && !this.dashHits.has(e.id) && distance(p, e) < 40 + e.r) { this.dashHits.add(e.id); this.hitEnemy(e, st.dashDamage, 22); }
      if (p.dash < dt * 1.1) {
        const r = 72 + this.skills.pounce * 15;
        this.effect('ring', p.x, p.y, { radius: r, color: '#eeb968', duration: 0.4 });
        for (const e of this.enemies) if (distance(p, e) < r + e.r) this.hitEnemy(e, 10 + this.skills.pounce * 9, 24);
        this.emit('land');
      }
    }
    if (p.attackCooldown <= 0) this.attack();
    if (this.state !== 'playing') return;
    p.healTimer -= dt;
    if (p.healTimer <= 0) { p.healTimer = 8; if (this.skills.purr && p.hp < st.maxHp) this.heal(this.skills.purr * 3); }
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = Math.max(0.22, 1.25 - Math.min(this.time, 360) / 340) / DIFFICULTIES[this.difficulty].spawn;
      if (this.enemies.length < 160) {
        const roll = this.random();
        this.spawnEnemy(this.time > 55 && roll > 0.77 ? 'toy' : this.time > 25 && roll > 0.51 ? 'car' : 'robot');
      }
    }
    if (this.time >= WORLD.bossAt && !this.bossSpawned) { this.bossSpawned = true; this.spawnEnemy('boss'); this.message = '吸尘器来了！守住你的客厅'; this.messageTimer = 4; this.emit('boss'); }
    this.updateEnemies(dt);
    if (this.state !== 'playing') return;
    for (const b of this.projectiles) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (distance(p, b) < b.r + 19) { this.hurt(b.damage); b.life = 0; }
    }
    this.projectiles = this.projectiles.filter(b => b.life > 0 && b.x > 0 && b.y > 0 && b.x < WORLD.width && b.y < WORLD.height);
    for (const d of this.drops) {
      const dist = distance(p, d);
      if (dist < st.pickup) { const dir = direction(p.x - d.x, p.y - d.y); const travel = Math.min(dist, dt * 430); d.x += dir.x * travel; d.y += dir.y * travel; }
      if (distance(p, d) < 26) {
        d.collected = true; p.eating = 0.35;
        if (d.kind === 'heal') { this.heal(d.value); this.emit('heal'); } else { this.addXp(d.value); this.emit('pickup'); }
        if (this.state !== 'playing') break;
      }
    }
    this.drops = this.drops.filter(d => !d.collected);
    this.enemies = this.enemies.filter(e => e.hp > 0);
    for (const e of this.effects) e.life -= dt;
    this.effects = this.effects.filter(e => e.life > 0);
  }
  updateEnemies(dt) {
    const p = this.player, diff = DIFFICULTIES[this.difficulty];
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.flash = Math.max(0, e.flash - dt); e.phase += dt * 4; e.timer -= dt;
      const d = direction(p.x - e.x, p.y - e.y), dist = distance(p, e);
      if ((e.kind === 'car' || e.kind === 'boss') && e.mode !== 'chase') {
        if (e.mode === 'warning' && e.timer <= 0) { e.mode = 'charge'; e.timer = e.kind === 'boss' ? 1.15 : 0.8; }
        if (e.mode === 'charge') {
          e.x += e.attack.x * (e.kind === 'boss' ? 390 : 330) * dt; e.y += e.attack.y * (e.kind === 'boss' ? 390 : 330) * dt;
          if (e.timer <= 0) { e.mode = 'chase'; e.timer = e.kind === 'boss' ? 2.3 : 3; if (e.kind === 'boss') this.shoot(e, 9); }
        }
      } else {
        if (e.kind !== 'toy' || dist > 265) { e.x += d.x * e.speed * diff.speed * dt; e.y += d.y * e.speed * diff.speed * dt; }
        if ((e.kind === 'car' || e.kind === 'boss') && e.timer <= 0 && dist < 600) { e.mode = 'warning'; e.attack = d; e.timer = (e.kind === 'boss' ? 1.2 : 0.9) * diff.warning; }
        if (e.kind === 'toy' && e.timer <= 0 && dist < 570) { this.shoot(e, 1); e.timer = 2.5 * diff.warning; }
      }
      e.x = clamp(e.x, e.r, WORLD.width - e.r); e.y = clamp(e.y, e.r, WORLD.height - e.r);
      if (distance(p, e) < 19 + e.r) this.hurt(e.kind === 'boss' ? 22 : e.kind === 'car' ? 15 : 10);
      if (this.state !== 'playing') return;
    }
  }
  shoot(enemy, count) {
    const a = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
    for (let i = 0; i < count; i++) {
      if (this.projectiles.length >= 160) break;
      const angle = a + (i - (count - 1) / 2) * 0.22;
      this.projectiles.push({ x: enemy.x, y: enemy.y, vx: Math.cos(angle) * 185, vy: Math.sin(angle) * 185, r: 8, damage: enemy.kind === 'boss' ? 15 : 10, life: 4.5 });
    }
  }
}
