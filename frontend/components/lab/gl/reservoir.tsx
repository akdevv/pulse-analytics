"use client";

import { Stat, fmt } from "../kit";
import { Stage, type StageStep } from "./stage";

const LABELS = [
  { key: "traffic", name: "Traffic in", sub: "from your sites" },
  { key: "ingest", name: "Ingest", sub: "204 in 4.8 ms" },
  { key: "queue", name: "Queue", sub: "the level is the backlog" },
  { key: "worker", name: "Worker", sub: "steady batches" },
  { key: "db", name: "Database", sub: "never flooded" },
];

const STEPS: StageStep[] = [
  {
    focus: null,
    title: "Traffic is a flow, not a pile",
    body: "Pulse treats pageviews like water: let them pour in, release them evenly.",
  },
  {
    focus: "traffic",
    title: "Pageviews pour in",
    body: "Every orange drop is a pageview from one of your sites.",
  },
  {
    focus: "ingest",
    title: "The ring answers each one",
    body: "Ingest replies 204 straight away. The blue sparks flying back are those replies.",
  },
  {
    focus: "queue",
    title: "A spike fills the tank",
    body: "A launch just hit. The level rises, and nothing downstream feels it.",
  },
  {
    focus: "worker",
    title: "The valve stays steady",
    body: "The worker lets out a batch every half second, whatever the level.",
  },
  {
    focus: "db",
    title: "The database is never flooded",
    body: "It sees the same calm pace of writes before, during and after the spike.",
  },
  {
    focus: null,
    title: "The tank drains on its own",
    body: "Once the rush passes the level falls back. No events were dropped.",
  },
];

export function Reservoir() {
  return (
    <Stage
      load={(cv, onLabels) =>
        import("./reservoir-scene").then((m) => m.createReservoir(cv, onLabels))
      }
      labels={LABELS}
      steps={STEPS}
      spikeOn={3}
      ariaLabel="A glass tank filling with traffic and draining at a steady pace"
      stats={(s) => (
        <div className="grid grid-cols-3 gap-x-8">
          <Stat
            label="Pouring in"
            value={`${fmt(s.inflow ?? 0)}/s`}
            tone="hot"
          />
          <Stat label="In the tank" value={fmt(s.queued ?? 0)} />
          <Stat
            label="To the DB"
            value={`${fmt(s.outflow ?? 0)}/s`}
            tone="cool"
          />
        </div>
      )}
    />
  );
}
