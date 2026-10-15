/**
 * The Mutual - Google Meet Real-Time Caption Observer
 * Captures live captions from Google Meet DOM and relays them to The Mutual Interceptor.
 * Works seamlessly with zero microphone permissions by intercepting Meet's CC stream.
 */

(function () {
  console.log("[The Mutual] Google Meet content script initialized.");

  let lastCapturedSentence = "";
  let lastSpeaker = "Speaker";
  let observer = null;
  let isCaptionsActive = false;

  // Insert subtle non-intrusive status badge into Meet UI
  function injectStatusBadge() {
    let badge = document.getElementById("the-mutual-meet-badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "the-mutual-meet-badge";
      document.body.appendChild(badge);

      badge.addEventListener("click", () => {
        // Request opening side panel
        if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ type: "OPEN_SIDEPANEL" });
        }
      });
    }

    const dotColor = isCaptionsActive ? "#2D6A4F" : "#D97706";
    const statusText = isCaptionsActive ? "Captions Intercepting" : "Click 'CC' for Live Stream";

    badge.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="width:7px; height:7px; border-radius:50%; background:${dotColor}; display:inline-block;"></span>
        <span style="font-weight:600; color:#1C1917; letter-spacing:0.02em;">The Mutual</span>
        <span style="color:#78716C; font-size:11px;">• ${statusText}</span>
      </div>
    `;

    Object.assign(badge.style, {
      position: "fixed",
      top: "16px",
      left: "16px",
      zIndex: "99999",
      background: "rgba(255, 255, 255, 0.94)",
      backdropFilter: "blur(8px)",
      border: "1px solid rgba(0, 0, 0, 0.08)",
      borderRadius: "20px",
      padding: "6px 14px",
      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "12px",
      color: "#292524",
      userSelect: "none",
      transition: "opacity 0.2s ease, transform 0.15s ease",
      cursor: "pointer"
    });

    badge.title = "The Mutual: Click to toggle Side Panel (or press ⌥M).";
  }

  // Keyboard shortcut listener (Option + M / ⌥M)
  window.addEventListener("keydown", (e) => {
    const isM = (e.code === "KeyM" || e.key === "m" || e.key === "M" || e.key === "µ");
    if (isM && (e.altKey || (e.metaKey && e.shiftKey))) {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: "OPEN_SIDEPANEL" });
      }
    }
  });

  // UI strings to strictly ignore (prevent capturing Meet menus, tooltips, buttons)
  const IGNORE_PATTERNS = [
    /receive desktop notifications/i,
    /allow notifications/i,
    /schedule in google calendar/i,
    /in-person notes/i,
    /your meeting is safe/i,
    /out of range/i,
    /developing an extension/i,
    /audio settings/i,
    /host controls/i,
    /share screen/i,
    /meeting details/i,
    /let gemini take notes/i,
    /start taking notes/i,
    /more options for/i,
    /press the down arrow/i,
    /turn on captions/i
  ];

  function isIgnoredUI(text) {
    if (!text || text.length < 5) return true;
    for (const pat of IGNORE_PATTERNS) {
      if (pat.test(text)) return true;
    }
    return false;
  }

  // Observe Google Meet Captions DOM
  function initCaptionObserver() {
    if (observer) return;

    observer = new MutationObserver((mutations) => {
      let foundCaption = false;

      for (const mutation of mutations) {
        if (!mutation.addedNodes.length) continue;

        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;

          // Target genuine Google Meet caption containers only!
          let captionEl = null;
          if (node.classList && node.classList.contains("a4bIc")) {
            captionEl = node;
          } else if (node.closest && (node.closest(".a4bIc") || node.closest("div[jsname='r4nke']"))) {
            captionEl = node;
          } else if (node.querySelector) {
            captionEl = node.querySelector(".a4bIc") || node.querySelector("div[jsname='r4nke'] span");
          }

          if (!captionEl) continue;

          foundCaption = true;
          isCaptionsActive = true;

          let captionText = (captionEl.innerText || captionEl.textContent || "").trim();

          // Search for speaker
          let speaker = "Speaker";
          const speakerEl = captionEl.closest("[jscontroller]")?.querySelector(".zs75td")
            || captionEl.parentElement?.querySelector(".zs75td")
            || document.querySelector(".zs75td");

          if (speakerEl && speakerEl.innerText) {
            speaker = speakerEl.innerText.trim();
          }

          // Filter out UI noise and duplicates
          if (captionText && captionText.length > 5 && captionText !== lastCapturedSentence && !isIgnoredUI(captionText)) {
            // Check if it's a spoken phrase
            if (captionText.includes(" ") && !captionText.endsWith("...")) {
              lastCapturedSentence = captionText;
              lastSpeaker = speaker;

              const payload = {
                speaker: speaker,
                text: captionText,
                source: "google_meet",
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
              };

              try {
                chrome.runtime.sendMessage({
                  type: "CAPTIONS_CHUNK",
                  payload: payload
                });
              } catch (e) {}
            }
          }
        }
      }

      if (foundCaption) {
        injectStatusBadge();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    console.log("[The Mutual] Caption mutation observer attached.");
  }

  // Detect Google Meet ID from URL and broadcast to extension
  function detectMeetingSession() {
    try {
      const path = window.location.pathname || "";
      const match = path.match(/\/([a-z0-9\-]+)/i);
      if (match && match[1] && match[1].length >= 4 && !["new", "landing", "lookup"].includes(match[1].toLowerCase())) {
        const meetingId = match[1].toLowerCase();
        if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({
            type: "MEETING_DETECTED",
            payload: {
              platform: "google_meet",
              meeting_id: meetingId,
              url: window.location.href,
              title: document.title || "Google Meet Session",
              timestamp: Date.now()
            }
          });
        }
      }
    } catch (e) {}
  }

  function checkReady() {
    injectStatusBadge();
    initCaptionObserver();
    detectMeetingSession();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkReady);
  } else {
    checkReady();
  }

  setInterval(() => {
    injectStatusBadge();
    detectMeetingSession();
  }, 4000);
})();

