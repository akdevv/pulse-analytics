"use client";

import { Stage, type StageStep } from "./stage";

const LABELS = [
  { key: "visitor", name: "Visitor", sub: "São Paulo" },
  { key: "server", name: "Your Pulse server", sub: "Frankfurt, say" },
  { key: "owner", name: "You, on the dashboard", sub: "Bangalore" },
];

const STEPS: StageStep[] = [
  {
    focus: null,
    title: "Every pageview is a round trip",
    body: "Scroll to follow one visit from a browser, through your server, to your dashboard.",
  },
  {
    focus: "visitor",
    title: "A visitor opens your page",
    body: "Someone in São Paulo loads your site. pulse.js gets ready to send one small event.",
  },
  {
    focus: "server",
    title: "The event crosses the ocean",
    body: "It travels to wherever you host Pulse. Here that is Frankfurt.",
  },
  {
    focus: "visitor",
    title: "A 204 comes straight back",
    body: "Ingest answers as soon as the event is safe in the queue. The page never waits for the database.",
  },
  {
    focus: "server",
    title: "Queued, then written in a batch",
    body: "The worker gathers events and writes 100 at a time into TimescaleDB.",
  },
  {
    focus: "owner",
    title: "It shows up on your dashboard",
    body: "You're in Bangalore. The live bar moves within a couple of seconds of the visit.",
  },
  {
    focus: null,
    title: "From everywhere, all at once",
    body: "The same trip happens for every visitor, on every site you track.",
  },
];

export function GlobeTrip() {
  return (
    <Stage
      load={(cv, onLabels) =>
        import("./globe-trip-scene").then((m) =>
          m.createGlobeTrip(cv, onLabels)
        )
      }
      labels={LABELS}
      steps={STEPS}
      ariaLabel="A globe showing one pageview travel from São Paulo to a server and on to a dashboard"
    />
  );
}
