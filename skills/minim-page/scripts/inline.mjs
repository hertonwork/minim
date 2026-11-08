#!/usr/bin/env node
// Inline minim into a page: replaces the `<script><!--minim--></script>` slot (or a previously inlined copy) with the
// chosen build from this skill's assets.   node inline.mjs page.html [--lite]
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [file, ...flags] = process.argv.slice(2);
if (!file) { console.error('usage: node inline.mjs page.html [--lite]'); process.exit(2); }
const build = flags.includes('--lite') ? 'minim-lite.min.js' : 'minim.min.js';
const dir = path.dirname(new URL(import.meta.url).pathname);
const js = (await readFile(path.join(dir, '..', 'assets', build), 'utf8')).trim();
if (js.includes('</script')) throw new Error(`${build} contains "</script" and cannot be inlined`);

let html = await readFile(file, 'utf8');
const marker = /<script>(?=<!--minim-->|"use strict";|\/\* ?[Mm]inim|var minim=|\(\(\)=>\{)[\s\S]*?<\/script>/;   // the slot, or an earlier inlined copy
if (!marker.test(html)) {
  console.error('no <script><!--minim--></script> slot (or earlier inlined minim) found; add the slot at the end of <body>');
  process.exit(1);
}
html = html.replace(marker, () => `<script>${js}</script>`);
await writeFile(file, html);
console.log(`${file}: inlined ${build} (${js.length} B)`);
