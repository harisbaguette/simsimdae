/**
 * Dodge Game
 * API-compliant IIFE for 심심해 game site
 */
(function () {
  'use strict';

  const CONFIG = window.GAME_CONFIG || { gameId: 'dodge-game', difficulties: ['easy','normal','hard','expert'], hasLeaderboard: true, scoreType: 'high' };

  const W = 480, H = 640;
  const PLAYER_R = 20;

  // Difficulty settings: { spawnRate, minSpeed, maxSpeed, minSize, maxSize }
  const DIFF = {
    easy:   { spawnRate: 60, minSpeed: 1.5, maxSpeed: 3.5, minSize: 18, maxSize: 40 },
    normal: { spawnRate: 45, minSpeed: 2.0, maxSpeed: 5.0, minSize: 15, maxSize: 35 },
    hard:   { spawnRate: 30, minSpeed: 3.0, maxSpeed: 7.0, minSize: 12, maxSize: 30 },
    expert: { spawnRate: 20, minSpeed: 4.0, maxSpeed: 9.0, minSize: 10, maxSize: 25 },
  };

  let canvas, ctx, root;
  let player, obstacles, particles, stars;
  let score, running, animId, startTime;
  let currentDiff = 'normal';
  let dodgeStreak = 0, lastStreakCheck = 0;
  let frame = 0;
  let shakeX = 0, shakeY = 0;

  // Mouse / touch position
  let targetX = W / 2, targetY = H - 100;

  /* ── INIT ────────────────────────────────────────────────── */
  function init() {
    root = document.getElementById('game-root');
    root.innerHTML = '';
    root.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:#0a0a1a;user-select:none;';

    canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'border:2px solid #1a237e;border-radius:8px;box-shadow:0 0 40px rgba(63,81,181,0.4);touch-action:none;cursor:none;';
    ctx = canvas.getContext('2d');
    root.appendChild(canvas);

    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      targetX = (e.clientX - rect.left) * (W / rect.width);
      targetY = (e.clientY - rect.top)  * (H / rect.height);
    });
    canvas.addEventListener('touchstart', onTouch, { passive: false });
    canvas.addEventListener('touchmove',  onTouch, { passive: false });

    // Starfield
    stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      speed: Math.random() * 0.4 + 0.1,
      alpha: Math.random() * 0.7 + 0.3
    }));

    drawWelcome();
  }

  function onTouch(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    targetX = (e.touches[0].clientX - rect.left) * (W / rect.width);
    targetY = (e.touches[0].clientY - rect.top)  * (H / rect.height);
  }

  function drawWelcome() {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#5c6bc0';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🚀 피하기 게임', W/2, H/2 - 20);
    ctx.fillStyle = '#a8b2d8';
    ctx.font = '16px sans-serif';
    ctx.fillText('startGame() 을 호출하세요', W/2, H/2 + 20);
  }

  /* ── START ───────────────────────────────────────────────── */
  window.startGame = function (diffId) {
    currentDiff = diffId || 'normal';
    score = 0;
    frame = 0;
    dodgeStreak = 0;
    shakeX = shakeY = 0;
    particles = [];
    obstacles = [];
    player = { x: W/2, y: H - 100, r: PLAYER_R, invincible: 0 };
    targetX = W/2; targetY = H - 100;
    startTime = performance.now();
    running = true;
    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(loop);
  };

  /* ── LOOP ────────────────────────────────────────────────── */
  function loop(ts) {
    if (!running) return;
    update(ts);
    render(ts);
    animId = requestAnimationFrame(loop);
  }

  function update(ts) {
    frame++;
    const d = DIFF[currentDiff];

    // Score = survival seconds × 100
    const elapsed = (ts - startTime) / 1000;
    score = Math.floor(elapsed * 100);
    window.updateScore && window.updateScore(score);

    // Player follows cursor (smooth)
    player.x += (targetX - player.x) * 0.18;
    player.y += (targetY - player.y) * 0.18;
    player.x = Math.max(player.r, Math.min(W - player.r, player.x));
    player.y = Math.max(player.r, Math.min(H - player.r, player.y));

    if (player.invincible > 0) player.invincible--;

    // Stars
    stars.forEach(s => { s.y += s.speed; if (s.y > H) s.y = 0; });

    // Spawn obstacle (rate increases over time)
    const dynamicRate = Math.max(10, d.spawnRate - Math.floor(elapsed / 5));
    if (frame % dynamicRate === 0) {
      const size = d.minSize + Math.random() * (d.maxSize - d.minSize);
      const speed = d.minSpeed + Math.random() * (d.maxSpeed - d.minSpeed) + elapsed * 0.05;
      const x = size + Math.random() * (W - size * 2);
      const hue = Math.random() * 60 + 340; // reds / oranges
      obstacles.push({ x, y: -size, size, speed, hue, rot: 0, rotSpeed: (Math.random()-0.5) * 0.1 });
    }

    // Update obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.y += o.speed;
      o.rot += o.rotSpeed;

      // Check close miss (streak)
      if (o.y > player.y - 60 && o.y < player.y + 60) {
        const dist = Math.hypot(player.x - o.x, player.y - o.y);
        if (dist < o.size + player.r + 30) {
          lastStreakCheck = frame;
          dodgeStreak++;
        }
      }

      if (o.y > H + o.size) {
        obstacles.splice(i, 1);
        continue;
      }

      // Collision
      if (player.invincible === 0) {
        const dist = Math.hypot(player.x - o.x, player.y - o.y);
        if (dist < player.r + o.size * 0.6) {
          triggerHit();
          return;
        }
      }
    }

    // Streak bonus (5+ near misses)
    if (dodgeStreak >= 5 && frame - lastStreakCheck < 30) {
      score += 200;
      window.updateScore && window.updateScore(score);
      spawnTextParticle(player.x, player.y - 30, '+200 회피!', '#ffcc00');
      dodgeStreak = 0;
    }

    // Particles
    particles = particles.filter(p => {
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.95; p.vy *= 0.95;
      p.life -= p.decay;
      return p.life > 0;
    });

    // Screen shake decay
    shakeX *= 0.8; shakeY *= 0.8;
  }

  function triggerHit() {
    shakeX = 15; shakeY = 10;
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 2 + Math.random() * 5;
      particles.push({ x: player.x, y: player.y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, life: 1, decay: 0.04, r: 3 + Math.random()*4, color: '#e94560' });
    }
    running = false;
    cancelAnimationFrame(animId);
    setTimeout(showGameOver, 600);
  }

  /* ── RENDER ──────────────────────────────────────────────── */
  function render(ts) {
    const sx = (Math.random() - 0.5) * shakeX;
    const sy = (Math.random() - 0.5) * shakeY;
    ctx.save();
    ctx.translate(sx, sy);

    // BG
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(-10, -10, W + 20, H + 20);

    // Stars
    stars.forEach(s => {
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // HUD
    const elapsed = (ts - startTime) / 1000;
    ctx.fillStyle = '#a8b2d8';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`시간: ${elapsed.toFixed(1)}s`, 10, 25);
    ctx.textAlign = 'right';
    ctx.fillText(`점수: ${score}`, W - 10, 25);
    if (dodgeStreak >= 3) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`🔥 회피 콤보 ×${dodgeStreak}`, W/2, 25);
    }

    // Obstacles
    obstacles.forEach(o => {
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.rotate(o.rot);
      const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, o.size);
      grd.addColorStop(0, `hsl(${o.hue},100%,70%)`);
      grd.addColorStop(1, `hsl(${o.hue},100%,35%)`);
      ctx.fillStyle = grd;
      ctx.strokeStyle = `hsl(${o.hue},100%,80%)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const sides = 4;
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * o.size, Math.sin(a) * o.size);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // Particles (text)
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

    // Player
    if (!running || player.invincible % 6 < 3) {
      // Glow
      const grd = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, player.r * 2.5);
      grd.addColorStop(0, 'rgba(92,107,192,0.5)');
      grd.addColorStop(1, 'rgba(92,107,192,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r * 2.5, 0, Math.PI*2);
      ctx.fill();

      // Body
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#5c6bc0';
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r - 4, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(player.x - 5, player.y - 5, 4, 0, Math.PI*2);
      ctx.fill();
    }

    ctx.restore();
  }

  function spawnTextParticle(x, y, text, color) {
    particles.push({ x, y, vx: 0, vy: -1.5, life: 1, decay: 0.02, text, color, size: 16, r: 0 });
  }

  /* ── GAME OVER ───────────────────────────────────────────── */
  function showGameOver() {
    render(performance.now()); // final frame

    ctx.fillStyle = 'rgba(10,10,26,0.85)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e94560';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('게임 오버!', W/2, H/2 - 60);
    ctx.fillStyle = '#a8b2d8';
    ctx.font = '20px sans-serif';
    ctx.fillText(`점수: ${score}`, W/2, H/2 - 15);

    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(W/2 - 90, H/2 + 20, 180, 46);
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 2;
    ctx.strokeRect(W/2 - 90, H/2 + 20, 180, 46);
    ctx.fillStyle = '#e94560';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('다시 시작', W/2, H/2 + 49);

    canvas.onclick = () => { canvas.onclick = null; window.startGame(currentDiff); };
    canvas.ontouchend = (e) => { e.preventDefault(); canvas.ontouchend = null; window.startGame(currentDiff); };

    document.getElementById('game-root').dispatchEvent(new CustomEvent('gameOver', { detail: { score, cleared: false }, bubbles: true }));
  }

  /* ── BOOT ────────────────────────────────────────────────── */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
