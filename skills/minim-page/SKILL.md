---
name: minim-page
description: >-
  Build a web page that scores 100/100/100/100 on Google PageSpeed (Lighthouse) with zero external JavaScript or CSS
  requests: one HTML file, minim (a 1.2–2.5 KB reactive library) inlined, sscss utility classes with the page's CSS
  generated and inlined (≈1 KB), system fonts, native dialogs and buttons, CSS-only animation. Use this whenever someone asks for a landing page, demo, product page,
  waitlist, form, settings screen, small dashboard, prototype or "quick page" that must be fast, work with no build step,
  pass PageSpeed or Core Web Vitals, run under a strict CSP, or sit on server-rendered HTML (PHP, Rails, Django, htmx) —
  and whenever a page "loads too much JS", "needs to score 100", or "should not pull in React/Vue/Alpine for this".
  Also use it to add interactivity (lists, toggles, counters, live previews, modals) to an existing static page.
---

# minim page

A page built this way is one `.html` file. The state is a JSON tag, the HTML binds to it by key with `data-*`
attributes, minim is pasted inline at the end of `<body>`, the CSS is sscss — short utility classes whose rules are
generated for this page and inlined in `<head>` — plus a few lines of the page's own, fonts are the system's, images
are inline SVG or sized `<img>`s. The browser makes one request for the document and nothing else.
That is why it scores 100: there is nothing to block rendering, nothing to shift, nothing to download, and no framework
to execute. It also means no bundler, no `npm install` for the page, and a strict Content-Security-Policy works because
nothing is `eval`'d — minim's attributes name keys, never expressions.

Read `references/minim.md` for the full attribute, command and API reference, `references/sscss.md` for the class
cheat sheet, and `references/design.md` for the visual rules before writing markup. The starter page in
`assets/starter.html` already has the structure, the classes and the slots.

## Build order

Work in this order; each step is cheap to redo and the later ones depend on the earlier ones.

### 1. State first

Write the whole state as one JSON object before any markup — every value the page shows or edits, with its initial
value. Keep it flat where you can and use nested objects only for real groups (`"user": { "city": "" }`). Arrays hold
list items; objects in arrays when items have fields (`{ "text": "", "done": false }`), plain strings when they don't.

```html
<script type="application/json" data-state="app" data-root="root">
  { "name": "", "plan": "monthly", "seats": 3, "agreed": false, "items": [] }
</script>
```

`data-state` names the global (`window.app`), `data-root` limits binding to an element (default `<body>`). From a
server language, emit it with the HTML-safe flags: PHP `json_encode($state, JSON_HEX_TAG|JSON_HEX_AMP)`, Rails
`raw state.to_json.gsub('</', '<\/')`, Django `json_script`.

### 2. Markup that binds by key

Write semantic HTML and bind with attributes whose values are **keys**, never expressions:

| Need | Attribute |
|---|---|
| Show a value | `<b data-watch="seats">3</b>` |
| Edit a value | `<input data-model="name">` (checkbox → boolean, `type=number`/`range` → Number) |
| Show/hide | `<p data-show="agreed" hidden>` |
| Attribute or CSS variable follows state | `<input data-bind="max:seats">`, `<div data-bind="--pct:progress">` |
| Class follows state | `<li data-class="done:$.done">` |
| A list | `<template data-each="items"> … $ $.field $i … </template>` |
| A button that changes state | `<button type="button" commandfor="root" command="--inc" value="seats">` |
| Any event changes state | `<input data-command="keydown.Enter:--push" data-key="items">` |

Commands: `--set` (`data-key` + `value`), `--toggle`, `--inc` (`data-step`), `--push`, `--remove` (`value` = index).
`commandfor` must point at the bound root's id. Native commands work too: `command="show-modal"` / `"close"` on a
`<dialog>`, `"toggle-popover"` on a popover — use them instead of writing a modal.

**Pre-render the initial state into the markup.** Put the initial value as the text of every `data-watch` element and
`hidden` on every `data-show` element that starts hidden. minim then only keeps the page in sync, and nothing moves
when it binds — this is what keeps Cumulative Layout Shift at 0. An empty `<span data-watch="count"></span>` that
fills with "0" after load is a layout shift; `<span data-watch="count">0</span>` is not.

Don't reach for JavaScript when the platform already has the thing: `<dialog>` + `command`, `<details>`, `popover`,
`<form>` with native validation and a real `action`, `input type=color/range/date`, `<meter>` / `<progress>`,
`scroll-snap`, `:has()`, view transitions. A page built this way usually needs no script of its own at all; if it does
need one (a fetch, a clipboard copy), keep it to a few lines inline at the end of `<body>` and have it write to the
state so minim renders the result.

### 3. Style with sscss, animate with its motion utilities

The look is [sscss](https://github.com/hertonwork/sscss): one- to three-letter utilities on seven tokens, with
automatic dark mode. Write classes from `references/sscss.md` — `f ac jb` (flex, centered, space-between),
`gr g8 m-c2` (grid, gap 4rem, two columns from 768px), `r2 bs p6` (panel: double radius, surface, padding 2rem),
`r ba cw px4 py2 an-fx` (primary button), `t1 cm` (small muted note), `h-`/`m-`/`l-` variants — and generate the
page's CSS:

```bash
node <skill>/scripts/sscss.mjs page.html --write    # exactly the rules this page uses → <style data-sscss> before </head>
node <skill>/scripts/sscss.mjs page.html --check    # exit 1 on a class that is neither sscss nor styled by the page
```

Run `--write` again after every edit to the markup; `check.mjs` fails the page when the block is stale. The
starter's own `<style>` holds the handful of things the vocabulary doesn't do — the type ramps (`h1`, `h2`), inputs,
`.wrap`, the `.field` section, the `.meter` height — and that is where token overrides go: change the values, keep
the roles (`--ink --mut --bg --sf --sf2 --acc --acci --r`). The default accent passes 4.5:1 as small text on the
surface; a new one must too, in both themes, and `--acci` must pass on it.

Animation is the stylesheet's job; state only flips a class or a variable. The `an-*` utilities are the whole
motion package and all of them are off under `prefers-reduced-motion`:

- `an-fx` on every button (hover tone, press scale).
- `data-class="an-spin:busy"` for anything that turns on and off; `an-tone` where tokens change.
- `data-bind="--pct:value"` on a meter's track + `an-grow` on its fill.
- `an-in` on list items and fragments inserted later (`@starting-style`), `an-vt` once for `data-each` view transitions.
- `an-rise` on the parts of a section for scroll-driven entrance: **transform only**. An opacity fade on off-screen
  content makes Lighthouse's contrast audit read the faded colors and fail the page — don't add one in the page's
  own `<style>` either.

Read `references/design.md` for the look: large display type in one family, headlines of two lines or fewer, sections
that each have their own composition, surfaces separated by tone, no gradients, shadows, hairlines, eyebrows,
monospace labels or emoji. The point is not restraint for its own sake: those are the things that make a page read as
generated, and the audits catch several of them (contrast, heading order, tap targets) anyway.

Want a living hero — an ocean, a flow field of ink — without a request or a lost point? That is the **shader-hero**
skill next to this one (`skills/shader-hero/`): a 2 KB harness that runs only on real GPUs, inlined after minim.

### 4. Inline minim

Pick the build:

- `assets/minim-lite.min.js` (1.2 KB gzipped): `data-model`, `data-watch`, `data-show`, `data-bind`, the four basic
  commands. Enough for forms, toggles, counters, live previews.
- `assets/minim.min.js` (2.5 KB gzipped): adds `data-each`, `data-class`, CSS-variable binds, `data-command`,
  `--remove`, a click fallback for browsers without `command` events. Use it when the page has a list or animation.

Paste its contents into `<script>…</script>` **at the end of `<body>`**. There it binds immediately, before the first
paint; in `<head>` it has to wait for the DOM. `scripts/inline.mjs page.html` does the paste for you (it replaces
`<!--minim-->` or an existing inlined copy) and refuses if the file contains `</script`.

No `<script src>`, no `<link rel=stylesheet>` (not even sscss's own stylesheet — generate), no web fonts, no CDN
anything. Each external file is a request that can block rendering and a point the score can drop; the whole method
is that there are none.

### 5. Check, then look

```bash
node <skill>/scripts/check.mjs page.html            # static preflight: the rules above, in seconds
node <skill>/scripts/check.mjs page.html --lighthouse  # also runs Lighthouse if `lighthouse` is installed (npm i -g lighthouse)
```

Fix every line the checker prints — they map one-to-one onto Lighthouse audits that cost points, plus two of its
own: a stale `<style data-sscss>` block and classes that have no rule anywhere. If you run Lighthouse
against your own local server instead, make it answer `404` for every path but `/`: Lighthouse also fetches
`/robots.txt`, `/llms.txt` and a manifest, and a server that returns the page for those gets SEO docked to 92. Then open the page at
a phone width and a desktop width and look: no horizontal scroll, headline on two lines or fewer, every control
labelled and reachable by keyboard, dark mode readable. Lighthouse runs the page cold on a throttled phone profile, so
anything that only looks right after a script runs will be caught.

The final check is the real one: deploy and run https://pagespeed.web.dev/ on the live URL. Expect 100 in all four
categories on mobile and desktop; if a category is lower, the report names the audit, and the list in step 5 of this
file covers every one we have hit.

## What a page needs, as a checklist

- `<!DOCTYPE html>`, `<html lang>`, `<meta charset>`, `<meta name="viewport">`, `<title>`, `<meta name="description">`,
  `<link rel="canonical">`, `<meta name="color-scheme" content="light dark">`
- A favicon as a `data:` SVG (no request)
- Exactly one `<h1>` on the first screen; `<h2>` for sections; no skipped levels (panel titles are `<p>`, not `<h3>`)
- A `<label>` for every input (or `aria-label` on inputs that stand alone); `aria-label` on icon-only buttons;
  `type="button"` on every non-submit button
- Text contrast ≥ 4.5:1 (3:1 for large text) in both themes; no text at reduced opacity
- Images: inline SVG, or `<img>` with `width`, `height`, `alt`, and `loading="lazy"` below the fold
- Grids are `gr` (its children get `min-width: 0`), so a `<pre>` or a long word can't overflow on phones
- `<style data-sscss>` regenerated after the last markup edit; every class is sscss or styled in the page's own `<style>`
- Links with real `href`s; buttons that do things
- The JSON state tag, the bound markup with initial values pre-rendered, minim inlined at the end of `<body>`

## Pitfalls we hit

- **Layout shift from binding.** Fixed by pre-rendering initial values (step 2) and inlining minim at the end of
  `<body>` (step 4). Reserve height for lists that start empty if the design needs it.
- **Contrast failures on off-screen text** from opacity-based entrance animations. Transform only.
- **Contrast failure on accent-colored small text** over a surface. sscss's default accent (`#1a7a37`) passes;
  re-check both themes when overriding `--acc`.
- **Heading order** audit when a panel's title is an `<h3>` before the first `<h2>`.
- **Horizontal overflow on phones** from a `<pre>` inside a grid column. `gr` gives children `min-width: 0`; a
  hand-written `display: grid` must do the same.
- **A head comment that mentioned `<style data-sscss>`** made an older generator replace the wrong block. Fixed in the
  generator; still, don't write tag names in comments.
- **Stale generated CSS**: a class added to the markup after the last `--write` has no rule. `check.mjs` catches it.
- **Class collisions**: a `.bar` nav and a `.bar` meter. Name things for what they are.
- **`data-show` and transitions**: `hidden` can't animate. Use `data-class` with a transition when it should.
- **Editing list items with `data-model="$"`** re-renders the list on every keystroke (the list effect reads every
  index). Make items objects and bind `$.field`; the list re-renders only on add/remove.
- **`Object.keys(state)` inside an effect** is tracked by the module build, not by lite.
