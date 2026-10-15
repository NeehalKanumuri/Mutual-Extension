/**
 * The Mutual — Offscreen Audio Bridge (offscreen.js)
 *
 * This script runs inside chrome-extension://…/offscreen.html which is created
 * by the background service worker via chrome.offscreen.createDocument().
 *
 * Chrome's Offscreen API grants this document access to getUserMedia / Web
 * Speech API even though a Side Panel cannot request it directly.
 *
 * Message protocol (all via chrome.runtime.sendMessage / onMessage):
 *
 *   background → offscreen:
 *     { type: "START_RECOGNITION",  lang: "en-IN" }
 *     { type: "STOP_RECOGNITION" }
 *
 *   offscreen → background (→ side panel):
 *     { type: "SPEECH_RESULT",   transcript: "...", isFinal: true/false }
 *     { type: "SPEECH_ERROR",    error: "not-allowed" | "no-speech" | ... }
 *     { type: "SPEECH_STATUS",   status: "started" | "stopped" }
 */

console.log("[The Mutual Offscreen] Bridge loaded.");

let recognition = null;
let isRunning    = false;
let wantRunning  = false;

// ── helpers ─────────────────────────────────────────────────────────────────

function send(msg) {
  chrome.runtime.sendMessage(msg).catch(() => {
    // Background may be restarting; safe to ignore
  });
}

let micStream = null;
let audioCtx = null;

async function enableHighSensitivityAudio() {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      if (!micStream) {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            autoGainControl: true,   // Force browser and OS automatic gain control
            echoCancellation: false, // Don't filter out distant room voices
            noiseSuppression: false, // Don't gate out distant speech as ambient noise
            channelCount: 1,
            sampleRate: 48000
          }
        });

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          audioCtx = new AudioContextClass();
          const source = audioCtx.createMediaStreamSource(micStream);
          const gainNode = audioCtx.createGain();
          gainNode.gain.value = 3.5; // 3.5x sensitivity boost for offline conference room speech

          const compressor = audioCtx.createDynamicsCompressor();
          compressor.threshold.setValueAtTime(-50, audioCtx.currentTime); // Boost low-volume voices
          compressor.knee.setValueAtTime(40, audioCtx.currentTime);
          compressor.ratio.setValueAtTime(12, audioCtx.currentTime);
          compressor.attack.setValueAtTime(0, audioCtx.currentTime);
          compressor.release.setValueAtTime(0.25, audioCtx.currentTime);

          source.connect(gainNode);
          gainNode.connect(compressor);

          const dest = audioCtx.createMediaStreamDestination();
          compressor.connect(dest);
        }
      }
    } catch (e) {
      console.warn("[The Mutual Offscreen] Sensitivity booster notice:", e);
    }
  }
}

// ── SpeechRecognition bootstrap ──────────────────────────────────────────────

async function startRecognition(lang) {
  if (isRunning) return;

  await enableHighSensitivityAudio();

  const SpeechRecognition =
    typeof webkitSpeechRecognition !== "undefined"
      ? webkitSpeechRecognition
      : (typeof SpeechRecognition !== "undefined" ? SpeechRecognition : null);

  if (!SpeechRecognition) {
    send({ type: "SPEECH_ERROR", error: "not-supported" });
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous      = true;
  recognition.interimResults  = true;
  recognition.lang            = lang || "en-IN";
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isRunning = true;
    console.log("[The Mutual Offscreen] Recognition started.");
    send({ type: "SPEECH_STATUS", status: "started" });
  };

  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      send({
        type:       "SPEECH_RESULT",
        transcript: result[0].transcript,
        isFinal:    result.isFinal
      });
    }
  };

  recognition.onerror = (event) => {
    console.warn("[The Mutual Offscreen] Recognition error:", event.error);
    send({ type: "SPEECH_ERROR", error: event.error });

    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      wantRunning = false;
      isRunning   = false;
    }
    // For no-speech / aborted we let onend handle restart
  };

  recognition.onend = () => {
    isRunning = false;
    console.log("[The Mutual Offscreen] Recognition ended.");
    if (wantRunning) {
      // Auto-restart (Chrome stops recognition after ~60 s of silence)
      setTimeout(() => {
        if (wantRunning && !isRunning) {
          try { recognition.start(); } catch (e) {}
        }
      }, 300);
    } else {
      send({ type: "SPEECH_STATUS", status: "stopped" });
    }
  };

  wantRunning = true;
  try {
    recognition.start();
  } catch (e) {
    console.warn("[The Mutual Offscreen] start() threw:", e);
  }
}

function stopRecognition() {
  wantRunning = false;
  if (recognition && isRunning) {
    try { recognition.stop(); } catch (e) {}
  }
}

// ── Message listener ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.target !== "offscreen") return;

  if (msg.type === "START_RECOGNITION") {
    startRecognition(msg.lang);
  } else if (msg.type === "STOP_RECOGNITION") {
    stopRecognition();
  }
});
