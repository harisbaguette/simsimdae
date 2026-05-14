(function () {
  'use strict';

  /* ── Config ─────────────────────────────────────────── */
  const root = document.getElementById('game-root');

  const DIFF_RADIUS = { easy: 120, normal: 90, hard: 60, expert: 40 };
  const GAME_DURATION = 10; // seconds

  /* ── Canvas setup ────────────────────────────────────── */
  const W = 400, H = 400;

  let canvas, ctx;
  let animId     = null;
  let gameActive = false;

  /* ── State ───────────────────────────────────────────── */
  let clickCount   = 0;
  let startTime    = 0;
  let btnX         = W / 2;
  let btnY         = H / 2;
  let btnR         = 90;
  let particles    = [];
  let moveInterval = null;
  let currentDiff  = 'normal';
  let ripples      = [];

  /* ── Init DOM ────────────────────────────────────────── */
  function initDOM() {
    root.innerHTML = '';
    root.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:0;';

    canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    canvas.style.cssText = `
      width: min(${W}px, 96vw);
      height: min(${H}px, 96vw);
      display: block;
      border-radius: 16px;
      touch-action: none;
      cursor: pointer;
      background: #0f1117;
    `;
    ctx = canvas.getContext('2d');
    root.appendChild(canvas);

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('touchstart', onTouch, { passive: true });
  }

  /* ── Input handlers ──────────────────────────────────── */
  function onPointerDown(e) {
    if (!gameActive) return;
    e.preventDefault();
    const rect   = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top)  * scaleY;
    handleHit(cx, cy);
  }

  function onTouch(e) {
    if (!gameActive) return;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    for (const t of e.changedTouches) {
      const cx = (t.clientX - rect.left) * scaleX;
      const cy = (t.clientY - rect.top)  * scaleY;
      handleHit(cx, cy);
    }
  }

  function handleHit(cx, cy) {
    const dist = Math.hypot(cx - btnX, cy - btnY);
    if (dist <= btnR) {
      clickCount++;
      window.updateScore && window.updateScore(clickCount);
      spawnParticles(btnX, btnY);
      spawnRipple(btnX, btnY);
    } else {
      // Miss flash
      spawnRipple(cx, cy, true);
    }
  }

  /* ── Particle system ─────────────────────────────────── */
  const COLORS = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff922b','#cc5de8','#ff6dd6'];

  function spawnParticles(x, y) {
    const count = 6 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const angle  = (Math.random() * Math.PI * 2);
      const speed  = 3 + Math.random() * 5;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r:  3 + Math.random() * 4,
        life: 1,
        decay: 0.028 + Math.random() * 0.02,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }
  }

  function spawnRipple(x, y, miss = false) {
    ripples.push({ x, y, r: btnR * 0.4, life: 1, miss });
  }

  /* ── Button position for expert mode ─────────────────── */
  function moveButton() {
    const margin = btnR + 20;
    btnX = margin + Math.random() * (W - margin * 2);
    btnY = margin + Math.random() * (H - margin * 2);
  }

  /* ── Draw ────────────────────────────────────────────── */
  function draw() {
    ctx.clearRect(0, 0, W, H);

    const elapsed  = (Date.now() - startTime) / 1000;
    const timeLeft = Math.max(0, GAME_DURATION - elapsed);
    const progress = timeLeft / GAME_DURATION; // 1 → 0

    // Background
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    // ── Countdown ring ──────────────────────────────────
    const ringX = W / 2, ringY = 68, ringR = 52;
    // Background ring
    ctx.beginPath();
    ctx.arc(ringX, ringY, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth   = 10;
    ctx.stroke();
    // Active ring (shrinks)
    const startAngle = -Math.PI / 2;
    const endAngle   = startAngle + Math.PI * 2 * progress;
    const hue        = Math.floor(120 * progress); // green → red
    ctx.beginPath();
    ctx.arc(ringX, ringY, ringR, startAngle, endAngle);
    ctx.strokeStyle = `hsl(${hue}, 90%, 55%)`;
    ctx.lineWidth   = 10;
    ctx.lineCap     = 'round';
    ctx.stroke();
    // Time text inside ring
    ctx.fillStyle    = '#ffffff';
    ctx.font         = 'bold 22px system-ui, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.ceil(timeLeft), ringX, ringY);

    // ── Ripples ─────────────────────────────────────────
    ripples = ripples.filter(rp => rp.life > 0);
    for (const rp of ripples) {
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r * (1 + (1 - rp.life) * 1.5), 0, Math.PI * 2);
      ctx.strokeStyle = rp.miss
        ? `rgba(255,80,80,${rp.life * 0.6})`
        : `rgba(255,220,60,${rp.life * 0.7})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      rp.life -= 0.04;
    }

    // ── Big button ──────────────────────────────────────
    // Shadow
    ctx.shadowColor   = '#4d96ff55';
    ctx.shadowBlur    = 28;
    // Outer glow ring
    ctx.beginPath();
    ctx.arc(btnX, btnY, btnR + 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(77,150,255,0.12)';
    ctx.fill();
    // Button gradient
    const grad = ctx.createRadialGradient(btnX - btnR * 0.3, btnY - btnR * 0.3, 0, btnX, btnY, btnR);
    grad.addColorStop(0, '#74c0fc');
    grad.addColorStop(0.5, '#4d96ff');
    grad.addColorStop(1, '#1864c8');
    ctx.beginPath();
    ctx.arc(btnX, btnY, btnR, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowBlur = 0;
    // Shine highlight
    ctx.beginPath();
    ctx.ellipse(btnX - btnR * 0.25, btnY - btnR * 0.3, btnR * 0.28, btnR * 0.16, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fill();
    // Button label
    ctx.fillStyle    = '#ffffff';
    ctx.font         = `bold ${Math.max(14, btnR * 0.38)}px system-ui, sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('누르기!', btnX, btnY);

    // ── Click counter ───────────────────────────────────
    ctx.fillStyle    = '#ffffff';
    ctx.font         = 'bold 52px system-ui, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(clickCount, W / 2, H - 48);
    ctx.font         = '16px system-ui, sans-serif';
    ctx.fillStyle    = '#8899aa';
    ctx.fillText('번 클릭', W / 2, H - 26);

    // ── Particles ───────────────────────────────────────
    particles = particles.filter(p => p.life > 0);
    for (const p of particles) {
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      p.x    += p.vx;
      p.y    += p.vy;
      p.vy   += 0.18; // gravity
      p.life -= p.decay;
    }
    ctx.globalAlpha = 1;

    // ── End check ───────────────────────────────────────
    if (timeLeft <= 0 && gameActive) {
      endGame();
      return;
    }

    animId = requestAnimationFrame(draw);
  }

  /* ── Game lifecycle ──────────────────────────────────── */
  function endGame() {
    gameActive = false;
    clearInterval(moveInterval);
    cancelAnimationFrame(animId);

    // Draw final state once
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('게임 종료!', W / 2, H / 2 - 30);
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillStyle = '#4d96ff';
    ctx.fillText(`${clickCount}번 클릭`, W / 2, H / 2 + 16);

    window.dispatchEvent(new CustomEvent('gameOver', {
      detail: { score: clickCount, cleared: false }
    }));
  }

  /* ── Public API ──────────────────────────────────────── */
  window.startGame = function (diffId, stageNum) {
    currentDiff = diffId || 'normal';
    btnR        = DIFF_RADIUS[currentDiff] || 90;
    clickCount  = 0;
    particles   = [];
    ripples     = [];
    gameActive  = false;

    cancelAnimationFrame(animId);
    clearInterval(moveInterval);

    initDOM();

    btnX = W / 2;
    btnY = H / 2;

    window.updateScore && window.updateScore(0);

    // Expert: button moves every 0.5s
    if (currentDiff === 'expert') {
      moveInterval = setInterval(moveButton, 500);
    }

    gameActive = true;
    startTime  = Date.now();
    animId     = requestAnimationFrame(draw);
  };

})();
