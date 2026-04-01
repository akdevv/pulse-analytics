# pulse-analytics

JavaScript/TypeScript SDK for [Pulse Analytics](https://github.com/akdevv/pulse-analytics).

## Installation

```bash
npm install @pulse/sdk
```

## Usage

### Vanilla JS / TypeScript

```ts
import { Pulse } from "@pulse/sdk";

Pulse.init({
  siteId: "your-site-id",
  apiHost: "https://api.pulse.com",
});
```

### React

```tsx
import { usePulse } from "@pulse/sdk/react";

function App() {
  usePulse({
    siteId: "your-site-id",
    apiHost: "https://api.pulse.com",
  });

  return <YourApp />;
}
```

## API

### `Pulse.init(config)`

Initializes the SDK, sends an initial pageview, and enables automatic SPA route tracking.

| Option    | Type      | Required | Description                             |
| --------- | --------- | -------- | --------------------------------------- |
| `siteId`  | `string`  | Yes      | Your site tracking ID                   |
| `apiHost` | `string`  | No       | Your Pulse backend URL                  |
| `debug`   | `boolean` | No       | Enable debug logging (default: `false`) |

### `Pulse.trackPageview(options?)`

Manually track a pageview. Useful when automatic SPA tracking doesn't capture a route change.

```ts
Pulse.trackPageview();
Pulse.trackPageview({ url: "/checkout", title: "Checkout" });
```

### `Pulse.trackEvent(eventName, properties?)`

Track a custom event with an optional properties payload.

```ts
Pulse.trackEvent("signup", { plan: "pro", source: "landing_page" });
Pulse.trackEvent("purchase", { amount: 49, currency: "USD" });
Pulse.trackEvent("video_play");
```

## License

MIT
