import test from 'node:test';
import assert from 'node:assert/strict';
import { SaveStore } from '../src/storage.js';

const memory = value => ({ value, getItem() { return this.value; }, setItem(_, data) { this.value = data; } });
test('损坏和禁止访问的存储不影响默认配置', () => {
  for (const storage of [memory('{broken'), { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } }, undefined]) {
    const store = new SaveStore(storage); assert.equal(store.data.difficulty, 1); assert.doesNotThrow(() => store.save());
  }
});
test('持久化数据有类型、范围和成绩结构校验', () => {
  const store = new SaveStore(memory(JSON.stringify({ difficulty: 99, music: -3, effects: 3, best: [{ time: -1, kills: 3 }, { time: 50, kills: 30, won: true }] })));
  assert.equal(store.data.difficulty, 1); assert.equal(store.data.music, 0); assert.equal(store.data.effects, 1); assert.equal(store.data.best[0], null); assert.equal(store.data.best[1].won, true);
});
test('音量、难度和各档成绩保存，新局技能不写入存档', () => {
  const storage = memory(null), store = new SaveStore(storage); store.data.music = 0.42; store.data.difficulty = 2;
  store.record({ time: 200.9, kills: 89, difficulty: 0, state: 'lost' }); store.record({ time: 312, kills: 130, difficulty: 1, state: 'won' });
  const loaded = new SaveStore(storage); assert.equal(loaded.data.music, 0.42); assert.equal(loaded.data.difficulty, 2);
  assert.equal(loaded.data.best[0].time, 200); assert.equal(loaded.data.best[1].won, true); assert.equal(loaded.data.best[2], null);
  assert.equal('skills' in JSON.parse(storage.value), false);
});
test('胜利成绩优先，较差的新纪录不覆盖旧成绩', () => {
  const store = new SaveStore(memory(null)); store.record({ time: 310, kills: 120, difficulty: 1, state: 'won' });
  store.record({ time: 350, kills: 180, difficulty: 1, state: 'lost' }); assert.equal(store.data.best[1].kills, 120);
  store.record({ time: 330, kills: 140, difficulty: 1, state: 'won' }); assert.equal(store.data.best[1].kills, 140);
});
