(function () {
  // --- Read config from the script ---
  // <script src="pulse.js" data-tid="pk-abc123" data-host="https://api.pulse.com"></script>;
  var currentScript = document.currentScript;
  var tid = currentScript.getAttribute("data-tid");
  var host = currentScript.getAttribute("data-host") || "http://localhost:8000";

  if (!tid) {
    console.warn(
      '@pulse: data-tid is required. Add data-tid="your-site-id" to the script tag.',
    );
    return; // exit early, nothing works without tid
  }

  // Utilities
  function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        var r = (Math.random() * 16) | 0;
        var v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
  }

  function getVisitorId() {
    var key = "pulse_cid";
    var existing = localStorage.getItem(key);

    if (existing) return existing;

    var newId = generateUUID();
    localStorage.setItem(key, newId);
    return newId;
  }

  function getSessionId() {
    var key = "pulse_sid";
    var existing = sessionStorage.getItem(key);

    if (existing) return existing;

    var newId = generateUUID();
    sessionStorage.setItem(key, newId);
    return newId;
  }

  function collectPageData() {
    return {
      dl: window.location.href, // document location (URL)
      dt: document.title || "", // page title
      dr: document.referrer || "", // referrer
      sr: screen.width + "x" + screen.height, // screen resoultion
      vp: window.innerWidth + "x" + window.innerHeight, // viewport size
      ul: navigator.language || "", // user language
    };
  }

  function sendPageView() {
    var pageData = collectPageData();

    var params = new URLSearchParams({
      v: "1",
      tid: tid,
      t: "PAGEVIEW",
      cid: getVisitorId(),
      sid: getSessionId(),
      dl: pageData.dl,
      dt: pageData.dt,
      dr: pageData.dr,
      sr: pageData.sr,
      vp: pageData.vp,
      ul: pageData.ul,
      z: Math.random(), // cache buster
    });
    var url = host + "/api/v1/track?" + params.toString();

    // fire & forget - we don't await or handle the response
    fetch(url, { method: "POST" }).catch(function (err) {
      // silent error handle - never break host page
      console.warn("@pulse: failed to send pageview.", err);
    });
    console.log("@pulse: pageview tracked —", pageData.dl);
  }

  // SPA navigation detection
  // Monkey-patch history.pushState to emit a custom event
  // when the router navigates programmatically
  var originalPushState = history.pushState;
  history.pushState = function () {
    originalPushState.apply(history, arguments);
    window.dispatchEvent(new Event("pulse:navigation"));
  };

  // back/forward button navigation
  window.addEventListener("popstate", function () {
    sendPageView();
  });

  // programmatic navigation (react-router, next.js router, etc.)
  window.addEventListener("pulse:navigation", function () {
    sendPageView();
  });

  // initial pageview on load
  sendPageView();
})();
