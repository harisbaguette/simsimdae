/**
 * Tower Stack Game
 * API-compliant IIFE for 심심해 game site
 */
(function () {
  'use strict';

  const CONFIG = window.GAME_CONFIG || { gameId: 'tower-stack', difficulties: ['easy','normal','hard','expert'], hasLeaderboard: true, scoreType: 'high' };

  const W = 320, H = 480;
  const BLOCK_H = 28;
  const BASE_W = 220;
  const PERFECT_THRESHOLD = 5;
  const BASE_SPEED = { easy: 1.5, normal: 2.5, hard: 3.5, expert: 5 };

  let canvas, ctx, root;
  let blocks, currentBlock, cameraY;
  let score, running, animId;
  let currentDiff = 'normal';
  let particles = [];
  let gamePhase = 'idle'; // idle | playing | over
  let perfectCount = 0;
  let flashAlpha = 0;

  // Color palette for blocks
  const PALETTE = [
    '#e94560','#ff8c42','#ffd166','#06d6a0','#118ab2','#7b2d8b','#f72585','#4cc9f0'
  ];

  /* ── INIT ────────────────────────────────────────────────── */
  function init() {
    root = document.getElementById('game-root');
    root.innerHTML = '';
    root.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:#1a0533;user-select:none;';

    canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'border:2px solid #7b2d8b;border-radius:8px;box-shadow:0 0 40px rgba(123,45,139,0.5);touch-action:none;';
    ctx = canvas.getContext('2d');
    root.appendChild(canvas);

    canvas.addEventListener('click', onDrop);
    canvas.addEventListener('touchend', e => { e.preventDefault(); onDrop(); }, { passive: false });

    drawWelcome();
  }

  function drawWelcome() {
    ctx.fillStyle = '#1a0533';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ce93d8';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏗 타워 쌓기', W/2, H/2 - 20);
    ctx.fillStyle = '#a8b2d8';
    ctx.font = '15px sans-serif';
    ctx.fillText('startGame() 을 호출하세요', W/2, H/2 + 20);
  }

  /* ── START ───────────────────────────────────────────────── */
  window.startGame = function (diffId) {
    currentDiff = diffId || 'normal';
    score = 0;
    perfectCount = 0;
    flashAlpha = 0;
    particles = [];

    // Base block
    const baseX = (W - BASE_W) / 2;
    blocks = [
      { x: baseX, w: BASE_W, y: H - BLOCK_H - 10, colorIdx: 0 }
    ];
    cameraY = 0;

    spawnMovingBlock();
    gamePhase = 'playing';
    running = true;
    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(loop);
  };

  function spawnMovingBlock() {
    const last = blocks[blocks.length - 1];
    const speed = BASE_SPEED[currentDiff] * (1 + blocks.length * 0.03);
    currentBlock = {
      x: -last.w * 0.5,
      w: last.w,
      y: last.y - BLOCK_H - 2,
      vx: speed,
      colorIdx: (last.colorIdx + 1) % PALETTE.length
    };
  }

  /* ── DROP ────────────────────────────────────────────────── */
  function onDrop() {
    if (gamePhase !== 'playing') return;

    const last = blocks[blocks.length - 1];
    const cb = currentBlock;

    // Calculate overlap
    const overlapLeft  = Math.max(cb.x, last.x);
    const overlapRight = Math.min(cb.x + cb.w, last.x + last.w);
    const overlap = overlapRight - overlapLeft;

    if (overlap <= 0) {
      // Missed entirely
      spawnFalloff(cb.x, cb.y, cb.w, cb.colorIdx, false);
      endGame();
      return;
    }

    const delta = Math.abs((cb.x + cb.w/2) - (last.x + last.w/2));
    const isPerfect = delta <= PERFECT_THRESHOLD;

    if (isPerfect) {
      // Snap to exact position
      cb.x = last.x;
      cb.w = last.w;
      perfectCount++;
      score += 15;
      flashAlpha = 1;
      spawnPerfectParticles(cb.x + cb.w/2, cb.y + BLOCK_H/2);
    } else {
      // Trim overhanging part
      const fallingX = cb.x < last.x ? cb.x : cb.x + overlap;
      const fallingW = cb.w - overlap;
      spawnFalloff(fallingX, cb.y, fallingW, cb.colorIdx, true);
      cb.x = overlapLeft;
      cb.w = overlap;
      perfectCount = 0;
      score += 10;
    }

    blocks.push({ x: cb.x, w: cb.w, y: cb.y, colorIdx: cb.colorIdx });
    window.updateScore && window.updateScore(score);

    // Camera scroll up when tower gets tall
    const topBlock = blocks[blocks.length - 1];
    const visibleTop = H * 0.35;
    if (topBlock.y - cameraY < visibleTop) {
      cameraY = topBlock.y - visibleTop;
    }

    if (cb.w < 3) {
      endGame();
      return;
    }

    spawnMovingBlock();
  }

  function spawnFalloff(x, y, w, colorIdx, partial) {
    const numP = Math.ceil(w / 6);
    for (let i = 0; i < numP; i++) {
      particles.push({
        x: x + Math.random() * w,
        y: y + BLOCK_H / 2,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 3,
        gravity: 0.3,
        w: 4 + Math.random() * 8,
        h: 4 + Math.random() * 8,
        rot: Math.random() * Math.PI,
        rotV: (Math.random() - 0.5) * 0.3,
        color: PALETTE[colorIdx],
        life: 1,
        decay: 0.02
      });
    }
  }

  function spawnPerfectParticles(cx, cy) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const s = 2 + Math.random() * 4;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        gravity: 0.05,
        w: 4, h: 4,
        rot: a, rotV: 0.1,
        color: '#ffd166',
        life: 1, decay: 0.025
      });
    }
  }

  /* ── LOOP ────────────────────────────────────────────────── */
  function loop() {
    if (!running) return;
    update();
    render();
    animId = requestAnimationFrame(loop);
  }

  function update() {
    if (gamePhase !== 'playing') return;

    // Move current block
    currentBlock.x += currentBlock.vx;
    if (currentBlock.x + currentBlock.w > W + currentBlock.w * 0.5) {
      currentBlock.vx = -Math.abs(currentBlock.vx);
    }
    if (currentBlock.x < -currentBlock.w * 0.5) {
      currentBlock.vx = Math.abs(currentBlock.vx);
    }

    // Particles
    particles = particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rot += p.rotV;
      p.life -= p.decay;
      return p.life > 0 && p.y - cameraY < H + 20;
    });

    flashAlpha = Math.max(0, flashAlpha - 0.04);
  }

  /* ── RENDER ──────────────────────────────────────────────── */
  function render() {
    ctx.fillStyle = '#1a0533';
    ctx.fillRect(0, 0, W, H);

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0d0120');
    bg.addColorStop(1, '#2d0b5c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Score HUD
    ctx.fillStyle = '#ce93d8';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${score}점`, W/2, 30);
    if (perfectCount > 0) {
      ctx.fillStyle = '#ffd166';
      ctx.font = '13px sans-serif';
      ctx.fillText(`✨ 퍼펙트 ×${perfectCount}`, W/2, 50);
    }

    ctx.save();
    ctx.translate(0, -cameraY);

    // Stacked blocks
    blocks.forEach((b, i) => {
      const color = PALETTE[b.colorIdx];
      drawBlock(b.x, b.y, b.w, BLOCK_H, color, i === 0);
    });

    // Current moving block
    if (gamePhase === 'playing') {
      const cb = currentBlock;
      const color = PALETTE[cb.colorIdx];
      // Ghost guide line
      const last = blocks[blocks.length - 1];
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(last.x, cb.y, last.w, BLOCK_H);
      ctx.setLineDash([]);

      drawBlock(cb.x, cb.y, cb.w, BLOCK_H, color, false);
    }

    // Particles
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    });

    ctx.restore();

    // Perfect flash overlay
    if (flashAlpha > 0) {
      ctx.globalAlpha = flashAlpha * 0.3;
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgba(255,209,102,${flashAlpha})`;
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('퍼펙트!', W/2, H/2);
    }
  }

  function drawBlock(x, y, w, h, color, isBase) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + 3, y + 3, w, h);

    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, lighten(color, 30));
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 3);
    ctx.fill();

    // Highlight edge
    ctx.strokeStyle = lighten(color, 50);
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 2);
    ctx.lineTo(x + w - 4, y + 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function lighten(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = Math.min(255, ((n >> 16) & 0xff) + amt);
    let g = Math.min(255, ((n >> 8)  & 0xff) + amt);
    let b = Math.min(255, ((n)       & 0xff) + amt);
    return `rgb(${r},${g},${b})`;
  }

  /* ── GAME OVER ───────────────────────────────────────────── */
  function endGame() {
    gamePhase = 'over';
    running = false;
    cancelAnimationFrame(animId);

    // Animate block falling
    setTimeout(() => {
      ctx.fillStyle = 'rgba(26,5,51,0.88)';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#e94560';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('게임 오버', W/2, H/2 - 50);

      ctx.fillStyle = '#ce93d8';
      ctx.font = '18px sans-serif';
      ctx.fillText(`쌓은 블록: ${blocks.length - 1}개`, W/2, H/2 - 10);
      ctx.fillText(`점수: ${score}`, W/2, H/2 + 20);

      // Restart button
      ctx.fillStyle = '#2d0b5c';
      ctx.fillRect(W/2 - 80, H/2 + 50, 160, 44);
      ctx.strokeStyle = '#7b2d8b';
      ctx.lineWidth = 2;
      ctx.strokeRect(W/2 - 80, H/2 + 50, 160, 44);
      ctx.fillStyle = '#ce93d8';
      ctx.font = 'bold 17px sans-serif';
      ctx.fillText('다시 시작', W/2, H/2 + 78);

      canvas.onclick = () => { canvas.onclick = null; window.startGame(currentDiff); };
      canvas.ontouchend = (e) => { e.preventDefault(); canvas.ontouchend = null; window.startGame(currentDiff); };

      document.getElementById('game-root').dispatchEvent(new CustomEvent('gameOver', { detail: { score, cleared: false }, bubbles: true }));
    }, 400);
  }

  /* ── BOOT ────────────────────────────────────────────────── */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
