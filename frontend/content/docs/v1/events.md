A pageview tells you someone arrived. A custom event tells you what they did once they were there: signed up, upgraded, played the video, gave up on the form.

Custom events need the npm package. The script tag version of Pulse handles pageviews only and exposes no API to call.

> Reporting on custom events is still being built. Events you send today are validated, enriched, and stored with everything else, and they will appear once the events view ships. The dashboard cannot show them yet, so treat this page as the writing half of the feature.

## Sending an event

```ts
import { Pulse } from "@akdevv/pulse/sdk";

Pulse.trackEvent("signup_completed", { plan: "pro", source: "pricing_page" });
```

The name is required. Properties are optional.

```ts
Pulse.trackEvent("video_play");
Pulse.trackEvent("checkout_started", { cart_value: 49, currency: "USD" });
Pulse.trackEvent("nav_click", { target: "docs", collapsed: true });
```

`init` has to have run first. Call `trackEvent` before it and the SDK logs a warning and drops the event rather than firing at a host it does not know.

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

One delegated listener covers every button on the page and survives DOM updates:

```html
<button data-track="hero_cta">Get started</button>

<script type="module">
  // Any ESM CDN works. With a bundler, import from "@akdevv/pulse/sdk".
  import { Pulse } from "https://esm.sh/@akdevv/pulse/sdk";

  Pulse.init({ siteId: "pk-...", apiHost: "{{API_ORIGIN}}" });

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-track]");
    if (el) Pulse.trackEvent(el.dataset.track);
  });
</script>
```

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
