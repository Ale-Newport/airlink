// Builds the live demo into demo/dist: the page, its stylesheet, the bundled
// protocol (unchanged @airlink/core), and the real media from docs/.
//
//   pnpm demo:build      then open demo/dist/index.html through any static server
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const out = join(here, 'dist');

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'media'), { recursive: true });

await build({
  entryPoints: [join(here, 'src', 'main.ts')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  minify: true,
  sourcemap: true,
  outfile: join(out, 'main.js'),
  logLevel: 'info',
});

cpSync(join(here, 'index.html'), join(out, 'index.html'));
cpSync(join(here, 'style.css'), join(out, 'style.css'));
for (const f of ['demo.mp4', 'demo-poster.jpg', 'social-preview.png']) {
  cpSync(join(root, 'docs', 'media', f), join(out, 'media', f));
}
// Pre-sized icon and screenshots live in demo/public, so the build needs no image tools.
cpSync(join(here, 'public'), out, { recursive: true });
console.log('demo built in', out);
