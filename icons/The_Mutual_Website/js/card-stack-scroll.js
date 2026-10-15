/**
 * THE MUTUAL — 3D Card Stack to 2x5 Matrix Landing Engine
 * Smoothly transitions from a 3D perspective fanned stack into a clean,
 * perfectly readable 2x5 matrix on scroll.
 */

(function () {
  'use strict';

  const runway = document.getElementById('card-stack-runway');
  const stickyViewport = document.getElementById('card-stack-sticky');
  const wrapper3D = document.getElementById('stack-3d-wrapper');
  const stackCenter = document.getElementById('card-stack-center');
  const progressBar = document.getElementById('stack-progress-bar');
  const hudCounter = document.getElementById('stack-hud-counter');
  const cards = document.querySelectorAll('.stack-card-item');

  if (!runway || !cards.length) return;

  const totalCards = cards.length;
  let targetProgress = 0;
  let currentProgress = 0;
  let isTicking = false;

  // 3D initial stack configuration (Phase 1)
  const config = {
    wrapperStart: { x: 260, y: 160, rotY: -32, rotX: 16, rotZ: 6 },
    wrapperEnd: { x: 0, y: 0, rotY: 0, rotX: 0, rotZ: 0 },

    stackStart: { x: -280, y: 60, rot: 22, rotX: 46, rotY: 28, scale: 0.88 },
    stackEnd: { x: 0, y: 0, rot: 0, rotX: 0, rotY: 0, scale: 1.0 },

    // Spread parameters during 3D stack phase
    zSpreadMax: 150,
    rotSpreadMax: 7,
    xSpreadMax: 44,
    ySpreadMax: -22
  };

  // 2x5 Matrix Dimensions (Phase 2 Landing Target — Spacious, Breathable, Uncluttered)
  const matrixConfig = {
    cols: 5,
    rows: 2,
    cardWidth: 252,
    cardHeight: 324,
    gapX: 20,
    gapY: 20
  };

  function lerp(start, end, factor) {
    return start + (end - start) * factor;
  }

  // Smooth easing for grid landing transition
  function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  // Calculate target 2x5 grid coordinate for card index (centered at 0, 0)
  function getGridCoordinates(idx, scaleFactor) {
    const col = idx % matrixConfig.cols;         // 0 to 4
    const row = Math.floor(idx / matrixConfig.cols); // 0 or 1

    const stepX = (matrixConfig.cardWidth + matrixConfig.gapX) * scaleFactor;
    const stepY = (matrixConfig.cardHeight + matrixConfig.gapY) * scaleFactor;

    // Center col 2 at x=0; center row 0.5 at y=0
    const targetX = (col - 2) * stepX;
    const targetY = (row - 0.5) * stepY;

    return { x: targetX, y: targetY };
  }

  // Calculate scroll position relative to runway
  function updateScrollProgress() {
    const rect = runway.getBoundingClientRect();
    const windowH = window.innerHeight;
    const scrollableDistance = runway.offsetHeight - windowH;

    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('matrix') === '1' && window.scrollY === 0) {
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
    // Lerp towards targetProgress for buttery 60fps movement
    currentProgress += (targetProgress - currentProgress) * 0.15;

    if (Math.abs(targetProgress - currentProgress) < 0.0001) {
      currentProgress = targetProgress;
    }

    const t = currentProgress;

    // Update progress bar
    if (progressBar) {
      progressBar.style.width = (t * 100).toFixed(1) + '%';
    }

    // Determine phase:
    // Phase 1 (t: 0.0 to 0.35) -> 3D Perspective Fanned Stack
    // Phase 2 (t: 0.35 to 0.85) -> Smooth untwisting & landing into 2x5 matrix
    // Phase 3 (t: 0.85 to 1.0)  -> Fully landed, flat, 100% readable 2x5 matrix
    const tFan = Math.min(1.0, t / 0.35);

    let tGridRaw = 0;
    if (t > 0.30) {
      tGridRaw = Math.min(1.0, (t - 0.30) / 0.48);
    }
    const tGrid = easeInOutCubic(tGridRaw);

    // Responsive scaling factor for the 2x5 grid on narrower viewports
    const availableWidth = window.innerWidth - 64;
    const totalMatrixWidth = 5 * matrixConfig.cardWidth + 4 * matrixConfig.gapX; // ~1184px
    const gridScale = Math.min(1.0, Math.max(0.68, availableWidth / totalMatrixWidth));

    // Update HUD text
    if (hudCounter) {
      if (tGrid >= 0.95) {
        hudCounter.textContent = `[ 2x5 MATRIX // ALL 10 CASES RESOLVED ]`;
      } else {
        const activeIndex = Math.min(totalCards - 1, Math.max(0, Math.floor(t * totalCards)));
        const cardNum = String(activeIndex + 1).padStart(2, '0');
        const segmentTag = cards[activeIndex]?.dataset.segment || 'WORKPLACE';
        hudCounter.textContent = `[ ${cardNum} / ${String(totalCards).padStart(2, '0')} // ${segmentTag} ]`;
      }
    }

    // 1. Transform the 3D wrapper (squares up as tGrid increases)
    if (wrapper3D) {
      const wrapX = lerp(lerp(config.wrapperStart.x, config.wrapperEnd.x, tFan), 0, tGrid);
      const wrapY = lerp(lerp(config.wrapperStart.y, config.wrapperEnd.y, tFan), 0, tGrid);
      const wrapRotY = lerp(lerp(config.wrapperStart.rotY, config.wrapperEnd.rotY, tFan), 0, tGrid);
      const wrapRotX = lerp(lerp(config.wrapperStart.rotX, config.wrapperEnd.rotX, tFan), 0, tGrid);
      const wrapRotZ = lerp(lerp(config.wrapperStart.rotZ, config.wrapperEnd.rotZ, tFan), 0, tGrid);

      wrapper3D.style.transform = `translate3d(${wrapX.toFixed(1)}px, ${wrapY.toFixed(1)}px, 0px) ` +
        `rotateX(${wrapRotX.toFixed(1)}deg) rotateY(${wrapRotY.toFixed(1)}deg) rotateZ(${wrapRotZ.toFixed(1)}deg)`;
    }

    // 2. Transform the Center Stack Container (unrotates and scales to fit matrix)
    if (stackCenter) {
      const sX = lerp(lerp(config.stackStart.x, config.stackEnd.x, tFan), 0, tGrid);
      const sY = lerp(lerp(config.stackStart.y, config.stackEnd.y, tFan), 0, tGrid);
      const sRot = lerp(lerp(config.stackStart.rot, config.stackEnd.rot, tFan), 0, tGrid);
      const sRotX = lerp(lerp(config.stackStart.rotX, config.stackEnd.rotX, tFan), 0, tGrid);
      const sRotY = lerp(lerp(config.stackStart.rotY, config.stackEnd.rotY, tFan), 0, tGrid);
      const sScale = lerp(lerp(config.stackStart.scale, config.stackEnd.scale, tFan), gridScale, tGrid);

      stackCenter.style.transform = `translate(-50%, -50%) translate3d(${sX.toFixed(1)}px, ${sY.toFixed(1)}px, 0px) ` +
        `rotate(${sRot.toFixed(1)}deg) rotateX(${sRotX.toFixed(1)}deg) rotateY(${sRotY.toFixed(1)}deg) scale(${sScale.toFixed(3)})`;
    }

    // 3. Transform individual cards: glide from 3D fan stack to exact 2x5 grid slot!
    const half = (totalCards - 1) / 2;

    cards.forEach((card, idx) => {
      const k = idx - half;

      // 3A. Position in 3D fan stack
      const fanMultiplier = lerp(0.2, 1.0, tFan);
      const stackZ = k * config.zSpreadMax * fanMultiplier;
      const baseRotation = (idx * 5) - (totalCards * 2.5);
      const stackRot = lerp(baseRotation * 3.5, baseRotation * 0.75, tFan);
      const stackX = k * config.xSpreadMax * fanMultiplier;
      const stackY = k * config.ySpreadMax * fanMultiplier;
      const stackTiltX = (idx % 2 === 0 ? 1 : -1) * lerp(6, 1.5, tFan);

      // 3B. Position in 2x5 Matrix
      const gridPos = getGridCoordinates(idx, 1.0);
      const targetGridX = gridPos.x;
      const targetGridY = gridPos.y;

      // 3C. Blend from Stack to Grid based on tGrid
      const finalX = lerp(stackX, targetGridX, tGrid);
      const finalY = lerp(stackY, targetGridY, tGrid);
      const finalZ = lerp(stackZ, 0, tGrid);
      const finalRot = lerp(stackRot, 0, tGrid);
      const finalTiltX = lerp(stackTiltX, 0, tGrid);

      card.style.transform = `translate3d(${finalX.toFixed(1)}px, ${finalY.toFixed(1)}px, ${finalZ.toFixed(1)}px) ` +
        `rotate(${finalRot.toFixed(1)}deg) rotateX(${finalTiltX.toFixed(1)}deg)`;

      // When in matrix mode, ensure all cards are crisp and fully opaque
      card.style.opacity = '1';
      card.style.zIndex = tGrid >= 0.7 ? 10 + idx : 10 + (totalCards - idx);
    });

    // Continue animation loop if still lerping
    if (Math.abs(targetProgress - currentProgress) >= 0.0005) {
      requestAnimationFrame(render);
    } else {
      isTicking = false;
    }
  }

  // Interactive Card Click (Subtle monochromatic highlight)
  cards.forEach((card) => {
    card.addEventListener('click', () => {
      cards.forEach(c => {
        const box = c.querySelector('.card-box');
        if (box) box.style.borderColor = 'rgba(255, 255, 255, 0.08)';
      });
      const box = card.querySelector('.card-box');
      if (box) box.style.borderColor = 'rgba(255, 255, 255, 0.35)';
    });
  });

  // Listen to scroll and resize
  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  window.addEventListener('resize', updateScrollProgress, { passive: true });

  // Initial trigger
  updateScrollProgress();
})();
