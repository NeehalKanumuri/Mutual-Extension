/**
 * The Mutual - Slack Huddle Caption Observer
 * Captures live captions from Slack Huddles (app.slack.com) and relays them
 * to The Mutual extension.
 *
 * Note: Slack Huddles don't have DOM-based captions in most cases.
 * This script:
 *  (a) Watches for any live-captions that Slack renders in the accessibility tree
 *  (b) Injects a badge to indicate The Mutual is monitoring
 *  (c) Falls back to relying on the offscreen microphone bridge (SpeechRecognition)
 *      if no DOM captions are found
 */

(function () {
  console.log("[The Mutual] Slack content script initialized.");

  let lastText = "";
  let observer = null;

  function injectBadge() {
    if (document.getElementById("the-mutual-badge")) return;

    const badge = document.createElement("div");
    badge.id = "the-mutual-badge";
    badge.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="width:7px;height:7px;border-radius:50%;background:#2D6A4F;display:inline-block;border:1px solid rgba(45,106,79,0.3);"></span>
        <span style="font-weight:600;color:#1C1917;letter-spacing:0.02em;">The Mutual</span>
        <span style="color:#78716C;font-size:11px;">• Monitoring Alignment (Slack Huddle)</span>
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
      const match = path.match(/\/client\/[A-Z0-9]+\/([A-Z0-9]+)/i) || path.match(/\/archives\/([A-Z0-9]+)/i);
      if (match && match[1]) {
        const meetingId = `huddle-${match[1].toLowerCase()}`;
        if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({
            type: "MEETING_DETECTED",
            payload: {
              platform: "slack",
              meeting_id: meetingId,
              url: window.location.href,
              title: document.title || "Slack Huddle",
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

  const IGNORED_PHRASES = [
    "looking to create a workspace",
    "create a new workspace",
    "workspace instead",
    "sign in to",
    "slack connect"
  ];

  function sendCaption(text, speaker) {
    text = text.trim();
    if (!text || text.length < 5 || text === lastText) return;
    const lower = text.toLowerCase();
    if (IGNORED_PHRASES.some(phrase => lower.includes(phrase))) return;
    lastText = text;

    try {
      chrome.runtime.sendMessage({
        type: "CAPTIONS_CHUNK",
        payload: {
          speaker:   speaker || "Huddle Participant",
          text:      text,
          source:    "slack",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        }
      });
    } catch (e) {}
  }

  function attachObserver() {
    if (observer) return;

    // Slack Huddle live caption selectors (specific to active huddles only)
    const SELECTORS = [
      "[data-qa='huddle_caption']",
      "[class*='huddle_caption']",
      ".p-huddle-closed-caption",
      ".p-huddle-transcript",
      "[data-qa='caption_text']",
      ".c-huddle__caption-text"
    ];

    observer = new MutationObserver(() => {
      for (const sel of SELECTORS) {
        document.querySelectorAll(sel).forEach(el => {
          const text = el.innerText || el.textContent || "";
          if (text.trim().length > 5) {
            sendCaption(text, "Slack Participant");
          }
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    console.log("[The Mutual] Slack caption observer attached.");
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
