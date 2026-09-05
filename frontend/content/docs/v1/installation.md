There are two ways to get Pulse onto a site, and the choice comes down to one question: do you need custom events?

**The script tag** is one line of HTML with no build step. It tracks pageviews, including client side route changes, and that is all it does. `pulse.js` has no API you can call.

**The npm package** ([`@akdevv/pulse`](https://www.npmjs.com/package/@akdevv/pulse)) tracks the same pageviews and adds `trackEvent`, so you can record a signup or a plan upgrade. It is written in TypeScript, has no dependencies, and ships a React hook.

Start with the script tag. Move to the package the day you want to track something that is not a pageview.

## Script tag

Paste this into `<head>`, on every page you want measured. In most projects that means one shared layout template.

```html
<script
  src="{{API_ORIGIN}}/pulse.js"
  data-tid="pk-8f2c41a9d7e04b6fa1c35d8e92b74a06"
  data-host="{{API_ORIGIN}}"
></script>
```

`data-tid` is your tracking ID. `data-host` is the API origin with no path, because the script appends `/api/v1/track` on its own.

The script wraps `history.pushState` and listens for `popstate`, so a client side router that pushes state gets its route changes counted without any extra work.

### Astro

Astro renders multi-page by default, so every navigation is a real page load and fires its own pageview. Put the tag in your base layout.

```astro
---
// src/layouts/BaseLayout.astro
---
<html lang="en">
  <head>
    <script
      is:inline
      src="{{API_ORIGIN}}/pulse.js"
      data-tid={import.meta.env.PUBLIC_PULSE_TID}
      data-host="{{API_ORIGIN}}"
    ></script>
  </head>
  <body><slot /></body>
</html>
```

`is:inline` matters. Without it Astro processes the tag as a bundled module, `document.currentScript` comes back null, and the script cannot read its own attributes.

If you have View Transitions turned on, Astro swaps pages without a document load. The `pushState` patch covers it.

## npm package

```bash
npm install @akdevv/pulse
# pnpm add @akdevv/pulse
# yarn add @akdevv/pulse
```

Call `init` once, as early in startup as you can manage. It sends the first pageview and starts watching for route changes.

```ts
import { Pulse } from "@akdevv/pulse/sdk";

Pulse.init({
  siteId: "pk-8f2c41a9d7e04b6fa1c35d8e92b74a06",
  apiHost: "{{API_ORIGIN}}",
});
```

Calling `init` twice sends two pageviews for the same load, so keep it in one place near the root of the app rather than in a component that can remount.

### React and Vite

`usePulse` is `init` with the mount guard already written. It runs once per mount and ignores repeat renders.

```tsx
import { usePulse } from "@akdevv/pulse/react";

export default function App() {
  usePulse({
    siteId: import.meta.env.VITE_PULSE_TID,
    apiHost: import.meta.env.VITE_PULSE_HOST,
  });

  return <Router />;
}
```

React Router and TanStack Router both navigate through `history.pushState`, so route changes are tracked and you do not need a location effect.

### Next.js App Router

The hook needs a client component, and the root layout is a server component, so give it a file of its own.

```tsx
// app/analytics.tsx
"use client";

import { usePulse } from "@akdevv/pulse/react";

export function Analytics() {
  usePulse({
    siteId: process.env.NEXT_PUBLIC_PULSE_TID!,
    apiHost: process.env.NEXT_PUBLIC_PULSE_HOST!,
  });

  return null;
}
```

```tsx
// app/layout.tsx
import { Analytics } from "./analytics";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Analytics />
        {children}
      </body>
    </html>
  );
}
```

The App Router navigates through the native history API, which is what the SDK is already listening to, so soft navigations are counted. If you find they are not, add a `usePathname` effect that calls `Pulse.trackPageview()`, and check your dashboard for duplicates afterwards.

## Environment variables

Keep the tracking ID and API host in env vars rather than typed into source. Both are public values that end up in the client bundle, which is why every framework makes you mark them as such.

```bash
# Next.js
NEXT_PUBLIC_PULSE_TID=pk-8f2c41a9d7e04b6fa1c35d8e92b74a06
NEXT_PUBLIC_PULSE_HOST={{API_ORIGIN}}

# Vite
VITE_PULSE_TID=pk-8f2c41a9d7e04b6fa1c35d8e92b74a06
VITE_PULSE_HOST={{API_ORIGIN}}

# Astro
PUBLIC_PULSE_TID=pk-8f2c41a9d7e04b6fa1c35d8e92b74a06
```

## Content Security Policy

A strict CSP blocks Pulse silently. The script never loads, the request never leaves, and nothing appears in the dashboard, so this is worth ruling out early if you have a policy in place.

Two directives need the API origin:

```
Content-Security-Policy:
  script-src 'self' {{API_ORIGIN}};
  connect-src 'self' {{API_ORIGIN}};
```

`script-src` covers loading `pulse.js`. `connect-src` covers the `fetch` that carries each event, and it applies to the npm package too, where there is no script to load. Miss the second one and the console reports a refused connection on every single event.

## Self-hosting a different API

Every snippet on this page points at `{{API_ORIGIN}}`. If you run your own instance, that value is your API origin instead, in `data-host`, in `apiHost`, and in both CSP directives.

`apiHost` is optional. Leave it out and the SDK posts to `/api/v1/track` on the current origin, which is what you want when the API sits behind the same domain as the site, on a path or a proxy.

## Next

[Custom events](/docs/events) covers `trackEvent` and how to name properties so the data is still usable in six months.
