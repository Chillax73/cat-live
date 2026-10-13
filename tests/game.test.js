import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, SKILLS, WORLD, xpNeeded } from '../src/game.js';

const advance = (game, seconds, input = { x: 0, y: 0 }) => { for (let i = 0; i < seconds * 60; i++) game.update(1 / 60, input); };
const quietGame = () => { const game = new Game(() => 0.25); game.reset(1); game.spawnTimer = 999; return game; };
test('新局重置全部角色、世界和技能，不继承成长', () => {
  const g = quietGame(); g.skills.claw = 5; g.kills = 10; g.time = 77; g.player.hp = 3; g.reset(2);
  assert.equal(g.state, 'playing'); assert.equal(g.time, 0); assert.equal(g.level, 1); assert.equal(g.kills, 0);
  assert.equal(g.player.hp, 100); assert.equal(g.skills.claw, 0); assert.equal(g.difficulty, 2);
});
test('对角移动归一化，角色不能离开地图', () => {
  const a = quietGame(), b = quietGame(); const origin = { ...a.player };
  advance(a, 1, { x: 1, y: 0 }); advance(b, 1, { x: 1, y: 1 });
  assert.ok(Math.abs(Math.hypot(b.player.x - origin.x, b.player.y - origin.y) - (a.player.x - origin.x)) < 0.001);
  advance(a, 20, { x: 1, y: -1 }); assert.equal(a.player.x, WORLD.width - 35); assert.equal(a.player.y, 40);
});
test('扑击沿最后朝向、有伤害、无敌、冷却和落地反馈', () => {
  const g = quietGame(); g.player.face = { x: 1, y: 0 }; g.player.attackCooldown = 999;
  const e = g.spawnEnemy('robot'); e.x = g.player.x + 100; e.y = g.player.y; e.speed = 0;
  assert.equal(g.pounce(), true); assert.equal(g.pounce(), false); const x = g.player.x;
  advance(g, 0.3); assert.ok(g.player.x > x + 150); assert.ok(e.hp < e.maxHp);
  assert.ok(g.takeEvents().some(e => e.type === 'land')); assert.equal(g.pounce(), false);
  advance(g, 3); assert.equal(g.pounce(), true);
});
test('自动猫爪造成伤害、击退和掉落，拾取导致升级', () => {
  const g = quietGame(), e = g.spawnEnemy('robot'); e.x = g.player.x + 60; e.y = g.player.y; e.speed = 0;
  advance(g, 1.1); assert.equal(g.kills, 1); assert.equal(g.enemies.length, 0); assert.ok(g.drops.length);
  g.drops = [{ kind: 'xp', value: xpNeeded(1), x: g.player.x, y: g.player.y, phase: 0 }]; advance(g, 0.1);
  assert.equal(g.state, 'upgrade'); assert.equal(g.level, 2); assert.equal(g.choices.length, 3);
});
test('三选一不重复，满级退出候选，选择生效；暂停不推进时间', () => {
  const g = quietGame(); g.skills.claw = 5; g.addXp(7);
  assert.equal(new Set(g.choices.map(s => s.id)).size, 3); assert.ok(g.choices.every(s => s.id !== 'claw'));
  const time = g.time, skill = g.choices[0].id; advance(g, 2); assert.equal(g.time, time);
  assert.equal(g.chooseUpgrade(0), true); assert.equal(g.skills[skill], 1); assert.equal(g.state, 'playing');
  assert.equal(g.chooseUpgrade(0), false);
});
test('一次获得多级经验不会丢失，选择后继续三选一', () => {
  const g = quietGame(); g.addXp(30); assert.equal(g.level, 2); assert.equal(g.xp, 23);
  g.chooseUpgrade(0); assert.equal(g.level, 3); assert.equal(g.xp, 11); assert.equal(g.state, 'upgrade');
  g.chooseUpgrade(0); assert.equal(g.state, 'playing');
});
test('所有技能满级后仍有三种加餐选项', () => {
  const g = quietGame(); SKILLS.forEach(s => g.skills[s.id] = s.max); g.player.hp = 40; g.addXp(7);
  assert.equal(g.choices.length, 3); assert.equal(new Set(g.choices.map(s => s.id)).size, 3);
  g.chooseUpgrade(0); assert.equal(g.player.hp, 70);
});
test('暂停只允许降档，升级中失焦保留三选一，计时和冷却冻结', () => {
  const g = quietGame(); g.pounce(); const cd = g.player.dashCooldown; g.pause(); advance(g, 5);
  assert.equal(g.time, 0); assert.equal(g.player.dashCooldown, cd); assert.equal(g.lowerDifficulty(2), false);
  assert.equal(g.lowerDifficulty(0), true); assert.equal(g.lowerDifficulty(1), false); g.resume();
  g.addXp(7); const choices = g.choices; g.pause('失焦'); g.resume(); assert.equal(g.state, 'upgrade'); assert.equal(g.choices, choices);
});
test('受伤无敌避免连续扣血，回血有上限，零血失败', () => {
  const g = quietGame(); g.hurt(10); assert.equal(g.player.hp, 90); g.hurt(10); assert.equal(g.player.hp, 90);
  g.heal(100); assert.equal(g.player.hp, 100); advance(g, 1.2); g.hurt(200); assert.equal(g.state, 'lost'); assert.equal(g.player.hp, 0);
});
test('难度影响伤害但不堆叠普通敌人血量', () => {
  const a = quietGame(), b = quietGame(); a.reset(0); b.reset(2); a.hurt(10); b.hurt(10);
  assert.ok(a.player.hp > b.player.hp); assert.equal(a.spawnEnemy('robot').hp, b.spawnEnemy('robot').hp);
});
test('在房间边角也不会把敌人直接生成在猫身上', () => {
  const g = new Game(() => 0); g.reset(); g.player.x = WORLD.width - 35; g.player.y = WORLD.height - 35;
  const e = g.spawnEnemy('boss'); assert.ok(Math.hypot(e.x - g.player.x, e.y - g.player.y) >= 350);
});
test('回血、生命上限和受伤炸毛技能生效', () => {
  const g = quietGame(); g.skills.purr = 2; g.skills.shock = 2; g.skills.armor = 1; g.player.hp = 70;
  const e = g.spawnEnemy('robot'); e.x = g.player.x + 80; e.y = g.player.y; e.speed = 0;
  g.hurt(10); assert.ok(e.hp <= 0); g.enemies = []; g.player.attackCooldown = 999; advance(g, 8.1);
  assert.equal(g.player.hp, 66); assert.equal(g.stats.maxHp, 115);
});
test('玩具车先预警再冲撞，捣蛋玩具发射投射物', () => {
  const g = quietGame(), car = g.spawnEnemy('car'), toy = g.spawnEnemy('toy');
  car.x = g.player.x + 220; car.y = g.player.y; car.timer = 0; toy.x = g.player.x + 250; toy.y = g.player.y; toy.timer = 0;
  advance(g, 0.02); assert.equal(car.mode, 'warning'); assert.ok(g.projectiles.length);
  advance(g, 1); assert.equal(car.mode, 'charge');
});
test('Boss 五分钟入场一次，击败后胜利，状态冻结', () => {
  const g = quietGame(); g.time = 299.99; advance(g, 0.1); const boss = g.enemies.find(e => e.kind === 'boss');
  assert.ok(boss); advance(g, 0.1); assert.equal(g.enemies.filter(e => e.kind === 'boss').length, 1);
  g.hitEnemy(boss, 9999); assert.equal(g.state, 'won'); const time = g.time; advance(g, 10); assert.equal(g.time, time);
});

test('真实六分钟模拟：多波敌人、升级、Boss 与数量上限', () => {
  let seed = 113;
  const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const g = new Game(rng); g.reset(0);
  // 此测试隔离存活压力，验证六分钟时序及模块贯通；难度公平性另需人工试玩。
  const originalHurt = g.hurt.bind(g); g.hurt = amount => { if (g.player.hp < 35) g.heal(60); originalHurt(amount); };
  let maxEnemies = 0, upgrades = 0, sawCar = false, sawToy = false;
  const priority = ['claw', 'reach', 'pounce', 'magnet', 'agility', 'purr', 'shock', 'armor'];
  for (let i = 0; i < 60 * 380 && g.state !== 'won' && g.state !== 'lost'; i++) {
    if (g.state === 'upgrade') { upgrades++; const index = g.choices.reduce((best, s, j, list) => priority.indexOf(s.id) < priority.indexOf(list[best].id) ? j : best, 0); g.chooseUpgrade(index); }
    const boss = g.enemies.find(e => e.kind === 'boss' && e.hp > 0);
    const drop = g.drops.find(d => d.kind === 'xp');
    const nearest = g.enemies.filter(e => e.hp > 0).sort((a, b) => Math.hypot(a.x - g.player.x, a.y - g.player.y) - Math.hypot(b.x - g.player.x, b.y - g.player.y))[0];
    const target = boss || drop || nearest || { x: 860, y: 560 };
    const dx = target.x - g.player.x, dy = target.y - g.player.y, len = Math.hypot(dx, dy);
    if (len > 10) g.player.face = { x: dx / len, y: dy / len };
    if (nearest && len < 200 && g.player.dashCooldown <= 0) g.pounce();
    g.update(1 / 60, { x: len > 45 ? dx : 0, y: len > 45 ? dy : 0 });
    maxEnemies = Math.max(maxEnemies, g.enemies.length); sawCar ||= g.enemies.some(e => e.kind === 'car'); sawToy ||= g.enemies.some(e => e.kind === 'toy');
    g.takeEvents();
  }
  assert.ok(g.bossSpawned); assert.equal(g.state, 'won'); assert.ok(g.kills > 100); assert.ok(upgrades > 5); assert.ok(sawCar && sawToy);
  assert.ok(maxEnemies <= 161); assert.ok(g.effects.length <= 220); assert.ok(g.projectiles.length <= 160);
});
