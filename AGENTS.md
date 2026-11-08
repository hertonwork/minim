# Working in this repository (for agents and people)

Minim is a tiny reactive library for server-rendered HTML. Two builds, one page, one skill.

## Layout

| Path | What | Edit? |
|---|---|---|
| `src/index.ts` | the library (module build): core, bindings, commands, boot | yes |
| `lite/minim.js` | the paste-in build, golfed by hand to stay ≈1.2 KB gzipped | yes, measure after (`npm run size`) |
| `dist/` | built output of `src/` (`index.js`, `index.d.ts`, `minim.min.js`) | no — `npm run build` |
| `lite/minim.min.js`, `lite/README.md`, `lite/example.html` | built from `lite/minim.js`, `lite/README.template.md`, `lite/example.template.html` | no — `npm run build` |
| `docs/index.template.html` | the GitHub Pages demo, styled with [sscss](https://github.com/hertonwork/sscss) utilities; `index.html` is built from it with the page's generated sscss CSS, Minim and the size chart inlined | yes (never `index.html` directly) |
| `docs/size-chart.mjs` | the size chart + wordmark SVGs; edit the numbers there and rerun | yes |
| `skills/shader-hero/` | the agent skill for GPU hero backgrounds: `assets/hero.js` (the harness: after-load start, GPU-only guard, adaptive resolution, reduced motion, tokens) + `assets/scenes/{ocean,flow,traffic}.js` (ocean: this page; flow: sscss; traffic: server); `docs/build-page.mjs` assembles the ocean from it | yes |
| `skills/minim-page/` | the agent skill for building pages this way; `assets/*.min.js`, `scripts/sscss.mjs` and `references/sscss.md` are copied from the builds and from the sscss package | yes (SKILL.md, design/minim references, check.mjs, inline.mjs, starter); copied files via `npm run build:skill` |
| `test/` | `index.test.mjs` (node:test, core) and `dom.test.mjs` (Playwright, the demo page under a strict CSP) | yes |

## Commands

```sh
npm install
npm test               # tsc + esbuild → dist/, lite outputs, index.html, skill assets; then the core tests
npm run test:browser   # Playwright checks on index.html (npm i -D playwright first)
npm run test:lite      # the lite build's core tests; npm run test:lite:browser for its page
npm run check:page     # the skill's preflight checker on the built demo page
npm run size           # current lite size (min / gzip / brotli)
```

## Rules that keep this project what it is

- **Attributes name keys, never expressions.** Nothing is `eval`'d; that is why Minim runs under a strict CSP. Do not add an expression language.
- **The lite build is a size claim.** Every byte added there must earn its place; measure with `npm run size` and keep the README's numbers true. New capabilities go in the module build first.
- **The demo page is one file with one request.** It is built from the template with Minim inlined, scores Lighthouse 100/100/100/100, and must keep doing so. Pre-render initial values, no external scripts/styles/fonts, transform-only entrance motion. The ocean shader starts after load on real GPUs only; Lighthouse's GPU-less Chrome measures the page without it, which is the page those visitors get. No shader may run on a software renderer.
- **The demo page's CSS is sscss.** Layout, spacing, color and motion are sscss classes (`f ac g4`, `r2 bs p6`, `an-fx`, `an-in`, `an-grow`…); `docs/build-page.mjs` generates exactly the rules used into `<style data-sscss>` and fails on a class that is neither in the vocabulary nor styled by the page's own `<style>`. Page-own rules stay in that `<style>` and stay short. The generator is the one-file bundle vendored at `skills/minim-page/scripts/sscss.mjs` (cheat sheet: `node skills/minim-page/scripts/sscss.mjs --list`); `npm run sync:sscss` refreshes it from the npm package.
- **Measure the same way for everyone.** Size numbers in the README come from the latest npm source of each library, terser, `gzip -9` / brotli 11. Update the chart (`node docs/size-chart.mjs`) when they change.
- **Tests run on the built output** (`dist/`, `index.html`), so run `npm run build` before judging a change.
- Commits are plain; PRs explain what changed and why in the body.

## Building a page with Minim

Use the skill in `skills/minim-page/` (`npx skills add hertonwork/minim`, or read `skills/minim-page/SKILL.md`). It
carries both builds, a starter page styled with sscss, the sscss generator and cheat sheet, an inliner and a preflight
checker, and the rules that got the demo to 100.
