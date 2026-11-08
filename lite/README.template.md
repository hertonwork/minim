# minim lite

Reactive state for server-rendered HTML in one `<script>` you paste into `<head>`. No install, no build, no import.
Attributes name **state keys** — never JavaScript expressions — so nothing is `eval`'d and it runs under a strict CSP.

__SIZE__ · MPL-2.0 · readable source: [`minim.js`](./minim.js) · module build with types: [`../`](../)

## 1. Paste this into `<head>`

```html
<script>__MIN__</script>
```

## 2. Put your state in the page as JSON

```html
<script type="application/json" data-state="app">
  { "name": "", "count": 0, "showName": false, "user": { "city": "Naples" }, "todos": [] }
</script>
```

This becomes a live `window.app`. Change it anywhere (`app.count++` in the console) and the page updates.
Optional `data-root="some-id"` limits binding to that element instead of `<body>`.

From PHP: `<script type="application/json" data-state="app"><?= json_encode($state, JSON_HEX_TAG|JSON_HEX_AMP) ?></script>`

## 3. Bind HTML with `data-` attributes

| Attribute | On | Does |
|---|---|---|
| `data-model="key"` | `input`, `textarea`, `select` | Two-way. Checkboxes use `checked`; `type=number`/`range` store Numbers. |
| `data-watch="key"` | any element | Sets `textContent` to the value. |
| `data-show="key"` | any element | Toggles the `hidden` attribute (truthy = shown). |
| `data-bind="attr:key attr2:key2"` | any element | Mirrors values into attributes. `false`/`null` removes the attribute, `true` sets it empty. |

Keys can be dotted paths: `data-model="user.city"`, `data-watch="todos.length"`.

## 4. Buttons without any JavaScript

Uses the HTML Invoker Commands API (`command` / `commandfor`, supported by all current browsers).
`commandfor` must point at the bound root (`<body id="…">` or the `data-root` element), and use `type="button"`.

```html
<body id="root">
  <button type="button" commandfor="root" command="--inc"    value="count">+1</button>
  <button type="button" commandfor="root" command="--inc"    value="count" data-step="-1">−1</button>
  <button type="button" commandfor="root" command="--toggle" value="showName">show/hide</button>
  <button type="button" commandfor="root" command="--set"    data-key="user.city" value="Miami">Miami</button>
  <button type="button" commandfor="root" command="--push"   data-key="todos" value="buy milk">add</button>
```

| Command | Reads | Effect |
|---|---|---|
| `--inc` | `value` = key, `data-step` (default 1) | `state[key] += step` |
| `--toggle` | `value` = key | `state[key] = !state[key]` |
| `--set` | `data-key`, `value` | `state[key] = value` (numeric strings become Numbers) |
| `--push` | `data-key` (an array), `value` | `state[key].push(value)` |

## 5. Complete example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <script>/* paste minim.min.js here */</script>
  <script type="application/json" data-state="app">{ "name": "", "count": 0, "showName": true }</script>
</head>
<body id="root">
  <input data-model="name" placeholder="Your name">
  <p data-show="showName">Hello, <strong data-watch="name"></strong>!</p>
  <button type="button" commandfor="root" command="--toggle" value="showName">toggle</button>
  <button type="button" commandfor="root" command="--inc" value="count">clicked <span data-watch="count"></span> times</button>
</body>
</html>
```

## JavaScript API (optional)

```js
const state = minim.reactive({ count: 0, items: [] });     // deep: nested objects, arrays, new keys all react
const stop  = minim.effect(() => console.log(state.count)); // runs now, re-runs when what it read changes
minim.bind(document.getElementById('widget'), state);       // bind a subtree yourself (also watches for new nodes)
stop();                                                      // stop an effect; effects also get `stop` as their argument
```

## Good to know

- Writes are batched: ten changes in a row cause one re-render, in a microtask. Read the DOM after `await Promise.resolve()`.
- Markup inserted later (`fetch` + `insertAdjacentHTML`, htmx swaps, PHP fragments) is bound automatically. Elements removed from the DOM release their bindings on the next update.
- An effect that writes what it reads is stopped after 99 rounds with a `console.error`, not a frozen tab.
- The one thing trimmed to hit the size: `Object.keys(state)` inside an effect is not tracked (array `.length` is). The module build tracks it.
- Needs a browser from 2023+ (`Proxy`, optional chaining, `command` events — buttons with `command` do nothing on older browsers). No IE.
- Want expressions, loops or templates? That's deliberately out of scope — reach for Alpine.js or Vue. minim is for pages the server already rendered.
