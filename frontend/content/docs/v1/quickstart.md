Pulse is a self-hosted analytics backend. You point a small script at it, and it records pageviews and custom events for one site. No cookies, no third party, and the data stays in your database.

This page takes you from a fresh account to a pageview on the dashboard. Budget two minutes.

## 1. Create a site

Sign in, open the dashboard, and choose **New site**. You need a name and a domain.

The domain is a label for your own benefit. Pulse matches incoming events on the tracking ID, not on the hostname they came from, so a site created as `example.com` still records events fired from `localhost` while you develop.

You get a tracking ID that looks like this:

```
pk-8f2c41a9d7e04b6fa1c35d8e92b74a06
```

It is public. It ships in your HTML and anyone who views source can read it, the same as any analytics tag. It grants nothing except the ability to send events to that site.

## 2. Add the snippet

Paste this into the `<head>` of every page you want tracked. Your own tracking ID goes in `data-tid`.

```html
<!-- Pulse Analytics -->
<script
  src="{{API_ORIGIN}}/pulse.js"
  data-tid="pk-8f2c41a9d7e04b6fa1c35d8e92b74a06"
  data-host="{{API_ORIGIN}}"
></script>
```

The setup page for your site has this snippet with the ID already filled in.

Two details worth knowing:

`data-host` is the API origin with no path. The script appends `/api/v1/track` itself, so a trailing `/api/v1` here produces a 404 on every event.

Put the tag in `<head>`, not at the end of `<body>`. The script is 3 KB and fires its pageview the moment it runs, so the lower it sits in the document the more early leavers you miss. Add `defer` if you would rather it wait for parsing to finish.

Using npm instead, or running a framework with client side routing? See [Installation](/docs/installation).

## 3. Verify

Load a page on your site, then open the dashboard. The realtime widget updates within a few seconds.

To test without deploying, fire an event from your terminal:

```bash
curl -X POST "{{API_ORIGIN}}/api/v1/track" \
  -G \
  --data-urlencode "v=1" \
  --data-urlencode "tid=pk-8f2c41a9d7e04b6fa1c35d8e92b74a06" \
  --data-urlencode "t=PAGEVIEW" \
  --data-urlencode "dl=https://example.com/" \
  --data-urlencode "dt=Home"
```

One thing to keep in mind before you read anything into the response. `/track` answers `204 No Content` to everything: accepted events, unknown tracking IDs, malformed parameters, rate limited requests. That is deliberate, because a tracking endpoint should never leak state to the page it is measuring or throw errors into someone's console. The consequence for you is that a `204` proves the request arrived and nothing more. The dashboard is the only real confirmation.

## What Pulse records

Every event carries the page URL, title, referrer, screen and viewport size, and browser language. The server adds the device, browser, and OS by parsing the user agent, and a country from the IP address.

Two identifiers are generated in the browser:

- `pulse_cid`, a random visitor ID in `localStorage`, which survives across visits
- `pulse_sid`, a random session ID in `sessionStorage`, which dies when the tab closes

Both are UUIDs with nothing derived from the person. No cookies are set, so no consent banner is required for Pulse itself. The raw IP address is used for the country lookup and is not part of what the dashboard shows.

## When nothing shows up

| What you see                                       | Usual cause                                                                                                                                    |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| No events at all, no network request in devtools   | An ad blocker ate the script. Test in a private window with blocking off.                                                                      |
| Request fires, 404 in the network tab              | `data-host` includes `/api/v1`. Remove it, the script adds the path.                                                                           |
| Request fires, 204, still nothing on the dashboard | The tracking ID is wrong or belongs to a deleted site. Copy it again from the setup page.                                                      |
| `Refused to load the script` in the console        | Content Security Policy. Add the API origin to `script-src` and `connect-src`. See [Installation](/docs/installation#content-security-policy). |
| Works locally, silent in production                | The production build is serving an older bundle, or the snippet only made it into one layout. Check view source on the live page.              |
| Events stop mid traffic spike                      | Rate limiting. A free site accepts 1,000 events per minute. See [SDK reference](/docs/reference#limits).                                       |

## Next

[Installation](/docs/installation) covers the npm package and framework specific setup. [Custom events](/docs/events) is where Pulse starts telling you things a pageview cannot.
