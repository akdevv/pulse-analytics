import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

const subscribe = (onChange: () => void) => {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
};

// useSyncExternalStore rather than useState + useEffect: a media query is an
// external store, and reading it in an effect meant one extra render on mount
// plus a wrong first paint. The server snapshot is false — SSR has no viewport,
// so it renders desktop and corrects on hydration.
export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  );
}
