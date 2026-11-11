"use client";

import { Stat, fmt } from "../kit";
import { Stage, type StageStep } from "./stage";

const LABELS = [
  { key: "laptop", name: "Visitor's browser", sub: "pulse.js" },
  { key: "gate", name: "Ingest", sub: "204 in 4.8 ms" },
  { key: "queue", name: "Queue", sub: "Redis" },
  { key: "worker", name: "Worker", sub: "100 per insert" },
  { key: "silo", name: "Database", sub: "TimescaleDB" },
  { key: "screen", name: "Dashboard", sub: "live" },
];

const STEPS: StageStep[] = [
  {
    focus: null,
    title: "One pageview, start to finish",
    body: "Each orange pill is 25 pageviews. Scroll to follow them through Pulse.",
  },
  {
    focus: "laptop",
    title: "A visitor opens a page",
    body: "pulse.js sends one small request with the path, referrer and screen size.",
  },
  {
    focus: "gate",
    title: "Ingest replies at once",
    body: "The server checks the key, answers 204 in about 5 ms and moves on. The blue pill is that reply.",
  },
  {
    focus: "queue",
    title: "The queue takes the rush",
    body: "A launch just hit. Events line up on the belt instead of hitting the database.",
  },
  {
    focus: "worker",
    title: "The worker writes in batches",
    body: "It presses 100 events into one insert, at its own steady pace.",
  },
  {
    focus: "silo",
    title: "Stored in TimescaleDB",
    body: "Each crate lands in a time-series table, ready to query.",
  },
  {
    focus: "screen",
    title: "Your dashboard updates",
    body: "The live bar grows within a couple of seconds of the visit.",
  },
  {
    focus: null,
    title: "The visitor never waited",
    body: "They got their reply in milliseconds. Everything after that happened in the background.",
  },
];

export function Diorama() {
  return (
    <Stage
      load={(cv, onLabels) =>
        import("./diorama-scene").then((m) => m.createDiorama(cv, onLabels))
      }
      labels={LABELS}
      steps={STEPS}
      spikeOn={3}
      labelsBelow
      ariaLabel="A miniature 3D model of the Pulse pipeline"
      stats={(s) => (
        <div className="grid grid-cols-2 gap-x-8">
          <Stat
            label="On the conveyor"
            value={`${fmt(s.queued ?? 0)} events`}
            tone="hot"
          />
          <Stat label="Stored" value={fmt(s.stored ?? 0)} tone="cool" />
        </div>
      )}
    />
  );
}
