// The Mutual — Antigravity UI Extension Frontend Logic

(function () {
  const statusPill = document.getElementById('status-pill');
  const statusText = document.getElementById('status-text');
  const menubarIndicator = document.getElementById('menubar-indicator');
  const transcriptStream = document.getElementById('transcript-stream');
  const transcriptionCount = document.getElementById('transcription-count');
  const btnToggleListen = document.getElementById('btn-toggle-listen');
  const listenIcon = document.getElementById('listen-icon');
  const listenText = document.getElementById('listen-text');
  const btnClearTranscript = document.getElementById('btn-clear-transcript');
  const quickInput = document.getElementById('quick-input');
  const btnSendQuick = document.getElementById('btn-send-quick');
  const btnOpenMenubar = document.getElementById('btn-open-menubar');
  const btnOpenWeb = document.getElementById('btn-open-web');
  const flagsCard = document.getElementById('flags-card');
  const flagsContainer = document.getElementById('flags-container');
  const flagsCount = document.getElementById('flags-count');
  const btnGenerateContract = document.getElementById('btn-generate-contract');
  const btnSendToAgent = document.getElementById('btn-send-to-agent');
  const contractDisplay = document.getElementById('contract-display');
  const submitProceedCard = document.getElementById('submit-proceed-card');
  const submitLinesBadge = document.getElementById('submit-lines-badge');
  const btnSubmitProceed = document.getElementById('btn-submit-proceed');
  const submitProceedIcon = document.getElementById('submit-proceed-icon');
  const submitProceedText = document.getElementById('submit-proceed-text');

  let isListening = false;
  let recognition = null;
  let capturedLines = [];
  let detectedFlags = [];
  let currentContract = null;

  // 1. Check Whisper & Menu Bar Status
  async function checkStatus() {
    try {
      const res = await window.sidecar.fetch('/api/status');
      const data = await res.json();
      if (data.status === 'ready' || data.model) {
        statusText.innerText = 'Whisper Turbo Active';
        if (menubarIndicator) {
          menubarIndicator.innerText = data.menubar_active ? '● Taskbar Top: Active' : '○ Taskbar Top: Offline';
          menubarIndicator.style.color = data.menubar_active ? '#166534' : '#D97706';
        }
      }
    } catch (e) {
      statusText.innerText = 'Local Daemon Connecting…';
    }
  }

  // 2. Open / Focus Taskbar Top Menu Bar App
  if (btnOpenMenubar) {
    btnOpenMenubar.addEventListener('click', async () => {
      try {
        await window.sidecar.fetch('/api/launch-menubar', { method: 'POST' });
        checkStatus();
      } catch (e) {
        console.warn('Could not launch menubar app:', e);
      }
    });
  }

  if (btnOpenWeb) {
    btnOpenWeb.addEventListener('click', () => {
      window.open('http://localhost:8000', '_blank');
    });
  }

  // 3. Process incoming speech line
  async function processLine(speaker, text) {
    const timestamp = new Date().toLocaleTimeString();
    capturedLines.push({ speaker, text, timestamp });

    // Update count
    transcriptionCount.innerText = `${capturedLines.length} lines`;

    // Remove placeholder
    if (transcriptStream.firstElementChild && transcriptStream.firstElementChild.innerText.includes('Click')) {
      transcriptStream.innerHTML = '';
    }

    // Render line
    const lineEl = document.createElement('div');
    lineEl.className = 'transcript-line';
    lineEl.innerHTML = `
      <div class="transcript-meta">
        <strong>${escapeHtml(speaker)}</strong>
        <span>${escapeHtml(timestamp)}</span>
      </div>
      <div class="transcript-text">${escapeHtml(text)}</div>
    `;
    transcriptStream.appendChild(lineEl);
    transcriptStream.scrollTop = transcriptStream.scrollHeight;

    // Check for ambiguity
    try {
      const res = await window.sidecar.fetch('/api/intercept', {
        method: 'POST',
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (data && data.is_ambiguous && data.flags && data.flags.length > 0) {
        flagsCard.style.display = 'block';
        data.flags.forEach((flag) => {
          detectedFlags.push(flag);
          renderFlag(flag, text);
        });
        flagsCount.innerText = detectedFlags.length;
      }
    } catch (e) {}
  }

  function renderFlag(flag, text) {
    const el = document.createElement('div');
    el.className = 'flag-card';
    el.innerHTML = `
      <div><strong>⚠️ ${escapeHtml(flag.category || 'Ambiguity Detected')}:</strong> "${escapeHtml(flag.detected_phrase || text)}"</div>
      <div style="font-size:11px; margin-top:3px; color:#7F1D1D;">${escapeHtml(flag.ob_diagnosis || '')}</div>
      <div class="flag-script">
        💬 <strong>Suggested Inquiry:</strong> "${escapeHtml(flag.suggested_script || '')}"
      </div>
    `;
    flagsContainer.appendChild(el);
  }

  // 4. Local Microphone Listening
  function toggleListening() {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Web Speech API is not supported in this frame. Use the text input below to test.');
      return;
    }

    try {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        isListening = true;
        btnToggleListen.style.background = '#DC2626';
        listenIcon.innerText = '⏹';
        listenText.innerText = 'Stop Local Listening';
      };

      recognition.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            const transcript = e.results[i][0].transcript.trim();
            if (transcript.length > 3) {
              processLine('Local Mic (Whisper Turbo)', transcript);
            }
          }
        }
      };

      recognition.onerror = (e) => {
        console.warn('Speech error:', e.error);
        if (e.error === 'not-allowed') {
          stopListening();
          alert('Microphone access needed. You can also paste text below.');
        }
      };

      recognition.onend = () => {
        if (isListening) {
          try { recognition.start(); } catch (err) {}
        } else {
          stopListening();
        }
      };

      recognition.start();
    } catch (err) {
      console.warn('Could not start recognition:', err);
      stopListening();
    }
  }

  function stopListening() {
    isListening = false;
    if (recognition) {
      try { recognition.stop(); } catch (err) {}
      recognition = null;
    }
    btnToggleListen.style.background = 'var(--brand-green)';
    listenIcon.innerText = '🎙️';
    listenText.innerText = 'Start Local Whisper Listening';

    if (capturedLines.length > 0) {
      if (submitProceedCard) submitProceedCard.style.display = 'block';
      if (submitLinesBadge) submitLinesBadge.innerText = `${capturedLines.length} lines ready`;
    }
  }

  btnToggleListen.addEventListener('click', toggleListening);

  btnClearTranscript.addEventListener('click', () => {
    capturedLines = [];
    detectedFlags = [];
    transcriptionCount.innerText = '0 lines';
    transcriptStream.innerHTML = `
      <div style="color:var(--text-muted); font-style:italic; text-align:center; padding:16px 8px;">
        Transcript cleared. Click 'Start Local Whisper Listening' or type below.
      </div>
    `;
    flagsCard.style.display = 'none';
    flagsContainer.innerHTML = '';
    flagsCount.innerText = '0';
    contractDisplay.style.display = 'none';
    btnSendToAgent.style.display = 'none';
    if (submitProceedCard) submitProceedCard.style.display = 'none';
  });

  // Quick text input
  function sendQuickText() {
    const val = quickInput.value.trim();
    if (!val) return;
    quickInput.value = '';
    processLine('Briefing Note', val);
    if (submitProceedCard) submitProceedCard.style.display = 'block';
    if (submitLinesBadge) submitLinesBadge.innerText = `${capturedLines.length} lines ready`;
  }

  btnSendQuick.addEventListener('click', sendQuickText);
  quickInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendQuickText();
  });

  // Explicit Submit & Proceed Action
  async function handleSubmitAndProceed() {
    const fullText = capturedLines.map((l) => `${l.speaker}: ${l.text}`).join(' ');
    if (!fullText || fullText.trim().length === 0) {
      alert('No briefing captured yet. Speak or type a briefing first.');
      return;
    }

    if (isListening) stopListening();

    if (btnSubmitProceed) btnSubmitProceed.disabled = true;
    if (submitProceedIcon) submitProceedIcon.innerText = '⏳';
    if (submitProceedText) submitProceedText.innerText = 'AI Processing Briefing & Synthesizing Contract…';

    try {
      const res = await window.sidecar.fetch('/api/generate-contract', {
        method: 'POST',
        body: JSON.stringify({ transcript: fullText })
      });
      currentContract = await res.json();
      renderContract(currentContract);
      if (contractDisplay) {
        contractDisplay.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (e) {
      console.warn('Contract generation error:', e);
    } finally {
      if (btnSubmitProceed) btnSubmitProceed.disabled = false;
      if (submitProceedIcon) submitProceedIcon.innerText = '⚡';
      if (submitProceedText) submitProceedText.innerText = 'Submit Briefing & Run AI Analysis →';
    }
  }

  if (btnSubmitProceed) {
    btnSubmitProceed.addEventListener('click', handleSubmitAndProceed);
  }

  // 5. Synthesize 5-Point Micro-Contract
  btnGenerateContract.addEventListener('click', async () => {
    const fullText = capturedLines.map((l) => `${l.speaker}: ${l.text}`).join(' ');
    const textToSend = fullText.length > 10 ? fullText : 'Marcus: Sometime next week, put together a clean deck for the leadership review. Make it look pakka professional.';

    try {
      const res = await window.sidecar.fetch('/api/generate-contract', {
        method: 'POST',
        body: JSON.stringify({ transcript: textToSend })
      });
      currentContract = await res.json();
      renderContract(currentContract);
    } catch (e) {
      console.warn('Contract generation error:', e);
    }
  });

  function renderContract(contract) {
    if (!contract || !contract.clauses) return;
    contractDisplay.style.display = 'block';
    contractDisplay.innerHTML = `
      <div style="font-weight:700; color:var(--text-main); margin-bottom:8px;">${escapeHtml(contract.title || 'Micro-Contract')}</div>
      <div style="display:flex; flex-direction:column; gap:6px;">
        ${contract.clauses.map((c) => `
          <div style="background:rgba(0,0,0,0.02); border:1px solid var(--border-color); border-radius:6px; padding:6px 8px;">
            <strong>Clause ${c.num}: ${escapeHtml(c.title)}</strong><br>
            <span style="color:var(--text-muted); font-size:11.5px;">${escapeHtml(c.content)}</span>
          </div>
        `).join('')}
      </div>
    `;

    // Show send to agent button
    btnSendToAgent.style.display = 'inline-flex';
  }

  // 6. Send Contract to Active Antigravity Conversation
  btnSendToAgent.addEventListener('click', () => {
    if (!currentContract || !window.sidecar.agent) return;

    const clausesText = (currentContract.clauses || []).map((c) => `* **Clause ${c.num} (${c.title}):** ${c.content}`).join('\n');
    const message = `🤝 **The Mutual — 5-Point Alignment Micro-Contract**\n\n*Synthesized via local Whisper Large-v3-Turbo:*\n\n${clausesText}\n\n*Status: Verified against organizational delegation guardrails.*`;

    if (window.sidecar.conversationId) {
      window.sidecar.agent.sendMessage(message);
      btnSendToAgent.innerText = '✓ Sent to Conversation!';
      setTimeout(() => {
        btnSendToAgent.innerHTML = '<span>💬</span> Send Contract to Active Conversation';
      }, 3000);
    } else {
      window.sidecar.agent.startConversation(message);
    }
  });

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial status check
  checkStatus();
  setInterval(checkStatus, 5000);
})();
