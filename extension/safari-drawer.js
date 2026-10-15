/**
 * The Mutual — Safari In-Page Floating Sidebar Drawer
 * Provides a persistent Side Panel experience inside Safari for
 * Google Meet, Zoom, Microsoft Teams, Slack, Google Docs, Notion, and local companion.
 */

(function () {
  if (window.__theMutualDrawerInitialized) return;
  window.__theMutualDrawerInitialized = true;

  console.log("[The Mutual] Safari Drawer module active. Shortcut: Option+M (⌥M)");

  let isDrawerOpen = false;
  let drawerRoot = null;
  let drawerPanel = null;
  let tabBtn = null;

  function isOptionM(e) {
    // On macOS, Option+M produces e.key === "µ" (or other symbol on non-US layouts)
    // and e.code === "KeyM".
    const isM = (
      e.code === "KeyM" ||
      e.key === "m" ||
      e.key === "M" ||
      e.key === "µ" ||
      e.key === "Âµ"
    );
    // Accepts: Option+M (Mac altKey), Cmd+Shift+M, Ctrl+Shift+M, or Alt+M
    return isM && (e.altKey || (e.metaKey && e.shiftKey) || (e.ctrlKey && e.shiftKey));
  }

  function getSidepanelUrl() {
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) {
      try {
        return chrome.runtime.getURL("sidepanel.html");
      } catch (e) {}
    }
    return "http://localhost:8000/sidepanel.html";
  }

  function createDrawer() {
    if (document.getElementById("the-mutual-safari-drawer-root")) {
      drawerPanel = document.getElementById("the-mutual-drawer-panel");
      tabBtn = document.getElementById("the-mutual-drawer-tab");
      return;
    }

    if (!document.body) {
      document.addEventListener("DOMContentLoaded", createDrawer);
      return;
    }

    drawerRoot = document.createElement("div");
    drawerRoot.id = "the-mutual-safari-drawer-root";

    const sidepanelUrl = getSidepanelUrl();

    drawerRoot.innerHTML = `
      <style>
        #the-mutual-safari-drawer-root {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          z-index: 2147483647;
          position: fixed;
          pointer-events: none;
        }
        #the-mutual-drawer-tab {
          position: fixed;
          top: 140px;
          right: 0;
          pointer-events: auto;
          background: #FFFFFF;
          color: #1C1917;
          border: 1px solid rgba(0, 0, 0, 0.14);
          border-right: none;
          border-top-left-radius: 12px;
          border-bottom-left-radius: 12px;
          padding: 8px 12px 8px 10px;
          box-shadow: -3px 4px 18px rgba(0, 0, 0, 0.12);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 600;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease, box-shadow 0.2s ease;
          user-select: none;
          z-index: 2147483646;
        }
        #the-mutual-drawer-tab:hover {
          transform: translateX(-4px);
          box-shadow: -5px 6px 22px rgba(0, 0, 0, 0.16);
          background: #FBFBFA;
        }
        .the-mutual-tab-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #2D6A4F;
          box-shadow: 0 0 6px rgba(45, 106, 79, 0.6);
          display: inline-block;
        }
        #the-mutual-drawer-panel {
          position: fixed;
          top: 0;
          right: 0;
          width: 440px;
          max-width: 92vw;
          height: 100vh;
          background: #FAFAF9;
          border-left: 1px solid rgba(0, 0, 0, 0.12);
          box-shadow: -14px 0 40px rgba(0, 0, 0, 0.16);
          transform: translateX(100%);
          transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: auto;
          display: flex;
          flex-direction: column;
          z-index: 2147483647;
          overflow: hidden;
        }
        #the-mutual-drawer-panel.open {
          transform: translateX(0);
        }
        #the-mutual-drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: #FFFFFF;
          border-bottom: 1px solid #E7E5E4;
          user-select: none;
        }
        #the-mutual-drawer-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .the-mutual-title {
          font-size: 13px;
          font-weight: 700;
          color: #1C1917;
          letter-spacing: -0.01em;
        }
        .the-mutual-badge-tag {
          font-size: 10px;
          font-weight: 600;
          background: #E8F5E9;
          color: #2D6A4F;
          padding: 2px 7px;
          border-radius: 10px;
        }
        .the-mutual-shortcut-hint {
          font-size: 11px;
          color: #78716C;
          background: #F5F5F4;
          padding: 1px 6px;
          border-radius: 4px;
          border: 1px solid #E7E5E4;
        }
        #the-mutual-drawer-close-btn {
          background: none;
          border: none;
          font-size: 16px;
          color: #78716C;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          line-height: 1;
        }
        #the-mutual-drawer-close-btn:hover {
          background: #F5F5F4;
          color: #1C1917;
        }
        #the-mutual-drawer-iframe {
          flex: 1;
          width: 100%;
          border: none;
          background: #FAFAF9;
        }
      </style>

      <!-- Collapsed right-edge trigger tab -->
      <div id="the-mutual-drawer-tab" title="Click or press Option+M (⌥M) to toggle Side Panel">
        <span class="the-mutual-tab-dot"></span>
        <span>The Mutual</span>
        <span style="font-size:10px;color:#78716C;margin-left:2px;">⌥M</span>
      </div>

      <!-- Slide-out Side Panel -->
      <div id="the-mutual-drawer-panel">
        <div id="the-mutual-drawer-header">
          <div id="the-mutual-drawer-header-left">
            <span class="the-mutual-tab-dot"></span>
            <span class="the-mutual-title">The Mutual</span>
            <span class="the-mutual-badge-tag">Safari</span>
            <span class="the-mutual-shortcut-hint">⌥M</span>
          </div>
          <button id="the-mutual-drawer-close-btn" title="Close Panel (⌥M)">✕</button>
        </div>
        <iframe
          id="the-mutual-drawer-iframe"
          src="${sidepanelUrl}"
          allow="microphone; camera; display-capture; clipboard-write"
        ></iframe>
      </div>
    `;

    document.body.appendChild(drawerRoot);

    drawerPanel = document.getElementById("the-mutual-drawer-panel");
    tabBtn = document.getElementById("the-mutual-drawer-tab");
    const closeBtn = document.getElementById("the-mutual-drawer-close-btn");

    if (tabBtn) tabBtn.addEventListener("click", () => toggleDrawer());
    if (closeBtn) closeBtn.addEventListener("click", () => toggleDrawer(false));
  }

  function toggleDrawer(forceState) {
    if (!drawerPanel) createDrawer();
    isDrawerOpen = typeof forceState === "boolean" ? forceState : !isDrawerOpen;
    if (drawerPanel) {
      if (isDrawerOpen) {
        drawerPanel.classList.add("open");
        if (tabBtn) tabBtn.style.opacity = "0";
      } else {
        drawerPanel.classList.remove("open");
        if (tabBtn) tabBtn.style.opacity = "1";
      }
    }
  }

  window.theMutualToggleDrawer = toggleDrawer;

  // ── Global Keyboard Shortcut: Option+M (macOS) / Alt+M ─────────────────────
  // Listen immediately on window at capture phase so meetings can't intercept it
  window.addEventListener("keydown", (e) => {
    if (isOptionM(e)) {
      e.preventDefault();
      e.stopPropagation();
      console.log("[The Mutual] Shortcut triggered: Option+M");
      toggleDrawer();
    }
  }, true);

  // Also listen for toggle messages from iframe or background
  window.addEventListener("message", (e) => {
    if (e.data && (e.data.type === "THE_MUTUAL_TOGGLE_DRAWER" || e.data.type === "TOGGLE_SIDEBAR")) {
      toggleDrawer();
    }
  });

  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === "TOGGLE_SIDEBAR") {
        toggleDrawer();
      }
    });
  }

  // Initialize drawer after DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createDrawer);
  } else {
    createDrawer();
  }
})();
