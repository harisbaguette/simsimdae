/**
 * Fruit Slice Game
 * API-compliant IIFE for 심심해 game site
 */
(function () {
  'use strict';

  const CONFIG = window.GAME_CONFIG || { gameId: 'fruit-slice', difficulties: ['easy','normal','hard','expert'], hasLeaderboard: true, scoreType: 'high' };

  const W = 480, H = 640;
  const GAME_TIME = 60;
  const MISS_LIMIT = 3;
  const DIFF_MULT   = { easy: 1, normal: 1.5, hard: 2, expert: 3 };
  const DIFF_SPAWN  = { easy: 90, normal: 70, hard: 50, expert: 35 };
  const DIFF_BOMBS  = { easy: 0.03, normal: 0.08, hard: 0.14, expert: 0.20 };

  const FRUITS = [
    { emoji: '🍎', color: '#e94560', shadow: '#c0392b', label: 'apple' },
    { emoji: '🍊', color: '#ff8c42', shadow: '#d35400', label: 'orange' },
    { emoji: '🍋', color: '#ffd166', shadow: '#f1c40f', label: 'lemon' },
    { emoji: '🍇', color: '#9b59b6', shadow: '#6c3483', label: 'grape' },
    { emoji: '🍓', color: '#e74c3c', shadow: '#c0392b', label: 'straw' },
    { emoji: '🍉', color: '#2ecc71', shadow: '#27ae60', label: 'water' },
    { emoji: '🍑', color: '#fd79a8', shadow: '#e84393', label: 'peach' },
  ];

  let canvas, ctx, root;
  let fruits, bombs, slices, particles, trail;
  let score, lives, misses, timeLeft, running, animId, frame;
  let lastSpawn, timerInterval;
  let currentDiff = 'normal';
  let mouseDown = false;
  let prevMouse = { x: 0, y: 0 };

  /* ── INIT ────────────────────────────────────────────────── */
  function init() {
    root = document.getElementById('game-root');
    root.innerHTML = '';
    root.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:#0d0d0d;user-select:none;';

    canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'border:2px solid #1a1a1a;border-radius:8px;box-shadow:0 0 40px rgba(0,0,0,0.8);touch-action:none;';
    ctx = canvas.getContext('2d');
    root.appendChild(canvas);

    canvas.addEventListener('mousedown',  e => { mouseDown = true; updateMouse(e); });
    canvas.addEventListener('mouseup',    () => { mouseDown = false; trail = []; });
    canvas.addEventListener('mousemove',  e => { if (mouseDown) { updateMouse(e); checkSlice(e); } });
    canvas.addEventListener('touchstart', e => { e.preventDefault(); mouseDown = true; updateTouch(e); }, { passive: false });
    canvas.addEventListener('touchend',   e => { e.preventDefault(); mouseDown = false; trail = []; }, { passive: false });
    canvas.addEventListener('touchmove',  e => { e.preventDefault(); if (mouseDown) { updateTouch(e); checkSliceTouch(e); } }, { passive: false });

    drawWelcome();
  }

  function updateMouse(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    const y = (e.clientY - rect.top)  * (H / rect.height);
    prevMouse = { x, y };
    if (mouseDown && running) {
      trail.push({ x, y, t: Date.now() });
      if (trail.length > 20) trail.shift();
    }
  }

  function updateTouch(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches[0].clientX - rect.left) * (W / rect.width);
    const y = (e.touches[0].clientY - rect.top)  * (H / rect.height);
    prevMouse = { x, y };
    if (running) {
      trail.push({ x, y, t: Date.now() });
      if (trail.length > 20) trail.shift();
    }
  }

  function drawWelcome() {
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ff8c42';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🍎 과일 슬라이스', W/2, H/2 - 20);
    ctx.fillStyle = '#888';
    ctx.font = '16px sans-serif';
    ctx.fillText('startGame() 을 호출하세요', W/2, H/2 + 20);
  }

  /* ── START ───────────────────────────────────────────────── */
  window.startGame = function (diffId) {
    currentDiff = diffId || 'normal';
    score = 0;
    misses = 0;
    timeLeft = GAME_TIME;
    frame = 0;
    lastSpawn = 0;
    fruits = [];
    bombs = [];
    slices = [];
    particles = [];
    trail = [];
    running = true;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!running) return;
      timeLeft--;
      if (timeLeft <= 0) { timeLeft = 0; endGame(false); }
    }, 1000);
    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(loop);
  };

  /* ── SPAWN ───────────────────────────────────────────────── */
  function spawnFruit() {
    const isBomb = Math.random() < DIFF_BOMBS[currentDiff];
    const x = 60 + Math.random() * (W - 120);
    const vy = -(10 + Math.random() * 6);
    const vx = (Math.random() - 0.5) * 4;
    const r = 26 + Math.random() * 12;
    const rot = (Math.random() - 0.5) * 0.1;

    if (isBomb) {
      bombs.push({ x, y: H + r, vx, vy, r, rot, angle: 0, alive: true });
    } else {
      const f = FRUITS[Math.floor(Math.random() * FRUITS.length)];
      fruits.push({ ...f, x, y: H + r, vx, vy, r, rot, angle: 0, alive: true, sliced: false });
    }
  }

  /* ── SLICE CHECK ─────────────────────────────────────────── */
  function checkSlice(e) {
    if (!running || trail.length < 2) return;
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (W / rect.width);
    const cy = (e.clientY - rect.top)  * (H / rect.height);
    const prev = trail[trail.length - 2];
    testSliceLine(prev.x, prev.y, cx, cy);
  }

  function checkSliceTouch(e) {
    if (!running || trail.length < 2) return;
    const prev = trail[trail.length - 2];
    const cur  = trail[trail.length - 1];
    testSliceLine(prev.x, prev.y, cur.x, cur.y);
  }

  function testSliceLine(x1, y1, x2, y2) {
    // Check bombs first
    for (let i = bombs.length - 1; i >= 0; i--) {
      const b = bombs[i];
      if (!b.alive) continue;
      if (lineCircle(x1, y1, x2, y2, b.x, b.y, b.r * 0.85)) {
        b.alive = false;
        endGame(true); // bomb = game over
        return;
      }
    }
    // Check fruits
    for (let i = fruits.length - 1; i >= 0; i--) {
      const f = fruits[i];
      if (!f.alive || f.sliced) continue;
      if (lineCircle(x1, y1, x2, y2, f.x, f.y, f.r * 0.85)) {
        f.sliced = true;
        sliceFruit(f, x1, y1, x2, y2);
      }
    }
  }

  function lineCircle(x1, y1, x2, y2, cx, cy, cr) {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx*dx + dy*dy;
    if (len2 === 0) return Math.hypot(cx-x1, cy-y1) < cr;
    const t = Math.max(0, Math.min(1, ((cx-x1)*dx + (cy-y1)*dy) / len2));
    const nx = x1 + t*dx - cx, ny = y1 + t*dy - cy;
    return nx*nx + ny*ny < cr*cr;
  }

  function sliceFruit(f, x1, y1, x2, y2) {
    const pts = Math.floor(10 * DIFF_MULT[currentDiff]);
    score += pts;
    window.updateScore && window.updateScore(score);

    // Slice angle
    const ang = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
    slices.push({
      x: f.x, y: f.y, r: f.r, color: f.color, shadow: f.shadow, emoji: f.emoji,
      leftVx: Math.cos(ang) * 3 - 1, leftVy: Math.sin(ang) * 3 - 4,
      rightVx: -Math.cos(ang) * 3 + 1, rightVy: -Math.sin(ang) * 3 - 4,
      lx: f.x, ly: f.y, rx: f.x, ry: f.y,
      life: 1, decay: 0.025
    });

    // Juice particles
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 2 + Math.random() * 5;
      particles.push({ x: f.x, y: f.y, vx: Math.cos(a)*s, vy: Math.sin(a)*s - 2, r: 3 + Math.random()*4, color: f.color, life: 1, decay: 0.03, gravity: 0.25 });
    }
    // Score text
    particles.push({ x: f.x, y: f.y - f.r, vx: 0, vy: -2, text: `+${pts}`, color: '#fff', life: 1, decay: 0.025, size: 20, gravity: 0 });
  }

  /* ── LOOP ────────────────────────────────────────────────── */
  function loop() {
    if (!running) return;
    update();
    render();
    animId = requestAnimationFrame(loop);
  }

  function update() {
    frame++;
    const spawnRate = DIFF_SPAWN[currentDiff];

    if (frame - lastSpawn >= spawnRate) {
      spawnFruit();
      if (Math.random() < 0.3) spawnFruit(); // occasional double
      lastSpawn = frame;
    }

    const G = 0.18;

    // Fruits
    for (let i = fruits.length - 1; i >= 0; i--) {
      const f = fruits[i];
      f.x += f.vx;
      f.y += f.vy;
      f.vy += G;
      f.angle += f.rot;

      if (f.y > H + f.r + 20) {
        fruits.splice(i, 1);
        if (!f.sliced) {
          misses++;
          if (misses >= MISS_LIMIT) { endGame(false); return; }
        }
      }
    }

    // Bombs
    for (let i = bombs.length - 1; i >= 0; i--) {
      const b = bombs[i];
      b.x += b.vx;
      b.y += b.vy;
      b.vy += G;
      b.angle += b.rot;
      if (b.y > H + b.r + 20) bombs.splice(i, 1);
    }

    // Slices
    slices = slices.filter(s => {
      s.lx += s.leftVx;  s.ly += s.leftVy;  s.leftVy += 0.2;
      s.rx += s.rightVx; s.ry += s.rightVy; s.rightVy += 0.2;
      s.life -= s.decay;
      return s.life > 0;
    });

    // Particles
    particles = particles.filter(p => {
      p.x += p.vx; p.y += p.vy;
      p.vy += p.gravity || 0;
      p.vx *= 0.98;
      p.life -= p.decay;
      return p.life > 0;
    });

    // Trail cleanup
    const now = Date.now();
    trail = trail.filter(t => now - t.t < 200);
  }

  /* ── RENDER ──────────────────────────────────────────────── */
  function render() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, W, H);

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1a0a00');
    bg.addColorStop(1, '#0a0a18');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // HUD
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`⏱ ${timeLeft}s`, 12, 28);
    ctx.textAlign = 'center';
    ctx.fillText(`${score}점`, W/2, 28);
    ctx.textAlign = 'right';
    // Miss indicators
    for (let i = 0; i < MISS_LIMIT; i++) {
      ctx.fillStyle = i < misses ? '#555' : '#e94560';
      ctx.beginPath();
      ctx.arc(W - 20 - i * 24, 18, 8, 0, Math.PI*2);
      ctx.fill();
    }

    // Fruits
    fruits.forEach(f => {
      if (f.sliced) return;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.angle);
      drawFruitCircle(f.r, f.color, f.shadow, f.emoji);
      ctx.restore();
    });

    // Bombs
    bombs.forEach(b => {
      if (!b.alive) return;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      drawBombCircle(b.r);
      ctx.restore();
    });

    // Sliced halves
    slices.forEach(s => {
      ctx.save();
      ctx.globalAlpha = s.life;
      // Left half
      ctx.save();
      ctx.translate(s.lx, s.ly);
      ctx.beginPath();
      ctx.arc(0, 0, s.r, Math.PI, 0);
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();
      ctx.fillStyle = lighten(s.color, 40);
      ctx.beginPath();
      ctx.arc(0, 0, s.r * 0.7, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // Right half
      ctx.save();
      ctx.translate(s.rx, s.ry);
      ctx.beginPath();
      ctx.arc(0, 0, s.r, 0, Math.PI);
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();
      ctx.fillStyle = lighten(s.color, 40);
      ctx.beginPath();
      ctx.arc(0, 0, s.r * 0.7, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.restore();
    });

    // Particles
    particles.forEach(p => {
      ctx.globalAlpha = p.life;
      if (p.text) {
        ctx.fillStyle = p.color;
        ctx.font = `bold ${p.size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(p.text, p.x, p.y);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1;

    // Blade trail
    if (trail.length > 2 && mouseDown) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 1; i < trail.length; i++) {
        const ratio = i / trail.length;
        ctx.strokeStyle = `rgba(255, 255, 255, ${ratio * 0.7})`;
        ctx.lineWidth = ratio * 6;
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 8 * ratio;
        ctx.beginPath();
        ctx.moveTo(trail[i-1].x, trail[i-1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawFruitCircle(r, color, shadow, emoji) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(3, 3, r, 0, Math.PI*2);
    ctx.fill();

    // Body
    const grd = ctx.createRadialGradient(-r*0.3, -r*0.3, r*0.1, 0, 0, r);
    grd.addColorStop(0, lighten(color, 40));
    grd.addColorStop(0.6, color);
    grd.addColorStop(1, shadow);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI*2);
    ctx.fill();

    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(-r*0.25, -r*0.3, r*0.28, r*0.18, -0.5, 0, Math.PI*2);
    ctx.fill();

    // Emoji
    ctx.font = `${r}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(emoji, 0, r * 0.36);
  }

  function drawBombCircle(r) {
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = `${r * 1.1}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('💣', 0, r * 0.4);
  }

  function lighten(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((n >> 16) & 0xff) + amt);
    const g = Math.min(255, ((n >> 8)  & 0xff) + amt);
    const b = Math.min(255, ((n)       & 0xff) + amt);
    return `rgb(${r},${g},${b})`;
  }

  /* ── END ─────────────────────────────────────────────────── */
  function endGame(bomb) {
    running = false;
    clearInterval(timerInterval);
    cancelAnimationFrame(animId);

    setTimeout(() => {
      ctx.fillStyle = 'rgba(0,0,0,0.82)';
      ctx.fillRect(0, 0, W, H);

      if (bomb) {
        ctx.fillStyle = '#e94560';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💥 폭발!', W/2, H/2 - 60);
      } else {
        ctx.fillStyle = timeLeft <= 0 ? '#ffd166' : '#e94560';
        ctx.font = 'bold 30px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(timeLeft <= 0 ? '⏰ 시간 종료!' : '🍎 놓쳤어요!', W/2, H/2 - 60);
      }

      ctx.fillStyle = '#f0f0f0';
      ctx.font = '22px sans-serif';
      ctx.fillText(`점수: ${score}`, W/2, H/2 - 10);
      ctx.fillStyle = '#a8b2d8';
      ctx.font = '16px sans-serif';
      ctx.fillText(`난이도 보너스 ×${DIFF_MULT[currentDiff]}`, W/2, H/2 + 20);

      ctx.fillStyle = '#1a0a00';
      ctx.fillRect(W/2 - 80, H/2 + 50, 160, 44);
      ctx.strokeStyle = '#ff8c42';
      ctx.lineWidth = 2;
      ctx.strokeRect(W/2 - 80, H/2 + 50, 160, 44);
      ctx.fillStyle = '#ff8c42';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('다시 시작', W/2, H/2 + 78);

      canvas.onclick = () => { canvas.onclick = null; window.startGame(currentDiff); };
      canvas.ontouchend = e => { e.preventDefault(); canvas.ontouchend = null; window.startGame(currentDiff); };

      document.getElementById('game-root').dispatchEvent(new CustomEvent('gameOver', { detail: { score, cleared: false }, bubbles: true }));
    }, 300);
  }

  /* ── BOOT ────────────────────────────────────────────────── */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
