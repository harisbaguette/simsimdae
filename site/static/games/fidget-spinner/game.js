(function () {
  'use strict';

  /* ── Config ─────────────────────────────────────────── */
  const root = document.getElementById('game-root');
  const W = 400, H = 400;
  const CX = W / 2, CY = H / 2;

  const FRICTION_MAP = {
    easy:   0.998,
    normal: 0.995,
    hard:   0.990,
    expert: 0.985,
  };

  /* ── State ───────────────────────────────────────────── */
  let canvas, ctx, animId;
  let angle         = 0;
  let angularVel    = 0;   // radians per frame
  let friction      = 0.995;
  let maxRpm        = 0;
  let currentRpm    = 0;
  let isDragging    = false;
  let lastAngle     = 0;
  let lastTime      = 0;
  let prevDragAngle = 0;
  let dragDelta     = 0;
  let idleTimer     = 0;    // frames near-zero
  let gameEnded     = false;
  let trailAngles   = [];
  const IDLE_THRESHOLD = 30 * 60; // 30 seconds at 60fps

  /* ── Lobe colours ────────────────────────────────────── */
  const LOBE_COLORS = [
    { fill: '#4d96ff', shine: '#74c0fc' },
    { fill: '#ff6b6b', shine: '#ffa8a8' },
    { fill: '#51cf66', shine: '#8ce99a' },
  ];

  /* ── DOM init ────────────────────────────────────────── */
  function initDOM() {
    root.innerHTML = '';
    root.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px;';

    canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    canvas.style.cssText = `
      width: min(${W}px, 94vw);
      height: min(${H}px, 94vw);
      display: block;
      border-radius: 16px;
      cursor: grab;
      touch-action: none;
      background: #0f1117;
    `;
    ctx = canvas.getContext('2d');
    root.appendChild(canvas);

    // Spin button
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:12px;align-items:center;';

    const spinBtn = document.createElement('button');
    spinBtn.textContent = '🌀 돌려!';
    spinBtn.style.cssText = `
      padding: 10px 28px;
      border: none;
      border-radius: 24px;
      background: linear-gradient(135deg, #4d96ff, #1864c8);
      color: #fff;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(77,150,255,.4);
      transition: transform 80ms;
    `;
    spinBtn.addEventListener('pointerdown', () => {
      angularVel += 0.18 + Math.random() * 0.08;
      spinBtn.style.transform = 'scale(0.93)';
    });
    spinBtn.addEventListener('pointerup', () => {
      spinBtn.style.transform = 'scale(1)';
    });

    btnRow.appendChild(spinBtn);
    root.appendChild(btnRow);

    // Pointer events for drag
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup',   onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   onTouchEnd,   { passive: true });
  }

  /* ── Drag handlers (pointer) ─────────────────────────── */
  function getCanvasAngle(e) {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const x = (e.clientX - rect.left) * scaleX - CX;
    const y = (e.clientY - rect.top)  * scaleY - CY;
    return Math.atan2(y, x);
  }

  function onPointerDown(e) {
    isDragging    = true;
    prevDragAngle = getCanvasAngle(e);
    dragDelta     = 0;
    lastTime      = performance.now();
    canvas.style.cursor = 'grabbing';
    canvas.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const now  = performance.now();
    const a    = getCanvasAngle(e);
    let   diff = a - prevDragAngle;
    // Wrap to [-π, π]
    if (diff >  Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    dragDelta  = diff / Math.max(1, (now - lastTime)) * 16; // normalize to ~60fps
    angle     += diff;
    prevDragAngle = a;
    lastTime      = now;
  }

  function onPointerUp() {
    if (!isDragging) return;
    isDragging  = false;
    angularVel  = dragDelta * 1.8; // fling factor
    canvas.style.cursor = 'grab';
  }

  /* ── Touch handlers ──────────────────────────────────── */
  function getTouchAngle(t) {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const x = (t.clientX - rect.left) * scaleX - CX;
    const y = (t.clientY - rect.top)  * scaleY - CY;
    return Math.atan2(y, x);
  }

  function onTouchStart(e) {
    const t = e.touches[0];
    isDragging    = true;
    prevDragAngle = getTouchAngle(t);
    dragDelta     = 0;
    lastTime      = performance.now();
  }

  function onTouchMove(e) {
    e.preventDefault();
    if (!isDragging || !e.touches.length) return;
    const now  = performance.now();
    const a    = getTouchAngle(e.touches[0]);
    let   diff = a - prevDragAngle;
    if (diff >  Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    dragDelta  = diff / Math.max(1, (now - lastTime)) * 16;
    angle     += diff;
    prevDragAngle = a;
    lastTime      = now;
  }

  function onTouchEnd() {
    isDragging = false;
    angularVel = dragDelta * 1.8;
  }

  /* ── Drawing ─────────────────────────────────────────── */
  const LOBE_RADIUS  = 68;  // distance from center to lobe center
  const LOBE_SIZE    = 52;  // lobe circle radius

  function drawSpinner() {
    const speed = Math.abs(angularVel);

    // Trail effect (motion blur)
    const trailCount = Math.min(8, Math.floor(speed * 80));
    for (let t = 0; t < trailCount; t++) {
      const trailAngle = angle - angularVel * (t + 1) * 2;
      const alpha      = (1 - t / trailCount) * 0.08;
      ctx.globalAlpha  = alpha;
      drawLobes(trailAngle, true);
    }
    ctx.globalAlpha = 1;

    // Main spinner
    drawLobes(angle, false);

    // Center hub
    const hubGrad = ctx.createRadialGradient(CX - 8, CY - 8, 0, CX, CY, 22);
    hubGrad.addColorStop(0, '#e9ecef');
    hubGrad.addColorStop(1, '#868e96');
    ctx.beginPath();
    ctx.arc(CX, CY, 22, 0, Math.PI * 2);
    ctx.fillStyle = hubGrad;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(CX, CY, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#343a40';
    ctx.fill();
    // Hub reflection
    ctx.beginPath();
    ctx.ellipse(CX - 6, CY - 6, 5, 3, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill();
  }

  function drawLobes(ang, isTrail) {
    for (let i = 0; i < 3; i++) {
      const lobeAngle = ang + (i * Math.PI * 2) / 3;
      const lx = CX + Math.cos(lobeAngle) * LOBE_RADIUS;
      const ly = CY + Math.sin(lobeAngle) * LOBE_RADIUS;
      const col = LOBE_COLORS[i];

      if (!isTrail) {
        // Shadow
        ctx.shadowColor = col.fill + '88';
        ctx.shadowBlur  = 18;
      }

      ctx.beginPath();
      ctx.arc(lx, ly, LOBE_SIZE, 0, Math.PI * 2);
      ctx.fillStyle = isTrail ? col.fill : col.fill;
      ctx.fill();

      if (!isTrail) {
        ctx.shadowBlur = 0;
        // Shine highlight
        ctx.beginPath();
        ctx.ellipse(lx - LOBE_SIZE * 0.25, ly - LOBE_SIZE * 0.25,
          LOBE_SIZE * 0.28, LOBE_SIZE * 0.16, -0.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fill();
      }
    }
  }

  function drawHUD() {
    // RPM display
    const rpmInt = Math.round(currentRpm);
    ctx.fillStyle    = rpmInt > 500 ? '#ffd43b' : rpmInt > 200 ? '#74c0fc' : '#ced4da';
    ctx.font         = 'bold 42px system-ui, monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(rpmInt.toLocaleString(), W / 2, 52);
    ctx.font      = '13px system-ui, sans-serif';
    ctx.fillStyle = '#8899aa';
    ctx.fillText('RPM', W / 2, 70);

    // Max RPM
    ctx.font      = '14px system-ui, sans-serif';
    ctx.fillStyle = '#ffd43b';
    ctx.fillText(`최고: ${Math.round(maxRpm).toLocaleString()} RPM`, W / 2, H - 16);

    // Speed bar
    const barW   = 200;
    const barH   = 8;
    const barX   = (W - barW) / 2;
    const barY   = H - 36;
    const maxVel = 0.6;
    const fill   = Math.min(1, Math.abs(angularVel) / maxVel);
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 4);
    ctx.fillStyle = '#2a2d3a';
    ctx.fill();
    if (fill > 0) {
      const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      barGrad.addColorStop(0, '#4d96ff');
      barGrad.addColorStop(0.6, '#51cf66');
      barGrad.addColorStop(1, '#ffd43b');
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW * fill, barH, 4);
      ctx.fillStyle = barGrad;
      ctx.fill();
    }
  }

  /* ── Physics loop ────────────────────────────────────── */
  const FPS = 60;

  function loop() {
    animId = requestAnimationFrame(loop);

    // Physics
    if (!isDragging) {
      angle      += angularVel;
      angularVel *= friction;
      if (Math.abs(angularVel) < 0.0001) angularVel = 0;
    }

    // RPM = angVel (rad/frame) × FPS (frame/s) / (2π) × 60 (s/min)
    currentRpm = Math.abs(angularVel) * FPS / (Math.PI * 2) * 60;
    if (currentRpm > maxRpm) {
      maxRpm = currentRpm;
      window.updateScore && window.updateScore(Math.round(maxRpm));
    }

    // Idle detection
    if (Math.abs(angularVel) < 0.002 && !isDragging) {
      idleTimer++;
    } else {
      idleTimer = 0;
    }

    if (idleTimer >= IDLE_THRESHOLD && !gameEnded) {
      gameEnded = true;
      endGame();
      return;
    }

    // Draw
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    drawSpinner();
    drawHUD();
  }

  function endGame() {
    cancelAnimationFrame(animId);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle    = '#ffffff';
    ctx.font         = 'bold 28px system-ui, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('정지!', W / 2, H / 2 - 40);
    ctx.font      = 'bold 20px system-ui, sans-serif';
    ctx.fillStyle = '#ffd43b';
    ctx.fillText(`최고 기록: ${Math.round(maxRpm).toLocaleString()} RPM`, W / 2, H / 2);
    ctx.font      = '15px system-ui, sans-serif';
    ctx.fillStyle = '#8899aa';
    ctx.fillText('더 빨리 돌려보세요!', W / 2, H / 2 + 36);

    window.dispatchEvent(new CustomEvent('gameOver', {
      detail: { score: Math.round(maxRpm), cleared: false }
    }));
  }

  /* ── Public API ──────────────────────────────────────── */
  window.startGame = function (diffId) {
    cancelAnimationFrame(animId);

    friction   = FRICTION_MAP[diffId] || 0.995;
    angle      = 0;
    angularVel = 0;
    maxRpm     = 0;
    currentRpm = 0;
    idleTimer  = 0;
    gameEnded  = false;
    isDragging = false;

    window.updateScore && window.updateScore(0);
    initDOM();
    loop();
  };

})();
