export const DEMO_COOKIE = "pulse_demo";
export const DEMO_HOME = "/dashboard/sites/demo-store";

export function isDemo() {
  return (
    typeof document !== "undefined" &&
    document.cookie.split("; ").includes(`${DEMO_COOKIE}=1`)
  );
}

// Full navigation, so the in-memory demo API is torn down with the page.
export function exitDemo(to = "/") {
  document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0`;
  window.location.assign(to);
}
