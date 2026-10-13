import { Game, DIFFICULTIES, SKILLS, xpNeeded } from './game.js';
import { Renderer } from './render.js';
import { GameAudio } from './audio.js';
import { SaveStore } from './storage.js';

const $ = id => document.getElementById(id);
let browserStorage;
try { browserStorage = window.localStorage; } catch { /* 禁止存储时保持可玩。 */ }
const store = new SaveStore(browserStorage), game = new Game(), renderer = new Renderer($('game-canvas')), audio = new GameAudio();
const keys = new Set(), dialog = $('game-dialog');
let lastState = '', lastHud = 0, accumulator = 0, lastTime = 0, pounceQueued = false, lastSkills = '', upgradeSignature = '';
const formatTime = value => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
audio.setVolumes(store.data.music, store.data.effects);

function updateSelectedDifficulty() {
  document.querySelectorAll('[data-difficulty]').forEach(button => {
    const selected = Number(button.dataset.difficulty) === store.data.difficulty;
    button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
  });
  const best = store.data.best[store.data.difficulty];
  $('best-record').textContent = best ? `${DIFFICULTIES[store.data.difficulty].name}最佳 · ${best.won ? '已守住客厅' : formatTime(best.time)} · 击败 ${best.kills}` : '第一口鱼干，等你来吃。';
}
function syncVolumes() {
  for (const prefix of ['settings', 'pause']) for (const name of ['music', 'effects']) {
    $(`${prefix}-${name}`).value = Math.round(store.data[name] * 100);
    $(`${prefix}-${name}-value`).textContent = `${Math.round(store.data[name] * 100)}%`;
  }
  audio.setVolumes(store.data.music, store.data.effects);
}
function clearInput() { keys.clear(); pounceQueued = false; accumulator = 0; }
function start(difficulty = store.data.difficulty) {
  clearInput(); game.reset(difficulty); lastSkills = ''; upgradeSignature = ''; lastState = '';
  if (dialog.open) dialog.close(); if ($('settings-dialog').open) $('settings-dialog').close();
  audio.unlock().then(() => audio.setPlaying(game.state === 'playing')); syncState();
  $('game-canvas').tabIndex = -1; $('game-canvas').focus({ preventScroll: true });
}
function menu() { clearInput(); game.state = 'ready'; audio.setPlaying(false); updateSelectedDifficulty(); syncState(); $('start-button').focus({ preventScroll: true }); }
function pause(reason) { clearInput(); game.pause(reason); syncState(); }
function resume() { clearInput(); game.resume(); audio.unlock().then(() => audio.setPlaying(game.state === 'playing')); syncState(); if (game.state === 'playing') $('game-canvas').focus({ preventScroll: true }); }

function renderChoices() {
  $('upgrade-description').textContent = `Lv. ${game.level} · 挑一个，这次想怎么撒野？`;
  $('upgrade-options').replaceChildren(...game.choices.map((skill, index) => {
    const button = document.createElement('button'); button.className = 'upgrade-option';
    const level = skill.id.startsWith('snack') ? '加餐奖励' : `下一级 Lv. ${game.skills[skill.id] + 1}`;
    // 所有内容来自本地固定技能定义，不使用外部输入。
    button.innerHTML = `<span class="choice-key">${index + 1}</span><span class="skill-icon" aria-hidden="true">${skill.icon}</span><small>${skill.subtitle} · ${level}</small><strong>${skill.name}</strong><span class="skill-text">${skill.text}</span><span class="skill-detail">${skill.detail}</span>`;
    button.addEventListener('click', () => choose(index)); return button;
  }));
}
function choose(index) {
  if (!game.chooseUpgrade(index)) return;
  clearInput(); upgradeSignature = ''; syncState();
  if (game.state === 'playing') $('game-canvas').focus({ preventScroll: true });
}
function syncState() {
  const state = game.state, changed = state !== lastState;
  const ready = state === 'ready';
  $('stage').classList.toggle('ready', ready); $('intro').hidden = !ready; $('art-caption').hidden = !ready;
  $('hud').hidden = ready; $('combat-footer').hidden = ready; $('pause-button').hidden = ready || state === 'won' || state === 'lost';
  audio.setPlaying(state === 'playing');
  for (const name of ['upgrade', 'pause', 'end']) $(`${name}-panel`).hidden = true;
  if (state === 'upgrade') {
    $('upgrade-panel').hidden = false;
    const signature = `${game.level}:${game.choices.map(s => s.id).join(',')}`;
    if (signature !== upgradeSignature) { renderChoices(); upgradeSignature = signature; }
  } else if (state === 'paused') {
    $('pause-panel').hidden = false;
    $('pause-reason').textContent = game.pauseReason || '准备好了，随时继续。';
    const select = $('pause-difficulty'); select.replaceChildren(...DIFFICULTIES.map((d, i) => {
      const option = document.createElement('option'); option.value = i; option.textContent = d.name; option.disabled = i > game.difficulty; return option;
    })); select.value = game.difficulty; syncVolumes();
  } else if (state === 'won' || state === 'lost') {
    $('end-panel').hidden = false;
    if (changed) store.record(game);
    const won = state === 'won';
    $('end-eyebrow').textContent = won ? '舔舔爪子，深藏功与名。' : '趴一会儿，再来过。';
    $('end-title').textContent = won ? '客厅，还是我的。' : '猫咪今天尽力了';
    $('end-copy').textContent = won ? '吸尘器退场，舒服日子回来了。' : '下次换个本领，再给它们一点颜色。';
    $('end-time').textContent = formatTime(game.time); $('end-kills').textContent = game.kills; $('end-level').textContent = game.level;
    $('end-difficulty').textContent = `本局难度 · ${DIFFICULTIES[game.difficulty].name}${game.difficulty < game.initialDifficulty ? '（已降档）' : ''}`;
    const picked = SKILLS.filter(s => game.skills[s.id] > 0);
    $('end-skills').textContent = picked.length ? picked.map(s => `${s.name} ${game.skills[s.id]}级`).join(' · ') : '这次靠的是天生猫爪。';
  }
  if (['upgrade', 'paused', 'won', 'lost'].includes(state)) {
    if (!dialog.open) dialog.showModal();
    if (changed || (state === 'upgrade' && document.activeElement?.className !== 'upgrade-option')) {
      const target = state === 'upgrade' ? $('upgrade-options').firstElementChild : state === 'paused' ? $('resume-button') : $('restart-button'); target?.focus({ preventScroll: true });
    }
  } else if (dialog.open) dialog.close();
  lastState = state; updateHud();
}
function updateHud() {
  if (game.state === 'ready') return;
  const p = game.player, st = game.stats;
  $('timer').textContent = formatTime(game.time); $('wave-text').textContent = `${game.bossSpawned ? '赶走吸尘器' : '守住客厅'} · ${DIFFICULTIES[game.difficulty].name}`;
  $('level-text').textContent = `Lv. ${game.level}`; $('health-text').textContent = `${Math.ceil(p.hp)} / ${st.maxHp}`;
  $('health-fill').style.width = `${p.hp / st.maxHp * 100}%`; $('health-fill').classList.toggle('low', p.hp / st.maxHp < 0.3);
  const meter = $('health-fill').parentElement; meter.setAttribute('aria-valuenow', Math.ceil(p.hp)); meter.setAttribute('aria-valuemax', st.maxHp);
  $('xp-fill').style.width = `${Math.min(1, game.xp / xpNeeded(game.level)) * 100}%`; $('xp-text').textContent = `小鱼干 ${game.xp} / ${xpNeeded(game.level)}`;
  $('kills-text').textContent = game.kills;
  $('pounce-text').textContent = p.dashCooldown <= 0 ? '飞扑就绪' : `${p.dashCooldown.toFixed(1)} 秒后再扑`;
  $('pounce-fill').style.width = `${(1 - p.dashCooldown / st.dashInterval) * 100}%`;
  const boss = game.enemies.find(e => e.kind === 'boss' && e.hp > 0);
  $('boss-hud').hidden = !boss; if (boss) $('boss-fill').style.width = `${boss.hp / boss.maxHp * 100}%`;
  $('game-message').hidden = game.messageTimer <= 0 || game.state !== 'playing'; $('game-message').textContent = game.message;
  const signature = JSON.stringify(game.skills);
  if (signature !== lastSkills) {
    lastSkills = signature;
    const picked = SKILLS.filter(s => game.skills[s.id] > 0);
    if (!picked.length) $('skill-strip').innerHTML = '<span class="empty-skills">吃鱼干，解锁猫咪本领</span>';
    else $('skill-strip').replaceChildren(...picked.map(s => {
      const badge = document.createElement('span'); badge.className = 'skill-badge'; badge.title = `${s.name} · Lv. ${game.skills[s.id]}`;
      badge.setAttribute('aria-label', badge.title); badge.innerHTML = `<strong>${s.icon}</strong><small>${game.skills[s.id]}</small>`; return badge;
    }));
  }
}

document.querySelectorAll('[data-difficulty]').forEach(button => button.addEventListener('click', () => {
  store.data.difficulty = Number(button.dataset.difficulty); store.save(); updateSelectedDifficulty();
}));
$('start-button').addEventListener('click', () => start());
$('restart-button').addEventListener('click', () => start(game.difficulty));
$('resume-button').addEventListener('click', resume);
$('pause-button').addEventListener('click', () => game.state === 'paused' ? resume() : pause());
$('quit-button').addEventListener('click', menu); $('menu-button').addEventListener('click', menu);
$('pause-difficulty').addEventListener('change', event => { game.lowerDifficulty(Number(event.target.value)); syncState(); });
$('settings-button').addEventListener('click', () => {
  audio.unlock();
  if (game.state === 'ready') { syncVolumes(); $('settings-dialog').showModal(); } else if (['playing', 'upgrade'].includes(game.state)) pause();
});
$('settings-close').addEventListener('click', () => $('settings-dialog').close());
$('mute-button').addEventListener('click', () => { store.data.music = 0; store.data.effects = 0; store.save(); syncVolumes(); });
for (const prefix of ['settings', 'pause']) for (const name of ['music', 'effects']) $(`${prefix}-${name}`).addEventListener('input', event => {
  store.data[name] = Number(event.target.value) / 100; store.save(); syncVolumes(); audio.unlock(); if (name === 'effects') audio.play('pickup');
});
dialog.addEventListener('cancel', event => { event.preventDefault(); if (game.state === 'paused') resume(); else if (game.state === 'upgrade') pause(); });

window.addEventListener('keydown', event => {
  if ($('settings-dialog').open) return;
  if (event.code === 'Escape') {
    if (['playing', 'upgrade', 'paused'].includes(game.state)) { event.preventDefault(); if (!event.repeat) game.state === 'paused' ? resume() : pause(); }
    return;
  }
  if (game.state === 'upgrade' && ['Digit1', 'Digit2', 'Digit3', 'Numpad1', 'Numpad2', 'Numpad3'].includes(event.code)) { event.preventDefault(); if (!event.repeat) choose(Number(event.code.at(-1)) - 1); return; }
  if (game.state !== 'playing') return;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
    event.preventDefault(); keys.add(event.code);
    if (event.code === 'Space' && !event.repeat) pounceQueued = true;
  }
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => pause('刚刚离开了窗口，猫咪在等你回来。'));
document.addEventListener('visibilitychange', () => { if (document.hidden) pause('切换了标签页，战斗已自动暂停。'); });
new ResizeObserver(() => renderer.resize()).observe($('stage'));

function frame(timestamp) {
  const delta = lastTime ? Math.min(0.1, (timestamp - lastTime) / 1000) : 0; lastTime = timestamp;
  if (game.state === 'playing') {
    accumulator += delta;
    while (accumulator >= 1 / 60 && game.state === 'playing') {
      const x = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
      const y = Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp'));
      if (pounceQueued) { if (x || y) { const len = Math.hypot(x, y); game.player.face = { x: x / len, y: y / len }; } game.pounce(); pounceQueued = false; }
      game.update(1 / 60, { x, y }); accumulator -= 1 / 60;
    }
  } else accumulator = 0;
  for (const event of game.takeEvents()) audio.play(event.type);
  if (game.state !== lastState || (game.state === 'upgrade' && upgradeSignature !== `${game.level}:${game.choices.map(s => s.id).join(',')}`)) syncState();
  if (timestamp - lastHud > 90) { updateHud(); lastHud = timestamp; }
  renderer.draw(game, timestamp / 1000, game.state === 'ready'); requestAnimationFrame(frame);
}
updateSelectedDifficulty(); syncVolumes(); syncState(); requestAnimationFrame(frame);
