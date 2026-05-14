(function () {
  'use strict';

  /* ── Config ─────────────────────────────────────────── */
  const root = document.getElementById('game-root');
  const W = 480, H = 640;

  const DIFF = {
    easy:   { minSpd: 0.5, maxSpd: 1.5, spawnMs: 1500, balloonR: 28 },
    normal: { minSpd: 1.0, maxSpd: 2.5, spawnMs: 1000, balloonR: 26 },
    hard:   { minSpd: 2.0, maxSpd: 4.0, spawnMs:  700, balloonR: 24 },
    expert: { minSpd: 3.0, maxSpd: 6.0, spawnMs:  500, balloonR: 22 },
  };

  const BALLOON_COLORS = [
    { body: '#ff6b6b', shine: '#ffa8a8', string: '#cc3333' },
    { body: '#4d96ff', shine: '#74c0fc', string: '#1864c8' },
    { body: '#51cf66', shine: '#8ce99a', string: '#2f9e44' },
    { body: '#ffd43b', shine: '#ffe066', string: '#e67700' },
    { body: '#cc5de8', shine: '#e599f7', string: '#862e9c' },
    { body: '#ff922b', shine: '#ffc078', string: '#d9480f' },
  ];

  const GAME_DURATION = 60; // seconds
  const MAX_LIVES     = 3;
  const COMBO_THRESH  = 3;  // pops in a row for combo

  /* ── State ───────────────────────────────────────────── */
  let canvas, ctx, animId;
  let balloons    = [];
  let pops        = [];   // pop animations
  let score       = 0;
  let lives       = MAX_LIVES;
  let combo       = 0;
  let bestCombo   = 0;
  let startTime   = 0;
  let gameActive  = false;
  let spawnTimer  = null;
  let cfg         = DIFF.normal;
  let missFlashes = []; // red flash on miss
  let floatTexts  = []; // floating score labels

  let nextId = 0;

  /* ── Canvas setup ────────────────────────────────────── */
  function initDOM() {
    root.innerHTML = '';
    root.style.cssText = 'display:flex;flex-direction:column;align-items:center;';

    canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    canvas.style.cssText = `
      width: min(${W}px, 96vw);
      height: auto;
      display: block;
      border-radius: 16px;
      cursor: crosshair;
      touch-action: none;
    `;
    ctx = canvas.getContext('2d');
    root.appendChild(canvas);

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('touchstart', onTouch, { passive: false });
  }

  /* ── Balloon factory ─────────────────────────────────── */
  function spawnBalloon() {
    if (!gameActive) return;
    const col = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
    const r   = cfg.balloonR + (Math.random() * 10 - 5);
    const speed = cfg.minSpd + Math.random() * (cfg.maxSpd - cfg.minSpd);
    balloons.push({
      id:    nextId++,
      x:     r + Math.random() * (W - r * 2),
      y:     H + r + 40,
      r,
      speed,
      col,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.04 + Math.random() * 0.03,
      wobbleAmp:   6 + Math.random() * 10,
      alive: true,
    });
  }

  /* ── Hit detection ───────────────────────────────────── */
  function getCanvasCoords(clientX, clientY) {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top)  * scaleY,
    };
  }

  function onPointerDown(e) {
    if (!gameActive) return;
    e.preventDefault();
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    handleClick(x, y);
  }

  function onTouch(e) {
    if (!gameActive) return;
    e.preventDefault();
    for (const t of e.changedTouches) {
      const { x, y } = getCanvasCoords(t.clientX, t.clientY);
      handleClick(x, y);
    }
  }

  function handleClick(cx, cy) {
    let hit = false;
    // Check closest balloon hit (front-to-back)
    for (let i = balloons.length - 1; i >= 0; i--) {
      const b = balloons[i];
      if (!b.alive) continue;
      const dist = Math.hypot(cx - b.x, cy - b.y);
      if (dist <= b.r) {
        popBalloon(b, i);
        hit = true;
        break;
      }
    }
    if (!hit) {
      // Miss visual
      missFlashes.push({ x: cx, y: cy, life: 1 });
    }
  }

  function popBalloon(b, idx) {
    b.alive = false;
    combo++;
    if (combo > bestCombo) bestCombo = combo;

    let pts = 10;
    let comboLabel = '';
    if (combo >= COMBO_THRESH) {
      const mult = 1 + Math.floor((combo - COMBO_THRESH) / 2 + 1);
      pts = 10 * mult;
      comboLabel = ` ×${mult}`;
    }
    score += pts;
    window.updateScore && window.updateScore(score);

    // Pop animation
    pops.push({
      x: b.x, y: b.y, r: b.r,
      col: b.col,
      life: 1,
      particles: makeParticles(b.x, b.y, b.col.body),
    });

    // Floating score text
    floatTexts.push({
      x: b.x, y: b.y,
      text: `+${pts}${comboLabel}`,
      life: 1,
      color: combo >= COMBO_THRESH ? '#ffd43b' : '#ffffff',
    });

    balloons.splice(idx, 1);
  }

  function makeParticles(x, y, color) {
    const arr = [];
    for (let i = 0; i < 10; i++) {
      const a = (Math.random() * Math.PI * 2);
      const s = 2 + Math.random() * 5;
      arr.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, r: 3+Math.random()*3, life: 1, color });
    }
    return arr;
  }

  /* ── Draw helpers ────────────────────────────────────── */
  function drawBalloon(b) {
    const x = b.x + Math.sin(b.wobble) * b.wobbleAmp;
    const y = b.y;
    const r = b.r;

    // String
    ctx.beginPath();
    ctx.moveTo(x, y + r);
    ctx.bezierCurveTo(x - 4, y + r + 14, x + 4, y + r + 20, x, y + r + 28);
    ctx.strokeStyle = b.col.string;
    ctx.lineWidth   = 1.2;
    ctx.stroke();

    // Body shadow
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur  = 10;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.92, r, 0, 0, Math.PI * 2);
    ctx.fillStyle = b.col.body;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Shine
    ctx.beginPath();
    ctx.ellipse(x - r * 0.28, y - r * 0.28, r * 0.22, r * 0.14, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill();

    // Knot dot
    ctx.beginPath();
    ctx.arc(x, y + r, 3, 0, Math.PI * 2);
    ctx.fillStyle = b.col.string;
    ctx.fill();

    // Update wobble
    b.wobble += b.wobbleSpeed;
  }

  function drawHUD() {
    const elapsed  = (Date.now() - startTime) / 1000;
    const timeLeft = Math.max(0, GAME_DURATION - elapsed);

    // Top bar background
    const topH = 56;
    ctx.fillStyle = 'rgba(15,17,23,0.85)';
    ctx.fillRect(0, 0, W, topH);

    // Timer
    const timerColor = timeLeft < 10 ? '#ff6b6b' : '#74c0fc';
    ctx.fillStyle    = timerColor;
    ctx.font         = 'bold 22px system-ui, sans-serif';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`⏱ ${Math.ceil(timeLeft)}s`, 16, topH / 2);

    // Lives (hearts)
    ctx.font      = '20px system-ui, sans-serif';
    ctx.textAlign = 'right';
    let hearts = '';
    for (let i = 0; i < MAX_LIVES; i++) hearts += i < lives ? '❤️' : '🖤';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(hearts, W - 12, topH / 2);

    // Combo display
    if (combo >= COMBO_THRESH) {
      ctx.font         = 'bold 15px system-ui, sans-serif';
      ctx.fillStyle    = '#ffd43b';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(`🔥 ${combo}콤보!`, W / 2, topH - 6);
    }

    // Timer bar
    const barProgress = timeLeft / GAME_DURATION;
    ctx.fillStyle = '#2a2d3a';
    ctx.fillRect(0, topH, W, 4);
    const barGrad = ctx.createLinearGradient(0, 0, W, 0);
    barGrad.addColorStop(0, '#ff6b6b');
    barGrad.addColorStop(0.5, '#ffd43b');
    barGrad.addColorStop(1, '#51cf66');
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, topH, W * barProgress, 4);
  }

  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(0.5, '#16213e');
    grad.addColorStop(1, '#0f3460');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 40; i++) {
      // deterministic "random" using seeded pattern
      const sx = ((i * 137.508 + 50) % W);
      const sy = 60 + ((i * 97.3 + 20) % (H - 80));
      ctx.beginPath();
      ctx.arc(sx, sy, 0.8 + (i % 3) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ── Main loop ───────────────────────────────────────── */
  function loop() {
    animId = requestAnimationFrame(loop);

    const elapsed  = (Date.now() - startTime) / 1000;
    const timeLeft = Math.max(0, GAME_DURATION - elapsed);

    // Background
    drawBackground();

    // Update balloons
    for (let i = balloons.length - 1; i >= 0; i--) {
      const b = balloons[i];
      b.y -= b.speed;
      if (b.y + b.r < 0) {
        // Escaped
        balloons.splice(i, 1);
        lives--;
        combo = 0; // break combo on escape
        missFlashes.push({ x: Math.random() * W, y: 100, life: 1, big: true });

        if (lives <= 0) {
          endGame('over');
          return;
        }
      }
    }

    // Draw balloons
    for (const b of balloons) drawBalloon(b);

    // Pop animations
    pops = pops.filter(p => p.life > 0);
    for (const p of pops) {
      // Expanding ring
      ctx.globalAlpha = p.life * 0.8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (1 + (1 - p.life) * 2), 0, Math.PI * 2);
      ctx.strokeStyle = p.col.body;
      ctx.lineWidth   = 3;
      ctx.stroke();
      ctx.globalAlpha = 1;
      // Particles
      p.particles = p.particles.filter(pt => pt.life > 0);
      for (const pt of p.particles) {
        ctx.globalAlpha = pt.life;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r * pt.life, 0, Math.PI * 2);
        ctx.fillStyle = pt.color;
        ctx.fill();
        pt.x    += pt.vx;
        pt.y    += pt.vy;
        pt.vy   += 0.15;
        pt.life -= 0.04;
      }
      ctx.globalAlpha = 1;
      p.life -= 0.045;
    }

    // Miss flashes
    missFlashes = missFlashes.filter(f => f.life > 0);
    for (const f of missFlashes) {
      ctx.globalAlpha = f.life * 0.5;
      ctx.beginPath();
      const r = f.big ? 80 : 20;
      ctx.arc(f.x, f.y, r * (1 + (1 - f.life)), 0, Math.PI * 2);
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth   = f.big ? 4 : 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
      f.life -= 0.06;
    }

    // Floating score texts
    floatTexts = floatTexts.filter(t => t.life > 0);
    for (const ft of floatTexts) {
      ctx.globalAlpha  = ft.life;
      ctx.fillStyle    = ft.color;
      ctx.font         = `bold ${14 + (1 - ft.life) * 4}px system-ui, sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor  = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur   = 4;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.shadowBlur   = 0;
      ctx.globalAlpha  = 1;
      ft.y    -= 1.2;
      ft.life -= 0.022;
    }

    drawHUD();

    if (timeLeft <= 0 && gameActive) {
      endGame('time');
      return;
    }
  }

  /* ── End game ────────────────────────────────────────── */
  function endGame(reason) {
    gameActive = false;
    clearInterval(spawnTimer);
    cancelAnimationFrame(animId);

    window.dispatchEvent(new CustomEvent('gameOver', {
      detail: { score, cleared: false }
    }));
  }

  /* ── Public API ──────────────────────────────────────── */
  window.startGame = function (diffId, stageNum) {
    cancelAnimationFrame(animId);
    clearInterval(spawnTimer);

    cfg        = DIFF[diffId] || DIFF.normal;
    score      = 0;
    lives      = MAX_LIVES;
    combo      = 0;
    bestCombo  = 0;
    balloons   = [];
    pops       = [];
    missFlashes = [];
    floatTexts  = [];
    gameActive  = false;
    nextId      = 0;

    window.updateScore && window.updateScore(0);
    initDOM();

    gameActive = true;
    startTime  = Date.now();

    // Immediately spawn first balloon
    spawnBalloon();
    spawnTimer = setInterval(spawnBalloon, cfg.spawnMs);

    animId = requestAnimationFrame(loop);
  };

})();
