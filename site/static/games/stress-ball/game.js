// Stress Ball — Game 6
// Squeeze the ball, release stress, earn points!
(function () {
  'use strict';

  const ROOT = document.getElementById('game-root');

  // ── Constants ──────────────────────────────────────────────────────────────
  const W = 400, H = 400;
  const BASE_RADIUS = 120;
  const SQUEEZE_DEPTH = 0.20;   // 20% radius reduction
  const OVERSHOOT    = 0.05;    // 5% overshoot on release
  const PARTICLE_COUNT = 5;

  // ── State ──────────────────────────────────────────────────────────────────
  let squeezes = 0;
  let animId;
  let canvas, ctx;

  // Ball animation
  let ballPhase = 'idle'; // 'idle' | 'squeezing' | 'releasing'
  let phaseT = 0;         // 0..1
  let squishX = 1, squishY = 1; // scale transform
  let pressure = 0;             // 0..1 for ring indicator
  let cx, cy, radius;

  // Particles
  const particles = [];

  // Background hue shift
  let bgHue = 240; // starts at deep blue

  // Spring state
  let springR = BASE_RADIUS; // current radius for spring simulation
  let springV = 0;           // velocity

  // ── Easing ────────────────────────────────────────────────────────────────
  function easeOutBack(t) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  // ── Particles ─────────────────────────────────────────────────────────────
  function spawnParticles() {
    for (let i = 0; i < PARTICLE_COUNT + (Math.random() * 3 | 0); i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      const hue   = 10 + Math.random() * 40;
      particles.push({
        x: cx + Math.cos(angle) * BASE_RADIUS * 0.9,
        y: cy + Math.sin(angle) * BASE_RADIUS * 0.9,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 1,
        decay: 0.04 + Math.random() * 0.03,
        r: 3 + Math.random() * 4,
        hue,
      });
    }
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life -= p.decay;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function drawParticles() {
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = `hsl(${p.hue},90%,60%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // ── Drawing ────────────────────────────────────────────────────────────────
  function lerp(a, b, t) { return a + (b - a) * t; }

  function drawBall() {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(squishX, squishY);

    // Shadow
    ctx.save();
    ctx.scale(1, 0.3);
    ctx.translate(0, springR * 1.15 / 0.3);
    const shadowAlpha = 0.15 + (1 - squishY) * 0.3;
    const shadowR = springR * squishX * (1 + (1 - squishY) * 0.5);
    const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, shadowR);
    sg.addColorStop(0, `rgba(0,0,0,${shadowAlpha})`);
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(0, 0, shadowR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Main ball gradient
    const grad = ctx.createRadialGradient(-springR * 0.35, -springR * 0.35, springR * 0.05, 0, 0, springR);
    grad.addColorStop(0, '#ffddcc');
    grad.addColorStop(0.4, '#ff8855');
    grad.addColorStop(0.8, '#e84020');
    grad.addColorStop(1, '#8b1a1a');

    ctx.beginPath();
    ctx.arc(0, 0, springR, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Highlight
    const hgrad = ctx.createRadialGradient(-springR * 0.3, -springR * 0.3, 0, -springR * 0.3, -springR * 0.3, springR * 0.55);
    hgrad.addColorStop(0, 'rgba(255,255,255,0.6)');
    hgrad.addColorStop(0.5, 'rgba(255,255,255,0.15)');
    hgrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(0, 0, springR, 0, Math.PI * 2);
    ctx.fillStyle = hgrad;
    ctx.fill();

    ctx.restore();
  }

  function drawPressureRing() {
    if (pressure < 0.02) return;
    const ringR = springR * Math.max(squishX, squishY) + 12;
    ctx.save();
    ctx.translate(cx, cy);

    const arc = pressure * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(0, 0, ringR, -Math.PI / 2, -Math.PI / 2 + arc);

    const ringGrad = ctx.createLinearGradient(-ringR, 0, ringR, 0);
    ringGrad.addColorStop(0, `hsl(${30 + pressure * 90}, 100%, 55%)`);
    ringGrad.addColorStop(1, `hsl(${30 + pressure * 90 + 40}, 100%, 65%)`);

    ctx.strokeStyle = ringGrad;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }

  function drawBackground() {
    // Shift hue toward warm/green as squeezes increase
    const sat = Math.min(squeezes * 0.6, 40);
    const lum = 12 + Math.min(squeezes * 0.05, 8);
    ctx.fillStyle = `hsl(${bgHue},${sat}%,${lum}%)`;
    ctx.fillRect(0, 0, W, H);
  }

  function drawUI() {
    // Squeeze counter
    ctx.save();
    ctx.font = 'bold 20px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(`${squeezes} 회 스트레스 해소!`, W / 2, 36);

    // Tip text
    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('꾹 눌러보세요', W / 2, H - 18);
    ctx.restore();
  }

  function drawToast() {
    if (squeezes >= 50 && squeezes < 55) {
      const alpha = Math.min(1, (55 - squeezes) + 1) * Math.min(1, (squeezes - 48));
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.font = 'bold 22px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe080';
      ctx.fillText('잘 하고 있어요! 💆', W / 2, H - 50);
      ctx.restore();
    }
    if (squeezes >= 100) {
      ctx.save();
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.004);
      ctx.font = `bold ${22 + pulse * 4}px "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#80ffcc';
      ctx.fillText('완전 힐링 완료! 🌟', W / 2, H - 50);
      ctx.restore();
    }
  }

  // ── Spring physics ─────────────────────────────────────────────────────────
  const SPRING_K   = 0.18;
  const SPRING_DAMP = 0.72;

  function updateSpring(target) {
    const force  = (target - springR) * SPRING_K;
    springV = (springV + force) * SPRING_DAMP;
    springR += springV;
  }

  // ── Animation loop ────────────────────────────────────────────────────────
  let targetRadius = BASE_RADIUS;
  let pressing = false;
  let pressFrames = 0;

  function loop() {
    animId = requestAnimationFrame(loop);

    // Update spring towards target
    updateSpring(targetRadius);

    // Squish based on spring compression
    const comprRatio = springR / BASE_RADIUS;
    // Squash-stretch: when compressed in Y, expand in X
    squishY = comprRatio;
    squishX = 1 / Math.sqrt(Math.max(comprRatio, 0.1));
    // Clamp
    squishX = Math.min(squishX, 1.3);
    squishY = Math.max(squishY, 0.7);

    // Pressure indicator
    if (pressing) {
      pressFrames++;
      pressure = Math.min(pressFrames / 40, 1);
    } else {
      pressure *= 0.85;
    }

    updateParticles();

    // Draw
    drawBackground();
    drawParticles();
    drawBall();
    drawPressureRing();
    drawUI();
    drawToast();
  }

  // ── Hit test ───────────────────────────────────────────────────────────────
  function isOnBall(x, y) {
    const dx = x - cx, dy = y - cy;
    return dx * dx + dy * dy <= springR * springR;
  }

  // ── Interaction ───────────────────────────────────────────────────────────
  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    // Scale from display to canvas coords
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    return [(src.clientX - rect.left) * scaleX, (src.clientY - rect.top) * scaleY];
  }

  function onDown(e) {
    e.preventDefault();
    const [x, y] = getPos(e);
    if (isOnBall(x, y)) {
      pressing = true;
      pressFrames = 0;
      targetRadius = BASE_RADIUS * (1 - SQUEEZE_DEPTH);
    }
  }

  function onUp(e) {
    if (!pressing) return;
    pressing = false;
    pressFrames = 0;

    squeezes++;
    if (typeof window.updateScore === 'function') window.updateScore(squeezes);

    // Overshoot — set target briefly beyond base
    targetRadius = BASE_RADIUS * (1 + OVERSHOOT);
    // Then spring will oscillate and settle at BASE_RADIUS
    setTimeout(() => { targetRadius = BASE_RADIUS; }, 80);

    spawnParticles();

    // Shift background hue toward green/teal as squeezes climb
    bgHue = Math.max(160, 240 - squeezes * 0.8);

    if (squeezes === 100) {
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('gameClear', { detail: { score: squeezes }, bubbles: true }));
        window.dispatchEvent(new CustomEvent('gameClear', { detail: { score: squeezes } }));
      }, 600);
    }
  }

  // ── Build UI ──────────────────────────────────────────────────────────────
  function buildUI() {
    ROOT.innerHTML = '';
    ROOT.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;';

    canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    // Responsive sizing
    const maxSize = Math.min(window.innerWidth - 32, 480);
    canvas.style.width  = maxSize + 'px';
    canvas.style.height = maxSize + 'px';
    canvas.style.borderRadius = '12px';
    canvas.style.cursor = 'pointer';
    canvas.style.touchAction = 'none';
    canvas.style.userSelect = 'none';

    ctx = canvas.getContext('2d');
    cx = W / 2;
    cy = H / 2;

    canvas.addEventListener('mousedown',  onDown, { passive: false });
    canvas.addEventListener('mouseup',    onUp);
    canvas.addEventListener('mouseleave', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchend',   onUp,   { passive: false });

    ROOT.appendChild(canvas);
  }

  // ── startGame ─────────────────────────────────────────────────────────────
  window.startGame = function () {
    if (animId) cancelAnimationFrame(animId);
    squeezes   = 0;
    springR    = BASE_RADIUS;
    springV    = 0;
    targetRadius = BASE_RADIUS;
    squishX    = 1;
    squishY    = 1;
    pressure   = 0;
    pressing   = false;
    pressFrames = 0;
    bgHue      = 240;
    particles.length = 0;

    buildUI();
    loop();
  };

  // Auto-start
  const CFG = window.GAME_CONFIG || {};
  if (!CFG.gameId) window.startGame('normal');
})();
