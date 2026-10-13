import { mkdir, cp, readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
for (const file of ['src/game.js', 'src/main.js', 'src/render.js', 'src/storage.js', 'src/audio.js']) {
  const result = spawnSync(process.execPath, ['--check', resolve(root, file)], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
}
await readFile(resolve(root, 'index.html'));
await rm(resolve(root, 'dist'), { recursive: true, force: true });
await mkdir(resolve(root, 'dist'), { recursive: true });
for (const file of ['index.html', 'styles.css', 'favicon.svg', 'src']) await cp(resolve(root, file), resolve(root, 'dist', file), { recursive: true });
console.log('构建完成：dist/ · 无第三方运行时依赖');
