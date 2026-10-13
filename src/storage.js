const KEY = 'cat-survivors-v1';
const defaults = () => ({ difficulty: 1, music: 0.25, effects: 0.55, best: [null, null, null] });
export class SaveStore {
  constructor(storage) {
    this.storage = storage; this.data = defaults();
    try {
      const value = JSON.parse(storage?.getItem(KEY) ?? 'null');
      if (!value || typeof value !== 'object') return;
      if (Number.isInteger(value.difficulty) && value.difficulty >= 0 && value.difficulty <= 2) this.data.difficulty = value.difficulty;
      for (const key of ['music', 'effects']) if (Number.isFinite(value[key])) this.data[key] = Math.min(1, Math.max(0, value[key]));
      if (Array.isArray(value.best)) this.data.best = this.data.best.map((_, i) => {
        const b = value.best[i];
        return b && Number.isFinite(b.time) && b.time >= 0 && Number.isFinite(b.kills) && b.kills >= 0 ? { time: b.time, kills: b.kills, won: b.won === true } : null;
      });
    } catch { /* 浏览器存储不可用时使用内存默认值。 */ }
  }
  save() { try { this.storage?.setItem(KEY, JSON.stringify(this.data)); } catch { /* 游玩不依赖持久化成功。 */ } }
  record(game) {
    const record = { time: Math.floor(game.time), kills: game.kills, won: game.state === 'won' }, i = game.difficulty;
    const old = this.data.best[i];
    if (!old || (record.won && !old.won) || (record.won === old.won && (record.kills > old.kills || (record.kills === old.kills && record.time > old.time)))) this.data.best[i] = record;
    this.save();
  }
}
