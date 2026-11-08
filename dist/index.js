/**
 * minim — tiny reactive state + HTML attribute bindings.
 * No build step, no dependencies, nothing eval'd (attributes name state KEYS, never expressions).
 *
 *   <script type="application/json" data-state="app">{"name":"","count":0}</script>
 *   <input data-model="name">  <span data-watch="name"></span>  <p data-show="count">…</p>
 *   <input data-bind="min:smallest max:largest">
 *   <button type="button" commandfor="root" command="--inc" value="count">+1</button>
 *   <script type="module" src="dist/index.js"></script>      (or <script src="dist/minim.min.js" defer>)
 */
/* ───────────────────────── reactive core ───────────────────────── */
let active = null; // the effect currently running — module scope is already a singleton
const queue = new Set(); // effects waiting for the microtask flush (a Set: N writes → 1 re-run)
let flushing = false;
class EffectImpl {
    fn;
    deps = new Set(); // every dep-set we're subscribed to, so we can unsubscribe
    disposed = false;
    constructor(fn, signal) {
        this.fn = fn;
        signal?.addEventListener('abort', () => this.dispose(), { once: true });
        this.run();
    }
    run() {
        if (this.disposed)
            return;
        for (const d of this.deps)
            d.delete(this); // re-track from scratch: conditional reads stay accurate
        this.deps.clear();
        const prev = active; // save the outer effect…
        active = this;
        try {
            this.fn();
        }
        finally {
            active = prev;
        } // …and restore it, so nested effects work
    }
    dispose() {
        this.disposed = true;
        for (const d of this.deps)
            d.delete(this);
        this.deps.clear();
    }
}
function schedule(e) {
    queue.add(e);
    if (!flushing) {
        flushing = true;
        queueMicrotask(flush);
    }
}
function flush() {
    let rounds = 0;
    try {
        while (queue.size) {
            if (++rounds > 100) {
                queue.clear();
                console.error('minim: effect loop (an effect keeps writing what it reads)');
                break;
            }
            const batch = [...queue];
            queue.clear();
            for (const e of batch)
                e.run();
        }
    }
    finally {
        flushing = false;
    }
}
const ITERATE = Symbol('iterate');
const RAW = Symbol('raw');
const depsOf = new WeakMap();
const proxies = new WeakMap();
function track(target, key) {
    if (!active)
        return; // reads outside an effect cost nothing
    let map = depsOf.get(target);
    if (!map)
        depsOf.set(target, (map = new Map()));
    let set = map.get(key);
    if (!set)
        map.set(key, (set = new Set()));
    set.add(active);
    active.deps.add(set);
}
function trigger(target, key) {
    const set = depsOf.get(target)?.get(key);
    if (set)
        for (const e of set)
            schedule(e);
}
/** Deep reactive proxy of `obj`: nested objects, arrays and keys added later all react. Same object → same proxy. */
export function reactive(obj) {
    if (obj === null || typeof obj !== 'object')
        return obj;
    if (obj[RAW])
        return obj; // already a proxy
    const known = proxies.get(obj);
    if (known)
        return known;
    const proxy = new Proxy(obj, {
        get(t, k, r) {
            if (k === RAW)
                return t;
            track(t, k);
            const v = Reflect.get(t, k, r);
            return v !== null && typeof v === 'object' ? reactive(v) : v; // wrap nested objects lazily
        },
        set(t, k, v, r) {
            const had = Object.hasOwn(t, k);
            const old = t[k];
            const ok = Reflect.set(t, k, v?.[RAW] ?? v, r); // store raw objects, not proxies
            if (!had) {
                trigger(t, k);
                trigger(t, ITERATE);
                if (Array.isArray(t))
                    trigger(t, 'length');
            } // new key / push
            else if (!Object.is(old, v))
                trigger(t, k); // NaN-safe
            return ok;
        },
        deleteProperty(t, k) {
            const had = Object.hasOwn(t, k);
            const ok = Reflect.deleteProperty(t, k);
            if (had) {
                trigger(t, k);
                trigger(t, ITERATE);
            }
            return ok;
        },
        has(t, k) { track(t, k); return Reflect.has(t, k); },
        ownKeys(t) { track(t, ITERATE); return Reflect.ownKeys(t); },
    });
    proxies.set(obj, proxy);
    return proxy;
}
/** Run `fn` now and again whenever anything it read changes. Returns a stop function. */
export function effect(fn, { signal } = {}) {
    const e = new EffectImpl(fn, signal);
    return () => e.dispose();
}
/** Resolves after pending effects have flushed (handy in tests: `state.x = 1; await tick();`). */
export const tick = () => Promise.resolve();
/* ───────────────────────── DOM bindings ───────────────────────── */
const SELECTOR = '[data-model],[data-watch],[data-show],[data-bind],[data-class],[data-each],[data-command]';
const bound = new WeakSet(); // elements already bound (by bind() or by data-each)
const getPath = (obj, path, sc) => {
    if (sc && path[0] === '$') {
        if (path === '$i')
            return sc.$i;
        return path === '$' ? sc.$ : getPath(sc.$, path.slice(2));
    }
    return path.split('.').reduce((o, k) => o?.[k], obj);
};
const setPath = (obj, path, v, sc) => {
    if (sc && path[0] === '$') {
        if (path === '$') {
            sc.list[sc.$i] = v;
            return;
        }
        obj = sc.$;
        path = path.slice(2);
    }
    const ks = path.split('.');
    const last = ks.pop();
    (ks.reduce((o, k) => o[k], obj))[last] = v;
};
const coerce = (s) => s === 'true' ? true : s === 'false' ? false : s !== '' && !isNaN(Number(s)) ? Number(s) : s;
const pairs = (spec) => spec.trim().split(/\s+/).map(p => p.split(':')).filter(([a, b]) => a && b);
/** Run a `--command` with `source` as the button/input it came from (`value`, `data-key`, `data-step`). */
function runCommand(state, command, source, sc) {
    const src = source, d = src.dataset;
    const key = d.key ?? src.value, cur = getPath(state, key, sc);
    switch (command) {
        case '--set':
            setPath(state, d.key, coerce(src.value), sc);
            break;
        case '--toggle':
            setPath(state, key, !cur, sc);
            break;
        case '--inc':
            setPath(state, key, (cur || 0) + Number(d.step ?? 1), sc);
            break;
        case '--push': // data-as="text" pushes { text: value } instead of the bare value
            if (src.value !== '') {
                const v = coerce(src.value);
                cur.push(d.as ? { [d.as]: v } : v);
                if (src instanceof HTMLInputElement)
                    src.value = '';
            }
            break;
        case '--remove':
            cur.splice(Number(src.value), 1);
            break;
    }
}
let eachId = 0;
function bindElement(el, state, signal, sc) {
    if (bound.has(el))
        return;
    bound.add(el);
    signal.addEventListener('abort', () => bound.delete(el), { once: true });
    const d = el.dataset;
    if (d.model != null) { // two-way, type-aware
        const input = el;
        const isCheck = input.type === 'checkbox';
        const isNum = input.type === 'number' || input.type === 'range';
        const read = () => (isCheck ? input.checked : isNum && input.value !== '' ? input.valueAsNumber : input.value);
        effect(() => {
            const v = getPath(state, d.model, sc) ?? '';
            if (isCheck)
                input.checked = !!v;
            else if (input.value !== String(v))
                input.value = String(v);
        }, { signal });
        input.addEventListener('input', () => setPath(state, d.model, read(), sc), { signal });
    }
    if (d.watch != null)
        effect(() => { el.textContent = String(getPath(state, d.watch, sc) ?? ''); }, { signal });
    if (d.show != null)
        effect(() => { el.hidden = !getPath(state, d.show, sc); }, { signal });
    if (d.bind != null) { // data-bind="min:smallest --hue:hue disabled:locked"
        for (const [attr, key] of pairs(d.bind))
            effect(() => {
                const v = getPath(state, key, sc), off = v == null || v === false;
                if (attr.startsWith('--'))
                    off ? el.style.removeProperty(attr) : el.style.setProperty(attr, String(v)); // CSS variables
                else
                    off ? el.removeAttribute(attr) : el.setAttribute(attr, v === true ? '' : String(v));
            }, { signal });
    }
    if (d.class != null) { // data-class="done:$.done shaking:alarm"
        for (const [cls, key] of pairs(d.class))
            effect(() => { el.classList.toggle(cls, !!getPath(state, key, sc)); }, { signal });
    }
    if (d.command != null) { // data-command="keydown.Enter:--push" on any element
        const [evt, command] = d.command.split(':'), [type, k] = evt.split('.');
        el.addEventListener(type, e => { if (!k || e.key === k)
            runCommand(state, command, el, sc); }, { signal });
    }
    if (d.each != null && el instanceof HTMLTemplateElement) { // <template data-each="todos"> … $ $.field $i … </template>
        const id = eachId++;
        let nodes = [], items, first = true;
        signal.addEventListener('abort', () => items?.abort(), { once: true });
        effect(() => {
            const list = getPath(state, d.each, sc);
            const snapshot = Array.isArray(list) ? [...list] : []; // read now (tracked); render maybe later (view transition)
            const render = () => {
                items?.abort();
                items = new AbortController();
                nodes.forEach(n => n.remove());
                nodes = [];
                snapshot.forEach((item, i) => {
                    const frag = el.content.cloneNode(true);
                    const scope = { $: item, $i: i, list: list };
                    frag.querySelectorAll('*').forEach(e => {
                        for (const a of e.attributes)
                            if (a.value === '$i')
                                a.value = String(i);
                            else if (a.value === '$')
                                a.value = String(item);
                    });
                    frag.querySelectorAll(SELECTOR).forEach(e => bindElement(e, state, items.signal, scope));
                    for (const n of frag.childNodes)
                        if (n instanceof HTMLElement)
                            n.style.viewTransitionName = `minim-${id}-${i}`;
                    nodes.push(...frag.childNodes);
                    el.before(frag);
                });
            };
            const vt = document.startViewTransition;
            first || !vt ? render() : vt.call(document, render); // animate adds/removes/reorders where supported
            first = false;
        }, { signal });
    }
}
/**
 * Bind everything under `root` to `state`. Returns an AbortController: `abort()` removes every effect and
 * listener this call created. Elements added to the DOM later are bound automatically, and elements removed
 * from the DOM release their bindings.
 */
export function bind(root, state, { commands = true } = {}) {
    const ctrl = new AbortController();
    const { signal } = ctrl;
    const perElement = new WeakMap();
    const bindOne = (el) => {
        if (perElement.has(el) || bound.has(el))
            return;
        const c = new AbortController();
        signal.addEventListener('abort', () => c.abort(), { once: true });
        perElement.set(el, c);
        bindElement(el, state, c.signal);
    };
    const scanIn = (node) => {
        if (!(node instanceof Element))
            return;
        if (node.matches(SELECTOR))
            bindOne(node);
        node.querySelectorAll(SELECTOR).forEach(bindOne);
    };
    const scanOut = (node) => {
        if (!(node instanceof Element))
            return;
        for (const el of [node, ...node.querySelectorAll(SELECTOR)]) {
            perElement.get(el)?.abort();
            perElement.delete(el);
        }
    };
    scanIn(root);
    const mo = new MutationObserver(records => {
        for (const r of records) {
            r.removedNodes.forEach(scanOut);
            r.addedNodes.forEach(scanIn);
        }
    });
    mo.observe(root, { childList: true, subtree: true });
    signal.addEventListener('abort', () => mo.disconnect(), { once: true });
    if (commands) { // declarative actions: no JS on the page
        if ('command' in HTMLButtonElement.prototype) { // Invoker Commands API (Baseline 2025)
            root.addEventListener('command', e => {
                const ev = e;
                if (ev.command.startsWith('--'))
                    runCommand(state, ev.command, ev.source);
            }, { signal });
        }
        else { // click fallback for older browsers
            root.addEventListener('click', e => {
                const btn = e.target.closest('button[command^="--"]');
                if (btn && btn.getAttribute('commandfor') === root.id)
                    runCommand(state, btn.getAttribute('command'), btn);
            }, { signal });
        }
    }
    return ctrl;
}
/* ───────────────────────── zero-config boot ───────────────────────── */
/** Every `<script type="application/json" data-state="name" data-root="id">` becomes a live `window.name`. */
export function boot(doc = document) {
    doc.querySelectorAll('script[type="application/json"][data-state]').forEach(el => {
        const name = el.dataset.state || 'state';
        const state = reactive(JSON.parse(el.textContent || '{}'));
        globalThis[name] = state; // poke it from the console: app.count++
        const root = (el.dataset.root && doc.getElementById(el.dataset.root)) || doc.body;
        bind(root, state);
    });
}
if (typeof document !== 'undefined') {
    // In <head>: wait for the DOM. At the end of <body> (or deferred/module): the DOM is parsed, so bind now — before first paint.
    document.body ? boot() : document.addEventListener('DOMContentLoaded', () => boot());
}
/* ───────────────────────── namespace + JsUpdatr (v2) compatibility ───────────────────────── */
export const minim = {
    reactive, effect, bind, tick, boot,
    /** @deprecated JsUpdatr v2 name for `reactive()`. Note: it now returns a Proxy — keep and use the returned object. */
    observe: reactive,
    /** @deprecated JsUpdatr v2 name for `effect()`. */
    run: effect,
};
/** @deprecated minim was published as JsUpdatr up to v2; this alias keeps old imports working. */
export const JsUpdatr = minim;
export default minim;
//# sourceMappingURL=index.js.map