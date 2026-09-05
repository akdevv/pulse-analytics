import { sendEvent } from "./tracker.ts";
import type { EventProperties } from "./tracker.ts";

/**
 * Declarative click tracking, wired from Pulse.init(). One delegated listener
 * covers every matching element, including ones React mounts later, so there
 * is nothing to attach per button and nothing to clean up on unmount.
 *
 *   <button data-pulse-event="hire_me_click">Hire me</button>
 *   <button data-pulse-event="plan_picked" data-pulse-props='{"plan":"pro"}'>
 */
export function enableAutoEvents(): void {
  document.addEventListener("click", (e) => {
    const target = e.target as Element | null;
    const el = target?.closest?.("[data-pulse-event]");
    if (!(el instanceof HTMLElement)) return;

    const name = el.dataset.pulseEvent;
    if (!name) return;

    const raw = el.dataset.pulseProps;
    let props: EventProperties | undefined;

    if (raw) {
      try {
        props = JSON.parse(raw) as EventProperties;
      } catch {
        // Bad JSON in an attribute must not cost the event. Send it unadorned.
        console.warn("@pulse: data-pulse-props is not valid JSON.", raw);
      }
    }

    sendEvent("CUSTOM", undefined, props, name);
  });
}
