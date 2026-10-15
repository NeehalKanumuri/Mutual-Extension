/**
 * The Mutual - Zoom Caption Observer
 * Captures live captions from Zoom Web App (app.zoom.us) and relays them to The Mutual.
 */

(function () {
  console.log("[The Mutual] Zoom content script initialized.");

  let lastText   = "";
  let observer   = null;

  function injectBadge() {
    if (document.getElementById("the-mutual-badge")) return;

    const badge = document.createElement("div");
    badge.id = "the-mutual-badge";
    badge.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="width:7px;height:7px;border-radius:50%;background:#2D6A4F;display:inline-block;border:1px solid rgba(45,106,79,0.3);"></span>
        <span style="font-weight:600;color:#1C1917;letter-spacing:0.02em;">The Mutual</span>
        <span style="color:#78716C;font-size:11px;">• Monitoring Alignment (Zoom)</span>
      </div>
    `;
    Object.assign(badge.style, {
      position: "fixed", top: "16px", left: "16px", zIndex: "99999",
      background: "rgba(255,255,255,0.94)", backdropFilter: "blur(8px)",
      border: "1px solid rgba(0,0,0,0.08)", borderRadius: "20px",
      padding: "6px 14px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
      fontFamily: "system-ui,-apple-system,sans-serif", fontSize: "12px",
      color: "#292524", userSelect: "none", cursor: "pointer"
    });
    badge.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "OPEN_SIDEPANEL" });
    });
    document.body && document.body.appendChild(badge);
  }

  function detectMeetingSession() {
    try {
      const path = window.location.pathname || "";
      const match = path.match(/\/(?:j|wc)\/(\d+)/i) || path.match(/\/postattendee.*[?&]confno=(\d+)/i);
      let meetingId = match ? match[1] : null;
      if (!meetingId) {
        const urlParams = new URLSearchParams(window.location.search);
        meetingId = urlParams.get("confno") || urlParams.get("meetingId");
      }
      if (meetingId && meetingId.length >= 6) {
        if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({
            type: "MEETING_DETECTED",
            payload: {
              platform: "zoom",
              meeting_id: meetingId,
              url: window.location.href,
              title: document.title || "Zoom Session",
              timestamp: Date.now()
            }
          });
        }
      }
    } catch (e) {}
  }

  // Option+M / ⌥M shortcut
  window.addEventListener("keydown", (e) => {
    const isM = (e.code === "KeyM" || e.key === "m" || e.key === "M" || e.key === "µ");
    if (isM && (e.altKey || (e.metaKey && e.shiftKey))) {
      chrome.runtime.sendMessage({ type: "OPEN_SIDEPANEL" });
    }
  });

  function sendCaption(text, speaker) {
    text = text.trim();
    if (!text || text.length < 5 || text === lastText) return;
    lastText = text;

    try {
      chrome.runtime.sendMessage({
        type: "CAPTIONS_CHUNK",
        payload: {
          speaker: speaker || "Participant",
          text:    text,
          source:  "zoom",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        }
      });
    } catch (e) {}
  }

  function attachObserver() {
    if (observer) return;

    // Zoom Web App caption selectors (multiple versions / layouts)
    const SELECTORS = [
      ".live-transcription-subtitle",           // Desktop web client
      "[class*='ClosedCaption']",               // Legacy class
      "[class*='caption-text']",                // Alt class
      "[aria-label*='Caption']",               // Accessibility label
      ".subtitle-section",                      // Another variant
    ];

    observer = new MutationObserver(() => {
      for (const sel of SELECTORS) {
        const els = document.querySelectorAll(sel);
        els.forEach(el => {
          const text = el.innerText || el.textContent || "";
          // Zoom often shows "Speaker Name: text" format
          const colonIdx = text.indexOf(":");
          let speaker = "Participant", body = text;
          if (colonIdx > 0 && colonIdx < 40) {
            speaker = text.slice(0, colonIdx).trim();
            body    = text.slice(colonIdx + 1).trim();
          }
          sendCaption(body, speaker);
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    console.log("[The Mutual] Zoom caption observer attached.");
  }

  function init() {
    injectBadge();
    attachObserver();
    detectMeetingSession();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  setInterval(() => {
    injectBadge();
    detectMeetingSession();
  }, 5000);
})();
