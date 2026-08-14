import type {
  PulseConfig,
  PageviewOptions,
  EventProperties,
} from "./tracker.ts";
import { enableSPA } from "./spa.ts";
import { configure, sendEvent } from "./tracker.ts";

const Pulse = {
  /**
   * Initialize Pulse Analytics. Must be called once before any tracking.
   * Sends an initial pageview and enables automatic SPA route tracking.
   *
   * @param config - Configuration options
   * @param config.siteId - Your site tracking ID
   * @param config.apiHost - Your Pulse backend URL
   * @param config.debug - Enable debug logging (default: false)
   *
   * @example
   * Pulse.init({ siteId: 'pk-abc123', apiHost: 'https://api.pulse.com' })
   */
  init(config: PulseConfig): void {
    configure(config);
    enableSPA();

    // Send the first pageview immediately on initialization
    sendEvent("PAGEVIEW");
  },

  /**
   * Track a pageview. Useful for manual control or when automatic SPA
   * tracking doesn't capture a route change.
   *
   * @param options - Optional overrides for the current page
   * @param options.url - Override the page URL
   * @param options.title - Override the page title
   * @param options.referrer - Override the referrer
   *
   * @example
   * Pulse.trackPageview()
   * Pulse.trackPageview({ url: '/checkout', title: 'Checkout' })
   */
  trackPageview(options?: PageviewOptions): void {
    sendEvent("PAGEVIEW", options);
  },

  /**
   * Track a custom event with an optional payload.
   *
   * @param eventName - Event identifier, use snake_case or camelCase
   * @param properties - Optional key-value metadata for the event
   *
   * @example
   * Pulse.trackEvent('signup', { plan: 'pro', source: 'landing_page' })
   * Pulse.trackEvent('purchase', { amount: 49, currency: 'USD' })
   * Pulse.trackEvent('video_play')
   */
  trackEvent(eventName: string, properties?: EventProperties): void {
    sendEvent("CUSTOM", undefined, properties, eventName);
  },
};

export { Pulse };
export type { PulseConfig, PageviewOptions, EventProperties };
export { getVisitorId, getSessionId } from "./session.js";
