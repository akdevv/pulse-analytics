import { getVisitorId, getSessionId } from "./session.js";

export interface PulseConfig {
  siteId: string;
  apiHost?: string;
  debug?: boolean;
}

export interface PageviewOptions {
  url?: string;
  title?: string;
  referrer?: string;
}

export type EventProperties = Record<string, string | number | boolean>;

let _config: PulseConfig | null = null;

export function configure(config: PulseConfig): void {
  _config = config;
}

export function sendEvent(
  eventType: "PAGEVIEW" | "CLICK" | "CUSTOM",
  pageOptions?: PageviewOptions,
  properties?: EventProperties,
  eventName?: string,
): void {
  if (!_config) {
    console.warn(
      "@pulse: init() not called. Run Pulse.init({ siteId, apiHost }) before tracking.",
    );
    return;
  }

  const url = pageOptions?.url ?? window.location.href;
  const title = pageOptions?.title ?? document.title;
  const referrer = pageOptions?.referrer ?? document.referrer;

  const params = new URLSearchParams({
    v: "1",
    tid: _config.siteId,
    t: eventType,
    dl: url,
    dr: referrer,
    dt: title,
    ul: navigator.language,
    sr: `${screen.width}x${screen.height}`,
    vp: `${window.innerWidth}x${window.innerHeight}`,
    cid: getVisitorId(),
    sid: getSessionId(),
    ts: String(Date.now()),
    z: String(Math.random()),
  });

  if (eventName) {
    params.set("en", eventName);
  }

  if (properties && Object.keys(properties).length > 0) {
    params.set("ep", JSON.stringify(properties));
  }

  const host = _config.apiHost?.replace(/\/$/, "") ?? "";
  const endpoint = `${host}/api/v1/track?${params.toString()}`;

  if (_config.debug) {
    console.log("@pulse [debug]:", eventType, Object.fromEntries(params));
  }

  try {
    fetch(endpoint, {
      method: "POST",
      keepalive: true,
    }).catch(() => {
      // silently swallow — analytics must never throw on the host page
    });
  } catch {
    // fetch itself can throw in some environments (old browsers, CSP blocks)
  }
}
