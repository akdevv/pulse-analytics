import { sendEvent } from "./tracker.ts";

export function enableSPA(): void {
  // Handle back/forward browser navigation
  window.addEventListener("popstate", () => {
    sendEvent("PAGEVIEW");
  });

  // Monkey-patch history.pushState
  const originalPushState = history.pushState.bind(history);

  history.pushState = function (
    state: unknown,
    unused: string,
    url?: string | URL | null,
  ): void {
    originalPushState(state, unused, url);
    sendEvent("PAGEVIEW");
  };

  // Monkey-patch history.replaceState
  const originalReplaceState = history.replaceState.bind(history);

  history.replaceState = function (
    state: unknown,
    unused: string,
    url?: string | URL | null,
  ): void {
    originalReplaceState(state, unused, url);
    sendEvent("PAGEVIEW");
  };
}
