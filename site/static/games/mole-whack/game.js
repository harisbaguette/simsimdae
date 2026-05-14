/**
 * Mole Whack Game (DOM-based)
 * API-compliant IIFE for 심심해 game site
 */
(function () {
  'use strict';

  const CONFIG = window.GAME_CONFIG || { gameId: 'mole-whack', difficulties: ['easy','normal','hard','expert'], hasLeaderboard: true, scoreType: 'high' };

  const GRID = 3;
  const TOTAL_TIME = 60;
  const GOLDEN_CHANCE = 0.1;
  const BASE_APPEAR = { easy: 1600, normal: 1100, hard: 750, expert: 500 };
  const BASE_STAY   = { easy: 1400, normal: 1000, hard: 700, expert: 450 };

  let root, grid, timerEl, scoreEl, livesEl, msgEl;
  let score, lives, timeLeft, running;
  let moleTimers = [];
  let countdownTimer = null;
  let currentDiff = 'normal';
  let whacked = 0, missed = 0;

  /* ── INIT ────────────────────────────────────────────────── */
  function init() {
    root = document.getElementById('game-root');
    root.innerHTML = '';
    root.style.cssText = `
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      height:100%;background:#1b4332;font-family:sans-serif;user-select:none;
    `;

    // HUD
    const hud = document.createElement('div');
    hud.style.cssText = 'display:flex;gap:24px;align-items:center;margin-bottom:16px;width:320px;justify-content:space-between;';

    timerEl = document.createElement('div');
    timerEl.style.cssText = 'color:#95d5b2;font-size:18px;font-weight:bold;';
    timerEl.textContent = '⏱ 60s';

    scoreEl = document.createElement('div');
    scoreEl.style.cssText = 'color:#ffd166;font-size:20px;font-weight:bold;';
    scoreEl.textContent = '0점';

    livesEl = document.createElement('div');
    livesEl.style.cssText = 'font-size:18px;';
    livesEl.textContent = '❤️❤️❤️';

    hud.append(timerEl, scoreEl, livesEl);
    root.appendChild(hud);

    // Message overlay
    msgEl = document.createElement('div');
    msgEl.style.cssText = `
      position:absolute;color:#ffd166;font-size:22px;font-weight:bold;
      pointer-events:none;transition:opacity 0.4s;opacity:0;
      text-shadow:0 2px 8px rgba(0,0,0,0.7);
    `;
    root.style.position = 'relative';
    root.appendChild(msgEl);

    // Grid
    grid = document.createElement('div');
    grid.style.cssText = `
      display:grid;grid-template-columns:repeat(3,100px);
      grid-template-rows:repeat(3,100px);gap:12px;
    `;

    for (let i = 0; i < 9; i++) {
      const hole = document.createElement('div');
      hole.className = 'hole';
      hole.dataset.idx = i;
      hole.style.cssText = `
        width:100px;height:100px;background:radial-gradient(circle,#2d6a4f 40%,#1b4332 100%);
        border-radius:50%;display:flex;align-items:center;justify-content:center;
        font-size:52px;cursor:pointer;border:4px solid #1b4332;
        box-shadow:inset 0 6px 16px rgba(0,0,0,0.5);
        transition:transform 0.08s;overflow:hidden;position:relative;
      `;

      const moleEl = document.createElement('div');
      moleEl.className = 'mole';
      moleEl.style.cssText = `
        position:absolute;bottom:-110%;transition:bottom 0.15s ease-out;
        font-size:56px;line-height:1;text-align:center;
        filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));
      `;
      moleEl.textContent = '🦔';
      hole.appendChild(moleEl);

      hole.addEventListener('click',     () => whackMole(hole, i));
      hole.addEventListener('touchstart', e => { e.preventDefault(); whackMole(hole, i); }, { passive: false });

      grid.appendChild(hole);
    }

    root.appendChild(grid);
    drawWelcome();
  }

  function drawWelcome() {
    // Show message on welcome
    root.querySelectorAll('.hole').forEach(h => {
      h.querySelector('.mole').style.bottom = '-110%';
    });
    scoreEl.textContent = 'startGame() 대기중';
    timerEl.textContent = '⏱ --s';
    livesEl.textContent = '❤️❤️❤️';
  }

  /* ── START ───────────────────────────────────────────────── */
  window.startGame = function (diffId) {
    currentDiff = diffId || 'normal';
    score = 0;
    lives = 3;
    timeLeft = TOTAL_TIME;
    whacked = 0; missed = 0;
    running = true;
    clearAllTimers();
    updateHUD();

    countdownTimer = setInterval(tick, 1000);
    scheduleNextMole();
  };

  function tick() {
    if (!running) return;
    timeLeft--;
    timerEl.textContent = `⏱ ${timeLeft}s`;
    timerEl.style.color = timeLeft <= 10 ? '#e94560' : '#95d5b2';

    // Speed up as time passes
    if (timeLeft % 10 === 0 && timeLeft < TOTAL_TIME) {
      // More moles by shortening schedule
    }

    if (timeLeft <= 0) {
      endGame();
    }
  }

  function scheduleNextMole() {
    if (!running) return;
    const elapsed = TOTAL_TIME - timeLeft;
    const speedMult = Math.max(0.4, 1 - elapsed * 0.008);
    const delay = BASE_APPEAR[currentDiff] * speedMult * (0.7 + Math.random() * 0.6);

    const t = setTimeout(() => {
      if (!running) return;
      showMole();
      scheduleNextMole();
    }, delay);
    moleTimers.push(t);
  }

  /* ── MOLE LOGIC ──────────────────────────────────────────── */
  function showMole() {
    const holes = root.querySelectorAll('.hole');
    // Find an empty hole
    const available = Array.from(holes).filter(h => !h.dataset.active);
    if (available.length === 0) return;

    const hole = available[Math.floor(Math.random() * available.length)];
    const isGolden = Math.random() < GOLDEN_CHANCE;
    const moleEl = hole.querySelector('.mole');

    hole.dataset.active = '1';
    moleEl.textContent = isGolden ? '🌟' : '🦔';
    moleEl.style.filter = isGolden ? 'drop-shadow(0 0 8px #ffd700)' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))';
    moleEl.style.bottom = '5%';

    const elapsed = TOTAL_TIME - timeLeft;
    const speedMult = Math.max(0.35, 1 - elapsed * 0.009);
    const stayDur = BASE_STAY[currentDiff] * speedMult * (0.7 + Math.random() * 0.6);

    const t = setTimeout(() => {
      if (!hole.dataset.active) return;
      // Missed
      hideMole(hole, false);
      if (running) {
        missed++;
        lives--;
        updateHUD();
        showMsg('-1 ❤️', '#e94560');
        if (lives <= 0) endGame();
      }
    }, stayDur);
    hole._hideTimer = t;
    moleTimers.push(t);
  }

  function hideMole(hole, whack) {
    clearTimeout(hole._hideTimer);
    delete hole.dataset.active;
    const moleEl = hole.querySelector('.mole');
    if (whack) {
      moleEl.style.bottom = '-110%';
      moleEl.style.transition = 'bottom 0.1s ease-in';
    } else {
      moleEl.style.bottom = '-110%';
      moleEl.style.transition = 'bottom 0.2s ease-in';
    }
    setTimeout(() => { moleEl.style.transition = 'bottom 0.15s ease-out'; }, 200);
  }

  function whackMole(hole, idx) {
    if (!running || !hole.dataset.active) return;
    const moleEl = hole.querySelector('.mole');
    const isGolden = moleEl.textContent === '🌟';

    const pts = isGolden ? 50 : 10;
    score += pts;
    whacked++;
    window.updateScore && window.updateScore(score);
    updateHUD();

    hideMole(hole, true);
    showMsg(isGolden ? `+${pts} ✨` : `+${pts}`, isGolden ? '#ffd166' : '#95d5b2');

    // Whack animation
    hole.style.transform = 'scale(0.88)';
    setTimeout(() => { hole.style.transform = ''; }, 90);
  }

  /* ── HUD ─────────────────────────────────────────────────── */
  function updateHUD() {
    scoreEl.textContent = `${score}점`;
    livesEl.textContent = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, 3 - lives));
  }

  let msgTimeout = null;
  function showMsg(text, color) {
    msgEl.style.opacity = '0';
    clearTimeout(msgTimeout);
    setTimeout(() => {
      msgEl.textContent = text;
      msgEl.style.color = color;
      msgEl.style.opacity = '1';
      msgEl.style.top = (grid.offsetTop - 30) + 'px';
      msgEl.style.left = W => '50%';
      msgEl.style.transform = 'translateX(-50%)';
      msgTimeout = setTimeout(() => { msgEl.style.opacity = '0'; }, 700);
    }, 50);
  }

  /* ── END ─────────────────────────────────────────────────── */
  function clearAllTimers() {
    moleTimers.forEach(clearTimeout);
    moleTimers = [];
    if (countdownTimer) clearInterval(countdownTimer);
    // Reset all moles
    root.querySelectorAll('.hole').forEach(h => {
      hideMole(h, false);
      delete h.dataset.active;
      clearTimeout(h._hideTimer);
    });
  }

  function endGame() {
    running = false;
    clearAllTimers();

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;
      background:rgba(0,0,0,0.8);display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:14px;z-index:10;
    `;

    const title = document.createElement('div');
    title.style.cssText = 'color:#ffd166;font-size:32px;font-weight:bold;';
    title.textContent = timeLeft <= 0 ? '시간 종료!' : '게임 오버!';

    const details = document.createElement('div');
    details.style.cssText = 'color:#a8d8c8;font-size:18px;text-align:center;line-height:1.7;';
    details.innerHTML = `최종 점수: <b style="color:#ffd166">${score}점</b><br>잡은 두더지: ${whacked}마리<br>놓친 두더지: ${missed}마리`;

    const btn = document.createElement('button');
    btn.textContent = '다시 시작';
    btn.style.cssText = `
      margin-top:10px;padding:12px 36px;background:#1b4332;color:#95d5b2;
      border:2px solid #52b788;border-radius:8px;font-size:17px;font-weight:bold;
      cursor:pointer;
    `;
    btn.addEventListener('click', () => {
      overlay.remove();
      window.startGame(currentDiff);
    });
    btn.addEventListener('touchend', e => {
      e.preventDefault();
      overlay.remove();
      window.startGame(currentDiff);
    });

    overlay.append(title, details, btn);
    root.appendChild(overlay);

    document.getElementById('game-root').dispatchEvent(new CustomEvent('gameOver', { detail: { score, cleared: timeLeft <= 0 }, bubbles: true }));
  }

  /* ── BOOT ────────────────────────────────────────────────── */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
