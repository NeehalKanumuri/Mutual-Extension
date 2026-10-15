/**
 * The Mutual — Microphone Permission Request Script
 *
 * Designed to be executed inside a hidden <iframe> with allow="microphone"
 * or inside a standalone extension page (popup / options).
 *
 * Calling getUserMedia({ audio: true }) here triggers Chrome's native
 * permission dialog for the extension origin.
 */

(function () {
  console.log("[The Mutual] requestPermissions.js loaded");

  const btn = document.getElementById("btn-request");
  const statusEl = document.getElementById("status");

  function notifyGranted() {
    if (statusEl) {
      statusEl.innerText = "✓ Microphone access granted!";
      statusEl.style.color = "#166534";
    }

    // 1. Notify parent window (if running in hidden iframe inside sidepanel / content script)
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "MIC_PERM_GRANTED" }, "*");
    }

    // 2. Notify extension runtime (background worker & all active panels)
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: "MIC_PERMISSION_GRANTED" }).catch(() => {});
    }

    // 3. Persist in chrome.storage.local
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ micAuthorized: true });
    }
  }

  function notifyDenied(error) {
    const errName = (error && error.name) ? error.name : (error ? String(error) : "Denied");
    console.warn("[The Mutual] Microphone access denied in requestPermissions:", errName);

    if (statusEl) {
      statusEl.innerText = "Microphone access blocked: " + errName;
      statusEl.style.color = "#DC2626";
    }

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "MIC_PERM_DENIED", error: errName }, "*");
    }

    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: "MIC_PERMISSION_DENIED", error: errName }).catch(() => {});
    }
  }

  async function requestMicrophone() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      notifyDenied(new Error("getUserMedia not supported"));
      return;
    }

    if (statusEl) statusEl.innerText = "Requesting permission...";

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Clean up track immediately so microphone is released for SpeechRecognition
      stream.getTracks().forEach((track) => track.stop());
      notifyGranted();
    } catch (err) {
      notifyDenied(err);
    }
  }

  // Hook up button click
  if (btn) {
    btn.addEventListener("click", requestMicrophone);
  }

  // Listen for parent messages requesting permission
  window.addEventListener("message", (e) => {
    if (e.data && e.data.type === "REQUEST_MIC_NOW") {
      requestMicrophone();
    }
  });

  // Automatically request on load
  // (In extension pages and hidden iframes with allow="microphone", this immediately opens Chrome's prompt)
  requestMicrophone();
})();
