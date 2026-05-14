/* Connect Four - connect-four/game.js */
(function () {
  'use strict';

  const CONFIG = window.GAME_CONFIG || { gameId: 'connect-four', difficulties: [], hasLeaderboard: false, scoreType: 'high' };

  const COLS = 7, ROWS = 6;
  const PLAYER = 1, AI = 2;
  const BEST_OF = 3;

  let root, canvas, ctx, difficulty, stage;
  let board, gameActive, currentTurn;
  let playerWins, aiWins, roundsPlayed, totalScore;
  let animating, dropAnim;
  let hoverCol = -1;

  // Responsive sizing
  let CELL, RADIUS, OFFSET_X, OFFSET_Y, W, H;

  function calcSize() {
    const avail = Math.min(root.clientWidth - 16, 480);
    CELL = Math.floor(avail / COLS);
    RADIUS = Math.floor(CELL * 0.42);
    W = CELL * COLS;
    H = CELL * (ROWS + 1); // extra row at top
    OFFSET_X = 0;
    OFFSET_Y = CELL; // top row reserved for drop indicator
  }

  /* ── Board Helpers ──────────────────────────────────── */
  function makeBoard() { return Array.from({ length: ROWS }, () => Array(COLS).fill(0)); }

  function dropPiece(b, col, player) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!b[r][col]) { b[r][col] = player; return r; }
    }
    return -1;
  }

  function colFull(b, col) { return b[0][col] !== 0; }

  function checkWin(b, player) {
    // Horizontal
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c <= COLS - 4; c++)
        if ([0,1,2,3].every(i => b[r][c+i] === player))
          return [[r,c],[r,c+1],[r,c+2],[r,c+3]];
    // Vertical
    for (let r = 0; r <= ROWS - 4; r++)
      for (let c = 0; c < COLS; c++)
        if ([0,1,2,3].every(i => b[r+i][c] === player))
          return [[r,c],[r+1,c],[r+2,c],[r+3,c]];
    // Diagonal \
    for (let r = 0; r <= ROWS - 4; r++)
      for (let c = 0; c <= COLS - 4; c++)
        if ([0,1,2,3].every(i => b[r+i][c+i] === player))
          return [[r,c],[r+1,c+1],[r+2,c+2],[r+3,c+3]];
    // Diagonal /
    for (let r = 3; r < ROWS; r++)
      for (let c = 0; c <= COLS - 4; c++)
        if ([0,1,2,3].every(i => b[r-i][c+i] === player))
          return [[r,c],[r-1,c+1],[r-2,c+2],[r-3,c+3]];
    return null;
  }

  function isBoardFull(b) { return b[0].every(c => c !== 0); }

  /* ── AI (Minimax + Alpha-Beta) ──────────────────────── */
  function scoreWindow(window4, p) {
    const opp = p === AI ? PLAYER : AI;
    const pc = window4.filter(x => x === p).length;
    const ec = window4.filter(x => x === 0).length;
    const oc = window4.filter(x => x === opp).length;
    if (pc === 4) return 100;
    if (pc === 3 && ec === 1) return 5;
    if (pc === 2 && ec === 2) return 2;
    if (oc === 3 && ec === 1) return -4;
    return 0;
  }

  function scoreBoard(b, p) {
    let score = 0;
    // Center column preference
    const centerCol = b.map(r => r[Math.floor(COLS/2)]);
    score += centerCol.filter(c => c === p).length * 3;

    // Horizontal
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c <= COLS - 4; c++)
        score += scoreWindow([b[r][c],b[r][c+1],b[r][c+2],b[r][c+3]], p);
    // Vertical
    for (let c = 0; c < COLS; c++)
      for (let r = 0; r <= ROWS - 4; r++)
        score += scoreWindow([b[r][c],b[r+1][c],b[r+2][c],b[r+3][c]], p);
    // Diag \
    for (let r = 0; r <= ROWS - 4; r++)
      for (let c = 0; c <= COLS - 4; c++)
        score += scoreWindow([b[r][c],b[r+1][c+1],b[r+2][c+2],b[r+3][c+3]], p);
    // Diag /
    for (let r = 3; r < ROWS; r++)
      for (let c = 0; c <= COLS - 4; c++)
        score += scoreWindow([b[r][c],b[r-1][c+1],b[r-2][c+2],b[r-3][c+3]], p);

    return score;
  }

  function copyBoard(b) { return b.map(r => [...r]); }

  function getValidCols(b) { return Array.from({ length: COLS }, (_, i) => i).filter(c => !colFull(b, c)); }

  function minimax(b, depth, alpha, beta, isMax) {
    const winP = checkWin(b, PLAYER);
    const winA = checkWin(b, AI);
    if (winA) return { score: 1000000 };
    if (winP) return { score: -1000000 };
    if (isBoardFull(b) || depth === 0) return { score: scoreBoard(b, AI) };

    const cols = getValidCols(b);
    if (isMax) {
      let best = { score: -Infinity, col: cols[0] };
      for (const c of cols) {
        const nb = copyBoard(b);
        dropPiece(nb, c, AI);
        const val = minimax(nb, depth - 1, alpha, beta, false).score;
        if (val > best.score) { best = { score: val, col: c }; }
        alpha = Math.max(alpha, val);
        if (alpha >= beta) break;
      }
      return best;
    } else {
      let best = { score: Infinity, col: cols[0] };
      for (const c of cols) {
        const nb = copyBoard(b);
        dropPiece(nb, c, PLAYER);
        const val = minimax(nb, depth - 1, alpha, beta, true).score;
        if (val < best.score) { best = { score: val, col: c }; }
        beta = Math.min(beta, val);
        if (alpha >= beta) break;
      }
      return best;
    }
  }

  function getAICol() {
    const depthMap = { easy: 1, normal: 3, hard: 4, expert: 5 };
    const depth = depthMap[difficulty] || 3;
    const valid = getValidCols(board);
    if (difficulty === 'easy') return valid[Math.floor(Math.random() * valid.length)];
    return minimax(board, depth, -Infinity, Infinity, true).col;
  }

  /* ── Drawing ────────────────────────────────────────── */
  function drawBoard(winLine) {
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#1a3a6e';
    ctx.beginPath();
    roundRect(ctx, 0, CELL, W, H - CELL, 12);
    ctx.fill();

    // Drop indicator row
    if (hoverCol >= 0 && gameActive && currentTurn === PLAYER && !animating) {
      ctx.fillStyle = 'rgba(239,68,68,0.85)';
      ctx.beginPath();
      ctx.arc(OFFSET_X + hoverCol * CELL + CELL/2, CELL/2, RADIUS, 0, Math.PI*2);
      ctx.fill();
    }

    // Cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cx = OFFSET_X + c * CELL + CELL/2;
        const cy = OFFSET_Y + r * CELL + CELL/2;
        const val = board[r][c];

        // Hole
        ctx.fillStyle = '#0f1e3a';
        ctx.beginPath();
        ctx.arc(cx, cy, RADIUS, 0, Math.PI*2);
        ctx.fill();

        if (val) {
          const isWin = winLine && winLine.some(([wr,wc]) => wr===r && wc===c);
          const grad = ctx.createRadialGradient(cx - RADIUS*0.3, cy - RADIUS*0.3, RADIUS*0.1, cx, cy, RADIUS);
          if (val === PLAYER) {
            grad.addColorStop(0, isWin ? '#ff9999' : '#ff6b6b');
            grad.addColorStop(1, isWin ? '#ff0000' : '#c0392b');
          } else {
            grad.addColorStop(0, isWin ? '#ffff88' : '#f9ca24');
            grad.addColorStop(1, isWin ? '#ffcc00' : '#e67e22');
          }
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, RADIUS, 0, Math.PI*2);
          ctx.fill();
          if (isWin) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        }
      }
    }

    // Animation drop
    if (animating && dropAnim) {
      const { col, player, targetRow, progress } = dropAnim;
      const cx = OFFSET_X + col * CELL + CELL/2;
      const targetY = OFFSET_Y + targetRow * CELL + CELL/2;
      const startY = CELL/2;
      const cy = startY + (targetY - startY) * progress;

      const grad = ctx.createRadialGradient(cx - RADIUS*0.3, cy - RADIUS*0.3, RADIUS*0.1, cx, cy, RADIUS);
      if (player === PLAYER) {
        grad.addColorStop(0, '#ff6b6b');
        grad.addColorStop(1, '#c0392b');
      } else {
        grad.addColorStop(0, '#f9ca24');
        grad.addColorStop(1, '#e67e22');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, RADIUS, 0, Math.PI*2);
      ctx.fill();
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function updateStatus(msg, color) {
    const el = document.getElementById('c4-status');
    if (el) { el.textContent = msg; el.style.color = color || '#333'; }
  }

  /* ── Game Flow ──────────────────────────────────────── */
  function animateDrop(col, player, targetRow, onDone) {
    animating = true;
    dropAnim = { col, player, targetRow, progress: 0 };
    const start = performance.now();
    const dur = 320;

    function frame(now) {
      let t = (now - start) / dur;
      if (t >= 1) { t = 1; animating = false; dropAnim = null; drawBoard(); onDone(); return; }
      // Ease: simulate gravity (accelerate then slight bounce)
      const eased = 1 - Math.pow(1 - t, 2);
      dropAnim.progress = eased;
      drawBoard();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function playerDrop(col) {
    if (!gameActive || animating || currentTurn !== PLAYER) return;
    if (colFull(board, col)) return;

    const row = dropPiece(board, col, PLAYER);
    animateDrop(col, PLAYER, row, () => {
      const win = checkWin(board, PLAYER);
      if (win) { drawBoard(win); endRound(PLAYER); return; }
      if (isBoardFull(board)) { endRound(0); return; }
      currentTurn = AI;
      updateStatus('AI 생각 중…', '#b45309');
      setTimeout(aiTurn, 500);
    });
  }

  function aiTurn() {
    if (!gameActive) return;
    const col = getAICol();
    const row = dropPiece(board, col, AI);
    animateDrop(col, AI, row, () => {
      const win = checkWin(board, AI);
      if (win) { drawBoard(win); endRound(AI); return; }
      if (isBoardFull(board)) { endRound(0); return; }
      currentTurn = PLAYER;
      updateStatus('당신의 차례 (빨강)', '#dc2626');
    });
  }

  function endRound(winner) {
    gameActive = false;
    roundsPlayed++;

    let msg, color;
    if (winner === PLAYER) {
      playerWins++;
      totalScore += 200;
      msg = '승리! 🎉 +200점';
      color = '#dc2626';
    } else if (winner === AI) {
      aiWins++;
      msg = '패배…';
      color = '#d97706';
    } else {
      msg = '무승부!';
      color = '#6b7280';
    }
    updateStatus(msg, color);
    if (typeof window.updateScore === 'function') window.updateScore(totalScore);
    updateScoreBar();

    setTimeout(() => {
      if (playerWins >= Math.ceil(BEST_OF / 2) || aiWins >= Math.ceil(BEST_OF / 2) || roundsPlayed >= BEST_OF) {
        endGame();
      } else {
        showNextButton();
      }
    }, 1000);
  }

  function showNextButton() {
    const btn = document.createElement('button');
    btn.textContent = '다음 라운드';
    btn.style.cssText = 'display:block;margin:12px auto 0;padding:10px 28px;font-size:16px;font-weight:600;border:none;border-radius:8px;background:#1a3a6e;color:#fff;cursor:pointer;';
    let triggered = false;
    function triggerNext(e) {
      if (triggered) return;
      triggered = true;
      e.preventDefault();
      btn.remove();
      startRound();
    }
    btn.addEventListener('touchend', triggerNext);
    btn.addEventListener('click', triggerNext);
    root.appendChild(btn);
  }

  function endGame() {
    const cleared = playerWins > aiWins;
    const evt = cleared
      ? new CustomEvent('gameClear', { detail: { score: totalScore } })
      : new CustomEvent('gameOver', { detail: { score: totalScore, cleared: false } });
    document.dispatchEvent(evt);

    const div = document.createElement('div');
    div.style.cssText = 'text-align:center;margin-top:14px;font-family:sans-serif;';
    div.innerHTML = `
      <div style="font-size:22px;font-weight:700;color:${cleared ? '#dc2626' : '#d97706'};">${cleared ? '게임 클리어! 🏆' : '게임 오버'}</div>
      <div style="font-size:15px;color:#555;margin:4px 0;">최종 점수: ${totalScore}</div>
      <button id="c4-replay" style="margin-top:10px;padding:8px 22px;font-size:15px;border:none;border-radius:8px;background:#1a3a6e;color:#fff;cursor:pointer;">다시 하기</button>
    `;
    root.appendChild(div);
    document.getElementById('c4-replay').addEventListener('click', () => window.startGame(difficulty, stage));
  }

  function updateScoreBar() {
    const el = document.getElementById('c4-scorebar');
    if (el) el.innerHTML = `<span>라운드 ${roundsPlayed}/${BEST_OF}</span><span style="color:#dc2626">🔴 ${playerWins}</span><span>:</span><span style="color:#d97706">🟡 ${aiWins}</span><span style="color:#5a67d8;font-weight:700">점수 ${totalScore}</span>`;
  }

  function startRound() {
    board = makeBoard();
    currentTurn = PLAYER;
    gameActive = true;
    animating = false;
    dropAnim = null;
    drawBoard();
    updateStatus('당신의 차례 (빨강)', '#dc2626');
    updateScoreBar();
  }

  /* ── Setup ──────────────────────────────────────────── */
  window.startGame = function (diffId, stageId) {
    difficulty = diffId || 'normal';
    stage = stageId || 1;
    playerWins = 0; aiWins = 0; roundsPlayed = 0; totalScore = 0;

    root = document.getElementById('game-root');
    root.style.cssText = 'padding:12px;box-sizing:border-box;max-width:500px;margin:0 auto;font-family:sans-serif;';
    root.innerHTML = '';

    // Score bar
    const sb = document.createElement('div');
    sb.id = 'c4-scorebar';
    sb.style.cssText = 'display:flex;justify-content:space-around;align-items:center;margin-bottom:8px;font-size:15px;font-weight:600;';
    root.appendChild(sb);

    // Status
    const st = document.createElement('div');
    st.id = 'c4-status';
    st.style.cssText = 'text-align:center;font-size:16px;font-weight:600;margin-bottom:8px;min-height:24px;';
    root.appendChild(st);

    // Canvas
    canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;margin:0 auto;border-radius:12px;cursor:pointer;touch-action:none;';
    root.appendChild(canvas);
    ctx = canvas.getContext('2d');

    calcSize();
    canvas.width = W;
    canvas.height = H;

    // Events
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (W / rect.width);
      hoverCol = Math.floor(x / CELL);
      if (!animating && gameActive && currentTurn === PLAYER) drawBoard();
    });
    canvas.addEventListener('mouseleave', () => { hoverCol = -1; if (gameActive) drawBoard(); });
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (W / rect.width);
      const col = Math.floor(x / CELL);
      if (col >= 0 && col < COLS) playerDrop(col);
    });
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.changedTouches[0];
      const x = (touch.clientX - rect.left) * (W / rect.width);
      const col = Math.floor(x / CELL);
      if (col >= 0 && col < COLS) playerDrop(col);
    });

    startRound();
  };

  if (CONFIG.gameId === 'connect-four' && document.getElementById('game-root')) {
    window.startGame((CONFIG.difficulties && CONFIG.difficulties[0]) || 'normal', 1);
  }
})();
