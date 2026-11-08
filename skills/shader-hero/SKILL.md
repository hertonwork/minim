---
name: shader-hero
description: >-
  Give a one-file web page a living hero background — a raymarched ocean, a slow flow field of ink in the accent
  color, lanes of traffic running to a horizon, or your own GLSL scene — without losing Lighthouse 100/100/100/100 or adding a request. A 2 KB WebGL harness
  (assets/hero.js) inlined into the page: starts after load when the browser is idle, runs on real GPUs only (software
  renderers such as PageSpeed's own Chrome keep the plain hero), adapts its resolution to the frame rate, pauses
  off-screen, draws a still frame under prefers-reduced-motion, and takes its colors from the page's CSS tokens so
  dark mode follows. Use this when a page wants the look of sites with a video or canvas background (ocean, waves,
  aurora, silk, smoke, marble, light trails, a grid floor) but must stay fast, build-free and score 100 on PageSpeed — on Minim/sscss pages or any
  HTML page. Not for interactive 3D, games or anything that needs a library.
---

# Shader hero

Sites like earendil.com (a raymarched ocean) and lefos.com (a looping video of leaf shadows) owe their atmosphere to
a full-screen background that moves. They pay for it with a 100 KB script or a 130 KB video, web fonts and a
framework, and a PageSpeed score to match. This skill gets the same kind of hero into a page that stays at
**100/100/100/100 with one request**: a fragment shader of a few hundred bytes, a 2 KB harness that knows when *not*
to run, and colors from the page's own tokens.

The three scenes that ship here were built for the Minim, sscss and server pages and tuned there:
`assets/scenes/ocean.js` (a raymarched sea), `assets/scenes/flow.js` (domain-warped ink) and
`assets/scenes/traffic.js` (a floor of lanes with requests and responses moving along them). They are the working
references for writing your own.

## How it keeps the score (read this before changing the harness)

Lighthouse and PageSpeed Insights run a headless Chrome **without a GPU**. WebGL there is SwiftShader: the fragment
shader executes on the CPU, inside the renderer, and a raymarcher at even a quarter resolution shows up as 6–24 s
of Total Blocking Time — we measured it, perf dropped to 70. Real visitors with a GPU would never notice. So the
harness treats "no GPU" as "no shader", which is also the honest experience for the few real visitors on software
rendering (remote desktops, old VMs): they get the plain hero, not a slideshow. Everything else follows from that:

| What | Why |
|---|---|
| `addEventListener('load', …)` + `requestIdleCallback` | first paint, LCP and CLS are measured before any shader compiles |
| `WEBGL_debug_renderer_info` matches `swiftshader\|llvmpipe\|softpipe\|software` → return | the software-renderer guard; this is what keeps Lighthouse at 100 |
| `navigator.connection.saveData` → return | the visitor asked for less |
| first frame timed with `gl.finish()` once; > 40 ms → remove the canvas | a weak GPU bows out before the canvas has even faded in |
| frame times sampled for 90 frames; > 19 ms on 8 of 30 → `scale *= 0.7` (floor 0.2) | adaptive resolution: steady 60 fps beats stuttering at full size |
| `IntersectionObserver` + `visibilitychange` | no frames when the hero is off-screen or the tab is hidden |
| `prefers-reduced-motion: reduce` → one frame | the scene is a still picture for those who asked for stillness |
| `location.hash === scene.hash` skips the guards | screenshots and curiosity; never the default |
| canvas starts at `opacity: 0`, gets `.on` after the first good frame | the page is complete without it; the scene fades in over 1.4 s |

Never remove the software-renderer guard to "make the demo show up in the screenshot tool" — use the hash.

## Put a scene on a page

1. **Markup.** The hero is a positioned, clipped section; the canvas comes first; the content after it is positioned
   so it paints above (with sscss: `rel oh` on the section, `rel` on the content):

   ```html
   <section class="rel oh hero">
     <canvas class="sea" aria-hidden="true"></canvas>
     <div class="wrap mx rel"> … headline, actions, panel … </div>
   </section>
   ```

2. **CSS**, in the page's own `<style>`. The ocean is a band at the bottom (the horizon sits near the top of the
   canvas), faded in at the top so text above it stays clean; the flow field covers the whole hero and fades itself
   on the headline side inside the shader:

   ```css
   /* ocean */
   :root { --sea: #0b6e99 } @media (prefers-color-scheme: dark) { :root { --sea: #2b8fbf } }
   .hero { padding-bottom: clamp(200px, 24vw, 320px) }
   .sea { position: absolute; inset: auto 0 0 0; width: 100%; height: min(52%, 420px); pointer-events: none; opacity: 0; transition: opacity 1.4s;
          -webkit-mask-image: linear-gradient(transparent, #000 34%); mask-image: linear-gradient(transparent, #000 34%) }
   .sea.on { opacity: 1 }
   /* flow field */
   .flow { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; opacity: 0; transition: opacity 1.6s }
   .flow.on { opacity: 1 }
   /* traffic: a band like the ocean, its height the padding plus a little, so the horizon (16% from the band's top)
      lands just below the content at every width */
   .hero { padding-bottom: clamp(200px, 24vw, 320px) }
   .traffic { position: absolute; inset: auto 0 0 0; width: 100%; height: clamp(236px, 28vw, 372px); pointer-events: none; opacity: 0; transition: opacity 1.4s;
              -webkit-mask-image: linear-gradient(transparent, #000 30%); mask-image: linear-gradient(transparent, #000 30%) }
   .traffic.on { opacity: 1 }
   ```

3. **The slot**, at the end of `<body>`, after any other inline script: `<script><!--shader--></script>`.

4. **Inline it:**

   ```sh
   node <skill>/scripts/inline.mjs page.html --scene ocean     # or flow, traffic, or ./my-scene.js
   ```

   Minifies with esbuild when it is installed (2.2 KB gzipped for the ocean, 2.0 KB for the flow), inlines readable
   source otherwise. Re-run after editing the scene; it replaces its earlier copy. From a build script:
   `import { assemble } from '<skill>/scripts/inline.mjs'` and put `await assemble('ocean')` into the page.

5. **Check.** Run the minim-page checker's Lighthouse pass (`check.mjs page.html --lighthouse`): expect 100s, and
   **requests 1** — a scene must not load anything. Then open the page with `#ocean` (or the scene's hash) in a
   browser that has a GPU and look at it in both color schemes; the shader is off in headless screenshots without
   the hash.

## Write a scene

A scene is a file with one object literal (no `export`): the canvas selector, the force hash, the fragment shader
body, and a `theme` function that turns tokens into uniforms.

```js
({
  selector: 'canvas.aurora',
  hash: '#aurora',
  frag: `uniform vec3 a,b;        // your uniforms; `r` (resolution) and `t` (seconds) are provided
void main(){ vec2 uv=(gl_FragCoord.xy-.5*r)/r.y; … gl_FragColor=vec4(col*alpha,alpha); }`,
  theme(token, dark, set) {        // token('--acc') → [r,g,b] in 0–1; set(name, [r,g,b] | number)
    set('a', token('--acc')); set('b', dark ? token('--ink') : token('--bg'));
  },
  scale: 0.5,                      // starting resolution as a fraction of CSS pixels (default 0.5)
})
```

Rules that made the three scenes work:

- **Premultiplied alpha.** The canvas is transparent over the page; output `vec4(col * a, a)`. A scene that covers
  text must fade itself where the text is (the flow field multiplies by `smoothstep` ramps on `uv`).
- **Budget per pixel.** Count `sin`/`noise` evaluations: the ocean marches 16 steps × 3 octaves × 2 trains and shades
  with 4 octaves × 3 normal taps; the flow field is 4 octaves × 5 fbm calls. Beyond that, mid-range phones drop to
  the lowest resolution step and it starts to look soft.
- **Slow is premium.** Camera at `t * .2`, waves at `t * .5`, ink at `t * .02–.05`. The first ocean moved at 2.5×
  these speeds and read as frantic.
- **No lattice.** Octaves of pure sine aligned to a grid show a net near the camera; rotate the plane each octave
  (`mat2(1.6,1.2,-1.2,1.6)`), add a second train at an odd frequency ratio (1.37), warp the domain once.
- **Colors from tokens, never literals.** Light mode wants the background as the "sky"/haze; dark mode wants the
  background mixed with the accent so the surface is visible at all (the ocean's night sky is `bg * .62 + sea * .38`).
- **Contrast.** Text that sits on the canvas is audited by Lighthouse against the canvas's *CSS* background (none),
  so it passes; keep it honest by masking the canvas away from running text anyway.
- **Thin lines need the full gradient.** Without derivatives (WebGL 1, no extension), compute how far one screen pixel
  moves your line coordinate in *both* directions and measure distance in pixels: the traffic scene's side lanes run
  almost flat on screen, and an x-only footprint broke them into dotted lines with rings near the horizon. Fade lines
  out where they come closer than a few pixels instead of letting them alias.
- GLSL ES 1.0: constant loop bounds, `mediump`, no `switch`, no dynamic array indexing.

## Pitfalls we hit

- **Perf 70, TBT 24 s** — the shader ran under SwiftShader in Lighthouse. The renderer guard fixed it; the score is
  the page those visitors get.
- **Two probe frames with `gl.finish()`** made the start hitch. One probe, before the canvas is shown.
- **`powerPreference: 'low-power'`** picked the integrated GPU on dual-GPU laptops and stuttered. Let the browser choose.
- **A CSS wave under the canvas** (so the hero wasn't empty before the shader) looked like a glitch at the swap even
  with a crossfade. The hero is plain until the scene fades in.
- **A green ocean** reads as hills. Water gets its own token (`--sea`); the accent stays for the page.
- **Leaf shadows as blurred SVG masks** (an attempt at lefos.com's video) read as clip-art. A video's softness needs
  a shader (noise) or the video; we dropped it.
- The **canvas is a data-less element**: Lighthouse lists no request for it, but a `mask-image` data URI does show up
  as a network record (free, but it is a line in the report). Masks belong in CSS gradients where possible.
