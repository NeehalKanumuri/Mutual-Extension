/**
 * THE MUTUAL — Main Application & Interactive Components Script
 */

(function () {
  'use strict';

  // ==========================================================================
  // 1. Navigation Smooth Scroll & Active Indicator
  // ==========================================================================
  const navLinks = document.querySelectorAll('.nav-link[href^="#"]');

  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ==========================================================================
  // 2. Interactive Ambiguity Interceptor Showcase
  // ==========================================================================
  const interceptorPresets = {
    deck: {
      category: 'Manager // Employee',
      speaker: 'Marcus (VP of Product):',
      vagueQuote: '"Sometime next week, put together a clean deck for leadership review... throw in some numbers and make it look professional."',
      vagueQuoteHtml: '“<span class="fuzzy-term">Sometime next week</span>, put together a <span class="fuzzy-term">clean deck</span> for leadership review... throw in <span class="fuzzy-term">some numbers</span> and make it look <span class="fuzzy-term">professional</span>.”',
      flaggedTerms: ['sometime next week', 'clean deck', 'throw in some numbers', 'look professional'],
      scriptTitle: 'Friendly clarification suggestion:',
      scriptText: '“Marcus, before we wrap up—to protect team focus: by \'sometime next week\', should I lock in Wednesday 2 PM or Friday close of business? And regarding metrics, which 2 KPI sources should serve as our single source of truth?”',
      mechanism: 'Frames the inquiry around protecting team focus rather than personal hesitation, making it completely natural to ask.'
    },
    feature: {
      category: 'Lead // Developer',
      speaker: 'Sarah (Engineering Lead):',
      vagueQuote: '"Make sure the API scales nicely, loop in whoever you think is necessary, and let\'s try to ship it ASAP."',
      vagueQuoteHtml: '“Make sure the API <span class="fuzzy-term">scales nicely</span>, <span class="fuzzy-term">loop in whoever</span> you think is necessary, and let\'s try to ship it <span class="fuzzy-term">ASAP</span>.”',
      flaggedTerms: ['scales nicely', 'loop in whoever', 'ship it ASAP'],
      scriptTitle: 'Friendly clarification suggestion:',
      scriptText: '“Sarah, to establish our Definition of Done: what RPS threshold defines \'scales nicely\' for this milestone? And who holds the final sign-off authority so we avoid committee latency?”',
      mechanism: 'Confirms exact RPS performance threshold and single sign-off decider upfront.'
    },
    client: {
      category: 'Client // Agency',
      speaker: 'David (Client Director):',
      vagueQuote: '"Give the marketing campaign a fresh modern look, don\'t worry about strict boundaries, we\'ll know it when we see it."',
      vagueQuoteHtml: '“Give the marketing campaign a <span class="fuzzy-term">fresh modern look</span>, <span class="fuzzy-term">don\'t worry about strict boundaries</span>, we\'ll <span class="fuzzy-term">know it when we see it</span>.”',
      flaggedTerms: ['fresh modern look', 'don\'t worry about boundaries', 'know it when we see it'],
      scriptTitle: 'Friendly clarification suggestion:',
      scriptText: '“David, to ensure we don\'t burn revision cycles on subjective drafts: let\'s establish 3 explicit Out-of-Scope guardrails and commit to a 24-hour turnaround SLA for the initial concept draft.”',
      mechanism: 'Agrees on clear boundaries upfront so you don\'t burn hours on endless subjective revisions.'
    },
    sponsor: {
      category: 'Sponsor // Team',
      speaker: 'Elena (Executive Sponsor):',
      vagueQuote: '"We need high-impact results for the board next month. Do whatever it takes, just get everyone aligned."',
      vagueQuoteHtml: '“We need <span class="fuzzy-term">high-impact results</span> for the board next month. <span class="fuzzy-term">Do whatever it takes</span>, just get everyone <span class="fuzzy-term">aligned</span>.”',
      flaggedTerms: ['high-impact results', 'whatever it takes', 'get everyone aligned'],
      scriptTitle: 'Friendly clarification suggestion:',
      scriptText: '“Elena, to prevent team burnout and deliver the board\'s exact target: what 3 verifiable deliverables will define success at the 30-day mark, and what existing initiatives are officially de-prioritized?”',
      mechanism: 'Turns vague leadership pressure into 3 concrete, achievable targets.'
    }
  };

  const compItems = document.querySelectorAll('.comp-item');
  const simSpeaker = document.getElementById('sim-speaker');
  const simQuote = document.getElementById('sim-quote');
  const simNudgeScript = document.getElementById('sim-nudge-script');
  const simMechanism = document.getElementById('sim-ob-mechanism');
  const btnCopyScript = document.getElementById('btn-copy-script');

  // Initial load
  if (simQuote && interceptorPresets.deck) {
    simQuote.innerHTML = interceptorPresets.deck.vagueQuoteHtml;
  }

  compItems.forEach(item => {
    item.addEventListener('click', () => {
      const presetKey = item.dataset.preset;
      const data = interceptorPresets[presetKey];
      if (!data) return;

      compItems.forEach(c => c.classList.remove('active'));
      item.classList.add('active');

      if (simSpeaker) simSpeaker.textContent = data.speaker;
      if (simQuote) simQuote.innerHTML = data.vagueQuoteHtml || data.vagueQuote;
      if (simNudgeScript) simNudgeScript.textContent = data.scriptText;
      if (simMechanism) simMechanism.textContent = data.mechanism;
    });
  });

  if (btnCopyScript) {
    btnCopyScript.addEventListener('click', () => {
      if (simNudgeScript) {
        navigator.clipboard.writeText(simNudgeScript.textContent).then(() => {
          const originalText = btnCopyScript.textContent;
          btnCopyScript.textContent = '[ COPIED ]';
          setTimeout(() => {
            btnCopyScript.textContent = originalText;
          }, 1800);
        });
      }
    });
  }

  // ==========================================================================
  // 3. Interactive Pre-Flight Deliverable Auditor
  // ==========================================================================
  const auditPresets = {
    strong: {
      score: '94%',
      isRisk: false,
      badgeText: '[ VERIFIED // LOW RISK ]',
      badgeClass: 'clause-badge-pass',
      clauses: [
        { name: '01. Deliverable & Format', desc: '5-Slide Executive Summary in 2026 Keynote format', pass: true },
        { name: '02. Hard Deadline & SLA', desc: 'Wednesday, Oct 15 at 17:00 EST with 24h SLA', pass: true },
        { name: '03. Definition of Done', desc: '3 Measurable DoD criteria fully satisfied', pass: true },
        { name: '04. Out-of-Scope Guardrails', desc: 'Zero unapproved scope additions detected', pass: true },
        { name: '05. Sign-off Authority', desc: 'Designated: Marcus Chen (VP Product)', pass: true }
      ],
      remedy: 'Draft aligns with agreed Micro-Contract terms. Safe to submit with high psychological safety.'
    },
    flawed: {
      score: '42%',
      isRisk: true,
      badgeText: '[ HIGH REWORK RISK ]',
      badgeClass: 'clause-badge-fail',
      clauses: [
        { name: '01. Deliverable & Format', desc: 'Draft format is a 24-page doc instead of 5-slide deck', pass: false },
        { name: '02. Hard Deadline & SLA', desc: 'Missing submission milestone timestamp', pass: false },
        { name: '03. Definition of Done', desc: '1 of 3 criteria missing (customer churn data omitted)', pass: false },
        { name: '04. Out-of-Scope Guardrails', desc: 'Contains 3 unapproved features flagged as anti-goals', pass: false },
        { name: '05. Sign-off Authority', desc: 'Addressed to general committee instead of designated decider', pass: false }
      ],
      remedy: 'Action Required: Trim 19 pages into 5 slides. Remove unapproved feature appendices to respect agreed anti-goals.'
    }
  };

  const btnSampleStrong = document.getElementById('btn-audit-strong');
  const btnSampleFlawed = document.getElementById('btn-audit-flawed');
  const auditScoreNum = document.getElementById('audit-score-num');
  const auditVerdictBadge = document.getElementById('audit-verdict-badge');
  const auditChecklist = document.getElementById('audit-checklist');
  const auditRemedyText = document.getElementById('audit-remedy-text');

  function renderAudit(preset) {
    if (!preset) return;

    if (auditScoreNum) {
      auditScoreNum.textContent = preset.score;
      if (preset.isRisk) {
        auditScoreNum.classList.add('risk');
      } else {
        auditScoreNum.classList.remove('risk');
      }
    }

    if (auditVerdictBadge) {
      auditVerdictBadge.textContent = preset.badgeText;
      auditVerdictBadge.className = preset.badgeClass;
    }

    if (auditChecklist) {
      auditChecklist.innerHTML = '';
      preset.clauses.forEach(c => {
        const item = document.createElement('div');
        item.className = 'clause-item';
        item.innerHTML = `
          <div>
            <div style="font-weight: 700; color: var(--text-primary);">${c.name}</div>
            <div style="font-size: 11.5px; color: var(--text-secondary);">${c.desc}</div>
          </div>
          <span class="${c.pass ? 'clause-badge-pass' : 'clause-badge-fail'}">
            ${c.pass ? '[ VERIFIED ]' : '[ VIOLATION ]'}
          </span>
        `;
        auditChecklist.appendChild(item);
      });
    }

    if (auditRemedyText) {
      auditRemedyText.textContent = preset.remedy;
    }
  }

  if (btnSampleStrong) {
    btnSampleStrong.addEventListener('click', () => {
      btnSampleStrong.classList.add('active');
      if (btnSampleFlawed) btnSampleFlawed.classList.remove('active');
      renderAudit(auditPresets.strong);
    });
  }

  if (btnSampleFlawed) {
    btnSampleFlawed.addEventListener('click', () => {
      btnSampleFlawed.classList.add('active');
      if (btnSampleStrong) btnSampleStrong.classList.remove('active');
      renderAudit(auditPresets.flawed);
    });
  }

  // ==========================================================================
  // 4. Download Modal & Extension Packages
  // ==========================================================================
  const modalOverlay = document.getElementById('download-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const openModalBtns = document.querySelectorAll('.trigger-download-modal');
  const modalTabBtns = document.querySelectorAll('.modal-tab-btn');
  const modalPanes = document.querySelectorAll('.modal-pane');
  const copyTerminalBtns = document.querySelectorAll('.terminal-copy-btn');

  openModalBtns.forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      if (modalOverlay) {
        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  function closeModal() {
    if (modalOverlay) {
      modalOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeModal);
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', e => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalOverlay && modalOverlay.classList.contains('active')) {
      closeModal();
    }
  });

  // Modal Tab Switching
  modalTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabTarget = btn.dataset.tab;

      modalTabBtns.forEach(b => b.classList.remove('active'));
      modalPanes.forEach(p => p.style.display = 'none');

      btn.classList.add('active');
      const targetPane = document.getElementById(`pane-${tabTarget}`);
      if (targetPane) {
        targetPane.style.display = 'flex';
      }
    });
  });

  // Terminal Command Copy
  copyTerminalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.dataset.copy;
      if (code) {
        navigator.clipboard.writeText(code).then(() => {
          const originalText = btn.textContent;
          btn.textContent = 'COPIED';
          setTimeout(() => {
            btn.textContent = originalText;
          }, 1600);
        });
      }
    });
  });

})();
