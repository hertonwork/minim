# Minim with Laravel

Minim fits Blade the way Alpine does, minus the 19 KB and minus `unsafe-eval`: the server renders the HTML, the
state is a JSON tag, and attributes name keys. Nothing is evaluated, so a strict Content-Security-Policy stays strict.

## 1. State from the controller

```php
// app/Http/Controllers/SignupController.php
public function create()
{
    return view('signup', ['state' => [
        'plan' => 'team', 'seats' => 3, 'agreed' => false,
        'addons' => [['text' => 'Priority support', 'done' => false]],
    ]]);
}
```

## 2. The view

`resources/views/signup.blade.php`:

```blade
<x-layout>
  <script type="application/json" data-state="app" data-root="root">@json($state, JSON_HEX_TAG | JSON_HEX_AMP)</script>

  <main id="root">
    <label>Seats
      <input type="number" min="1" data-model="seats" data-bind="max:maxSeats">
    </label>

    <p class="f ac g3">
      <button type="button" commandfor="root" command="--inc" value="seats" data-step="-1">−</button>
      <b data-watch="seats">{{ $state['seats'] }}</b>
      <button type="button" commandfor="root" command="--inc" value="seats">+</button>
    </p>

    <label><input type="checkbox" data-model="agreed"> I agree to the terms</label>
    <p data-show="agreed" hidden>Thanks — <b data-watch="seats">{{ $state['seats'] }}</b> seats on the <b data-watch="plan">{{ $state['plan'] }}</b> plan.</p>

    <ul>
      <template data-each="addons">
        <li><input type="checkbox" data-model="$.done"> <span data-watch="$.text" data-class="done:$.done"></span></li>
      </template>
    </ul>
    <input data-command="keydown.Enter:--push" data-key="addons" data-as="text" placeholder="Add an add-on, press Enter">

    <div id="offer"></div>
  </main>

  @once
    @push('scripts')
      <script>{!! file_get_contents(base_path('node_modules/@labs_kai/minim/dist/minim.min.js')) !!}</script>
    @endpush
  @endonce
</x-layout>
```

Pre-render the initial values inside the `data-watch` elements (`{{ $state['seats'] }}`) and the page is complete before
Minim runs — no flash, CLS 0.

## 3. Partials that arrive later bind themselves

Return a Blade partial from any route and insert it; Minim's MutationObserver binds it to the same state:

```php
// routes/web.php
Route::get('/offer', fn () => view('partials.offer'));
```

```blade
{{-- resources/views/partials/offer.blade.php --}}
<p>Your <b data-watch="plan"></b> plan with <b data-watch="seats"></b> seats: <b data-watch="price"></b></p>
```

```html
<button type="button" id="load">See the offer</button>
<script>
  document.getElementById('load').onclick = async () =>
    document.getElementById('offer').innerHTML = await (await fetch('/offer')).text();
</script>
```

With htmx the same partial just needs `hx-get="/offer" hx-target="#offer"` — no script at all.

## 4. Reading the state back

Every `data-state="app"` tag becomes a live global of that name — `window.app` — in both builds. Post it the usual way:

```html
<button type="button" id="save">Save</button>
<script>
  document.getElementById('save').onclick = () => fetch('/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]').content },
    body: JSON.stringify(app),
  });
</script>
```

## 5. CSP

Because nothing is evaluated, this works under the strict policy Laravel's `spatie/laravel-csp` would give you:

```
default-src 'self'; script-src 'self' 'nonce-…'; style-src 'self' 'nonce-…'
```

Give the inline `<script>` tags the nonce (`@cspNonce`) and leave `unsafe-eval` out — Alpine and petite-vue can't do that.

## Styling

The demo page's classes (`f ac g3` above) are [sscss](https://github.com/hertonwork/sscss): `npx sscss resources/views/signup.blade.php --write`
generates just the rules the view uses into its `<head>`, or load `sscss.base.css` once (2 KB).
