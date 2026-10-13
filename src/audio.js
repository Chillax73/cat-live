export class GameAudio {
  constructor() { this.ctx = null; this.music = 0.25; this.effects = 0.55; this.playing = false; this.timer = null; this.step = 0; this.last = {}; }
  async unlock() {
    try {
      if (!this.ctx) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        this.ctx = new Audio(); this.musicGain = this.ctx.createGain(); this.effectsGain = this.ctx.createGain();
        this.musicGain.connect(this.ctx.destination); this.effectsGain.connect(this.ctx.destination); this.setVolumes(this.music, this.effects);
      }
      if (this.ctx.state === 'suspended') await this.ctx.resume();
    } catch { /* 音频不可用不影响游戏。 */ }
  }
  setVolumes(music, effects) {
    this.music = music; this.effects = effects;
    if (this.ctx) { this.musicGain.gain.value = music * 0.25; this.effectsGain.gain.value = effects * 0.22; }
  }
  tone(freq, duration, gain, bus, type = 'sine', endFreq = freq, delay = 0) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime + delay, osc = this.ctx.createOscillator(), env = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, now); osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    env.gain.setValueAtTime(0, now); env.gain.linearRampToValueAtTime(gain, now + 0.012); env.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(env); env.connect(bus === 'music' ? this.musicGain : this.effectsGain); osc.start(now); osc.stop(now + duration + 0.03);
    osc.onended = () => { osc.disconnect(); env.disconnect(); };
  }
  setPlaying(playing) {
    if (playing === this.playing) return;
    this.playing = playing;
    clearInterval(this.timer); this.timer = null;
    if (!playing || !this.ctx) return;
    const notes = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23, 261.63, 329.63, 440, 392, 293.66, 349.23, 392, 293.66];
    this.timer = setInterval(() => {
      if (!this.playing || this.music <= 0) return;
      this.tone(notes[this.step % notes.length], 0.22, 0.17, 'music', 'triangle');
      if (this.step % 4 === 0) this.tone(notes[this.step % notes.length] / 2, 0.5, 0.15, 'music');
      this.step++;
    }, 280);
  }
  play(type) {
    if (!this.ctx || this.effects <= 0) return;
    const now = this.ctx.currentTime;
    if (now - (this.last[type] ?? -100) < (type === 'pickup' ? 0.12 : type === 'kill' ? 0.08 : 0.035)) return;
    this.last[type] = now;
    if (type === 'claw') this.tone(220, 0.09, 0.32, 'effects', 'triangle', 85);
    if (type === 'kill') this.tone(130, 0.1, 0.25, 'effects', 'sine', 55);
    if (type === 'pounce') this.tone(130, 0.18, 0.25, 'effects', 'triangle', 650);
    if (type === 'land') this.tone(100, 0.18, 0.4, 'effects', 'triangle', 35);
    if (type === 'pickup') this.tone(790, 0.06, 0.14, 'effects', 'sine', 1060);
    if (type === 'hurt') { this.tone(590, 0.12, 0.3, 'effects', 'triangle', 850); this.tone(850, 0.19, 0.25, 'effects', 'triangle', 390, 0.1); }
    if (['upgrade', 'select', 'heal', 'end', 'boss'].includes(type)) [523, 659, 784].forEach((f, i) => this.tone(type === 'boss' ? f / 2 : f, 0.25, 0.2, 'effects', 'triangle', f, i * 0.09));
  }
}
