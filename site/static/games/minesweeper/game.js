/* Minesweeper - minesweeper/game.js */
(function () {
  'use strict';

  const CONFIG = window.GAME_CONFIG || { gameId: 'minesweeper', difficulties: [], hasLeaderboard: false, scoreType: 'high' };

  const DIFF_SETTINGS = {
    easy:   { rows: 9,  cols: 9,  mines: 10 },
    normal: { rows: 16, cols: 16, mines: 40 },
    hard:   { rows: 16, cols: 16, mines: 50 },
    expert: { rows: 20, cols: 20, mines: 70 },
  };

  let root, difficulty, stage;
  let rows, cols, totalMines;
  let board; // { mine, revealed, flagged, count }[][]
  let gameActive, firstClick, timerInterval, startTime;
  let flagCount, revealedCount;
  let longPressTimer = null;

  /* ── Board Init ─────────────────────────────────────── */
  function makeBoard() {
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({ mine: false, revealed: false, flagged: false, count: 0 }))
    );
  }

  function placeMines(safeR, safeC) {
    const safe = new Set();
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        const nr = safeR + dr, nc = safeC + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols)
          safe.add(nr * cols + nc);
      }
    const all = [];
    for (let i = 0; i < rows * cols; i++) if (!safe.has(i)) all.push(i);
    // Fisher-Yates shuffle first `totalMines`
    for (let i = 0; i < totalMines; i++) {
      const j = i + Math.floor(Math.random() * (all.length - i));
      [all[i], all[j]] = [all[j], all[i]];
      board[Math.floor(all[i] / cols)][all[i] % cols].mine = true;
    }
    // Calculate counts
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c].mine) continue;
        let cnt = 0;
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r+dr, nc = c+dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) cnt++;
          }
        board[r][c].count = cnt;
      }
    }
  }

  /* ── BFS Reveal ─────────────────────────────────────── */
  function revealBFS(r, c) {
    const queue = [[r, c]];
    while (queue.length) {
      const [cr, cc] = queue.shift();
      if (cr < 0 || cr >= rows || cc < 0 || cc >= cols) continue;
      const cell = board[cr][cc];
      if (cell.revealed || cell.flagged) continue;
      cell.revealed = true;
      revealedCount++;
      if (cell.count === 0 && !cell.mine) {
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++)
            if (dr || dc) queue.push([cr+dr, cc+dc]);
      }
    }
  }

  /* ── Chord Click ─────────────────────────────────────── */
  function chordClick(r, c) {
    const cell = board[r][c];
    if (!cell.revealed || cell.count === 0) return;
    let adjFlags = 0;
    const neighbors = [];
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r+dr, nc = c+dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (board[nr][nc].flagged) adjFlags++;
        else if (!board[nr][nc].revealed) neighbors.push([nr, nc]);
      }
    if (adjFlags === cell.count) {
      for (const [nr, nc] of neighbors) {
        if (board[nr][nc].mine) { triggerMine(nr, nc); return; }
        revealBFS(nr, nc);
      }
      renderBoard();
      checkWin();
    }
  }

  /* ── Timer ──────────────────────────────────────────── */
  function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
      const el = document.getElementById('ms-timer');
      if (el) el.textContent = `⏱ ${Math.floor((Date.now() - startTime) / 1000)}s`;
    }, 500);
  }

  function stopTimer() { clearInterval(timerInterval); }

  /* ── Render ─────────────────────────────────────────── */
  const NUM_COLORS = ['','#2563eb','#16a34a','#dc2626','#7c3aed','#9f1239','#0891b2','#374151','#6b7280'];

  function renderBoard() {
    const grid = document.getElementById('ms-grid');
    if (!grid) return;

    const cellSize = Math.min(34, Math.floor((root.clientWidth - 24) / cols));
    grid.style.cssText = `display:grid;grid-template-columns:repeat(${cols},${cellSize}px);gap:2px;margin:0 auto;width:fit-content;`;

    grid.innerHTML = '';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = board[r][c];
        const el = document.createElement('div');
        el.style.cssText = `
          width:${cellSize}px;height:${cellSize}px;display:flex;align-items:center;justify-content:center;
          font-size:${cellSize >= 28 ? 14 : 11}px;font-weight:700;border-radius:3px;cursor:pointer;
          user-select:none;-webkit-user-select:none;
          ${cell.revealed
            ? `background:${cell.mine ? '#fca5a5' : '#e5e7eb'};box-shadow:inset 0 1px 2px rgba(0,0,0,0.1);`
            : cell.flagged
              ? 'background:#fde68a;box-shadow:0 1px 3px rgba(0,0,0,0.15);'
              : 'background:#6b7280;box-shadow:0 1px 3px rgba(0,0,0,0.2);'}
        `;

        if (cell.revealed) {
          if (cell.mine) el.textContent = '💥';
          else if (cell.count > 0) { el.textContent = cell.count; el.style.color = NUM_COLORS[cell.count]; }
        } else if (cell.flagged) {
          el.textContent = '🚩';
        } else {
          el.style.background = '#94a3b8';
        }

        // Click events
        el.addEventListener('click', (e) => { e.preventDefault(); handleReveal(r, c); });
        el.addEventListener('contextmenu', (e) => { e.preventDefault(); handleFlag(r, c); });

        // Touch: long press = flag
        el.addEventListener('touchstart', (e) => {
          longPressTimer = setTimeout(() => {
            longPressTimer = null;
            handleFlag(r, c);
          }, 500);
        });
        el.addEventListener('touchend', (e) => {
          if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; handleReveal(r, c); }
          e.preventDefault();
        });
        el.addEventListener('touchmove', () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } });

        grid.appendChild(el);
      }
    }

    // Update mine counter
    const mc = document.getElementById('ms-mines');
    if (mc) mc.textContent = `💣 ${totalMines - flagCount}`;
  }

  function updateInfoBar() {
    const mc = document.getElementById('ms-mines');
    if (mc) mc.textContent = `💣 ${totalMines - flagCount}`;
  }

  /* ── Handlers ───────────────────────────────────────── */
  function handleReveal(r, c) {
    if (!gameActive) return;
    const cell = board[r][c];
    if (cell.flagged) return;

    if (firstClick) {
      firstClick = false;
      placeMines(r, c);
      startTimer();
    }

    if (cell.revealed) {
      chordClick(r, c);
      return;
    }

    if (cell.mine) { triggerMine(r, c); return; }

    revealBFS(r, c);
    renderBoard();
    checkWin();
  }

  function handleFlag(r, c) {
    if (!gameActive) return;
    if (firstClick) return; // Can't flag before first click
    const cell = board[r][c];
    if (cell.revealed) return;
    if (cell.flagged) { cell.flagged = false; flagCount--; }
    else { cell.flagged = true; flagCount++; }
    renderBoard();
  }

  function triggerMine(r, c) {
    gameActive = false;
    stopTimer();
    board[r][c].revealed = true;
    // Reveal all mines
    for (let rr = 0; rr < rows; rr++)
      for (let cc = 0; cc < cols; cc++)
        if (board[rr][cc].mine) board[rr][cc].revealed = true;
    renderBoard();
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    setTimeout(() => {
      showResult(false, 0, elapsed);
    }, 600);
  }

  function checkWin() {
    const total = rows * cols;
    if (revealedCount === total - totalMines) {
      gameActive = false;
      stopTimer();
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const finalScore = Math.max(0, 10000 - elapsed * 10);
      if (typeof window.updateScore === 'function') window.updateScore(finalScore);
      setTimeout(() => { showResult(true, finalScore, elapsed); }, 300);
    }
  }

  function showResult(won, score, elapsed) {
    const old = document.getElementById('ms-result');
    if (old) old.remove();

    const div = document.createElement('div');
    div.id = 'ms-result';
    div.style.cssText = 'text-align:center;margin-top:14px;font-family:sans-serif;padding:12px;background:#f8fafc;border-radius:10px;';
    div.innerHTML = `
      <div style="font-size:24px;font-weight:700;color:${won ? '#16a34a' : '#dc2626'};margin-bottom:6px;">${won ? '클리어! 🎉' : '게임 오버 💥'}</div>
      ${won ? `<div style="font-size:15px;color:#555;margin-bottom:4px;">시간: ${elapsed}초 | 점수: ${score}</div>` : ''}
      <button id="ms-replay" style="margin-top:8px;padding:10px 26px;font-size:15px;font-weight:600;border:none;border-radius:8px;background:#475569;color:#fff;cursor:pointer;">다시 하기</button>
    `;
    root.appendChild(div);
    document.getElementById('ms-replay').addEventListener('click', () => window.startGame(difficulty, stage));

    if (won) {
      document.dispatchEvent(new CustomEvent('gameClear', { detail: { score } }));
    } else {
      document.dispatchEvent(new CustomEvent('gameOver', { detail: { score: 0, cleared: false } }));
    }
  }

  /* ── Setup ──────────────────────────────────────────── */
  window.startGame = function (diffId, stageId) {
    difficulty = diffId || 'normal';
    stage = stageId || 1;
    const s = DIFF_SETTINGS[difficulty] || DIFF_SETTINGS.normal;
    rows = s.rows; cols = s.cols; totalMines = s.mines;

    board = makeBoard();
    gameActive = true; firstClick = true;
    flagCount = 0; revealedCount = 0;

    root = document.getElementById('game-root');
    root.style.cssText = 'padding:12px;box-sizing:border-box;max-width:740px;margin:0 auto;font-family:sans-serif;';
    root.innerHTML = '';

    // Info bar
    const info = document.createElement('div');
    info.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-size:16px;font-weight:600;';
    info.innerHTML = `<span id="ms-mines">💣 ${totalMines}</span><span id="ms-timer">⏱ 0s</span>`;
    root.appendChild(info);

    // Instruction
    const hint = document.createElement('div');
    hint.style.cssText = 'text-align:center;font-size:12px;color:#9ca3af;margin-bottom:8px;';
    hint.textContent = '좌클릭: 열기 | 우클릭/길게누르기: 깃발';
    root.appendChild(hint);

    // Grid container
    const grid = document.createElement('div');
    grid.id = 'ms-grid';
    root.appendChild(grid);

    renderBoard();
  };

  if (CONFIG.gameId === 'minesweeper' && document.getElementById('game-root')) {
    window.startGame((CONFIG.difficulties && CONFIG.difficulties[0]) || 'easy', 1);
  }
})();
