/* Gomoku (오목) - gomoku/game.js */
(function () {
  'use strict';

  const CONFIG = window.GAME_CONFIG || { gameId: 'gomoku', difficulties: [], hasLeaderboard: false, scoreType: 'high' };

  const SIZE = 15; // 15×15 intersections
  const PLAYER = 1, AI = 2;

  let root, canvas, ctx, difficulty, stage;
  let board, gameActive, currentTurn;
  let score, startTime;
  let hoverPos = null;
  let lastMove = null;

  let CELL, PADDING, W, H;

  function calcSize() {
    const avail = Math.min(root.clientWidth - 8, 520);
    PADDING = Math.floor(avail / (SIZE + 1));
    CELL = Math.floor((avail - PADDING * 2) / (SIZE - 1));
    W = PADDING * 2 + CELL * (SIZE - 1);
    H = W;
  }

  function makeBoard() { return Array.from({ length: SIZE }, () => Array(SIZE).fill(0)); }

  /* ── Win Detection ──────────────────────────────────── */
  function checkWin(b, player) {
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (b[r][c] !== player) continue;
        for (const [dr, dc] of dirs) {
          let len = 1;
          const cells = [[r,c]];
          while (true) {
            const nr = r + dr * len, nc = c + dc * len;
            if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE || b[nr][nc] !== player) break;
            cells.push([nr, nc]);
            len++;
          }
          if (len >= 5) return cells;
        }
      }
    }
    return null;
  }

  function isFull(b) { return b.every(row => row.every(c => c !== 0)); }

  /* ── AI: Threat-Space Search ─────────────────────────── */
  const SCORE_TABLE = {
    five: 100000,
    open4: 10000,
    broken4: 5000,
    open3: 1000,
    broken3: 300,
    open2: 100,
    broken2: 20,
  };

  function evalLine(b, r, c, dr, dc, player) {
    // Count consecutive + open ends
    let count = 1, open = 0;
    // Forward
    let i = 1;
    while (i <= 4) {
      const nr = r + dr*i, nc = c + dc*i;
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) break;
      if (b[nr][nc] === player) { count++; i++; }
      else { if (b[nr][nc] === 0) open++; break; }
    }
    // Backward
    i = 1;
    while (i <= 4) {
      const nr = r - dr*i, nc = c - dc*i;
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) break;
      if (b[nr][nc] === player) { count++; i++; }
      else { if (b[nr][nc] === 0) open++; break; }
    }
    if (count >= 5) return SCORE_TABLE.five;
    if (count === 4) return open >= 2 ? SCORE_TABLE.open4 : SCORE_TABLE.broken4;
    if (count === 3) return open >= 2 ? SCORE_TABLE.open3 : SCORE_TABLE.broken3;
    if (count === 2) return open >= 2 ? SCORE_TABLE.open2 : SCORE_TABLE.broken2;
    return 0;
  }

  function evalCell(b, r, c, player) {
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    let total = 0;
    for (const [dr, dc] of dirs) {
      total += evalLine(b, r, c, dr, dc, player);
    }
    return total;
  }

  function getCandidates(b) {
    const visited = new Set();
    const candidates = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (b[r][c] === 0) continue;
        // Add neighbors
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
            if (b[nr][nc] !== 0) continue;
            const key = nr * SIZE + nc;
            if (!visited.has(key)) { visited.add(key); candidates.push([nr, nc]); }
          }
        }
      }
    }
    if (candidates.length === 0) candidates.push([Math.floor(SIZE/2), Math.floor(SIZE/2)]);
    return candidates;
  }

  function getAIMove(b, diff) {
    // Easy: random candidate
    const candidates = getCandidates(b);

    if (diff === 'easy') {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }

    // Score each candidate
    let best = -Infinity, bestMove = candidates[0];
    for (const [r, c] of candidates) {
      // Win immediately
      b[r][c] = AI;
      if (checkWin(b, AI)) { b[r][c] = 0; return [r, c]; }
      b[r][c] = 0;

      // Block player win
      b[r][c] = PLAYER;
      if (checkWin(b, PLAYER)) { b[r][c] = 0; return [r, c]; }
      b[r][c] = 0;

      const aiScore = evalCell(b, r, c, AI);
      const playerScore = evalCell(b, r, c, PLAYER);
      const total = aiScore * 1.1 + playerScore;

      if (total > best) { best = total; bestMove = [r, c]; }
    }

    // Normal: also do 1-ply lookahead
    if (diff === 'normal') return bestMove;

    // Hard/Expert: 2-ply lookahead
    let best2 = -Infinity, bestMove2 = bestMove;
    const top = candidates.slice().sort((a, cand) => {
      const sa = evalCell(b, a[0], a[1], AI) + evalCell(b, a[0], a[1], PLAYER);
      const sc = evalCell(b, cand[0], cand[1], AI) + evalCell(b, cand[0], cand[1], PLAYER);
      return sc - sa;
    }).slice(0, diff === 'expert' ? 12 : 8);

    for (const [r, c] of top) {
      b[r][c] = AI;
      if (checkWin(b, AI)) { b[r][c] = 0; return [r, c]; }

      // Opponent best response
      const opp = getCandidates(b).slice(0, 6);
      let minScore = Infinity;
      for (const [or, oc] of opp) {
        b[or][oc] = PLAYER;
        const s = evalCell(b, r, c, AI) - evalCell(b, or, oc, PLAYER) * 1.2;
        if (s < minScore) minScore = s;
        b[or][oc] = 0;
      }
      b[r][c] = 0;

      const score = evalCell(b, r, c, AI) * 1.1 + evalCell(b, r, c, PLAYER) - minScore * 0.3;
      if (score > best2) { best2 = score; bestMove2 = [r, c]; }
    }

    return bestMove2;
  }

  /* ── Drawing ────────────────────────────────────────── */
  function draw(winCells) {
    ctx.clearRect(0, 0, W, H);

    // Board background
    ctx.fillStyle = '#dcb677';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = '#9a7b3c';
    ctx.lineWidth = 1;
    for (let i = 0; i < SIZE; i++) {
      const x = PADDING + i * CELL;
      const y = PADDING + i * CELL;
      ctx.beginPath(); ctx.moveTo(x, PADDING); ctx.lineTo(x, H - PADDING); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(PADDING, y); ctx.lineTo(W - PADDING, y); ctx.stroke();
    }

    // Star points (standard go board dots)
    const dots = [3, 7, 11];
    ctx.fillStyle = '#6b4a1a';
    for (const r of dots) {
      for (const c of dots) {
        ctx.beginPath();
        ctx.arc(PADDING + c * CELL, PADDING + r * CELL, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Center
    ctx.beginPath();
    ctx.arc(PADDING + 7 * CELL, PADDING + 7 * CELL, 4, 0, Math.PI * 2);
    ctx.fill();

    // Hover indicator
    if (hoverPos && gameActive && currentTurn === PLAYER) {
      const [hr, hc] = hoverPos;
      if (!board[hr][hc]) {
        ctx.fillStyle = 'rgba(30,30,30,0.25)';
        ctx.beginPath();
        ctx.arc(PADDING + hc * CELL, PADDING + hr * CELL, CELL * 0.44, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Stones
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!board[r][c]) continue;
        const x = PADDING + c * CELL, y = PADDING + r * CELL;
        const isWin = winCells && winCells.some(([wr, wc]) => wr === r && wc === c);
        const isLast = lastMove && lastMove[0] === r && lastMove[1] === c;
        const r2 = CELL * 0.46;

        const grad = ctx.createRadialGradient(x - r2*0.3, y - r2*0.3, r2*0.1, x, y, r2);
        if (board[r][c] === PLAYER) {
          grad.addColorStop(0, '#888'); grad.addColorStop(1, '#111');
        } else {
          grad.addColorStop(0, '#fff'); grad.addColorStop(1, '#ccc');
        }
        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(x, y, r2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (isWin) {
          ctx.strokeStyle = '#ff4500';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        if (isLast) {
          ctx.fillStyle = board[r][c] === PLAYER ? '#ff6' : '#c00';
          ctx.beginPath();
          ctx.arc(x, y, r2 * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function posFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    let cx, cy;
    if (e.touches) {
      cx = e.touches[0].clientX; cy = e.touches[0].clientY;
    } else {
      cx = e.clientX; cy = e.clientY;
    }
    const sx = (cx - rect.left) * (W / rect.width);
    const sy = (cy - rect.top) * (H / rect.height);
    const c = Math.round((sx - PADDING) / CELL);
    const r = Math.round((sy - PADDING) / CELL);
    if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) return [r, c];
    return null;
  }

  function updateStatus(msg, color) {
    const el = document.getElementById('gom-status');
    if (el) { el.textContent = msg; el.style.color = color || '#333'; }
  }

  /* ── Game Flow ──────────────────────────────────────── */
  function playerPlace(r, c) {
    if (!gameActive || currentTurn !== PLAYER || board[r][c]) return;
    board[r][c] = PLAYER;
    lastMove = [r, c];
    score += 10;
    if (typeof window.updateScore === 'function') window.updateScore(score);

    const win = checkWin(board, PLAYER);
    if (win) {
      draw(win);
      endGame(true);
      return;
    }
    if (isFull(board)) { draw(); endGame(null); return; }
    currentTurn = AI;
    draw();
    updateStatus('AI 생각 중…', '#6b7280');
    setTimeout(aiPlace, 350);
  }

  function aiPlace() {
    if (!gameActive) return;
    const [r, c] = getAIMove(board, difficulty);
    board[r][c] = AI;
    lastMove = [r, c];

    const win = checkWin(board, AI);
    if (win) {
      draw(win);
      endGame(false);
      return;
    }
    if (isFull(board)) { draw(); endGame(null); return; }
    currentTurn = PLAYER;
    draw();
    updateStatus('당신의 차례 (흑)', '#222');
  }

  function endGame(playerWon) {
    gameActive = false;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const timeBonus = Math.max(0, 300 - elapsed) * 2;

    let finalScore = score;
    let msg, color;
    if (playerWon === true) {
      finalScore += timeBonus + 500;
      msg = `승리! 🎉 +${500 + timeBonus}점`;
      color = '#222';
    } else if (playerWon === false) {
      msg = '패배…';
      color = '#dc2626';
    } else {
      finalScore += 100;
      msg = '무승부!';
      color = '#d97706';
    }
    if (typeof window.updateScore === 'function') window.updateScore(finalScore);
    updateStatus(msg, color);

    const evt = playerWon === true
      ? new CustomEvent('gameClear', { detail: { score: finalScore } })
      : new CustomEvent('gameOver', { detail: { score: finalScore, cleared: false } });
    document.dispatchEvent(evt);

    // Show replay button
    const btn = document.createElement('button');
    btn.textContent = '다시 하기';
    btn.style.cssText = 'display:block;margin:10px auto 0;padding:10px 28px;font-size:16px;font-weight:600;border:none;border-radius:8px;background:#2d5016;color:#fff;cursor:pointer;';
    btn.addEventListener('click', () => window.startGame(difficulty, stage));
    root.appendChild(btn);
  }

  /* ── Setup ──────────────────────────────────────────── */
  window.startGame = function (diffId, stageId) {
    difficulty = diffId || 'normal';
    stage = stageId || 1;
    board = makeBoard();
    gameActive = true;
    currentTurn = PLAYER;
    score = 0;
    startTime = Date.now();
    lastMove = null;
    hoverPos = null;

    root = document.getElementById('game-root');
    root.style.cssText = 'padding:8px;box-sizing:border-box;max-width:540px;margin:0 auto;font-family:sans-serif;';
    root.innerHTML = '';

    const status = document.createElement('div');
    status.id = 'gom-status';
    status.style.cssText = 'text-align:center;font-size:16px;font-weight:600;margin-bottom:8px;color:#222;';
    status.textContent = '당신의 차례 (흑)';
    root.appendChild(status);

    canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;margin:0 auto;border-radius:4px;cursor:crosshair;touch-action:none;';
    root.appendChild(canvas);
    ctx = canvas.getContext('2d');

    calcSize();
    canvas.width = W; canvas.height = H;

    canvas.addEventListener('mousemove', (e) => {
      const pos = posFromEvent(e);
      hoverPos = pos;
      if (gameActive && currentTurn === PLAYER) draw();
    });
    canvas.addEventListener('mouseleave', () => { hoverPos = null; draw(); });
    canvas.addEventListener('click', (e) => {
      const pos = posFromEvent(e);
      if (pos) playerPlace(pos[0], pos[1]);
    });
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.changedTouches[0];
      const sx = (touch.clientX - rect.left) * (W / rect.width);
      const sy = (touch.clientY - rect.top) * (H / rect.height);
      const c = Math.round((sx - PADDING) / CELL);
      const r = Math.round((sy - PADDING) / CELL);
      if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) playerPlace(r, c);
    });

    draw();
  };

  if (CONFIG.gameId === 'gomoku' && document.getElementById('game-root')) {
    window.startGame((CONFIG.difficulties && CONFIG.difficulties[0]) || 'normal', 1);
  }
})();
