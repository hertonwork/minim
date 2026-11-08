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
/** Deep reactive proxy of `obj`: nested objects, arrays and keys added later all react. Same object → same proxy. */
export declare function reactive<T extends object>(obj: T): T;
export interface EffectOptions {
    signal?: AbortSignal;
}
/** Run `fn` now and again whenever anything it read changes. Returns a stop function. */
export declare function effect(fn: () => void, { signal }?: EffectOptions): () => void;
/** Resolves after pending effects have flushed (handy in tests: `state.x = 1; await tick();`). */
export declare const tick: () => Promise<void>;
export interface BindOptions {
    commands?: boolean;
}
/**
 * Bind everything under `root` to `state`. Returns an AbortController: `abort()` removes every effect and
 * listener this call created. Elements added to the DOM later are bound automatically, and elements removed
 * from the DOM release their bindings.
 */
export declare function bind(root: HTMLElement, state: object, { commands }?: BindOptions): AbortController;
/** Every `<script type="application/json" data-state="name" data-root="id">` becomes a live `window.name`. */
export declare function boot(doc?: Document): void;
export declare const minim: {
    reactive: typeof reactive;
    effect: typeof effect;
    bind: typeof bind;
    tick: typeof tick;
    boot: typeof boot;
    /** @deprecated JsUpdatr v2 name for `reactive()`. Note: it now returns a Proxy — keep and use the returned object. */
    observe: typeof reactive;
    /** @deprecated JsUpdatr v2 name for `effect()`. */
    run: typeof effect;
};
/** @deprecated minim was published as JsUpdatr up to v2; this alias keeps old imports working. */
export declare const JsUpdatr: {
    reactive: typeof reactive;
    effect: typeof effect;
    bind: typeof bind;
    tick: typeof tick;
    boot: typeof boot;
    /** @deprecated JsUpdatr v2 name for `reactive()`. Note: it now returns a Proxy — keep and use the returned object. */
    observe: typeof reactive;
    /** @deprecated JsUpdatr v2 name for `effect()`. */
    run: typeof effect;
};
export default minim;
