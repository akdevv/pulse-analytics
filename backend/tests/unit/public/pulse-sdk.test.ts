import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * pulse.js is browser code served straight from backend/public — no bundler,
 * no module system, and no DOM available in this suite. Rather than pull in
 * jsdom for one file, the IIFE is run through `new Function` with the handful
 * of globals it actually touches passed in as parameters. Bare identifiers in
 * the source resolve to those parameters, so the real file is exercised
 * unmodified and nothing leaks onto globalThis.
 */
const SOURCE = readFileSync(
  fileURLToPath(new URL("../../../public/pulse.js", import.meta.url)),
  "utf8"
);

const TID = "pk-test1234567890123456789012345678";
const HOST = "https://api.example.test";

type Harness = {
  /** Every URL passed to fetch, in order. */
  calls: string[];
  /** The document-level click handler pulse.js registered. */
  click: (event: unknown) => void;
  /** Whatever pulse.js attached to window.Pulse. */
  Pulse: {
    trackEvent: (name?: string, props?: unknown) => void;
    trackPageview: () => void;
  };
  warn: ReturnType<typeof vi.fn>;
  log: ReturnType<typeof vi.fn>;
};

function load(debug = false): Harness {
  const calls: string[] = [];
  const listeners: Record<string, (event: unknown) => void> = {};
  const store = new Map<string, string>();

  const storage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  };

  const documentStub = {
    currentScript: {
      getAttribute: (name: string) =>
          name === "data-tid"
          ? TID
          : name === "data-host"
            ? HOST
            : name === "data-debug"
              ? debug
                ? "true"
                : null
              : null,
    },
    title: "Test page",
    referrer: "",
    addEventListener: (type: string, fn: (event: unknown) => void) => {
      listeners[type] = fn;
    },
  };

  const windowStub: Record<string, unknown> = {
    location: { href: "https://site.test/pricing" },
    innerWidth: 1280,
    innerHeight: 800,
    addEventListener: () => {},
    dispatchEvent: () => {},
  };

  const warn = vi.fn();
  const log = vi.fn();

  new Function(
    "document",
    "window",
    "screen",
    "navigator",
    "localStorage",
    "sessionStorage",
    "history",
    "fetch",
    "console",
    "Event",
    SOURCE
  )(
    documentStub,
    windowStub,
    { width: 1920, height: 1080 },
    { language: "en-US" },
    storage,
    storage,
    { pushState: () => {}, replaceState: () => {} },
    (url: string) => {
      calls.push(url);
      return Promise.resolve();
    },
    { warn, log, error: () => {} },
    class {}
  );

  return {
    calls,
    click: listeners.click!,
    Pulse: windowStub.Pulse as Harness["Pulse"],
    warn,
    log,
  };
}

/** A click landing on `el`, matching the real event's target.closest(). */
function clickOn(attrs: Record<string, string | null>) {
  const el = {
    getAttribute: (name: string) => attrs[name] ?? null,
  };
  return {
    target: {
      closest: (selector: string) =>
        selector === "[data-pulse-event]" && attrs["data-pulse-event"] !== null
          ? el
          : null,
    },
  };
}

function params(url: string): URLSearchParams {
  return new URL(url).searchParams;
}

describe("pulse.js", () => {
  let h: Harness;

  beforeEach(() => {
    h = load();
  });

  it("sends a pageview on load", () => {
    expect(h.calls).toHaveLength(1);
    const p = params(h.calls[0]!);
    expect(p.get("t")).toBe("PAGEVIEW");
    expect(p.get("tid")).toBe(TID);
    expect(p.get("dl")).toBe("https://site.test/pricing");
    // A pageview carries no event name — the events queries filter on that.
    expect(p.get("en")).toBeNull();
  });

  it("registers a document-level click listener", () => {
    expect(typeof h.click).toBe("function");
  });

  it("tracks a click on data-pulse-event", () => {
    h.click(clickOn({ "data-pulse-event": "hire_me_click" }));

    expect(h.calls).toHaveLength(2);
    const p = params(h.calls[1]!);
    expect(p.get("t")).toBe("CUSTOM");
    expect(p.get("en")).toBe("hire_me_click");
    expect(p.get("ep")).toBeNull();
  });

  it("sends data-pulse-props as JSON alongside the name", () => {
    h.click(
      clickOn({
        "data-pulse-event": "plan_picked",
        "data-pulse-props": '{"plan":"pro"}',
      })
    );

    const p = params(h.calls[1]!);
    expect(p.get("en")).toBe("plan_picked");
    expect(JSON.parse(p.get("ep")!)).toEqual({ plan: "pro" });
  });

  // Bad JSON in an attribute is the author's typo, not the visitor's fault.
  // Losing the click entirely would be the worse failure.
  it("still sends the event when data-pulse-props is not valid JSON", () => {
    h.click(
      clickOn({
        "data-pulse-event": "plan_picked",
        "data-pulse-props": "{plan: pro}",
      })
    );

    expect(h.calls).toHaveLength(2);
    const p = params(h.calls[1]!);
    expect(p.get("en")).toBe("plan_picked");
    expect(p.get("ep")).toBeNull();
    expect(h.warn).toHaveBeenCalled();
  });

  it("ignores clicks that miss a data-pulse-event element", () => {
    h.click(clickOn({ "data-pulse-event": null }));
    expect(h.calls).toHaveLength(1);
  });

  it("exposes trackEvent on window", () => {
    h.Pulse.trackEvent("signup_completed", { plan: "pro" });

    const p = params(h.calls[1]!);
    expect(p.get("t")).toBe("CUSTOM");
    expect(p.get("en")).toBe("signup_completed");
    expect(JSON.parse(p.get("ep")!)).toEqual({ plan: "pro" });
  });

  it("drops a trackEvent call with no name rather than sending an unnamed event", () => {
    h.Pulse.trackEvent();
    expect(h.calls).toHaveLength(1);
    expect(h.warn).toHaveBeenCalled();
  });

  // A host site's console is not ours to fill with one line per click.
  it("stays quiet unless data-debug is set", () => {
    h.Pulse.trackEvent("a");
    expect(h.log).not.toHaveBeenCalled();
  });

  it("logs every event when data-debug is true", () => {
    const d = load(true);
    d.Pulse.trackEvent("a");
    expect(d.log).toHaveBeenCalled();
  });

  // Warnings are a developer's own mistake, so they are never gated on debug.
  it("warns about invalid props even with debug off", () => {
    h.click(
      clickOn({
        "data-pulse-event": "x",
        "data-pulse-props": "nope",
      })
    );
    expect(h.log).not.toHaveBeenCalled();
    expect(h.warn).toHaveBeenCalled();
  });

  it("reuses the visitor and session ids across events", () => {
    h.Pulse.trackEvent("a");
    h.Pulse.trackEvent("b");

    const [first, second] = [params(h.calls[1]!), params(h.calls[2]!)];
    expect(first.get("cid")).toBe(second.get("cid"));
    expect(first.get("sid")).toBe(second.get("sid"));
  });
});
