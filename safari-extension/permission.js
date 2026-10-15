/**
 * The Mutual — Dedicated Microphone Authorization Controller
 * Runs in external file to comply with Chrome Manifest V3 Content Security Policy (CSP).
 */

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btn-grant-mic");
  const btnTestSpeech = document.getElementById("btn-test-speech");
  const statusMsg = document.getElementById("status-msg");
  const card = document.getElementById("auth-card");
  const copySettingsBtn = document.getElementById("btn-copy-settings-url");

  // Copy site settings URL to clipboard
  if (copySettingsBtn) {
    copySettingsBtn.addEventListener("click", () => {
      const extOrigin = window.location.origin || (chrome.runtime ? chrome.runtime.getURL("") : "");
      const settingsUrl = extOrigin
        ? `chrome://settings/content/siteDetails?site=${encodeURIComponent(extOrigin)}`
        : "chrome://settings/content/microphone";

      navigator.clipboard.writeText(settingsUrl).then(() => {
        copySettingsBtn.innerText = "✓ Copied! Paste into new Chrome tab";
        setTimeout(() => { copySettingsBtn.innerText = "📋 Copy Chrome Settings URL"; }, 3000);
      }).catch(() => {
        copySettingsBtn.innerText = settingsUrl;
      });
    });
  }

  function markPermissionSuccess(method) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ micAuthorized: true });
    }
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        chrome.runtime.sendMessage({ type: "MIC_PERMISSION_GRANTED" });
      } catch (e) {}
    }

    card.innerHTML = `
      <div class="auth-icon" style="background:#DCFCE7; color:#166534; font-size:32px;">✓</div>
      <h1 class="auth-title" style="color:#166534;">Microphone Authorized!</h1>
      <p class="auth-desc">
        Microphone access verified via <strong>${escapeHtml(method)}</strong>.<br>
        Live speech listening is now active in The Mutual side panel!
      </p>
      <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:8px; padding:12px; width:100%; box-sizing:border-box; text-align:center;">
        <span style="font-size:12.5px; font-weight:600; color:#15803D;">🎙️ Microphone Hardware Stream Confirmed</span>
      </div>
      <button class="btn-grant" id="btn-close-perm" style="background:#2D6A4F; margin-top:8px;">
        Close Tab & Return to Meeting
      </button>
      <div style="font-size:12px; color:#A8A29E; margin-top:6px;">
        (Closing automatically in 2.5 seconds…)
      </div>
    `;

    const closeBtn = document.getElementById("btn-close-perm");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => window.close());
    }

    setTimeout(() => {
      window.close();
    }, 2500);
  }

  async function requestPermission() {
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = `<span>⏳</span> Requesting Access...`;
    statusMsg.innerHTML = `<span style="color:#2563EB; font-weight:500;">Please click 'Allow' in Chrome's permission prompt above...</span>`;

    const timer = setTimeout(() => {
      if (btn.disabled) {
        btn.disabled = false;
        btn.innerHTML = `<span>🎙️</span> Allow Microphone Access`;
        statusMsg.innerHTML = `<span style="color:#78716C;">If no prompt appeared, check Chrome's site settings or macOS System Settings below.</span>`;
      }
    }, 8000);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      clearTimeout(timer);

      // Verify stream audio tracks
      const tracks = stream.getAudioTracks();
      if (tracks && tracks.length > 0) {
        console.log("[The Mutual] Audio track active:", tracks[0].label);
      }

      // Stop tracks cleanly
      setTimeout(() => {
        stream.getTracks().forEach((track) => track.stop());
      }, 500);

      markPermissionSuccess("MediaDevices Stream");

    } catch (err) {
      clearTimeout(timer);
      const errName = err ? (err.name || "Error") : "Error";
      const errMsg = err ? (err.message || String(err)) : "Permission denied";
      console.warn("[The Mutual] Microphone permission error details:", errName, errMsg);

      btn.disabled = false;
      btn.innerHTML = `<span>🎙️</span> Try Again`;

      const isMacBlocked = errMsg.toLowerCase().includes("system") || errName === "NotAllowedError";

      statusMsg.innerHTML = `
        <div style="margin-top:8px; text-align:left; background:#FEF2F2; border:1px solid #FECACA; border-radius:8px; padding:14px; color:#991B1B; font-size:12px; line-height:1.55;">
          <strong>Microphone Authorization Notice (${escapeHtml(errName)})</strong><br>
          ${escapeHtml(errMsg)}<br><br>
          <strong>To enable right now:</strong>
          <ol style="margin:4px 0 0 0; padding-left:18px;">
            <li><strong>In this Chrome tab:</strong> Look at the URL bar at the top. Click the <strong>🎛️ Tune</strong> or <strong>🔒 Lock</strong> icon next to <code>chrome-extension://...</code> and toggle <strong>Microphone</strong> to <strong>Allow</strong>.</li>
            <li><strong>In macOS Settings:</strong> Open <strong>System Settings → Privacy & Security → Microphone</strong> and make sure <strong>Google Chrome</strong> is toggled <strong>ON</strong>.</li>
            <li>After toggling, click <strong>Try Again</strong> above.</li>
          </ol>
        </div>
      `;
    }
  }

  // Direct Web Speech API test
  function testSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      statusMsg.innerHTML = `<span style="color:#DC2626;">Web Speech API is not supported in this browser.</span>`;
      return;
    }

    if (!btnTestSpeech) return;
    btnTestSpeech.disabled = true;
    btnTestSpeech.innerHTML = `<span>⏳</span> Testing Speech Engine...`;
    statusMsg.innerHTML = `<span style="color:#2563EB;">Starting Chrome speech engine... Say something!</span>`;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-IN";

      recognition.onstart = () => {
        statusMsg.innerHTML = `<span style="color:#166534; font-weight:600;">🎙️ Speech engine active! Listening... Say "Hello Mutual"</span>`;
      };

      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        statusMsg.innerHTML = `<span style="color:#166534; font-weight:600;">✓ Heard: "${escapeHtml(text)}" — Microphone verified!</span>`;
        recognition.stop();
        setTimeout(() => {
          markPermissionSuccess("Web Speech Recognition");
        }, 1200);
      };

      recognition.onerror = (event) => {
        console.warn("[The Mutual] Speech test error:", event.error);
        btnTestSpeech.disabled = false;
        btnTestSpeech.innerHTML = `<span>🗣️</span> Test Speech Recognition`;
        statusMsg.innerHTML = `<span style="color:#DC2626;">Speech Recognition: ${escapeHtml(event.error)}. Please ensure Chrome has microphone access.</span>`;
      };

      recognition.onend = () => {
        btnTestSpeech.disabled = false;
        btnTestSpeech.innerHTML = `<span>🗣️</span> Test Speech Recognition`;
      };

      recognition.start();

    } catch (err) {
      btnTestSpeech.disabled = false;
      btnTestSpeech.innerHTML = `<span>🗣️</span> Test Speech Recognition`;
      statusMsg.innerHTML = `<span style="color:#DC2626;">Error: ${escapeHtml(err.message || String(err))}</span>`;
    }
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  if (btn) btn.addEventListener("click", requestPermission);
  if (btnTestSpeech) btnTestSpeech.addEventListener("click", testSpeechRecognition);

  // Check if microphone is already granted in Chrome
  if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: "microphone" }).then((permStatus) => {
      if (permStatus.state === "granted") {
        markPermissionSuccess("Pre-Authorized Browser Permission");
      }
    }).catch(() => {});
  }
});
