import { cp, mkdir, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const path of ['index.html', 'src', 'assets', 'data', 'admin', '_headers', '404.html']) {
  await cp(path, `dist/${path}`, { recursive: true });
}
console.log('Built static website → dist/');
