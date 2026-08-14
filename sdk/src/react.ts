import { useEffect, useRef } from "react";
import { enableSPA } from "./spa.ts";
import { configure, sendEvent, type PulseConfig } from "./tracker.ts";

export function usePulse(config: PulseConfig): void {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    configure(config);
    enableSPA();
    sendEvent("PAGEVIEW");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
