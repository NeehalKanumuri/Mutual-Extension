/**
 * THE MUTUAL — Scroll-Driven Video Scrubbing & Handshake Storytelling Engine
 * Video: business_handshake.mp4
 * Theme: Deep Green and Black shades with dynamic background dimming
 * Highlighting HANDSHAKE prominently with bold key phrases
 */

(function () {
  'use strict';

  const video = document.getElementById('handshake-video');
  const runway = document.getElementById('video-scrub-runway');
  const dimmerOverlay = document.getElementById('video-dimmer-overlay');
  const progressFill = document.getElementById('scrub-timeline-fill');
  const pctText = document.getElementById('scrub-pct-text');
  const stageIndicator = document.getElementById('story-stage-indicator');
  const storyHeading = document.getElementById('story-heading');
  const storyBody = document.getElementById('story-body');
  const clauseRows = document.querySelectorAll('.clause-row');
  const partyNeehal = document.getElementById('signoff-neehal');
  const partyBhushith = document.getElementById('signoff-bhushith');

  if (!video || !runway) return;

  let targetProgress = 0;
  let currentProgress = 0;
  let isTicking = false;
  let videoDuration = 0;

  // Storytelling narrative milestones with bold key terms and highlighted HANDSHAKE
  const storyStages = [
    {
      min: 0.0,
      max: 0.28,
      phase: '[ PHASE 01 // BEFORE THE HANDSHAKE ]',
      heading: 'BEFORE THE <span class="handshake-keyword">HANDSHAKE</span>: WHERE ASSUMPTIONS COLLIDE',
      body: 'In typical calls, instructions are casual: <strong>"Put together something clean by next week."</strong> The employee nods to avoid <strong>fear of asking</strong>. The manager thinks they were crystal clear. Two completely different pictures of <strong>"Done"</strong> are already in motion.',
      activeClause: 0,
      neehalSigned: false,
      bhushithSigned: false
    },
    {
      min: 0.28,
      max: 0.58,
      phase: '[ PHASE 02 // THE MOMENT OF THE HANDSHAKE ]',
      heading: 'THE MOMENT OF THE <span class="handshake-keyword">HANDSHAKE</span>: AGREEING IN REAL TIME',
      body: 'Before anyone hangs up, The Mutual intercepts ambiguous words. Never start working on <strong>vague verbal promises</strong>—all expectations are codified into an <strong>explicit, mutual agreement</strong>.',
      activeClause: 1,
      neehalSigned: true,
      bhushithSigned: false
    },
    {
      min: 0.58,
      max: 0.85,
      phase: '[ PHASE 03 // THE 5-POINT CONTRACT ]',
      heading: 'THE 5-POINT <span class="handshake-keyword">HANDSHAKE</span>: CLEAR &amp; BINDING',
      body: '1. <strong>Core Deliverable &amp; Format</strong>. 2. <strong>Hard Cutoff Deadline</strong> with 24h SLA. 3. <strong>Measurable Definition of Done</strong>. 4. <strong>Out-of-Scope Anti-Goals</strong> (no scope creep). 5. <strong>Single Sign-Off Decider</strong>. No committee paralysis. Zero surprise rejections.',
      activeClause: 3,
      neehalSigned: true,
      bhushithSigned: false
    },
    {
      min: 0.85,
      max: 1.0,
      phase: '[ PHASE 04 // CONSENSUS LOCKED ]',
      heading: 'CONSENSUS LOCKED: <span class="handshake-keyword">HANDSHAKE</span> COMPLETE',
      body: 'Both <strong>manager and employee</strong> sign off in 30 seconds. The <strong>20-hour redo trap</strong> is permanently prevented before the first slide is built or the first line of code is written.',
      activeClause: 4,
      neehalSigned: true,
      bhushithSigned: true
    }
  ];

  // Initialize video metadata
  function onVideoReady() {
    videoDuration = video.duration || 5.0;
    video.pause();
    updateScrollProgress();
  }

  if (video.readyState >= 1) {
    onVideoReady();
  } else {
    video.addEventListener('loadedmetadata', onVideoReady);
  }

  // Handle fallback source
  video.addEventListener('error', () => {
    if (!video.src.includes('assets/')) {
      video.src = 'assets/business_handshake.mp4';
      video.load();
    }
  });

  // Calculate scroll position relative to the video runway
  function updateScrollProgress() {
    const rect = runway.getBoundingClientRect();
    const windowH = window.innerHeight;
    const scrollableDistance = runway.offsetHeight - windowH;

    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('consensus') === '1' && window.scrollY === 0) {
      targetProgress = 1.0;
      currentProgress = 1.0;
      if (!isTicking) { isTicking = true; requestAnimationFrame(render); }
      return;
    }
    const progress = -rect.top / scrollableDistance;
    targetProgress = Math.max(0, Math.min(1, progress));

    if (!isTicking) {
      isTicking = true;
      requestAnimationFrame(render);
    }
  }

  // Physics animation loop with smooth lerping
  function render() {
    currentProgress += (targetProgress - currentProgress) * 0.14;

    if (Math.abs(targetProgress - currentProgress) < 0.0005) {
      currentProgress = targetProgress;
    }

    const t = currentProgress;

    // 1. Scrub Video Frame smoothly
    if (videoDuration > 0 && isFinite(videoDuration) && !video.seeking) {
      const targetTime = Math.max(0, Math.min(videoDuration - 0.05, t * videoDuration));
      if (Math.abs(video.currentTime - targetTime) > 0.02) {
        if ('fastSeek' in video) {
          video.fastSeek(targetTime);
        } else {
          video.currentTime = targetTime;
        }
      }
    }

    // 2. Dynamic Background Dimming (Darkens with scroll)
    if (dimmerOverlay) {
      const dimmerOpacity = 0.45 + (t * 0.45);
      dimmerOverlay.style.opacity = dimmerOpacity.toFixed(2);
      const greenShift = Math.floor(14 + (t * 18));
      dimmerOverlay.style.background = `radial-gradient(circle at 60% 45%, rgba(13, ${greenShift}, 25, 0.55) 0%, rgba(5, 5, 5, 0.95) 75%)`;
    }

    // 3. Update HUD & Timeline
    if (progressFill) {
      progressFill.style.width = (t * 100).toFixed(1) + '%';
    }
    if (pctText) {
      pctText.innerHTML = `<strong>${Math.round(t * 100)}%</strong> HANDSHAKE ALIGNED`;
    }

    // 4. Update Storytelling Content & Milestones
    const currentStage = storyStages.find(s => t >= s.min && t <= s.max) || storyStages[0];

    if (stageIndicator && stageIndicator.textContent !== currentStage.phase) {
      stageIndicator.textContent = currentStage.phase;
    }
    if (storyHeading && storyHeading.dataset.currentHeading !== currentStage.heading) {
      storyHeading.innerHTML = currentStage.heading;
      storyHeading.dataset.currentHeading = currentStage.heading;
    }
    if (storyBody && storyBody.dataset.currentBody !== currentStage.body) {
      storyBody.innerHTML = currentStage.body;
      storyBody.dataset.currentBody = currentStage.body;
    }

    // Highlight active clause in 5-point contract
    if (clauseRows.length) {
      clauseRows.forEach((row, i) => {
        if (i <= currentStage.activeClause) {
          row.classList.add('active');
        } else {
          row.classList.remove('active');
        }
      });
    }

    // Bilateral Sign-off Status
    if (partyNeehal) {
      partyNeehal.innerHTML = currentStage.neehalSigned ? '<strong style="color:#38DF78;">[ SIGNED ]</strong>' : '<span style="color:#D97706;">[ PENDING ]</span>';
    }
    if (partyBhushith) {
      partyBhushith.innerHTML = currentStage.bhushithSigned ? '<strong style="color:#38DF78;">[ SIGNED ]</strong>' : '<span style="color:#D97706;">[ PENDING ]</span>';
    }

    // Continue loop if still lerping
    if (Math.abs(targetProgress - currentProgress) >= 0.0005) {
      requestAnimationFrame(render);
    } else {
      isTicking = false;
    }
  }

  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  window.addEventListener('resize', () => {
    onVideoReady();
    updateScrollProgress();
  }, { passive: true });

  updateScrollProgress();
})();
