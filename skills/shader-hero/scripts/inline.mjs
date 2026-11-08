#!/usr/bin/env node
// Assemble the harness with a scene and inline it into a page.
//   node inline.mjs page.html --scene ocean          # or flow, traffic, or a path to your own scene file
//   node inline.mjs --scene ocean > hero.js          # just print the assembled script
// The page needs <script><!--shader--></script> (or an earlier inlined copy) at the end of <body>, and the scene's
// canvas in the hero. Minifies with esbuild when it is installed; inlines readable source otherwise.
// Also importable: `import { assemble } from '.../scripts/inline.mjs'` for a build script.
import { readFile, writeFile, access, realpath } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const dir = path.dirname(new URL(import.meta.url).pathname);

/** The harness with `scene` (a name from assets/scenes, or a path) inserted, minified when esbuild is around. */
export async function assemble(scene) {
  const scenePath = /[\\/.]/.test(scene) ? path.resolve(scene) : path.join(dir, '..', 'assets', 'scenes', scene + '.js');
  await access(scenePath).catch(() => { throw new Error(`no scene at ${scenePath}`); });
  const [harness, src] = await Promise.all([readFile(path.join(dir, '..', 'assets', 'hero.js'), 'utf8'), readFile(scenePath, 'utf8')]);
  let js = harness.replace('/*SCENE*/null', () => src.replace(/^\s*\/\/.*\n/gm, '').trim().replace(/;?\s*$/, ''));
  try { const { transform } = await import('esbuild'); js = (await transform(js, { minify: true, target: 'es2022' })).code.trim(); } catch { /* readable source is fine */ }
  if (js.includes('</script')) throw new Error('the assembled script contains "</script" and cannot be inlined');
  return js;
}

async function main(args) {
  const sceneArg = args[args.indexOf('--scene') + 1];
  const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--scene');
  if (args.indexOf('--scene') === -1 || !sceneArg) { console.error('usage: node inline.mjs [page.html] --scene ocean|flow|traffic|path/to/scene.js'); process.exit(2); }
  const js = await assemble(sceneArg);
  if (!file) { process.stdout.write(js + '\n'); return; }
  let html = await readFile(file, 'utf8');
  const slot = /<script>(?=<!--shader-->|const init=\(\)=>\{|\/\/ shader-hero)[\s\S]*?<\/script>/;
  if (!slot.test(html)) { console.error('no <script><!--shader--></script> slot (or earlier inlined shader) found; add the slot at the end of <body>'); process.exit(1); }
  html = html.replace(slot, () => `<script>${js}</script>`);
  await writeFile(file, html);
  console.error(`${file}: inlined the ${path.basename(sceneArg, '.js')} scene (${js.length} B)`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(await realpath(process.argv[1])).href) await main(process.argv.slice(2));
