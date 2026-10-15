/**
 * The Mutual - Background Service Worker (Manifest V3)
 *
 * Responsibilities:
 *  1. Open side panel on extension icon click
 *  2. Manage the Offscreen document for microphone / SpeechRecognition
 *  3. Relay caption chunks from content scripts → storage + side panel
 *  4. Relay speech results from offscreen → side panel
 *  5. Serve page-text extraction requests from the side panel
 */

// ── Setup ────────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((e) => console.warn("[The Mutual] sidePanel behaviour:", e));
  }
  console.log("[The Mutual] Extension installed / updated.");
});

// Ensure panel opens on action click across worker wakeups
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => {});
}

// Option+M / Alt+M Command listener
if (chrome.commands && chrome.commands.onCommand) {
  chrome.commands.onCommand.addListener((command) => {
    if (chrome.sidePanel && chrome.sidePanel.open) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].id) {
          chrome.sidePanel.open({ tabId: tabs[0].id }).catch((e) => {
            console.warn("[The Mutual] Could not open side panel via command:", e);
          });
        }
      });
    }
  });
}

// ── Offscreen document management ────────────────────────────────────────────

const OFFSCREEN_URL = chrome.runtime.getURL("offscreen.html");
const OFFSCREEN_REASONS = ["USER_MEDIA"]; // Needed for mic access

async function ensureOffscreen() {
  // Chrome 116+ API
  if (chrome.offscreen) {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [OFFSCREEN_URL]
    }).catch(() => []);

    if (existingContexts.length === 0) {
      await chrome.offscreen.createDocument({
        url:    OFFSCREEN_URL,
        reasons: OFFSCREEN_REASONS,
        justification: "Speech recognition requires microphone access via USER_MEDIA."
      });
      console.log("[The Mutual] Offscreen document created.");
    }
  }
}

async function closeOffscreen() {
  if (chrome.offscreen) {
    await chrome.offscreen.closeDocument().catch(() => {});
    console.log("[The Mutual] Offscreen document closed.");
  }
}

// ── Message routing ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // ── Open Side Panel request from content script / badge / shortcut ─────────
  if (message.type === "OPEN_SIDEPANEL") {
    if (chrome.sidePanel && chrome.sidePanel.open) {
      const tabId = (sender && sender.tab && sender.tab.id) ? sender.tab.id : null;
      if (tabId) {
        chrome.sidePanel.open({ tabId }).catch((e) => console.warn("[The Mutual] sidePanel.open failed:", e));
      } else {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs[0] && tabs[0].id) {
            chrome.sidePanel.open({ tabId: tabs[0].id }).catch(() => {});
          }
        });
      }
    }
    sendResponse({ status: "ok" });
    return true;
  }

  // ── Captions from content scripts (Meet, Zoom, Teams, Slack …) ───────────
  if (message.type === "CAPTIONS_CHUNK") {
    if (message.payload && message.payload.text) {
      const t = message.payload.text.toLowerCase();
      if (t.includes("looking to create a workspace") || t.includes("create a new workspace") || t.includes("workspace instead")) {
        sendResponse({ status: "ignored_boilerplate" });
        return true;
      }
    }

    // Persist to local storage (ring-buffer of 100 entries)
    chrome.storage.local.get(["session_transcript"], (res) => {
      const existing = (res.session_transcript || []).filter(item => {
        if (!item || !item.text) return false;
        const it = item.text.toLowerCase();
        return !it.includes("looking to create a workspace") && !it.includes("workspace instead");
      });
      const updated  = [...existing, message.payload];
      chrome.storage.local.set({ session_transcript: updated.slice(-100) });
    });

    // Also forward live to any open side panel
    chrome.runtime.sendMessage({ type: "CAPTIONS_CHUNK_LIVE", payload: message.payload })
      .catch(() => {}); // Side panel may not be open yet

    sendResponse({ status: "acknowledged" });
    return true;
  }

  // ── Side panel: start microphone via offscreen ────────────────────────────
  if (message.type === "START_MIC") {
    ensureOffscreen().then(() => {
      chrome.runtime.sendMessage({
        type:   "START_RECOGNITION",
        target: "offscreen",
        lang:   message.lang || "en-IN"
      }).catch(() => {});
    });
    sendResponse({ status: "ok" });
    return true;
  }

  // ── Side panel: stop microphone ───────────────────────────────────────────
  if (message.type === "STOP_MIC") {
    chrome.runtime.sendMessage({
      type:   "STOP_RECOGNITION",
      target: "offscreen"
    }).catch(() => {});
    sendResponse({ status: "ok" });
    return true;
  }

  // ── Offscreen → side panel: speech results ────────────────────────────────
  // Note: Offscreen document's chrome.runtime.sendMessage already reaches all extension frames.
  // We do not re-broadcast here to avoid duplicated speech transcriptions.
  if (message.type === "SPEECH_RESULT" || message.type === "SPEECH_ERROR" || message.type === "SPEECH_STATUS") {
    return false;
  }

  // ── Page text extraction (for Pre-Flight) ─────────────────────────────────
  if (message.type === "GET_ACTIVE_PAGE_TEXT") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0] || !tabs[0].id) {
        sendResponse({ text: "" });
        return;
      }
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          const selection = window.getSelection()?.toString().trim() || "";
          if (selection.length > 20) return selection;

          const docBody =
            document.querySelector(".kix-page-content")        // Google Docs
            || document.querySelector(".notion-page-content")   // Notion
            || document.querySelector("[role='main']")          // Gmail / generic
            || document.body;
          return docBody ? (docBody.innerText || "") : "";
        }
      }, (results) => {
        if (chrome.runtime.lastError || !results || !results[0]) {
          sendResponse({ text: "" });
        } else {
          sendResponse({ text: results[0].result || "" });
        }
      });
    });
    return true; // async response
  }

  if (message.type === "MEETING_DETECTED") {
    const payload = message.payload || {};
    chrome.storage.local.set({ active_meeting: payload });
    chrome.runtime.sendMessage({ type: "MEETING_DETECTED_LIVE", payload }).catch(() => {});
    sendResponse({ status: "stored", meeting: payload });
    return true;
  }

  if (message.type === "GET_ACTIVE_MEETING") {
    chrome.storage.local.get(["active_meeting"], (res) => {
      sendResponse({ meeting: res.active_meeting || null });
    });
    return true;
  }
});

// Automatic passive tab inspection for zero-friction meeting detection
function inspectTabForMeeting(tab) {
  if (!tab || !tab.url) return;
  try {
    const url = new URL(tab.url);
    let platform = null;
    let meetingId = null;

    if (url.hostname.includes("meet.google.com")) {
      const parts = url.pathname.replace(/^\//, "").split("/");
      if (parts[0] && parts[0].length >= 4 && !["new", "landing", "lookup"].includes(parts[0].toLowerCase())) {
        platform = "google_meet";
        meetingId = parts[0].toLowerCase();
      }
    } else if (url.hostname.includes("zoom.us")) {
      const match = url.pathname.match(/\/(?:j|wc)\/(\d+)/i) || url.search.match(/confno=(\d+)/i);
      if (match) {
        platform = "zoom";
        meetingId = match[1];
      }
    } else if (url.hostname.includes("teams.microsoft.com") || url.hostname.includes("teams.live.com")) {
      const match = url.href.match(/meetup-join\/([^/?]+)/i) || url.href.match(/[?&]meetingId=([^&]+)/i);
      if (match) {
        platform = "teams";
        meetingId = match[1].slice(0, 16);
      }
    } else if (url.hostname.includes("slack.com")) {
      const match = url.pathname.match(/\/client\/[A-Z0-9]+\/([A-Z0-9]+)/i) || url.pathname.match(/\/archives\/([A-Z0-9]+)/i);
      if (match) {
        platform = "slack";
        meetingId = `huddle-${match[1].toLowerCase()}`;
      }
    }

    if (platform && meetingId) {
      const payload = {
        platform,
        meeting_id: meetingId,
        url: tab.url,
        title: tab.title || "Meeting Call",
        timestamp: Date.now()
      };
      chrome.storage.local.set({ active_meeting: payload });
      chrome.runtime.sendMessage({ type: "MEETING_DETECTED_LIVE", payload }).catch(() => {});
    }
  } catch (e) {}
}

if (chrome.tabs && chrome.tabs.onUpdated) {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" || changeInfo.url) {
      inspectTabForMeeting(tab);
    }
  });
}

if (chrome.tabs && chrome.tabs.onActivated) {
  chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
      if (tab) inspectTabForMeeting(tab);
    });
  });
}

