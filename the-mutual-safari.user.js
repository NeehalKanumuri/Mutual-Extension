// ==UserScript==
// @name         The Mutual — Safari In-Page Companion
// @namespace    https://themutual.ai/
// @version      1.0.0
// @description  Behavioral alignment, ambiguity interceptor, and delegation handshake for Safari (Meet, Zoom, Teams, Slack, Docs)
// @author       The Mutual Team
// @match        https://meet.google.com/*
// @match        https://app.zoom.us/*
// @match        https://zoom.us/wc/*
// @match        https://teams.microsoft.com/*
// @match        https://teams.live.com/*
// @match        https://app.slack.com/*
// @match        https://docs.google.com/document/*
// @match        https://mail.google.com/*
// @match        https://www.notion.so/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';
  if (window.__theMutualSafariInjected) return;
  window.__theMutualSafariInjected = true;

  console.log("[The Mutual] Safari Companion script activated.");

  const BACKEND_URL = "http://localhost:8000";
  let isDrawerOpen = false;

  // 1. Create floating badge & slide-out drawer
  function initUI() {
    if (document.getElementById("the-mutual-safari-root")) return;

    const root = document.createElement("div");
    root.id = "the-mutual-safari-root";
    root.innerHTML = `
      <style>
        #the-mutual-safari-tab {
          position: fixed;
          top: 140px;
          right: 0;
          z-index: 2147483646;
          background: #FFFFFF;
          color: #1C1917;
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-right: none;
          border-top-left-radius: 12px;
          border-bottom-left-radius: 12px;
          padding: 8px 12px 8px 10px;
          box-shadow: -3px 4px 16px rgba(0, 0, 0, 0.08);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 7px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 12px;
          font-weight: 600;
          transition: transform 0.2s ease, opacity 0.2s ease;
          user-select: none;
        }
        #the-mutual-safari-tab:hover {
          transform: translateX(-4px);
        }
        .the-mutual-live-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #2D6A4F;
          box-shadow: 0 0 6px rgba(45, 106, 79, 0.5);
          display: inline-block;
        }
        #the-mutual-safari-panel {
          position: fixed;
          top: 0;
          right: 0;
          width: 440px;
          max-width: 90vw;
          height: 100vh;
          background: #FAFAF9;
          border-left: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: -12px 0 36px rgba(0, 0, 0, 0.14);
          transform: translateX(100%);
          transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 2147483647;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        #the-mutual-safari-panel.open {
          transform: translateX(0);
        }
        #the-mutual-safari-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: #FFFFFF;
          border-bottom: 1px solid #E7E5E4;
        }
        #the-mutual-safari-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .the-mutual-header-title {
          font-size: 13px;
          font-weight: 700;
          color: #1C1917;
        }
        .the-mutual-header-tag {
          font-size: 10px;
          font-weight: 600;
          background: #E8F5E9;
          color: #2D6A4F;
          padding: 2px 7px;
          border-radius: 10px;
        }
        .the-mutual-header-hint {
          font-size: 11px;
          color: #A8A29E;
        }
        #the-mutual-safari-close-btn {
          background: none;
          border: none;
          font-size: 15px;
          color: #78716C;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
        }
        #the-mutual-safari-close-btn:hover {
          background: #F5F5F4;
          color: #1C1917;
        }
        #the-mutual-safari-iframe {
          flex: 1;
          width: 100%;
          border: none;
          background: #FAFAF9;
        }
      </style>

      <div id="the-mutual-safari-tab" title="Toggle The Mutual Side Panel (Option+M)">
        <span class="the-mutual-live-dot"></span>
        <span>The Mutual</span>
      </div>

      <div id="the-mutual-safari-panel">
        <div id="the-mutual-safari-header">
          <div id="the-mutual-safari-header-left">
            <span class="the-mutual-live-dot"></span>
            <span class="the-mutual-header-title">The Mutual</span>
            <span class="the-mutual-header-tag">Safari</span>
            <span class="the-mutual-header-hint">⌥M</span>
          </div>
          <button id="the-mutual-safari-close-btn" title="Close Panel (⌥M)">✕</button>
        </div>
        <iframe
          id="the-mutual-safari-iframe"
          src="${BACKEND_URL}/sidepanel.html"
          allow="microphone; camera; display-capture; clipboard-write"
        ></iframe>
      </div>
    `;

    document.body.appendChild(root);

    const tab = document.getElementById("the-mutual-safari-tab");
    const closeBtn = document.getElementById("the-mutual-safari-close-btn");
    const panel = document.getElementById("the-mutual-safari-panel");

    function toggle(force) {
      isDrawerOpen = typeof force === "boolean" ? force : !isDrawerOpen;
      if (isDrawerOpen) {
        panel.classList.add("open");
        tab.style.opacity = "0";
      } else {
        panel.classList.remove("open");
        tab.style.opacity = "1";
      }
    }

    tab.addEventListener("click", () => toggle());
    closeBtn.addEventListener("click", () => toggle(false));

    function isOptionM(e) {
      const isM = (e.code === "KeyM" || e.key === "m" || e.key === "M" || e.key === "µ" || e.key === "Âµ");
      return isM && (e.altKey || (e.metaKey && e.shiftKey) || (e.ctrlKey && e.shiftKey));
    }

    window.addEventListener("keydown", (e) => {
      if (isOptionM(e)) {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }
    }, true);
  }

  // 2. Observe captions on Google Meet, Zoom, Teams
  let lastCaptured = "";
  function sendChunk(text, speaker) {
    text = (text || "").trim();
    if (text.length < 5 || text === lastCaptured) return;
    lastCaptured = text;

    // Relay to backend
    fetch(`${BACKEND_URL}/api/intercept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript_chunk: text,
        speaker: speaker || "Speaker"
      })
    }).catch(() => {});
  }

  function startCaptionObserver() {
    const SELECTORS = [
      "div[jsname='r4nke']", ".a4bIc", "div[aria-live='polite']", // Meet
      ".live-transcription-subtitle", "[class*='caption']",       // Zoom
      "[data-tid='closed-caption-display']"                      // Teams
    ];

    const observer = new MutationObserver(() => {
      for (const sel of SELECTORS) {
        document.querySelectorAll(sel).forEach(el => {
          const text = el.innerText || el.textContent || "";
          if (text.trim().length > 6) {
            sendChunk(text, "Meeting Speaker");
          }
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initUI();
      startCaptionObserver();
    });
  } else {
    initUI();
    startCaptionObserver();
  }
})();
