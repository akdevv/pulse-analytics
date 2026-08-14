# @akdevv/pulse

Lightweight, privacy-friendly analytics SDK for JavaScript and TypeScript. Drop it into any web app to track pageviews and custom events — no cookies, no bloat.

[![npm](https://img.shields.io/npm/v/@akdevv/pulse)](https://www.npmjs.com/package/@akdevv/pulse)
[![license](https://img.shields.io/npm/l/@akdevv/pulse)](./LICENSE)

## Installation

```bash
npm install @akdevv/pulse
# or
pnpm add @akdevv/pulse
# or
yarn add @akdevv/pulse
```

## Quick Start

### Vanilla JS / TypeScript

```ts
import { Pulse } from "@akdevv/pulse/sdk";

Pulse.init({
  siteId: "your-site-id",
  apiHost: "https://your-pulse-backend.com",
});
```

### React

```tsx
import { usePulse } from "@akdevv/pulse/react";

function App() {
  usePulse({
    siteId: "your-site-id",
    apiHost: "https://your-pulse-backend.com",
  });

  return <YourApp />;
}
```

### Next.js (App Router)

Create `app/analytics.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { usePulse } from "@akdevv/pulse/react";
import { Pulse } from "@akdevv/pulse/sdk";

export function Analytics() {
  const pathname = usePathname();
  const mounted = useRef(false);

  usePulse({
    siteId: process.env.NEXT_PUBLIC_PULSE_SITE_ID!,
    apiHost: process.env.NEXT_PUBLIC_PULSE_HOST,
  });

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    Pulse.trackPageview();
  }, [pathname]);

  return null;
}
```

Add to your root layout:

```tsx
// app/layout.tsx
import { Analytics } from "./analytics";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Analytics />
        {children}
      </body>
    </html>
  );
}
```

Set environment variables:

```env
NEXT_PUBLIC_PULSE_SITE_ID=your-site-id
NEXT_PUBLIC_PULSE_HOST=https://your-pulse-backend.com
```

## API

### `Pulse.init(config)`

Initializes the SDK, sends an initial pageview, and starts automatic SPA route tracking.

| Option    | Type      | Required | Default | Description                    |
| --------- | --------- | -------- | ------- | ------------------------------ |
| `siteId`  | `string`  | Yes      | —       | Your site tracking ID          |
| `apiHost` | `string`  | No       | —       | Your Pulse backend URL         |
| `debug`   | `boolean` | No       | `false` | Enable verbose debug logging   |

### `usePulse(config)`

React hook — initializes the SDK on mount. Accepts the same config as `Pulse.init`. Use this instead of calling `Pulse.init` directly in React apps.

```tsx
usePulse({
  siteId: "your-site-id",
  apiHost: "https://your-pulse-backend.com",
});
```

### `Pulse.trackPageview(options?)`

Manually track a pageview. Useful for SPA route changes not caught automatically.

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
