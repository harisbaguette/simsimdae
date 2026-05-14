/* Tic-Tac-Toe - tic-tac-toe/game.js */
(function () {
  'use strict';

  const CONFIG = window.GAME_CONFIG || { gameId: 'tic-tac-toe', difficulties: [], hasLeaderboard: false, scoreType: 'high' };

  let root, difficulty, stage;
  let board, currentPlayer, gameActive;
  let wins, losses, draws, roundsPlayed;
  let totalScore;
  const MAX_ROUNDS = 5;

  /* ── Minimax ─────────────────────────────────────────── */
  function checkWinner(b) {
    const lines = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];
    for (const [a,b2,c] of lines) {
      if (b[a] && b[a] === b[b2] && b[a] === b[c]) return { winner: b[a], line: [a,b2,c] };
    }
    if (b.every(c => c)) return { winner: 'draw', line: [] };
    return null;
  }

  function minimax(b, isMax, depth, maxDepth, alpha, beta) {
    const res = checkWinner(b);
    if (res) {
      if (res.winner === 'O') return 10 - depth;
      if (res.winner === 'X') return depth - 10;
      return 0;
    }
    if (maxDepth !== null && depth >= maxDepth) return 0;

    if (isMax) {
      let best = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (!b[i]) {
          b[i] = 'O';
          best = Math.max(best, minimax(b, false, depth + 1, maxDepth, alpha, beta));
          b[i] = null;
          alpha = Math.max(alpha, best);
          if (beta <= alpha) break;
        }
      }
      return best;
    } else {
      let best = Infinity;
      for (let i = 0; i < 9; i++) {
        if (!b[i]) {
          b[i] = 'X';
          best = Math.min(best, minimax(b, true, depth + 1, maxDepth, alpha, beta));
          b[i] = null;
          beta = Math.min(beta, best);
          if (beta <= alpha) break;
        }
      }
      return best;
    }
  }

  function getAIMove(b, diff) {
    const empty = b.map((v, i) => v ? null : i).filter(i => i !== null);
    if (diff === 'easy') return empty[Math.floor(Math.random() * empty.length)];

    const maxDepth = diff === 'normal' ? 2 : null;
    let bestVal = -Infinity, bestMove = empty[0];
    for (const i of empty) {
      b[i] = 'O';
      const val = minimax(b, false, 0, maxDepth, -Infinity, Infinity);
      b[i] = null;
      if (val > bestVal) { bestVal = val; bestMove = i; }
    }
    return bestMove;
  }

  function getBestMove(b) {
    const empty = b.map((v, i) => v ? null : i).filter(i => i !== null);
    let bestVal = -Infinity, bestMove = empty[0];
    for (const i of empty) {
      b[i] = 'O';
      const val = minimax(b, false, 0, null, -Infinity, Infinity);
      b[i] = null;
      if (val > bestVal) { bestVal = val; bestMove = i; }
    }
    return bestMove;
  }

  /* ── Render ───────────────────────────────────────────── */
  function render() {
    root.innerHTML = '';

    // Score bar
    const scoreBar = document.createElement('div');
    scoreBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;font-family:sans-serif;';
    scoreBar.innerHTML = `
      <span style="font-size:14px;color:#555;">라운드 ${roundsPlayed + 1}/${MAX_ROUNDS}</span>
      <span style="font-size:14px;color:#333;font-weight:600;">승 ${wins} · 무 ${draws} · 패 ${losses}</span>
      <span style="font-size:14px;color:#5a67d8;font-weight:700;">점수: ${totalScore}</span>
    `;
    root.appendChild(scoreBar);

    // Status
    const status = document.createElement('div');
    status.id = 'ttt-status';
    status.style.cssText = 'text-align:center;font-family:sans-serif;font-size:17px;font-weight:600;color:#333;margin-bottom:14px;min-height:26px;';
    if (gameActive) {
      status.textContent = currentPlayer === 'X' ? '당신의 차례 (X)' : 'AI 생각 중…';
    }
    root.appendChild(status);

    // Hint banner (expert only)
    if (difficulty === 'expert' && gameActive && currentPlayer === 'X') {
      const hint = document.createElement('div');
      hint.style.cssText = 'text-align:center;font-size:13px;color:#718096;margin-bottom:10px;';
      const hm = getBestMove([...board]);
      hint.textContent = `힌트: ${Math.floor(hm/3)+1}행 ${(hm%3)+1}열이 최선입니다`;
      root.appendChild(hint);
    }

    // Grid
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:300px;margin:0 auto;';

    board.forEach((cell, i) => {
      const btn = document.createElement('button');
      btn.style.cssText = `
        width:100%;aspect-ratio:1;font-size:52px;font-weight:700;border:none;border-radius:12px;
        cursor:${cell || !gameActive || currentPlayer !== 'X' ? 'default' : 'pointer'};
        background:${cell === 'X' ? '#ebf4ff' : cell === 'O' ? '#fff5f5' : '#f7f8fa'};
        color:${cell === 'X' ? '#3b82f6' : '#ef4444'};
        box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        transition: transform 0.1s, box-shadow 0.1s;
      `;
      btn.textContent = cell || '';
      if (!cell && gameActive && currentPlayer === 'X') {
        btn.addEventListener('click', () => handleClick(i));
        btn.addEventListener('touchend', (e) => { e.preventDefault(); handleClick(i); });
        btn.onmouseenter = () => { btn.style.transform = 'scale(1.05)'; btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; };
        btn.onmouseleave = () => { btn.style.transform = ''; btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)'; };
      }
      grid.appendChild(btn);
    });
    root.appendChild(grid);

    // Result overlay (shown after game ends via nextRoundButton)
  }

  function highlightWin(line) {
    const cells = root.querySelector('div:nth-child(3)') || root.querySelectorAll('button');
    // Re-render with highlights
    const buttons = root.querySelectorAll('button');
    line.forEach(i => {
      if (buttons[i]) {
        buttons[i].style.background = '#fef08a';
        buttons[i].style.transform = 'scale(1.08)';
      }
    });
  }

  function showResult(msg, color, autoNext) {
    const old = document.getElementById('ttt-result');
    if (old) old.remove();

    const div = document.createElement('div');
    div.id = 'ttt-result';
    div.style.cssText = `text-align:center;margin-top:18px;font-family:sans-serif;`;
    div.innerHTML = `
      <div style="font-size:22px;font-weight:700;color:${color};margin-bottom:12px;">${msg}</div>
      <button id="ttt-next" style="padding:10px 28px;font-size:16px;font-weight:600;border:none;border-radius:8px;background:#5a67d8;color:#fff;cursor:pointer;box-shadow:0 2px 8px rgba(90,103,216,0.3);">
        ${roundsPlayed >= MAX_ROUNDS ? '결과 보기' : '다음 라운드'}
      </button>
    `;
    root.appendChild(div);
    document.getElementById('ttt-next').addEventListener('click', nextRound);
    document.getElementById('ttt-next').addEventListener('touchend', (e) => { e.preventDefault(); nextRound(); });
  }

  /* ── Game Logic ───────────────────────────────────────── */
  function handleClick(i) {
    if (!gameActive || board[i] || currentPlayer !== 'X') return;
    board[i] = 'X';
    render();

    const res = checkWinner(board);
    if (res) {
      endRound(res);
      return;
    }
    currentPlayer = 'O';
    render();
    setTimeout(aiMove, 400);
  }

  function aiMove() {
    if (!gameActive) return;
    const move = getAIMove([...board], difficulty);
    board[move] = 'O';
    render();

    const res = checkWinner(board);
    if (res) {
      endRound(res);
      return;
    }
    currentPlayer = 'X';
    render();
  }

  function endRound(res) {
    gameActive = false;
    roundsPlayed++;

    let msg, color;
    if (res.winner === 'X') {
      wins++;
      totalScore += 100;
      msg = '승리! 🎉 +100점';
      color = '#3b82f6';
    } else if (res.winner === 'O') {
      losses++;
      totalScore = Math.max(0, totalScore - 50);
      msg = '패배… -50점';
      color = '#ef4444';
    } else {
      draws++;
      msg = '무승부!';
      color = '#f59e0b';
    }

    if (typeof window.updateScore === 'function') window.updateScore(totalScore);
    render();
    if (res.line && res.line.length) highlightWin(res.line);
    showResult(msg, color, true);
  }

  function nextRound() {
    if (roundsPlayed >= MAX_ROUNDS) {
      endGame();
      return;
    }
    startRound();
  }

  function startRound() {
    board = Array(9).fill(null);
    currentPlayer = 'X';
    gameActive = true;
    render();
  }

  function endGame() {
    root.innerHTML = '';
    const div = document.createElement('div');
    div.style.cssText = 'text-align:center;font-family:sans-serif;padding:24px;';
    const cleared = wins > losses;
    div.innerHTML = `
      <div style="font-size:26px;font-weight:700;color:${cleared ? '#3b82f6' : '#ef4444'};margin-bottom:10px;">
        ${cleared ? '게임 클리어! 🏆' : '게임 오버'}
      </div>
      <div style="font-size:16px;color:#555;margin-bottom:6px;">승 ${wins} / 무 ${draws} / 패 ${losses}</div>
      <div style="font-size:22px;font-weight:700;color:#5a67d8;margin-bottom:18px;">최종 점수: ${totalScore}</div>
      <button id="ttt-replay" style="padding:10px 28px;font-size:16px;font-weight:600;border:none;border-radius:8px;background:#5a67d8;color:#fff;cursor:pointer;">다시 하기</button>
    `;
    root.appendChild(div);
    document.getElementById('ttt-replay').addEventListener('click', () => window.startGame(difficulty, stage));

    const evt = cleared
      ? new CustomEvent('gameClear', { detail: { score: totalScore } })
      : new CustomEvent('gameOver', { detail: { score: totalScore, cleared: false } });
    document.dispatchEvent(evt);
  }

  /* ── Public API ───────────────────────────────────────── */
  window.startGame = function (diffId, stageId) {
    difficulty = diffId || 'normal';
    stage = stageId || 1;
    wins = 0; losses = 0; draws = 0; roundsPlayed = 0; totalScore = 0;

    root = document.getElementById('game-root');
    root.style.cssText = 'padding:16px;box-sizing:border-box;max-width:360px;margin:0 auto;';

    startRound();
  };

  // Auto-init if GAME_CONFIG present
  if (CONFIG.gameId === 'tic-tac-toe' && document.getElementById('game-root')) {
    const diff = (CONFIG.difficulties && CONFIG.difficulties[0]) || 'normal';
    window.startGame(diff, 1);
  }
})();
