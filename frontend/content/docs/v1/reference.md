Everything the browser SDK exposes, and the wire format underneath it.

## Pulse.init(config)

Configures the SDK, sends one pageview, and starts listening for route changes. Call it once per page load.

```ts
import { Pulse } from "@akdevv/pulse/sdk";

Pulse.init({
  siteId: "pk-8f2c41a9d7e04b6fa1c35d8e92b74a06",
  apiHost: "{{API_ORIGIN}}",
  debug: false,
});
```

| Option    | Type      | Required | Description                                                                            |
| --------- | --------- | -------- | -------------------------------------------------------------------------------------- |
| `siteId`  | `string`  | yes      | Your tracking ID, in the form `pk-` followed by 32 characters.                         |
| `apiHost` | `string`  | no       | API origin, no path. Omit it and events post to `/api/v1/track` on the current origin. |
| `debug`   | `boolean` | no       | Logs every event and its parameters to the console. Off by default.                    |

Returns nothing, and never throws. A failed request is swallowed on purpose, because analytics has no business breaking the page it measures.

## Pulse.trackPageview(options?)

Sends a pageview by hand. Route changes are already covered, so reach for this when you want a pageview that does not match the URL, such as a modal you treat as its own screen.

```ts
Pulse.trackPageview();
Pulse.trackPageview({ url: "/checkout/payment", title: "Payment" });
```

| Option     | Type     | Default                |
| ---------- | -------- | ---------------------- |
| `url`      | `string` | `window.location.href` |
| `title`    | `string` | `document.title`       |
| `referrer` | `string` | `document.referrer`    |

## Pulse.trackEvent(name, properties?)

Records a named event. See [Custom events](/docs/events) for naming and what not to put in properties.

```ts
Pulse.trackEvent("signup_completed", { plan: "pro" });
```

| Argument     | Type                                          | Required |
| ------------ | --------------------------------------------- | -------- |
| `name`       | `string`, up to 255 characters                | yes      |
| `properties` | `Record<string, string \| number \| boolean>` | no       |

## usePulse(config)

React hook, same config as `init`. Runs once on mount, guards against React's double invocation in development, and ignores every render after the first.

```tsx
import { usePulse } from "@akdevv/pulse/react";

usePulse({ siteId: "pk-...", apiHost: "{{API_ORIGIN}}" });
```

Config is read on first mount only. Changing `siteId` later has no effect until a full reload.

## getVisitorId() and getSessionId()

```ts
import { getVisitorId, getSessionId } from "@akdevv/pulse/sdk";
```

Both return the UUID the SDK is attaching to events, generating one if it does not exist yet. Useful for correlating a support ticket with a session, and for nothing else. Neither is derived from the person.

| ID          | Storage          | Lifetime                           |
| ----------- | ---------------- | ---------------------------------- |
| `pulse_cid` | `localStorage`   | Until the visitor clears site data |
| `pulse_sid` | `sessionStorage` | Until the tab closes               |

Private browsing can make both storage APIs throw. When that happens the SDK falls back to a fresh UUID per event rather than failing, so those hits count as new visitors.

## Script tag attributes

`pulse.js` reads its own tag through `document.currentScript`.

| Attribute   | Required | Description                                                                                        |
| ----------- | -------- | -------------------------------------------------------------------------------------------------- |
| `data-tid`  | yes      | Tracking ID. Without it the script warns and stops.                                                |
| `data-host` | no       | API origin, no path. Defaults to `http://localhost:8000`, which is only ever right in development. |

The script tracks pageviews. It has no `trackEvent`, and it does not attach anything to `window`. For events, use the npm package.

## Tracking endpoint

Both the script and the package end up here. It is documented so you can send events from a server, a mobile app, or curl.

```
POST /api/v1/track?v=1&tid=pk-...&t=PAGEVIEW&dl=https://example.com/
```

Everything travels in the query string. The request body is ignored.

| Parameter | Meaning                          | Required            |
| --------- | -------------------------------- | ------------------- |
| `v`       | Protocol version, currently `1`  | no, defaults to `1` |
| `tid`     | Tracking ID                      | yes                 |
| `t`       | `PAGEVIEW`, `CLICK`, or `CUSTOM` | yes                 |
| `dl`      | Page URL, absolute               | yes                 |
| `dt`      | Page title, up to 500 characters | no                  |
| `dr`      | Referrer URL                     | no                  |
| `en`      | Event name, up to 255 characters | for `CUSTOM`        |
| `ep`      | Event properties, JSON encoded   | no                  |
| `cid`     | Visitor ID, UUID                 | no                  |
| `sid`     | Session ID, UUID                 | no                  |
| `sr`      | Screen size, `1920x1080`         | no                  |
| `vp`      | Viewport size, `1280x800`        | no                  |
| `ul`      | Browser language, `en-US`        | no                  |
| `ts`      | Client timestamp in milliseconds | no                  |
| `z`       | Cache buster, any value          | no                  |

The server derives the rest: browser, OS, and device from the user agent, country from the IP address, and the received timestamp. Send `ts` and the client's clock is used for the event time, which is worth remembering when a machine's clock is wrong.

### Responses

`/track` returns `204 No Content` to every request it receives. Accepted, rejected, rate limited, malformed, unknown site, all `204`, all with an empty body.

That is a deliberate trade. A tracking endpoint that returns errors leaks whether a tracking ID exists, and it puts noise in the console of a site that is not yours to break. The cost is that you cannot use the status code for debugging. Use the dashboard, or turn on `debug` and read what the SDK is sending.

## Limits

Rate limits are enforced per minute, in Redis, on two independent counters. Cross either one and events are dropped silently until the minute rolls over.

| Limit                                | Value   |
| ------------------------------------ | ------- |
| Events per minute, free site         | 1,000   |
| Events per minute, pro site          | 10,000  |
| Events per minute, enterprise site   | 100,000 |
| Events per minute, single IP address | 500     |

The IP limit applies across all sites, so one visitor cannot spend a site's whole budget. On a self-hosted instance all of these are yours to change, in `backend/src/config/ratelimit.ts`.

Payload limits: event names up to 255 characters, page titles up to 500, request bodies capped at 8 KB. Malformed URLs in `dl` are rejected outright, since a pageview with no valid URL is not a pageview.
