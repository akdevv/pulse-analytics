A pageview tells you someone arrived. A custom event tells you what they did once they were there: signed up, upgraded, played the video, gave up on the form.

There are two ways to send one. Add a `data-pulse-event` attribute to an element and Pulse tracks the click for you, or call `Pulse.trackEvent()` from your own code. Both work with the script tag and with the npm package.

## The no-code way

Put the event name on the element. Pulse listens for clicks on the whole document, so this works on elements added to the page later, and you write no JavaScript at all.

```html
<button data-pulse-event="hire_me_click">Hire me</button>
```

Properties go in a second attribute, as JSON:

```html
<button data-pulse-event="plan_picked" data-pulse-props='{"plan":"pro"}'>
  Choose Pro
</button>
```

Mind the quoting: the attribute is wrapped in single quotes because JSON uses double quotes inside. If the JSON does not parse, Pulse warns in the console and sends the event without properties rather than dropping it.

This is the whole feature on a static site. No bundler, no module script, nothing to import.

## Sending an event

For anything a click attribute cannot express — an event fired on success, on a timer, or from a form handler — call `trackEvent` directly.

```ts
import { Pulse } from "@akdevv/pulse/sdk";

Pulse.trackEvent("signup_completed", { plan: "pro", source: "pricing_page" });
```

The name is required. Properties are optional. On the script tag install the same function is on the global, with no import:

```html
<script>
  Pulse.trackEvent("signup_completed", { plan: "pro" });
</script>
```

A few more shapes:

```ts
Pulse.trackEvent("video_play");
Pulse.trackEvent("checkout_started", { cart_value: 49, currency: "USD" });
Pulse.trackEvent("nav_click", { target: "docs", collapsed: true });
```

With the npm package, `init` has to have run first. Call `trackEvent` before it and the SDK logs a warning and drops the event rather than firing at a host it does not know. The script tag initialises itself, so there is no ordering to get wrong beyond loading the script.

## In a React app

`trackEvent` is a plain function on the `Pulse` object. There is no hook for it and no context to wire up. Import it and call it from the handler.

```tsx
import { Pulse } from "@akdevv/pulse/sdk";

export function UpgradeButton({ plan }: { plan: string }) {
  return (
    <button
      onClick={() => {
        Pulse.trackEvent("upgrade_clicked", { plan });
        router.push("/checkout");
      }}
    >
      Upgrade
    </button>
  );
}
```

Fire the event before you navigate. The request uses `keepalive`, so the browser finishes sending it even when the page is already tearing down.

## Without a framework

Nothing to wire up. The script tag already installs the click listener and the global:

```html
<script
  src="{{API_ORIGIN}}/pulse.js"
  data-tid="pk-..."
  data-host="{{API_ORIGIN}}"
></script>

<button data-pulse-event="hero_cta">Get started</button>
```

## Seeing them

Custom events show up in two places on the site dashboard.

The **Custom Events** card lists every event name in the selected range with its total count and how many distinct visitors fired it. Click a row and it expands into a breakdown of the properties that came with it, grouped by key, with a count per value — which is where `plan: pro` beats `plan: free` becomes a number you can read.

The **Realtime** panel has a Live Events column showing named events from the last five minutes. That is the one to watch while you are wiring an event up: click the button, and the name should appear within about five seconds.

If an event never appears, the name is the thing to check first. Pulse groups on the exact string it received.

## Naming

Event names are free text up to 255 characters, which means nothing stops you from ending up with `signup`, `Signup`, `sign-up`, and `user_signed_up` all describing the same click. Pulse groups on the exact string, so those are four different events and every chart splits four ways.

Pick a shape on day one and hold it. The one used throughout these docs is `object_verb` in snake case: `signup_completed`, `checkout_started`, `video_play`. Any convention works as long as it is the only one in the codebase.

Keep the set of names small and fixed. A name should be something you could list ahead of time.

```ts
// Good. Six events, whatever the catalogue does.
Pulse.trackEvent("product_viewed", { category: "boots", sku: "TR-114" });

// Bad. One event name per product, thousands of series, no chart survives it.
Pulse.trackEvent(`product_viewed_${sku}`);
```

The rule of thumb: names identify the action, properties carry the specifics.

## Properties

Properties are a flat object. The type is `Record<string, string | number | boolean>`, and TypeScript will stop you at the point of the call if you try to pass anything else.

```ts
// Fine
Pulse.trackEvent("filter_applied", { field: "country", value: "IN", count: 3 });

// Type error, and not worth working around
Pulse.trackEvent("filter_applied", { filters: [{ field: "country" }] });
```

Flatten instead of nesting. `{ filter_field: "country", filter_value: "IN" }` is two columns you can group by, where a nested object is one blob you cannot.

Each event travels as a query string, and properties are JSON encoded into a single parameter. Long values are the thing to watch: a few short keys are free, a serialised object of a hundred fields will eventually meet a proxy's URL length limit and vanish without an error.

Property values follow the same low cardinality logic as names. `plan: "pro"` groups into a useful bar chart. `user_id: "4f2a..."` groups into a chart with one bar per person.

## Do not send personal data

This one is worth stating flatly, because it is easy to do by accident and hard to undo.

Never put email addresses, names, phone numbers, raw IDs, or full URLs containing tokens into event properties. Pulse deliberately collects nothing that identifies a person, which is what lets you run it without a cookie banner. One `email` property undoes that for the whole site, and the value is now in a database, a backup, and every export.

```ts
// No
Pulse.trackEvent("signup_completed", { email: user.email, name: user.name });

// Yes
Pulse.trackEvent("signup_completed", { plan: user.plan, referred: true });
```

If you need per-user behaviour, you need a product analytics tool with a consent flow, not an anonymous pageview counter.

## Next

[SDK reference](/docs/reference) has the full signatures and the tracking parameters that go over the wire.
