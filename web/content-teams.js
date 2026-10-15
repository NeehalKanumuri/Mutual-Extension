/**
 * The Mutual - Microsoft Teams Caption Observer
 * Captures live captions from Microsoft Teams Web (teams.microsoft.com / teams.live.com)
 * and relays them to The Mutual extension.
 */

(function () {
  console.log("[The Mutual] Microsoft Teams content script initialized.");

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
        <span style="color:#78716C;font-size:11px;">• Monitoring Alignment (Teams)</span>
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
      const url = window.location.href || "";
      let meetingId = null;
      const joinMatch = url.match(/meetup-join\/([^/?]+)/i);
      if (joinMatch) {
        meetingId = joinMatch[1].slice(0, 16);
      } else {
        const callingMatch = url.match(/modern-calling\/([^/?]+)/i) || url.match(/[?&]meetingId=([^&]+)/i);
        if (callingMatch) {
          meetingId = callingMatch[1].slice(0, 16);
        }
      }
      if (meetingId) {
        if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({
            type: "MEETING_DETECTED",
            payload: {
              platform: "teams",
              meeting_id: meetingId,
              url: window.location.href,
              title: document.title || "Teams Session",
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
          speaker:   speaker || "Participant",
          text:      text,
          source:    "teams",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        }
      });
    } catch (e) {}
  }

  function attachObserver() {
    if (observer) return;

    // Teams closed-caption / live transcript selectors
    const CAPTION_SELECTORS = [
      "[data-tid='closed-caption-display']",            // Primary CC panel
      "[data-tid='closed-caption-text']",
      "[class*='live-caption']",
      "[class*='caption-container']",
      "[class*='cc-display']",
      ".ts-caption-text",
      "[aria-label*='caption']",
    ];

    const SPEAKER_SELECTORS = [
      "[data-tid='closed-caption-speaker-name']",
      "[class*='speaker-name']",
    ];

    observer = new MutationObserver(() => {
      for (const sel of CAPTION_SELECTORS) {
        document.querySelectorAll(sel).forEach(el => {
          let speaker = "Participant";
          // Try to get speaker from sibling or parent
          for (const sSel of SPEAKER_SELECTORS) {
            const sp = el.closest("[data-tid]")?.querySelector(sSel)
              || el.parentElement?.querySelector(sSel);
            if (sp) { speaker = sp.innerText || sp.textContent || "Participant"; break; }
          }
          const text = el.innerText || el.textContent || "";
          sendCaption(text, speaker.trim());
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    console.log("[The Mutual] Teams caption observer attached.");
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
