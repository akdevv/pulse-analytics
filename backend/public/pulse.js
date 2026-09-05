(function () {
  // <script src="pulse.js" data-tid="pk-abc123" data-host="https://api.pulse.com"></script>
  var currentScript = document.currentScript;
  var tid = currentScript.getAttribute("data-tid");
  var host = currentScript.getAttribute("data-host") || "http://localhost:8000";
  var debug = currentScript.getAttribute("data-debug") === "true";

  if (!tid) {
    console.warn(
      '@pulse: data-tid is required. Add data-tid="your-site-id" to the script tag.',
    );
    return;
  }

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
      sr: screen.width + "x" + screen.height, // screen resolution
      vp: window.innerWidth + "x" + window.innerHeight, // viewport size
      ul: navigator.language || "", // user language
    };
  }

  function send(eventType, eventName, properties) {
    var pageData = collectPageData();

    var params = new URLSearchParams({
      v: "1",
      tid: tid,
      t: eventType,
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

    if (eventName) params.set("en", eventName);
    if (properties && Object.keys(properties).length > 0) {
      params.set("ep", JSON.stringify(properties));
    }

    var url = host + "/api/v1/track?" + params.toString();

    // keepalive: a click that navigates away still finishes sending
    fetch(url, { method: "POST", keepalive: true }).catch(function (err) {
      console.warn("@pulse: failed to send event.", err);
    });
    if (debug) {
      console.log("@pulse: tracked —", eventName || eventType, pageData.dl);
    }
  }

  function sendPageView() {
    send("PAGEVIEW");
  }

  // pushState fires no event of its own, so patch it into one
  var originalPushState = history.pushState;
  history.pushState = function () {
    originalPushState.apply(history, arguments);
    window.dispatchEvent(new Event("pulse:navigation"));
  };

  window.addEventListener("popstate", function () {
    sendPageView();
  });

  window.addEventListener("pulse:navigation", function () {
    sendPageView();
  });

  // Delegated so elements added to the DOM later are covered too:
  //   <button data-pulse-event="plan_picked" data-pulse-props='{"plan":"pro"}'>
  document.addEventListener("click", function (e) {
    var el = e.target && e.target.closest && e.target.closest("[data-pulse-event]");
    if (!el) return;

    var name = el.getAttribute("data-pulse-event");
    if (!name) return;

    var raw = el.getAttribute("data-pulse-props");
    var props;
    if (raw) {
      try {
        props = JSON.parse(raw);
      } catch (err) {
        // bad JSON must not cost the event, so send it without props
        console.warn("@pulse: data-pulse-props is not valid JSON.", raw, err);
      }
    }

    send("CUSTOM", name, props);
  });

  window.Pulse = {
    trackEvent: function (eventName, properties) {
      if (!eventName) {
        console.warn("@pulse: trackEvent needs an event name.");
        return;
      }
      send("CUSTOM", eventName, properties);
    },
    trackPageview: sendPageView,
  };

  sendPageView();
})();
