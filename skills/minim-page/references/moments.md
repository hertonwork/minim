# Moments: one orchestrated thing per page

A page gets one moment: a part that moves with intent and shows how the subject works. Everything else stays still
apart from `an-fx` feedback. These recipes come from aiformflow.com (Nov 2026): Blade + minim + sscss, one request per
page, Lighthouse 100. Each one keeps the rules in `design.md`:
- state flips an attribute or a class, and the stylesheet does the motion;
- motion is transform only, or a colour change that passes contrast at every frame;
- everything stops under `prefers-reduced-motion`;
- the page reads finished with the script off.

Class names here are page-own CSS. Check `node <skill>/scripts/sscss.mjs --list` before you name one: sscss owns
short names such as `wh`, `wl` and `wr` (grid ratios), and a page class with the same name changes every element that
uses either one.

## A picker that drives an example (radios + `data-bind`)

The visitor picks a case and a panel shows it: a sample request, a package, an open time. Use radios. They give
arrow keys, a checked state for screen readers, and no script needed for the choice itself. `data-model` on a radio
group stores the chosen `value`, coerced like `--set` (module build).

```html
<div data-bind="data-ex:ex" data-ex="1">
  <fieldset class="f fw g2"><legend class="t1 cm">Try a request</legend>
    <label class="pick"><input class="sr" type="radio" name="ex" value="1" data-model="ex" checked>No cooling</label>
    <label class="pick"><input class="sr" type="radio" name="ex" value="2" data-model="ex">Water heater leak</label>
  </fieldset>
  <div class="ex ex-1">…the first example, pre-rendered…</div>
  <div class="ex ex-2">…</div>
</div>
<script type="application/json" data-state="app" data-root="main">{"ex":1}</script>
```

```css
.sr { position: absolute; opacity: 0; width: 1px; height: 1px; }              /* the input stays focusable */
.pick { position: relative; display: inline-flex; align-items: center; min-height: 44px; padding: 0 1rem; border-radius: 999px; background: var(--sf2); cursor: pointer; }
.pick:has(:checked) { background: var(--ink); color: var(--bg); }
.pick:has(:focus-visible) { outline: 3px solid var(--acc); outline-offset: 2px; }
.ex { display: none; }
[data-ex="1"] .ex-1, [data-ex="2"] .ex-2 { display: block; }
```

Pre-render `data-ex` and `checked` with the initial value so the first paint is right. Without the script, the
first example stays and the radios still work as a form.

## Pinned chapters

Three short chapters scroll past one frame that stays in view and changes with them. An IntersectionObserver writes
one state key. It names the chapter; it never computes styles.

```html
<div class="pin gr g8 m-c2" data-pin data-bind="data-step:step" data-step="1">
  <ol>
    <li class="ch ch-1" data-ch="1"><h3>They write one sentence</h3><p>…</p><div class="m-hd">…picture 1…</div></li>
    <li class="ch ch-2" data-ch="2">…<div class="m-hd">…picture 2…</div></li>
    <li class="ch ch-3" data-ch="3">…<div class="m-hd">…picture 3…</div></li>
  </ol>
  <div class="hd m-bk"><div class="stick">
    <div class="st st-1">…picture 1…</div><div class="st st-2">…</div><div class="st st-3">…</div>
  </div></div>
</div>
```

```css
.st { display: none; }
@media (min-width: 768px) {
  .pin .ch { min-height: 62svh; display: grid; align-content: center; }
  .stick { position: sticky; top: 12svh; }
  [data-step="1"] .st-1, [data-step="2"] .st-2, [data-step="3"] .st-3 { display: block; animation: rise .45s cubic-bezier(.2, .7, .2, 1) both; }
}
@keyframes rise { from { transform: translateY(22px); } }
@media (prefers-reduced-motion: reduce) { .st { animation: none !important; } }
```

```html
<script>
document.querySelectorAll('[data-pin]').forEach((pin) => {
  if (!('IntersectionObserver' in window) || !window.app) return;
  const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) window.app.step = e.target.dataset.ch; },
    { rootMargin: '-45% 0px -45% 0px' });                     // a chapter counts when it crosses the middle band
  pin.querySelectorAll('[data-ch]').forEach((ch) => io.observe(ch));
});
</script>
```

Put it after minim. Phones get each picture under its chapter (`m-hd`), so nothing is pinned on a small screen.
In a full-page screenshot the sticky frame stays at the top. Check it by scrolling a real viewport.

## Pulse lanes (a diagram that shows flow)

Boxes joined by 2px lanes, with a dot running along each lane. Each lane clips its own dot, so nothing overflows
the page.

```html
<div class="dia">
  <div class="node">A visitor writes …</div>
  <div class="ln h" aria-hidden="true"><i></i></div>
  <div class="node hub">The form</div>
  <ul class="outs"><li class="out"><span class="ln" aria-hidden="true"><i></i></span><span class="node">Telegram</span></li>…</ul>
</div>
```

```css
.ln { position: relative; height: 2px; background: var(--sf2); overflow-x: clip; }
.ln i { position: absolute; inset: 0; animation: run 3.2s linear infinite; }
.ln i::before { content: ""; position: absolute; top: -4px; left: -10px; width: 10px; height: 10px; border-radius: 50%; background: var(--acc); }
@keyframes run { from { transform: translateX(0); } to { transform: translateX(calc(100% + 10px)); } }
.out:nth-child(2) .ln i { animation-delay: .45s; } .out:nth-child(3) .ln i { animation-delay: .9s; }
@media (prefers-reduced-motion: reduce) { .ln i { animation: none; } }
```

On phones, stack the boxes and turn the lanes vertical: `width: 2px; height: 36px; overflow-y: clip`, with a
`translateY` keyframe. A held-back branch (spam, errors) takes `--mut` for its dot.

## A statement that fills in as it arrives

A closing line, one `<span>` per word, goes from `--mut` to `--ink` as it scrolls into view. Only browsers with
scroll timelines animate it. Elsewhere it is ink from the start.

```css
@supports (animation-timeline: view()) {
  .stmt span { animation: fill linear both; animation-timeline: view(); animation-range: entry 70% cover 48%; }
  @keyframes fill { from { color: var(--mut); } }
}
@media (prefers-reduced-motion: reduce) { .stmt span { animation: none !important; } }
```

The start colour is visible text, so `--mut` must pass 4.5:1 on the ground in both themes. It does with the sscss
tokens. Lighthouse reads the colour at load, when the line is still muted. Keep the spaces between
the spans, or screen readers run the words together.

## Hero entrance and the hover layer

- **Entrance.** The hero's parts rise 22px on load with staggered delays. They stay fully opaque, so the first paint
  is already the finished page:
  `@keyframes enter { from { transform: translateY(22px) } } [data-enter] .en { animation: enter .8s cubic-bezier(.2,.7,.2,1) both }`,
  with `.en2`–`.en5` adding 70ms each. Use `an-rise` for sections further down.
- **Hover layer:**
  - a button steps up 1px on hover and scales to .97 on press (`an-fx` does this);
  - a linked card lifts 2px;
  - a text link draws its underline from the left (`::after` with `transform: scaleX(0 → 1)`, origin left).
  - All of it is transform only, and none of it applies under reduced motion.
