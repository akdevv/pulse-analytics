# Pulse frontend

Next.js dashboard, landing page and docs for Pulse Analytics.

## Development

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL points at the backend
pnpm install
pnpm dev                     # http://localhost:3000
```

`pnpm typecheck`, `pnpm lint` and `pnpm build` are the checks CI cares about.

## Live demo

`/demo` opens the real dashboard with no backend behind it. It sets a
`pulse_demo` cookie and reloads into the dashboard, where every API call is
answered in the browser:

- `lib/demo/adapter.ts` is an axios adapter that routes requests to the demo
  handlers instead of the network.
- `lib/demo/data.ts` generates deterministic traffic for two sample sites, so
  charts, totals and breakdowns agree with each other for any date range.
- `lib/demo/ai.ts` answers Ask AI from a fixed set of questions, built from the
  same data.
- The realtime panel is driven by a timer instead of the SSE stream.

Changes made in the demo (new sites, settings, conversations) live in memory
and reset on reload. Exiting the demo, or opening the sign in or sign up page,
clears the cookie.

Because nothing in the demo calls the API, the frontend can be deployed to
Vercel on its own and the demo keeps working while the backend is down.
