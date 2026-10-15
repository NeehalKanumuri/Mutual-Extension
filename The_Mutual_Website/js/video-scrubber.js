/**
 * THE MUTUAL — Scroll-Driven Video Scrubbing & Handshake Storytelling Engine
 * Video: business_handshake.mp4
 * Theme: Deep Green & Black shades with dynamic background dimming
 * Structure: Exact match to design screenshot layout with sharp boxed HANDSHAKE keyword,
 *            ultra-smooth hardware-accelerated video scrubbing with in-memory blob preloading
 *            and queued seek reconciliation.
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
  const protocolSummary = document.getElementById('hs-protocol-summary');
  const protocolPills = document.querySelectorAll('.hs-protocol-pill');
  const partyNeehal = document.getElementById('signoff-neehal');
  const partyBhushith = document.getElementById('signoff-bhushith');

  if (!video || !runway) return;

  let targetProgress = 0;
  let currentProgress = 0;
  let isTicking = false;
  let videoDuration = 7.32;
  let isSeeking = false;
  let queuedTime = null;

  // Configure video for optimal hardware scrubbing
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.pause();

  // Preload video into in-memory Blob URL for buttery smooth 60fps frame scrubbing
  function preloadVideoBlob() {
    fetch('business_handshake.mp4')
      .then(res => {
        if (!res.ok) throw new Error('Fetch failed');
        return res.blob();
      })
      .then(blob => {
        const objUrl = URL.createObjectURL(blob);
        const curTime = video.currentTime || 0;
        video.src = objUrl;
        video.currentTime = curTime;
      })
      .catch(() => {
        // Fallback to direct file src is already active
      });
  }
  preloadVideoBlob();

  // Storytelling narrative milestones:
  // Exactly matching the typography, line breaks, and sharp boxed HANDSHAKE in the design screenshot
  const storyStages = [
    {
      min: 0.0,
      max: 0.28,
      phase: '[ PHASE 01 // BEFORE THE HANDSHAKE ]',
      heading: 'BEFORE THE<br><span class="handshake-keyword">HANDSHAKE</span> : WHERE<br>ASSUMPTIONS COLLIDE',
      body: 'In typical calls, instructions are casual: <strong>"Put together something clean by next week."</strong> The employee nods to avoid <strong>fear of asking</strong>. The manager thinks they were crystal clear. Two completely different pictures of <strong>"Done"</strong> are already in motion.',
      protocolVisible: false,
      activePillIndex: -1,
      neehalSigned: false,
      bhushithSigned: false
    },
    {
      min: 0.28,
      max: 0.58,
      phase: '[ PHASE 02 // THE MOMENT OF THE HANDSHAKE ]',
      heading: 'THE MOMENT OF THE<br><span class="handshake-keyword">HANDSHAKE</span> : AGREEING<br>IN REAL TIME',
      body: 'Before anyone hangs up, The Mutual intercepts ambiguous words. Never start working on <strong>vague verbal promises</strong>—all expectations are codified into an <strong>explicit, mutual agreement</strong>.',
      protocolVisible: false,
      activePillIndex: 0,
      neehalSigned: true,
      bhushithSigned: false
    },
    {
      min: 0.58,
      max: 0.85,
      phase: '[ PHASE 03 // THE 5-POINT CONTRACT ]',
      heading: 'THE 5-POINT<br><span class="handshake-keyword">HANDSHAKE</span> : CLEAR &amp;<br>BINDING',
      body: '1. <strong>Core Deliverable &amp; Format</strong>. 2. <strong>Hard Cutoff Deadline</strong> with 24h SLA. 3. <strong>Measurable Definition of Done</strong>. 4. <strong>Out-of-Scope Anti-Goals</strong> (no scope creep). 5. <strong>Single Sign-Off Decider</strong>. No committee paralysis. Zero surprise rejections.',
      protocolVisible: true,
      activePillIndex: 4,
      neehalSigned: true,
      bhushithSigned: false
    },
    {
      min: 0.85,
      max: 1.0,
      phase: '[ PHASE 04 // CONSENSUS LOCKED ]',
      heading: 'CONSENSUS LOCKED :<br><span class="handshake-keyword">HANDSHAKE</span><br>COMPLETE',
      body: 'Both <strong>manager and employee</strong> sign off in 30 seconds. The <strong>20-hour redo trap</strong> is permanently prevented before the first slide is built or the first line of code is written.',
      protocolVisible: true,
      activePillIndex: 4,
      neehalSigned: true,
      bhushithSigned: true
    }
  ];

  // Initialize video metadata
  function onVideoReady() {
    videoDuration = video.duration || 7.32;
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

  // Butter-smooth queued seeking logic
  function performSeek(time) {
    if (video.seeking || isSeeking) {
      queuedTime = time;
      return;
    }
    if (Math.abs(video.currentTime - time) < 0.02) return;

    isSeeking = true;
    try {
      video.currentTime = time;
    } catch (e) {
      isSeeking = false;
    }
  }

  video.addEventListener('seeked', () => {
    isSeeking = false;
    if (queuedTime !== null) {
      const nextTime = queuedTime;
      queuedTime = null;
      performSeek(nextTime);
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
    currentProgress += (targetProgress - currentProgress) * 0.16;

    if (Math.abs(targetProgress - currentProgress) < 0.0005) {
      currentProgress = targetProgress;
    }

    const t = currentProgress;

    // 1. Scrub Video Frame smoothly without decoder stutter
    if (videoDuration > 0 && isFinite(videoDuration)) {
      const targetTime = Math.max(0, Math.min(videoDuration - 0.04, t * videoDuration));
      performSeek(targetTime);
    }

    // 2. Dynamic Background Dimming (Darkens with scroll)
    if (dimmerOverlay) {
      const dimmerOpacity = 0.45 + (t * 0.45);
      dimmerOverlay.style.opacity = dimmerOpacity.toFixed(2);
      const greenShift = Math.floor(14 + (t * 18));
      dimmerOverlay.style.background = `radial-gradient(circle at 50% 50%, rgba(13, ${greenShift}, 25, 0.55) 0%, rgba(5, 5, 5, 0.95) 75%)`;
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

    // Phase Indicator: [ PHASE 01 // BEFORE THE HANDSHAKE ]
    if (stageIndicator && stageIndicator.textContent !== currentStage.phase) {
      stageIndicator.textContent = currentStage.phase;
    }

    // Exact Multi-line Heading with Sharp Boxed HANDSHAKE
    if (storyHeading && storyHeading.dataset.currentHeading !== currentStage.heading) {
      storyHeading.innerHTML = currentStage.heading;
      storyHeading.dataset.currentHeading = currentStage.heading;
    }

    // Narrative Body
    if (storyBody && storyBody.dataset.currentBody !== currentStage.body) {
      storyBody.innerHTML = currentStage.body;
      storyBody.dataset.currentBody = currentStage.body;
    }

    // 5-Point Protocol Bar (visible during Phase 3 & 4)
    if (protocolSummary) {
      if (currentStage.protocolVisible) {
        protocolSummary.classList.add('visible');
      } else {
        protocolSummary.classList.remove('visible');
      }
    }

    if (protocolPills.length) {
      protocolPills.forEach((pill, idx) => {
        if (idx <= currentStage.activePillIndex) {
          pill.classList.add('active');
        } else {
          pill.classList.remove('active');
        }
      });
    }

    // Bilateral Sign-off Status
    if (partyNeehal) {
      partyNeehal.className = currentStage.neehalSigned ? 'signoff-status-signed' : 'signoff-status-pending';
      partyNeehal.innerHTML = currentStage.neehalSigned ? '[ SIGNED ]' : '[ PENDING ]';
    }
    if (partyBhushith) {
      partyBhushith.className = currentStage.bhushithSigned ? 'signoff-status-signed' : 'signoff-status-pending';
      partyBhushith.innerHTML = currentStage.bhushithSigned ? '[ SIGNED ]' : '[ PENDING ]';
    }

    // Continue loop if still lerping or if seeking is queued
    if (Math.abs(targetProgress - currentProgress) >= 0.0005 || queuedTime !== null) {
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
