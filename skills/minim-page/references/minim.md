# minim reference

minim is a reactive library for server-rendered HTML. State is a JSON tag; attributes bind elements to it by key.
Nothing is evaluated: attribute values are keys or dotted paths, never expressions. Two builds, same attributes where
they overlap: **lite** (paste-in, 1.2 KB gzipped) and the **module build** (2.5 KB gzipped, more attributes).

Contents: State · Attributes · Commands · List scope · JavaScript API · Boot timing · Server-side embedding · Builds

## State

```html
<script type="application/json" data-state="app" data-root="root">{ "count": 0, "user": { "city": "" }, "todos": [] }</script>
```

- Every such tag becomes a live, deep-reactive global named by `data-state` (`window.app`). Several tags → several globals.
- `data-root="id"` binds only inside that element; default is `<body>`.
- Nested objects, arrays and keys added later are all reactive. `app.count++` from the console re-renders.
- Writes are batched: many changes in a row produce one re-render, in a microtask.

## Attributes

| Attribute | On | Does | Build |
|---|---|---|---|
| `data-model="key"` | `input`, `textarea`, `select` | Two-way. Checkbox ↔ boolean via `checked`; `type=number`/`range` store Numbers (an empty or half-typed field stores `''` and is not clobbered); everything else strings. | both |
| `data-watch="key"` | any | `textContent = String(value ?? '')`. Pre-render the initial value as the element's text. | both |
| `data-show="key"` | any | `hidden = !value`. Pre-render `hidden` when the initial value is falsy. | both |
| `data-bind="attr:key attr2:key2"` | any | `setAttribute(attr, value)`; `false`/`null` removes the attribute, `true` sets it empty. Names starting with `--` set CSS custom properties on the element instead (module build). | both (`--` module) |
| `data-class="name:key other:key2"` | any | `classList.toggle(name, !!value)`. | module |
| `data-each="key"` | `<template>` | Stamps the template content once per array item, inserted before the template. See *List scope*. Re-renders on add/remove/replace through `document.startViewTransition` when available (after the first render). | module |
| `data-command="event[.key]:--cmd"` | any | Listens for `event` on the element (`keydown.Enter` filters `event.key`) and runs the command with the element as source. | module |

Keys are dotted paths: `user.city`, `todos.length`, `items.0.name`.

## Commands

Buttons use the HTML Invoker Commands API: `<button type="button" commandfor="ROOT_ID" command="--inc" value="count">`.
The browser dispatches a `command` event on the root; minim applies it. `commandfor` must equal the bound root's `id`.
Native commands (`show-modal`, `close`, `toggle-popover`, `show-popover`, `hide-popover`) are handled by the browser.

| Command | Reads from the source element | Effect |
|---|---|---|
| `--set` | `data-key`, `value` | `state[key] = value` — `"true"`/`"false"` become booleans, numeric strings Numbers |
| `--toggle` | `value` (or `data-key`) = key | `state[key] = !state[key]` |
| `--inc` | `value` (or `data-key`) = key, `data-step` (default 1) | `state[key] = (state[key] || 0) + step` |
| `--push` | `data-key` = array key, `value` | `state[key].push(value)`; ignored when `value` is empty; an input source is cleared afterwards |
| `--remove` | `data-key` = array key, `value` = index | `state[key].splice(index, 1)` (module) |

Old browsers without `command` events: the module build falls back to a click listener on `button[command^="--"]`.

## List scope (`data-each`)

Inside the template, keys may start with `$`:

- `$` — the item itself (`data-watch="$"` for a list of strings; `data-model="$"` writes `list[i] = v`)
- `$.field` — a field of an object item (`data-model="$.done"`, `data-class="done:$.done"`)
- `$i` — the index
- Attribute values that are exactly `$i` or `$` are substituted at render time: `<button command="--remove" data-key="todos" value="$i">`.

The list effect reads the array's length and every index, so it re-renders on add, remove, or replacing an item;
editing a field of an object item (`$.done`) updates only that item's bindings. For editable rows, use object items.

Each stamped top-level element gets a `view-transition-name`, so adds and removes animate individually; set
`::view-transition-group(*) { animation-duration: .3s }` to tune, or `@starting-style` for browsers without view
transitions.

## JavaScript API (optional)

```js
// module build: import { reactive, effect, bind, tick, boot } from '@labs_kai/minim'   |   classic/lite: window.minim
const state = minim.reactive({ n: 0 });          // deep Proxy; same object → same proxy
const stop  = minim.effect(() => { /* reads are tracked; re-runs when they change */ });
minim.effect(fn, { signal: abortController.signal });   // module: stop via AbortSignal
const ctrl  = minim.bind(element, state);        // bind a subtree yourself; module returns an AbortController
await minim.tick();                               // module: wait for pending effects
stop(); ctrl.abort();
```

The lite build passes `stop` into the effect callback instead of taking a signal; its `bind` returns the state.
An effect that writes what it reads is stopped after ~100 rounds with a `console.error`.

## Boot timing

minim boots when the script runs if `<body>` already exists (script at the end of `<body>`, `defer`, or `type=module`);
otherwise on `DOMContentLoaded` (script in `<head>`). End of `<body>` is the right place: binding happens before the first
paint, so pre-rendered values and bindings agree from the first frame.

Markup inserted later anywhere under the root is bound by a MutationObserver (fetch responses, htmx swaps, server
partials). Removed elements release their bindings.

## Server-side embedding

- PHP: `<script type="application/json" data-state="app"><?= json_encode($state, JSON_HEX_TAG|JSON_HEX_AMP) ?></script>`
- Laravel Blade: `{!! json_encode($state, JSON_HEX_TAG|JSON_HEX_AMP) !!}`
- Rails: `<%= raw state.to_json.gsub('</', '<\/') %>`
- Django: `{{ state|json_script:"state" }}` then add `data-state` to that tag, or render the tag yourself.
- Node/any: JSON with `</` escaped as `<\/` inside a script tag.

## Builds

| | lite (`assets/minim-lite.min.js`) | module (`assets/minim.min.js`) |
|---|---|---|
| size | 2.4 KB min / 1.2 KB gzip | 6.1 KB min / 2.5 KB gzip |
| attributes | model, watch, show, bind | + class, each, command, `--var` binds |
| commands | set, toggle, inc, push | + remove, click fallback |
| global | `window.minim` | `window.minim` (IIFE) or ESM exports |
| `Object.keys(state)` in effects | not tracked | tracked |

Source and npm package: https://github.com/hertonwork/minim (`npm i @labs_kai/minim`; CDN `https://cdn.jsdelivr.net/npm/@labs_kai/minim@3/dist/minim.min.js`
for pages that may load a script — but a page built with this skill inlines the file instead).
