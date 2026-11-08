/* minim lite — paste in <head>. Reactive state + HTML attribute bindings in ~1.2 KB gzipped. No deps, no build, nothing eval'd.
   Attributes name state KEYS (never expressions):  data-model  data-watch  data-show  data-bind="attr:key"
   State: <script type="application/json" data-state="app">{...}</script>  ->  window.app (live, deep)
   Buttons: <button type="button" commandfor="ROOT_ID" command="--inc|--toggle|--set|--push" value="key">
   Trade-off vs the module build: Object.keys(state) inside an effect is not tracked (array .length is). */
(() => {
  let A, F;                                           // active effect, flush scheduled
  const Q = new Set, D = new WeakMap, P = new WeakMap, R = Symbol();
  const dep = (t, k) => { const m = D.get(t) || D.set(t, new Map).get(t); return m.get(k) || m.set(k, new Set).get(k) };
  const track = (t, k) => { if (A) { const s = dep(t, k); s.add(A); A.d.add(s) } };
  const trigger = (t, k) => { D.get(t)?.get(k)?.forEach(e => Q.add(e)); Q.size && !F && (F = 1, queueMicrotask(flush)) };
  const flush = () => {
    for (let n = 0; Q.size && n < 99; n++) { const b = [...Q]; Q.clear(); b.forEach(e => e()) }
    Q.size && console.error('minim: effect loop'); Q.clear(); F = 0;
  };
  const effect = f => {
    const clr = () => { e.d.forEach(s => s.delete(e)); e.d.clear() };
    const e = () => { if (!e.x) { clr(); const p = A; A = e; try { f(stop) } finally { A = p } } };
    const stop = () => { e.x = 1; clr() };
    e.d = new Set; e(); return stop;
  };
  const reactive = o => {
    if (!o || typeof o != 'object' || o[R]) return o;
    let p = P.get(o);
    p || P.set(o, p = new Proxy(o, {
      get: (t, k) => k == R ? t : (track(t, k), reactive(t[k])),
      set(t, k, v) {
        const had = k in t, old = t[k];
        t[k] = v;
        if (!had || !Object.is(old, v)) trigger(t, k);
        had || Array.isArray(t) && trigger(t, 'length');   // push: index added → length readers re-run
        return true;
      },
    }));
    return p;
  };
  const get = (o, p) => p.split('.').reduce((o, k) => o?.[k], o);
  const set = (o, p, v) => { const k = p.split('.'), l = k.pop(); k.reduce((o, k) => o[k], o)[l] = v };
  const num = s => s !== '' && !isNaN(s) ? +s : s;
  const bindEl = (el, S) => {
    const { model, watch, show, bind } = el.dataset, live = f => effect(stop => el.isConnected ? f() : stop());
    if (model) {
      const chk = el.type == 'checkbox', n = el.type == 'number' || el.type == 'range';
      live(() => { const v = get(S, model) ?? ''; chk ? el.checked = !!v : el.value != v && (el.value = v) });
      el.oninput = () => set(S, model, chk ? el.checked : n && el.value !== '' ? el.valueAsNumber : el.value);
    }
    watch && live(() => el.textContent = get(S, watch) ?? '');
    show && live(() => el.hidden = !get(S, show));
    bind && bind.split(' ').forEach(p => { const [a, k] = p.split(':'); k && live(() => { const v = get(S, k); v == null || v === false ? el.removeAttribute(a) : el.setAttribute(a, v === true ? '' : v) }) });
  };
  const bind = (root, S) => {
    const B = new WeakSet, scan = n => n.querySelectorAll && [n, ...n.querySelectorAll('[data-model],[data-watch],[data-show],[data-bind]')].forEach(e => e.dataset && !B.has(e) && (B.add(e), bindEl(e, S)));
    scan(root);
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(scan))).observe(root, { childList: 1, subtree: 1 });
    root.addEventListener('command', e => {
      const b = e.source, c = e.command, k = b.dataset.key || b.value, v = get(S, k);
      c == '--set' ? set(S, k, num(b.value)) : c == '--toggle' ? set(S, k, !v) : c == '--inc' ? set(S, k, (v || 0) + +(b.dataset.step || 1)) : c == '--push' && v.push(num(b.value));
    });
  };
  const boot = () => document.querySelectorAll('script[type="application/json"][data-state]').forEach(s =>
    bind(document.getElementById(s.dataset.root) || document.body, globalThis[s.dataset.state || 'state'] = reactive(JSON.parse(s.textContent))));
  globalThis.minim = { reactive, effect, bind };
  document.body ? boot() : addEventListener('DOMContentLoaded', boot);   // in <head>: wait; at the end of <body>: bind before first paint
})();
