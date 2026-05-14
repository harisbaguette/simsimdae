/**
 * Brick Breaker
 * API-compliant IIFE for 심심해 game site
 */
(function () {
  'use strict';

  const CONFIG = window.GAME_CONFIG || { gameId: 'brick-break', difficulties: ['easy','normal','hard','expert'], hasLeaderboard: true, scoreType: 'high' };

  const W = 480, H = 640;
  const PADDLE_H = 14;
  const BASE_PADDLE_W = 90;
  const BALL_R = 8;
  const BRICK_ROWS = 5;
  const BRICK_COLS = 8;
  const BRICK_W = 52;
  const BRICK_H = 22;
  const BRICK_PAD = 4;
  const BRICK_TOP = 60;
  const POWERUP_CHANCE = 0.15;

  const DIFF_SPEED = { easy: 4, normal: 5.5, hard: 7, expert: 9 };
  const BRICK_COLORS = [
    ['#4fc3f7','#0288d1'],
    ['#81c784','#388e3c'],
    ['#ffb74d','#f57c00'],
    ['#f48fb1','#c2185b'],
    ['#ce93d8','#7b1fa2'],
  ];
  const HP_COLORS = { 1: '#4fc3f7', 2: '#ffb74d', 3: '#e94560' };

  let canvas, ctx, root;
  let paddle, balls, bricks, powerups, particles;
  let score, lives, level, running, animId;
  let currentDiff = 'normal';
  let mouseX = W / 2;
  let paddleWidthBonus = 0;
  let paddleBonusTimer = 0;
  let totalBricks = 0;
  let touchX = null;

  /* ── INIT ────────────────────────────────────────────────── */
  function init() {
    root = document.getElementById('game-root');
    root.innerHTML = '';
    root.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:#0d0d1a;user-select:none;';

    canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'border:2px solid #0f3460;border-radius:6px;box-shadow:0 0 40px rgba(79,195,247,0.2);touch-action:none;';
    ctx = canvas.getContext('2d');
    root.appendChild(canvas);

    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) * (W / rect.width);
    });
    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      touchX = (e.touches[0].clientX - rect.left) * (W / rect.width);
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      touchX = (e.touches[0].clientX - rect.left) * (W / rect.width);
    }, { passive: false });
    canvas.addEventListener('touchend', () => { touchX = null; });

    drawWelcome();
  }

  function drawWelcome() {
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#4fc3f7';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🧱 벽돌 깨기', W/2, H/2 - 20);
    ctx.fillStyle = '#a8b2d8';
    ctx.font = '16px sans-serif';
    ctx.fillText('startGame() 을 호출하세요', W/2, H/2 + 20);
  }

  /* ── START ───────────────────────────────────────────────── */
  window.startGame = function (diffId, stageNum) {
    currentDiff = diffId || 'normal';
    score = 0;
    lives = 3;
    level = stageNum || 1;
    paddleWidthBonus = 0;
    paddleBonusTimer = 0;
    particles = [];
    powerups = [];
    buildLevel();
    running = true;
    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(loop);
  };

  function buildLevel() {
    const pw = BASE_PADDLE_W + paddleWidthBonus;
    paddle = { x: W/2 - pw/2, y: H - 50, w: pw, h: PADDLE_H };
    balls = [makeBall()];
    bricks = [];
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        const hp = row < 2 ? 1 : row < 4 ? 2 : 3;
        const x = col * (BRICK_W + BRICK_PAD) + 20;
        const y = row * (BRICK_H + BRICK_PAD) + BRICK_TOP;
        bricks.push({ x, y, w: BRICK_W, h: BRICK_H, hp, maxHp: hp });
      }
    }
    totalBricks = bricks.length;
    powerups = [];
  }

  function makeBall(x, y, vx, vy) {
    const speed = DIFF_SPEED[currentDiff] * (1 + (level - 1) * 0.1);
    const angle = vx !== undefined ? 0 : (-Math.PI/2 + (Math.random()-0.5) * Math.PI/3);
    return {
      x: x || W/2,
      y: y || (H - 80),
      vx: vx !== undefined ? vx : Math.cos(angle) * speed,
      vy: vy !== undefined ? vy : Math.sin(angle) * speed,
      r: BALL_R,
      trail: []
    };
  }

  /* ── LOOP ────────────────────────────────────────────────── */
  function loop() {
    if (!running) return;
    update();
    render();
    animId = requestAnimationFrame(loop);
  }

  function update() {
    // Paddle
    const targetX = (touchX !== null ? touchX : mouseX) - paddle.w / 2;
    paddle.x += (targetX - paddle.x) * 0.25;
    paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

    // Power-up timer
    if (paddleBonusTimer > 0) {
      paddleBonusTimer--;
      if (paddleBonusTimer === 0) {
        paddleWidthBonus = 0;
        paddle.w = BASE_PADDLE_W;
      }
    }

    // Balls — iterate in reverse so splice doesn't skip entries
    for (let bi = balls.length - 1; bi >= 0; bi--) {
      const ball = balls[bi];
      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > 8) ball.trail.shift();

      ball.x += ball.vx;
      ball.y += ball.vy;

      // Wall bounce
      if (ball.x - ball.r < 0)  { ball.x = ball.r;  ball.vx = Math.abs(ball.vx); }
      if (ball.x + ball.r > W)  { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
      if (ball.y - ball.r < 0)  { ball.y = ball.r;  ball.vy = Math.abs(ball.vy); }

      // Fell below — only lose life if ball goes below bottom edge (not above)
      if (ball.y - ball.r > H) {
        balls.splice(bi, 1);
        if (balls.length === 0) {
          lives--;
          window.updateScore && window.updateScore(score);
          if (lives <= 0) {
            gameOver();
            return;
          } else {
            // Respawn single ball
            balls = [makeBall()];
          }
        }
        continue;
      }

      // Paddle collision
      if (ball.vy > 0 &&
          ball.x > paddle.x && ball.x < paddle.x + paddle.w &&
          ball.y + ball.r > paddle.y && ball.y - ball.r < paddle.y + paddle.h) {
        ball.y = paddle.y - ball.r;
        const hitPos = (ball.x - (paddle.x + paddle.w/2)) / (paddle.w/2);
        const angle = hitPos * (Math.PI / 3);
        const speed = Math.hypot(ball.vx, ball.vy);
        ball.vx = Math.sin(angle) * speed;
        ball.vy = -Math.cos(angle) * speed;
      }

      // Brick collision
      for (let i = bricks.length - 1; i >= 0; i--) {
        const b = bricks[i];
        if (!intersectBallBrick(ball, b)) continue;

        b.hp--;
        spawnParticles(b.x + b.w/2, b.y + b.h/2, HP_COLORS[b.hp + 1] || '#fff');

        // Deflect — compare overlaps to choose axis
        const overlapX = Math.min(ball.x + ball.r - b.x, b.x + b.w - (ball.x - ball.r));
        const overlapY = Math.min(ball.y + ball.r - b.y, b.y + b.h - (ball.y - ball.r));
        if (overlapX < overlapY) {
          ball.vx = ball.x < b.x + b.w/2 ? -Math.abs(ball.vx) : Math.abs(ball.vx);
        } else {
          ball.vy = ball.y < b.y + b.h/2 ? -Math.abs(ball.vy) : Math.abs(ball.vy);
        }

        if (b.hp <= 0) {
          score += b.maxHp * 10;
          window.updateScore && window.updateScore(score);
          if (Math.random() < POWERUP_CHANCE) {
            powerups.push({
              x: b.x + b.w/2, y: b.y, vy: 2,
              type: Math.random() < 0.5 ? 'wide' : 'multi',
              r: 10, life: 1
            });
          }
          bricks.splice(i, 1);
          if (bricks.length === 0) {
            levelClear();
            return;
          }
        }
        break;
      }
    }

    // Powerups
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.y += p.vy;
      if (p.y > paddle.y && p.y < paddle.y + paddle.h &&
          p.x > paddle.x && p.x < paddle.x + paddle.w) {
        applyPowerup(p.type);
        powerups.splice(i, 1);
      } else if (p.y > H) {
        powerups.splice(i, 1);
      }
    }

    // Particles
    particles = particles.filter(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.15;
      p.life -= 0.03;
      return p.life > 0;
    });
  }

  function intersectBallBrick(ball, b) {
    const nearX = Math.max(b.x, Math.min(b.x + b.w, ball.x));
    const nearY = Math.max(b.y, Math.min(b.y + b.h, ball.y));
    return Math.hypot(ball.x - nearX, ball.y - nearY) < ball.r;
  }

  function applyPowerup(type) {
    if (type === 'wide') {
      paddleWidthBonus = 50;
      paddle.w = BASE_PADDLE_W + paddleWidthBonus;
      paddleBonusTimer = 600;
    } else if (type === 'multi') {
      const orig = balls[0];
      balls.push(makeBall(orig.x, orig.y, orig.vx + 2, orig.vy));
      balls.push(makeBall(orig.x, orig.y, orig.vx - 2, orig.vy));
    }
  }

  /* ── RENDER ──────────────────────────────────────────────── */
  function render() {
    // BG
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

    // HUD
    ctx.fillStyle = '#a8b2d8';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`레벨 ${level}`, 10, 20);
    ctx.textAlign = 'right';
    ctx.fillText(`점수: ${score}`, W - 10, 20);
    // Lives
    for (let i = 0; i < lives; i++) {
      ctx.fillStyle = '#e94560';
      ctx.beginPath();
      ctx.arc(W/2 - (lives-1)*12 + i*24, 18, 7, 0, Math.PI*2);
      ctx.fill();
    }

    // Bricks
    bricks.forEach(b => {
      const ci = b.maxHp - 1;
      const [c1, c2] = BRICK_COLORS[ci % BRICK_COLORS.length];
      const fade = b.hp / b.maxHp;
      const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
      grad.addColorStop(0, c1);
      grad.addColorStop(1, c2);
      ctx.globalAlpha = 0.4 + fade * 0.6;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 4);
      ctx.fill();
      if (b.maxHp > 1) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(b.hp, b.x + b.w/2, b.y + b.h/2 + 4);
      }
      ctx.globalAlpha = 1;
    });

    // Powerups
    powerups.forEach(p => {
      ctx.fillStyle = p.type === 'wide' ? '#ffcc00' : '#00e5ff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.type === 'wide' ? 'W' : 'M', p.x, p.y + 4);
    });

    // Particles
    particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Balls
    balls.forEach(ball => {
      // Trail
      ball.trail.forEach((t, i) => {
        ctx.globalAlpha = (i / ball.trail.length) * 0.4;
        ctx.fillStyle = '#4fc3f7';
        const tr = ball.r * (i / ball.trail.length);
        ctx.beginPath();
        ctx.arc(t.x, t.y, tr, 0, Math.PI*2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Glow
      const grd = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.r * 2);
      grd.addColorStop(0, 'rgba(79,195,247,0.6)');
      grd.addColorStop(1, 'rgba(79,195,247,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r * 2, 0, Math.PI*2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#4fc3f7';
      ctx.beginPath();
      ctx.arc(ball.x - 2, ball.y - 2, ball.r * 0.4, 0, Math.PI*2);
      ctx.fill();
    });

    // Paddle
    const paddleGrd = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.h);
    paddleGrd.addColorStop(0, paddleBonusTimer > 0 ? '#ffcc00' : '#4fc3f7');
    paddleGrd.addColorStop(1, paddleBonusTimer > 0 ? '#ff8800' : '#0288d1');
    ctx.fillStyle = paddleGrd;
    ctx.beginPath();
    ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 7);
    ctx.fill();
  }

  function spawnParticles(cx, cy, color) {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1 + Math.random() * 3;
      particles.push({ x: cx, y: cy, vx: Math.cos(a)*s, vy: Math.sin(a)*s - 2, r: 2 + Math.random()*3, life: 1, color });
    }
  }

  /* ── LEVEL CLEAR / GAME OVER ─────────────────────────────── */
  function levelClear() {
    running = false;
    cancelAnimationFrame(animId);
    score += 500 * level;
    window.updateScore && window.updateScore(score);

    ctx.fillStyle = 'rgba(13,13,26,0.8)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#4fc3f7';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('레벨 클리어!', W/2, H/2 - 30);
    ctx.fillStyle = '#ffcc00';
    ctx.font = '22px sans-serif';
    ctx.fillText(`+${500 * level} 보너스`, W/2, H/2 + 10);

    drawButton(W/2 - 80, H/2 + 40, 160, 44, '다음 레벨', '#4fc3f7');

    const dispatch = () => {
      document.getElementById('game-root').dispatchEvent(new CustomEvent('gameClear', { detail: { score }, bubbles: true }));
    };
    canvas.onclick = () => {
      canvas.onclick = null;
      level++;
      paddleWidthBonus = 0;
      paddleBonusTimer = 0;
      particles = [];
      buildLevel();
      running = true;
      animId = requestAnimationFrame(loop);
    };
    dispatch();
  }

  function gameOver() {
    running = false;
    cancelAnimationFrame(animId);

    ctx.fillStyle = 'rgba(13,13,26,0.85)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e94560';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('게임 오버', W/2, H/2 - 40);
    ctx.fillStyle = '#a8b2d8';
    ctx.font = '22px sans-serif';
    ctx.fillText(`점수: ${score}`, W/2, H/2 + 5);
    drawButton(W/2 - 80, H/2 + 35, 160, 44, '다시 시작', '#e94560');

    canvas.onclick = () => { canvas.onclick = null; window.startGame(currentDiff); };

    document.getElementById('game-root').dispatchEvent(new CustomEvent('gameOver', { detail: { score, cleared: false }, bubbles: true }));
  }

  function drawButton(x, y, w, h, label, color) {
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w/2, y + h/2 + 7);
  }

  /* ── BOOT ────────────────────────────────────────────────── */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
