/**
 * Snake Game
 * API-compliant IIFE for 심심해 game site
 */
(function () {
  'use strict';

  const CONFIG = window.GAME_CONFIG || { gameId: 'snake-game', difficulties: ['easy','normal','hard','expert'], hasLeaderboard: true, scoreType: 'high' };

  const CELL = 20;
  const COLS = 20;
  const ROWS = 20;
  const W = COLS * CELL;
  const H = ROWS * CELL;

  const SPEEDS = { easy: 150, normal: 100, hard: 70, expert: 50 };
  const WRAP   = { easy: true,  normal: true,  hard: false, expert: false };

  let canvas, ctx, root;
  let snake, dir, nextDir, apple, score, lives;
  let loopTimer = null;
  let running = false;
  let currentDiff = 'normal';
  let touchStartX = 0, touchStartY = 0;
  let particles = [];

  /* ── INIT ────────────────────────────────────────────────── */
  function init() {
    root = document.getElementById('game-root');
    root.innerHTML = '';
    root.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:#1a1a2e;user-select:none;';

    canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    canvas.style.cssText = 'border:3px solid #0f3460;border-radius:8px;box-shadow:0 0 30px rgba(15,52,96,0.8);touch-action:none;';
    ctx = canvas.getContext('2d');
    root.appendChild(canvas);

    // Mobile swipe
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchend',   onTouchEnd,   { passive: true });
    // Keyboard
    document.addEventListener('keydown', onKey);

    drawWelcome();
  }

  function drawWelcome() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e94560';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🐍 스네이크', W/2, H/2 - 20);
    ctx.fillStyle = '#a8b2d8';
    ctx.font = '16px sans-serif';
    ctx.fillText('startGame() 을 호출하세요', W/2, H/2 + 20);
  }

  /* ── GAME START ──────────────────────────────────────────── */
  window.startGame = function (diffId) {
    currentDiff = diffId || 'normal';
    score = 0;
    lives = 3;
    particles = [];
    initSnake();
    spawnApple();
    running = true;
    if (loopTimer) clearInterval(loopTimer);
    loopTimer = setInterval(step, SPEEDS[currentDiff] || 100);
    // Smooth particle layer via rAF
    requestAnimationFrame(renderLoop);
  };

  function initSnake() {
    const midX = Math.floor(COLS / 2);
    const midY = Math.floor(ROWS / 2);
    snake = [
      { x: midX,     y: midY },
      { x: midX - 1, y: midY },
      { x: midX - 2, y: midY },
    ];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
  }

  function spawnApple() {
    let pos;
    do {
      pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    } while (snake.some(s => s.x === pos.x && s.y === pos.y));
    apple = pos;
  }

  /* ── GAME LOOP ───────────────────────────────────────────── */
  function step() {
    if (!running) return;
    dir = { ...nextDir };
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    const wrap = WRAP[currentDiff];

    if (wrap) {
      head.x = (head.x + COLS) % COLS;
      head.y = (head.y + ROWS) % ROWS;
    } else {
      if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
        handleDeath();
        return;
      }
    }

    // Self collision (skip last tail cell which will move away)
    for (let i = 0; i < snake.length - 1; i++) {
      if (snake[i].x === head.x && snake[i].y === head.y) {
        handleDeath();
        return;
      }
    }

    snake.unshift(head);

    if (head.x === apple.x && head.y === apple.y) {
      score += 10;
      window.updateScore && window.updateScore(score);
      spawnParticles(apple.x * CELL + CELL/2, apple.y * CELL + CELL/2, '#e94560');
      spawnApple();
    } else {
      snake.pop();
    }

    draw();
  }

  let lastRender = 0;
  function renderLoop(ts) {
    if (!running) return;
    if (ts - lastRender > 16) {
      updateParticles();
      // particles drawn on top of game state
    }
    requestAnimationFrame(renderLoop);
  }

  /* ── DRAWING ─────────────────────────────────────────────── */
  function draw() {
    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    // Grid dots
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        ctx.fillRect(x * CELL + CELL/2 - 1, y * CELL + CELL/2 - 1, 2, 2);
      }
    }

    // Apple glow
    const ax = apple.x * CELL + CELL/2;
    const ay = apple.y * CELL + CELL/2;
    const grd = ctx.createRadialGradient(ax, ay, 2, ax, ay, CELL);
    grd.addColorStop(0, 'rgba(233,69,96,0.6)');
    grd.addColorStop(1, 'rgba(233,69,96,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(ax, ay, CELL, 0, Math.PI * 2);
    ctx.fill();

    // Apple
    ctx.fillStyle = '#e94560';
    ctx.beginPath();
    ctx.arc(ax, ay, CELL/2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(ax - 2, ay - 2, CELL/2 - 5, 0, Math.PI * 2);
    ctx.fill();

    // Snake
    snake.forEach((seg, i) => {
      const px = seg.x * CELL;
      const py = seg.y * CELL;
      const ratio = i / snake.length;
      const r = Math.round(80  + (1 - ratio) * 80);
      const g = Math.round(200 + (1 - ratio) * 55);
      const b = Math.round(120 - ratio * 60);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.beginPath();
      ctx.roundRect(px + 1, py + 1, CELL - 2, CELL - 2, 4);
      ctx.fill();

      if (i === 0) {
        // Eyes
        const eyeOffX = dir.y !== 0 ? 4 : (dir.x > 0 ? 8 : 2);
        const eyeOff2X = dir.y !== 0 ? 12 : eyeOffX;
        const eyeOffY = dir.x !== 0 ? 4 : (dir.y > 0 ? 8 : 2);
        const eyeOff2Y = dir.x !== 0 ? 12 : eyeOffY;
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(px + eyeOffX,  py + eyeOffY,  2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px + eyeOff2X, py + eyeOff2Y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(px + eyeOffX  + 0.5, py + eyeOffY  + 0.5, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px + eyeOff2X + 0.5, py + eyeOff2Y + 0.5, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Particles
    drawParticles();
  }

  /* ── PARTICLES ───────────────────────────────────────────── */
  function spawnParticles(cx, cy, color) {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 / 12) * i + Math.random() * 0.5;
      const speed = 1 + Math.random() * 3;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1, decay: 0.05 + Math.random() * 0.05,
        r: 2 + Math.random() * 3,
        color
      });
    }
  }

  function updateParticles() {
    particles = particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.9;
      p.vy *= 0.9;
      p.life -= p.decay;
      return p.life > 0;
    });
  }

  function drawParticles() {
    particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  /* ── DEATH / GAME OVER ───────────────────────────────────── */
  function handleDeath() {
    spawnParticles(snake[0].x * CELL + CELL/2, snake[0].y * CELL + CELL/2, '#ff6b6b');
    draw();

    clearInterval(loopTimer);
    running = false;

    // Flash effect
    let flashes = 0;
    const flashInterval = setInterval(() => {
      ctx.fillStyle = `rgba(233,69,96,${0.3 - flashes * 0.05})`;
      ctx.fillRect(0, 0, W, H);
      flashes++;
      if (flashes >= 6) {
        clearInterval(flashInterval);
        drawGameOver();
      }
    }, 80);
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(26,26,46,0.85)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#e94560';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('게임 오버', W/2, H/2 - 40);

    ctx.fillStyle = '#a8b2d8';
    ctx.font = '22px sans-serif';
    ctx.fillText(`점수: ${score}`, W/2, H/2 + 5);

    ctx.fillStyle = '#0f3460';
    ctx.fillRect(W/2 - 80, H/2 + 30, 160, 44);
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 2;
    ctx.strokeRect(W/2 - 80, H/2 + 30, 160, 44);
    ctx.fillStyle = '#e94560';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('다시 시작', W/2, H/2 + 58);

    canvas.onclick = () => {
      canvas.onclick = null;
      window.startGame(currentDiff);
    };
    canvas.ontouchend = (e) => {
      e.preventDefault();
      canvas.ontouchend = null;
      window.startGame(currentDiff);
    };

    document.dispatchEvent(new CustomEvent('gameOver', { detail: { score, cleared: false } }));
    root.dispatchEvent(new CustomEvent('gameOver', { detail: { score, cleared: false } }));
    document.getElementById('game-root').dispatchEvent(new CustomEvent('gameOver', { detail: { score, cleared: false }, bubbles: true }));
  }

  /* ── INPUT ───────────────────────────────────────────────── */
  function onKey(e) {
    const map = {
      ArrowUp:    { x: 0,  y: -1 },
      ArrowDown:  { x: 0,  y:  1 },
      ArrowLeft:  { x: -1, y:  0 },
      ArrowRight: { x: 1,  y:  0 },
      KeyW: { x: 0,  y: -1 },
      KeyS: { x: 0,  y:  1 },
      KeyA: { x: -1, y:  0 },
      KeyD: { x: 1,  y:  0 },
    };
    const newDir = map[e.code];
    if (!newDir) return;
    if (newDir.x !== 0 && newDir.x === -dir.x) return;
    if (newDir.y !== 0 && newDir.y === -dir.y) return;
    nextDir = newDir;
    e.preventDefault();
  }

  function onTouchStart(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }

  function onTouchEnd(e) {
    if (!running) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      const newDir = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
      if (newDir.x !== -dir.x) nextDir = newDir;
    } else {
      const newDir = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
      if (newDir.y !== -dir.y) nextDir = newDir;
    }
  }

  /* ── BOOT ────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
