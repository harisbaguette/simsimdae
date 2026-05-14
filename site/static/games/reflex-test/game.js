/**
 * Reflex Test Game
 * API-compliant IIFE for 심심해 game site
 */
(function () {
  'use strict';

  const CONFIG = window.GAME_CONFIG || { gameId: 'reflex-test', difficulties: ['easy','normal','hard','expert'], hasLeaderboard: true, scoreType: 'low' };

  const W = 400, H = 300;
  const ROUNDS = 5;
  const FAKE_CHANCE = { easy: 0.1, normal: 0.2, hard: 0.3, expert: 0.4 };
  const FAKE_PENALTY = 500;

  let canvas, ctx, root;
  let phase, round, results, signalStart, waitTimer;
  let currentDiff = 'normal';
  let score = 0;
  let flashColor = null;
  let flashAlpha = 0;
  let animId = null;
  let canClick = false;

  /* ── INIT ────────────────────────────────────────────────── */
  function init() {
    root = document.getElementById('game-root');
    root.innerHTML = '';
    root.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:#111827;user-select:none;';

    canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'border:2px solid #374151;border-radius:10px;box-shadow:0 0 30px rgba(0,0,0,0.5);cursor:pointer;touch-action:none;';
    ctx = canvas.getContext('2d');
    root.appendChild(canvas);

    canvas.addEventListener('click', onPlayerAction);
    canvas.addEventListener('touchstart', e => { e.preventDefault(); onPlayerAction(); }, { passive: false });

    drawWelcome();
  }

  function drawWelcome() {
    drawBg('#111827');
    ctx.fillStyle = '#9ca3af';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ 반응속도 테스트', W/2, H/2 - 20);
    ctx.fillStyle = '#6b7280';
    ctx.font = '15px sans-serif';
    ctx.fillText('startGame() 을 호출하세요', W/2, H/2 + 20);
  }

  /* ── START ───────────────────────────────────────────────── */
  window.startGame = function (diffId) {
    currentDiff = diffId || 'normal';
    round = 0;
    results = [];
    score = 0;
    canClick = false;
    if (waitTimer) clearTimeout(waitTimer);
    if (animId) cancelAnimationFrame(animId);
    phase = 'waiting';
    nextRound();
  };

  function nextRound() {
    if (round >= ROUNDS) {
      showResults();
      return;
    }
    round++;
    phase = 'prepare';
    canClick = false;
    render();

    // Random delay 1000–4000ms before signal
    const delay = 1000 + Math.random() * 3000;
    waitTimer = setTimeout(() => {
      const isFake = Math.random() < FAKE_CHANCE[currentDiff];
      if (isFake) {
        showFake();
      } else {
        showGo();
      }
    }, delay);
  }

  function showFake() {
    phase = 'fake';
    canClick = true;
    flashColor = '#e94560';
    flashAlpha = 1;
    render();

    waitTimer = setTimeout(() => {
      if (phase === 'fake') {
        // Fake signal ended without click → good
        phase = 'prepare';
        canClick = false;
        render();
        // Short pause then signal
        waitTimer = setTimeout(() => {
          showGo();
        }, 600);
      }
    }, 800);
  }

  function showGo() {
    phase = 'go';
    signalStart = performance.now();
    canClick = true;
    flashColor = '#10b981';
    flashAlpha = 1;
    render();

    // Timeout if no click in 3s
    waitTimer = setTimeout(() => {
      if (phase === 'go') {
        results.push(3000);
        phase = 'prepare';
        canClick = false;
        nextRound();
      }
    }, 3000);
  }

  function onPlayerAction() {
    if (!canClick || phase === 'prepare' || phase === 'idle') return;

    if (phase === 'fake') {
      // Penalty click
      clearTimeout(waitTimer);
      results.push(-1); // marker for fake click
      canClick = false;
      phase = 'penalized';
      flashColor = '#ef4444';
      flashAlpha = 0.7;
      render();
      waitTimer = setTimeout(nextRound, 900);
      return;
    }

    if (phase === 'go') {
      clearTimeout(waitTimer);
      const rt = performance.now() - signalStart;
      results.push(rt);
      canClick = false;
      phase = 'result';
      flashAlpha = 0;
      render();
      waitTimer = setTimeout(nextRound, 800);
    }
  }

  /* ── RENDER ──────────────────────────────────────────────── */
  function render() {
    ctx.clearRect(0, 0, W, H);

    // Background color based on phase
    let bgColor = '#111827';
    if (phase === 'go') bgColor = '#064e3b';
    else if (phase === 'fake') bgColor = '#450a0a';
    else if (phase === 'penalized') bgColor = '#7f1d1d';
    drawBg(bgColor);

    // Round indicator dots
    for (let i = 0; i < ROUNDS; i++) {
      let color = '#374151';
      if (i < results.length) {
        const r = results[i];
        color = r === -1 ? '#ef4444' : '#10b981';
      } else if (i === round - 1 && phase !== 'prepare') {
        color = '#f59e0b';
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(W/2 - (ROUNDS-1)*14 + i*28, 22, 8, 0, Math.PI*2);
      ctx.fill();
    }

    if (phase === 'prepare') {
      ctx.fillStyle = '#9ca3af';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`라운드 ${round} / ${ROUNDS}`, W/2, H/2 - 30);
      ctx.fillStyle = '#6b7280';
      ctx.font = '15px sans-serif';
      ctx.fillText('준비하세요...', W/2, H/2 + 5);

      // Blinking cursor
      if (Math.floor(Date.now() / 400) % 2 === 0) {
        ctx.fillStyle = '#4b5563';
        ctx.font = '28px sans-serif';
        ctx.fillText('|', W/2, H/2 + 45);
      }
      requestAnimationFrame(render);
      return;
    }

    if (phase === 'go') {
      // Pulsing circle
      const pulse = 0.85 + 0.15 * Math.sin(Date.now() / 80);
      const grd = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, 75 * pulse);
      grd.addColorStop(0, 'rgba(16,185,129,0.9)');
      grd.addColorStop(1, 'rgba(16,185,129,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(W/2, H/2, 90 * pulse, 0, Math.PI*2);
      ctx.fill();

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(W/2, H/2, 70 * pulse, 0, Math.PI*2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('지금!', W/2, H/2 + 10);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#a7f3d0';
      ctx.fillText('클릭하세요!', W/2, H/2 + 35);
      requestAnimationFrame(render);
      return;
    }

    if (phase === 'fake') {
      const grd = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, 70);
      grd.addColorStop(0, 'rgba(239,68,68,0.8)');
      grd.addColorStop(1, 'rgba(239,68,68,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(W/2, H/2, 80, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(W/2, H/2, 60, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('가짜 신호!', W/2, H/2 + 8);
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#fca5a5';
      ctx.fillText('클릭하지 마세요', W/2, H/2 + 30);
      requestAnimationFrame(render);
      return;
    }

    if (phase === 'penalized') {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('페널티!', W/2, H/2 - 10);
      ctx.fillStyle = '#fca5a5';
      ctx.font = '16px sans-serif';
      ctx.fillText(`+${FAKE_PENALTY}ms 추가`, W/2, H/2 + 20);
      return;
    }

    if (phase === 'result') {
      const rt = results[results.length - 1];
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(rt)}ms`, W/2, H/2);
      let rating = '🔥 훌륭해요!';
      if (rt > 400) rating = '😊 보통이에요';
      if (rt > 600) rating = '😅 느려요';
      ctx.fillStyle = '#6ee7b7';
      ctx.font = '18px sans-serif';
      ctx.fillText(rating, W/2, H/2 + 35);
      return;
    }
  }

  function drawBg(color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, H);
  }

  /* ── RESULTS ─────────────────────────────────────────────── */
  function showResults() {
    canClick = false;
    if (animId) cancelAnimationFrame(animId);

    // Calculate avg (penalties = +500ms each)
    let totalMs = 0;
    let validRounds = 0;
    results.forEach(r => {
      if (r === -1) { totalMs += FAKE_PENALTY; validRounds++; }
      else { totalMs += r; validRounds++; }
    });
    const avg = validRounds > 0 ? totalMs / validRounds : 9999;
    score = Math.round(avg); // lower = better
    window.updateScore && window.updateScore(score);

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#f3f4f6';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('결과', W/2, 35);

    // Table
    const tableX = W/2 - 130;
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(tableX, 50, 260, 30);
    ctx.fillStyle = '#9ca3af';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('라운드', tableX + 12, 70);
    ctx.textAlign = 'right';
    ctx.fillText('반응시간', tableX + 248, 70);

    results.forEach((r, i) => {
      const y = 90 + i * 26;
      ctx.fillStyle = i % 2 === 0 ? '#1a2535' : '#111827';
      ctx.fillRect(tableX, y - 14, 260, 26);
      ctx.fillStyle = r === -1 ? '#ef4444' : (r < 250 ? '#10b981' : r < 450 ? '#f59e0b' : '#9ca3af');
      ctx.textAlign = 'left';
      ctx.font = '13px sans-serif';
      ctx.fillText(`라운드 ${i + 1}`, tableX + 12, y + 4);
      ctx.textAlign = 'right';
      ctx.fillText(r === -1 ? `페널티 +${FAKE_PENALTY}ms` : `${Math.round(r)}ms`, tableX + 248, y + 4);
    });

    const avgY = 90 + results.length * 26 + 14;
    ctx.fillStyle = '#374151';
    ctx.fillRect(tableX, avgY - 14, 260, 28);
    ctx.fillStyle = '#f3f4f6';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('평균', tableX + 12, avgY + 5);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd166';
    ctx.fillText(`${Math.round(avg)}ms`, tableX + 248, avgY + 5);

    // Rating
    let rating = '⚡ 반사 신경 최고!';
    if (avg > 400) rating = '👍 평균 수준';
    if (avg > 600) rating = '💪 연습이 필요해요';
    if (avg > 900) rating = '😴 집중하세요';
    ctx.fillStyle = '#a8b2d8';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(rating, W/2, avgY + 38);

    // Restart button
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(W/2 - 70, avgY + 55, 140, 38);
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(W/2 - 70, avgY + 55, 140, 38);
    ctx.fillStyle = '#d1d5db';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('다시 하기', W/2, avgY + 80);

    canvas.onclick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const cx = (e.clientX - rect.left) * (W / rect.width);
      const cy = (e.clientY - rect.top)  * (H / rect.height);
      if (cx > W/2 - 70 && cx < W/2 + 70 && cy > avgY + 55 && cy < avgY + 93) {
        canvas.onclick = null;
        window.startGame(currentDiff);
      }
    };

    document.getElementById('game-root').dispatchEvent(new CustomEvent('gameOver', { detail: { score, cleared: false }, bubbles: true }));
  }

  /* ── BOOT ────────────────────────────────────────────────── */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
