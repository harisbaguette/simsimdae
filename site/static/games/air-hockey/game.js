/**
 * Air Hockey Game
 * API-compliant IIFE for 심심해 game site
 */
(function () {
  'use strict';

  const CONFIG = window.GAME_CONFIG || { gameId: 'air-hockey', difficulties: ['easy','normal','hard','expert'], hasLeaderboard: true, scoreType: 'high' };

  const W = 480, H = 640;
  const PADDLE_R = 30;
  const PUCK_R   = 18;
  const GOAL_W   = 140;
  const WIN_SCORE = 7;

  const AI_SPEED  = { easy: 2, normal: 4, hard: 6, expert: 8 };
  const FRICTION  = 0.992;
  const MAX_SPEED = 18;

  let canvas, ctx, root;
  let puck, playerPaddle, aiPaddle;
  let playerScore, aiScore;
  let running, animId;
  let currentDiff = 'normal';
  let particles = [];
  let lastGoalTime = 0;
  let goalMessage = '';
  let goalAlpha = 0;
  let shakeFrames = 0;

  // Mouse / touch tracking
  let targetX = W/2, targetY = H - 80;
  let prevPlayerX = W/2, prevPlayerY = H - 80;
  let aiPrevX = W/2, aiPrevY = 100;

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
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏒 에어 하키', W/2, H/2 - 20);
    ctx.fillStyle = '#a8b2d8';
    ctx.font = '16px sans-serif';
    ctx.fillText('startGame() 을 호출하세요', W/2, H/2 + 20);
  }

  /* ── START ───────────────────────────────────────────────── */
  window.startGame = function (diffId) {
    currentDiff = diffId || 'normal';
    playerScore = 0;
    aiScore = 0;
    particles = [];
    goalMessage = '';
    goalAlpha = 0;
    shakeFrames = 0;

    resetPositions();

    running = true;
    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(loop);
  };

  function resetPositions() {
    playerPaddle = { x: W/2, y: H - 100, r: PADDLE_R };
    aiPaddle     = { x: W/2, y: 100,     r: PADDLE_R, vx: 0 };
    puck         = { x: W/2, y: H/2, vx: (Math.random()-0.5)*6, vy: (Math.random() < 0.5 ? 1 : -1) * 5, r: PUCK_R };
    prevPlayerX  = W/2;
    prevPlayerY  = H - 100;
    aiPrevX      = W/2;
    aiPrevY      = 100;
    targetX = W/2;
    targetY = H - 100;
  }

  /* ── LOOP ────────────────────────────────────────────────── */
  function loop() {
    if (!running) return;
    update();
    render();
    animId = requestAnimationFrame(loop);
  }

  function update() {
    // Player paddle movement (smooth, constrained to bottom half)
    prevPlayerX = playerPaddle.x;
    prevPlayerY = playerPaddle.y;

    const clampedX = Math.max(PADDLE_R, Math.min(W - PADDLE_R, targetX));
    const clampedY = Math.max(H/2 + PADDLE_R, Math.min(H - PADDLE_R, targetY));
    playerPaddle.x += (clampedX - playerPaddle.x) * 0.35;
    playerPaddle.y += (clampedY - playerPaddle.y) * 0.35;

    // AI paddle movement (constrained to top half) — store prev before moving
    aiPrevX = aiPaddle.x;
    aiPrevY = aiPaddle.y;
    const aiSpeed = AI_SPEED[currentDiff];
    const aiTargetX = puck.y < H * 0.6 ? puck.x : W/2; // only react when puck is on AI side
    const dxAI = aiTargetX - aiPaddle.x;
    aiPaddle.x += Math.sign(dxAI) * Math.min(Math.abs(dxAI), aiSpeed);
    aiPaddle.x = Math.max(PADDLE_R, Math.min(W - PADDLE_R, aiPaddle.x));
    // Slight Y movement to challenge
    const aiTargetY = puck.y < H/2 ? puck.y : H/2 - 60;
    aiPaddle.y += (aiTargetY - aiPaddle.y) * 0.08;
    aiPaddle.y = Math.max(PADDLE_R, Math.min(H/2 - PADDLE_R, aiPaddle.y));

    // Puck physics
    puck.x += puck.vx;
    puck.y += puck.vy;
    puck.vx *= FRICTION;
    puck.vy *= FRICTION;

    // Speed cap
    const speed = Math.hypot(puck.vx, puck.vy);
    if (speed > MAX_SPEED) {
      puck.vx = (puck.vx / speed) * MAX_SPEED;
      puck.vy = (puck.vy / speed) * MAX_SPEED;
    }
    // Min speed to prevent stall
    if (speed > 0.1 && speed < 1.5) {
      puck.vx = (puck.vx / speed) * 1.5;
      puck.vy = (puck.vy / speed) * 1.5;
    }

    // Wall bounce (left/right)
    if (puck.x - puck.r < 0) {
      puck.x = puck.r; puck.vx = Math.abs(puck.vx) * 0.95;
      spawnWallParticles(0, puck.y, 'right');
    }
    if (puck.x + puck.r > W) {
      puck.x = W - puck.r; puck.vx = -Math.abs(puck.vx) * 0.95;
      spawnWallParticles(W, puck.y, 'left');
    }

    // Goals (top/bottom walls, center gap = goal)
    const goalLeft  = (W - GOAL_W) / 2;
    const goalRight = goalLeft + GOAL_W;

    if (puck.y - puck.r < 0) {
      if (puck.x > goalLeft && puck.x < goalRight) {
        // Player scores
        playerScore++;
        window.updateScore && window.updateScore(playerScore);
        shakeFrames = 20;
        goalMessage = '⚡ 득점!';
        goalAlpha = 2;
        spawnGoalParticles(puck.x, 0, '#4fc3f7');
        setTimeout(() => resetPositions(), 1200);
        if (playerScore >= WIN_SCORE) { winGame(); return; }
        return;
      } else {
        puck.y = puck.r; puck.vy = Math.abs(puck.vy) * 0.85;
      }
    }

    if (puck.y + puck.r > H) {
      if (puck.x > goalLeft && puck.x < goalRight) {
        // AI scores
        aiScore++;
        shakeFrames = 20;
        goalMessage = '😢 실점';
        goalAlpha = 2;
        spawnGoalParticles(puck.x, H, '#e94560');
        setTimeout(() => resetPositions(), 1200);
        if (aiScore >= WIN_SCORE) { loseGame(); return; }
        return;
      } else {
        puck.y = H - puck.r; puck.vy = -Math.abs(puck.vy) * 0.85;
      }
    }

    // Paddle-puck collisions
    collidePuckPaddle(playerPaddle, prevPlayerX, prevPlayerY);
    collidePuckPaddle(aiPaddle, aiPrevX, aiPrevY);

    // Particles
    particles = particles.filter(p => {
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.95; p.vy *= 0.95;
      p.vy += 0.05;
      p.life -= p.decay;
      return p.life > 0;
    });

    goalAlpha = Math.max(0, goalAlpha - 0.03);
    if (shakeFrames > 0) shakeFrames--;
  }

  function collidePuckPaddle(paddle, prevX, prevY) {
    const dx = puck.x - paddle.x;
    const dy = puck.y - paddle.y;
    const dist = Math.hypot(dx, dy);
    const minDist = puck.r + paddle.r;

    if (dist < minDist && dist > 0) {
      // Separate
      const nx = dx / dist, ny = dy / dist;
      puck.x = paddle.x + nx * minDist;
      puck.y = paddle.y + ny * minDist;

      // Reflect velocity
      const relVx = puck.vx - (paddle.x - prevX) * 1.2;
      const relVy = puck.vy - (paddle.y - prevY) * 1.2;
      const dot = relVx * nx + relVy * ny;
      puck.vx = puck.vx - 2 * dot * nx;
      puck.vy = puck.vy - 2 * dot * ny;

      // Add paddle velocity for feel
      puck.vx += (paddle.x - prevX) * 1.5;
      puck.vy += (paddle.y - prevY) * 1.5;

      // Ensure minimum departure speed
      const sp = Math.hypot(puck.vx, puck.vy);
      if (sp < 4) { puck.vx = nx * 4; puck.vy = ny * 4; }

      spawnWallParticles(puck.x, puck.y, 'burst');
    }
  }

  /* ── RENDER ──────────────────────────────────────────────── */
  function render() {
    const sx = shakeFrames > 0 ? (Math.random()-0.5) * shakeFrames * 0.8 : 0;
    const sy = shakeFrames > 0 ? (Math.random()-0.5) * shakeFrames * 0.4 : 0;
    ctx.save();
    ctx.translate(sx, sy);

    // Background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(-10, -10, W+20, H+20);

    // Table surface
    const tableGrd = ctx.createLinearGradient(0, 0, 0, H);
    tableGrd.addColorStop(0, '#0d1b3e');
    tableGrd.addColorStop(0.5, '#0a2040');
    tableGrd.addColorStop(1, '#0d1b3e');
    ctx.fillStyle = tableGrd;
    ctx.fillRect(0, 0, W, H);

    // Center line
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();
    ctx.setLineDash([]);

    // Center circle
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W/2, H/2, 70, 0, Math.PI*2);
    ctx.stroke();

    // Goals
    const gL = (W - GOAL_W) / 2;
    const gR = gL + GOAL_W;
    // Top goal (player's)
    ctx.fillStyle = 'rgba(79,195,247,0.15)';
    ctx.fillRect(gL, 0, GOAL_W, 8);
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(gL, 0); ctx.lineTo(gL, 12);
    ctx.moveTo(gR, 0); ctx.lineTo(gR, 12);
    ctx.stroke();
    // Bottom goal (AI's)
    ctx.fillStyle = 'rgba(233,69,96,0.15)';
    ctx.fillRect(gL, H - 8, GOAL_W, 8);
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(gL, H); ctx.lineTo(gL, H-12);
    ctx.moveTo(gR, H); ctx.lineTo(gR, H-12);
    ctx.stroke();

    // Score
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e94560';
    ctx.fillText(`AI: ${aiScore}`, 14, 35);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#4fc3f7';
    ctx.fillText(`나: ${playerScore}`, W - 14, H - 12);

    // Particles
    particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r || 3, 0, Math.PI*2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // AI paddle
    drawPaddle(aiPaddle.x, aiPaddle.y, '#e94560', '#b71c1c');
    // Player paddle
    drawPaddle(playerPaddle.x, playerPaddle.y, '#4fc3f7', '#0277bd');

    // Puck shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(puck.x + 3, puck.y + 3, puck.r, puck.r * 0.7, 0, 0, Math.PI*2);
    ctx.fill();

    // Puck
    const puckGrd = ctx.createRadialGradient(puck.x - puck.r*0.3, puck.y - puck.r*0.3, 0, puck.x, puck.y, puck.r);
    puckGrd.addColorStop(0, '#fff');
    puckGrd.addColorStop(0.4, '#ccc');
    puckGrd.addColorStop(1, '#666');
    ctx.fillStyle = puckGrd;
    ctx.beginPath();
    ctx.arc(puck.x, puck.y, puck.r, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Goal message
    if (goalAlpha > 0) {
      ctx.globalAlpha = Math.min(1, goalAlpha);
      ctx.font = 'bold 42px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#4fc3f7';
      ctx.shadowBlur = 20;
      ctx.fillText(goalMessage, W/2, H/2 + 12);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function drawPaddle(x, y, light, dark) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.arc(x + 3, y + 3, PADDLE_R, 0, Math.PI*2);
    ctx.fill();

    const grd = ctx.createRadialGradient(x - PADDLE_R*0.3, y - PADDLE_R*0.3, 0, x, y, PADDLE_R);
    grd.addColorStop(0, light);
    grd.addColorStop(1, dark);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, PADDLE_R, 0, Math.PI*2);
    ctx.fill();

    // Handle
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.arc(x, y, PADDLE_R * 0.42, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, PADDLE_R * 0.42, 0, Math.PI*2);
    ctx.stroke();
    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(x - PADDLE_R*0.2, y - PADDLE_R*0.25, PADDLE_R*0.32, PADDLE_R*0.18, -0.5, 0, Math.PI*2);
    ctx.fill();
  }

  function spawnWallParticles(x, y, dir) {
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2;
      particles.push({ x, y, vx: Math.cos(a)*2, vy: Math.sin(a)*2, r: 2 + Math.random()*3, color: '#4fc3f7', life: 0.8, decay: 0.06 });
    }
  }

  function spawnGoalParticles(x, y, color) {
    for (let i = 0; i < 25; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 3 + Math.random() * 7;
      particles.push({ x, y: y || H/2, vx: Math.cos(a)*s, vy: Math.sin(a)*s - 4, r: 3 + Math.random()*5, color, life: 1, decay: 0.025 });
    }
  }

  /* ── WIN / LOSE ──────────────────────────────────────────── */
  function winGame() {
    running = false;
    cancelAnimationFrame(animId);
    showEndScreen('🎉 승리!', '#4fc3f7', true);
  }

  function loseGame() {
    running = false;
    cancelAnimationFrame(animId);
    showEndScreen('😢 패배', '#e94560', false);
  }

  function showEndScreen(title, color, won) {
    setTimeout(() => {
      ctx.fillStyle = 'rgba(10,10,26,0.88)';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = color;
      ctx.font = 'bold 42px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, W/2, H/2 - 55);

      ctx.fillStyle = '#f0f0f0';
      ctx.font = '22px sans-serif';
      ctx.fillText(`${playerScore} : ${aiScore}`, W/2, H/2 - 5);
      ctx.fillStyle = '#a8b2d8';
      ctx.font = '16px sans-serif';
      ctx.fillText(won ? '7점 먼저 득점 달성!' : 'AI가 7점을 먼저 득점했습니다', W/2, H/2 + 30);

      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(W/2 - 80, H/2 + 60, 160, 44);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(W/2 - 80, H/2 + 60, 160, 44);
      ctx.fillStyle = color;
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('다시 시작', W/2, H/2 + 88);

      canvas.onclick = () => { canvas.onclick = null; window.startGame(currentDiff); };
      canvas.ontouchend = e => { e.preventDefault(); canvas.ontouchend = null; window.startGame(currentDiff); };

      const evtName = won ? 'gameClear' : 'gameOver';
      document.getElementById('game-root').dispatchEvent(new CustomEvent(evtName, { detail: { score: playerScore, cleared: won }, bubbles: true }));
    }, 600);
  }

  /* ── BOOT ────────────────────────────────────────────────── */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
