/* Fifteen Puzzle - fifteen-puzzle/game.js */
(function () {
  'use strict';

  const CONFIG = window.GAME_CONFIG || { gameId: 'fifteen-puzzle', difficulties: [], hasLeaderboard: false, scoreType: 'high' };

  const DIFF_SETTINGS = {
    easy:   { size: 3, shuffleMoves: 50 },
    normal: { size: 4, shuffleMoves: 200 },
    hard:   { size: 4, shuffleMoves: 500 },
    expert: { size: 5, shuffleMoves: 300 },
  };

  let rootEl = null;
  let gridEl = null;
  let tiles = [];       // 1D array of tile values (0 = empty), length = size*size
  let size = 4;
  let emptyIdx = 0;
  let moves = 0;
  let seconds = 0;
  let timerInterval = null;
  let gameActive = false;
  let currentDiff = 'normal';
  let cellSize = 90;

  const styleId = 'fp-style';

  function injectStyles() {
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      #fp-wrapper {
        display: flex; flex-direction: column; align-items: center;
        font-family: Arial, sans-serif; padding: 12px; box-sizing: border-box; user-select: none; width: 100%;
      }
      #fp-header {
        display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; justify-content: center;
      }
      .fp-stat {
        background: #34495e; color: #fff; border-radius: 8px;
        padding: 6px 14px; font-weight: bold; text-align: center; min-width: 80px;
      }
      .fp-stat span { display: block; font-size: 10px; opacity: 0.8; }
      .fp-stat strong { font-size: 18px; }
      #fp-board {
        position: relative;
        background: #2c3e50;
        border-radius: 10px;
        padding: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      }
      .fp-tile {
        position: absolute;
        display: flex; align-items: center; justify-content: center;
        border-radius: 8px;
        font-weight: 900;
        cursor: pointer;
        transition: top 0.15s ease, left 0.15s ease;
        box-sizing: border-box;
        box-shadow: 0 3px 8px rgba(0,0,0,0.25);
      }
      .fp-tile:hover { filter: brightness(1.08); }
      .fp-tile.empty { background: transparent !important; box-shadow: none; cursor: default; }
      .fp-tile.correct {
        background: linear-gradient(135deg, #27ae60, #2ecc71) !important;
        color: #fff !important;
      }
      #fp-msg {
        margin-top: 10px; font-size: 17px; font-weight: bold; color: #2c3e50; min-height: 26px; text-align: center;
      }
      .fp-score-anim {
        animation: fpPop 0.25s ease;
      }
      @keyframes fpPop {
        0% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }

  function tileColor(val, total) {
    if (!val) return 'transparent';
    const hue = Math.round((val / total) * 270);
    return `hsl(${hue}, 70%, 52%)`;
  }

  function buildBoard() {
    if (!rootEl) return;
    rootEl.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.id = 'fp-wrapper';

    const header = document.createElement('div');
    header.id = 'fp-header';
    header.innerHTML = `
      <div class="fp-stat"><span>이동</span><strong id="fp-moves">0</strong></div>
      <div class="fp-stat"><span>시간</span><strong id="fp-time">0s</strong></div>
      <div class="fp-stat"><span>점수</span><strong id="fp-score">-</strong></div>
    `;

    const maxW = Math.min((rootEl.clientWidth || 480) - 40, 460);
    const gap = 6;
    const padding = 8;
    cellSize = Math.floor((maxW - padding * 2 - gap * (size - 1)) / size);

    const boardSize = cellSize * size + gap * (size - 1) + padding * 2;
    const board = document.createElement('div');
    board.id = 'fp-board';
    board.style.width = boardSize + 'px';
    board.style.height = boardSize + 'px';

    const msgEl = document.createElement('div');
    msgEl.id = 'fp-msg';

    wrapper.appendChild(header);
    wrapper.appendChild(board);
    wrapper.appendChild(msgEl);
    rootEl.appendChild(wrapper);

    gridEl = board;
    renderTiles();

    board.addEventListener('click', onBoardClick);
    board.addEventListener('touchend', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (el) el.click();
    }, { passive: false });
  }

  function getTilePos(idx) {
    const row = Math.floor(idx / size);
    const col = idx % size;
    const gap = 6;
    const padding = 8;
    return {
      top: padding + row * (cellSize + gap),
      left: padding + col * (cellSize + gap),
    };
  }

  function renderTiles() {
    if (!gridEl) return;
    gridEl.innerHTML = '';

    const total = size * size - 1;
    tiles.forEach((val, idx) => {
      const tileEl = document.createElement('div');
      tileEl.className = 'fp-tile' + (val === 0 ? ' empty' : '');
      tileEl.dataset.idx = idx;

      const pos = getTilePos(idx);
      tileEl.style.width = cellSize + 'px';
      tileEl.style.height = cellSize + 'px';
      tileEl.style.top = pos.top + 'px';
      tileEl.style.left = pos.left + 'px';
      tileEl.style.fontSize = cellSize > 70 ? '28px' : '20px';

      if (val !== 0) {
        tileEl.textContent = val;
        tileEl.style.background = tileColor(val, total);
        tileEl.style.color = '#fff';
        if (val === idx + 1 || (val === total && idx === total)) {
          tileEl.classList.add('correct');
        }
      }

      gridEl.appendChild(tileEl);
    });
  }

  function updateTilePositions() {
    if (!gridEl) return;
    const tileDivs = gridEl.querySelectorAll('.fp-tile');
    const total = size * size - 1;
    tiles.forEach((val, idx) => {
      const div = tileDivs[idx];
      if (!div) return;
      div.dataset.idx = idx;
      const pos = getTilePos(idx);
      div.style.top = pos.top + 'px';
      div.style.left = pos.left + 'px';

      if (val === 0) {
        div.className = 'fp-tile empty';
        div.textContent = '';
        div.style.background = 'transparent';
      } else {
        div.className = 'fp-tile';
        div.textContent = val;
        div.style.background = tileColor(val, total);
        div.style.color = '#fff';
        if (val === idx + 1 || (val === total && idx === total - 1)) {
          // correct spot check
        }
      }
    });
  }

  function onBoardClick(e) {
    if (!gameActive) return;
    const tileEl = e.target.closest('.fp-tile');
    if (!tileEl) return;
    const idx = parseInt(tileEl.dataset.idx, 10);
    if (isNaN(idx) || tiles[idx] === 0) return;
    tryMove(idx);
  }

  function tryMove(idx) {
    // Check if adjacent to empty
    const row = Math.floor(idx / size);
    const col = idx % size;
    const eRow = Math.floor(emptyIdx / size);
    const eCol = emptyIdx % size;

    const adjacent = (row === eRow && Math.abs(col - eCol) === 1) ||
                     (col === eCol && Math.abs(row - eRow) === 1);
    if (!adjacent) return;

    // Swap tile with empty
    tiles[emptyIdx] = tiles[idx];
    tiles[idx] = 0;

    // DOM swap - move tile element to empty position, move empty to tile position
    const tileDivs = Array.from(gridEl.querySelectorAll('.fp-tile'));
    const movingDiv = tileDivs[idx];
    const emptyDiv = tileDivs[emptyIdx];

    // Update data-idx
    movingDiv.dataset.idx = emptyIdx;
    emptyDiv.dataset.idx = idx;

    // Animate
    const newPos = getTilePos(emptyIdx);
    const emptyPos = getTilePos(idx);
    movingDiv.style.top = newPos.top + 'px';
    movingDiv.style.left = newPos.left + 'px';
    emptyDiv.style.top = emptyPos.top + 'px';
    emptyDiv.style.left = emptyPos.left + 'px';

    // Swap in DOM order (for future clicks)
    gridEl.insertBefore(movingDiv, emptyDiv);

    emptyIdx = idx;
    moves++;
    document.getElementById('fp-moves').textContent = moves;

    if (isSolved()) {
      gameActive = false;
      clearInterval(timerInterval);
      const sc = calcScore();
      document.getElementById('fp-score').textContent = sc;
      if (typeof window.updateScore === 'function') window.updateScore(sc);
      document.getElementById('fp-msg').textContent = `🎉 완성! 점수: ${sc}`;
      document.dispatchEvent(new CustomEvent('gameClear', { detail: { score: sc } }));
    }
  }

  function isSolved() {
    for (let i = 0; i < tiles.length - 1; i++) {
      if (tiles[i] !== i + 1) return false;
    }
    return tiles[tiles.length - 1] === 0;
  }

  function calcScore() {
    return Math.max(100, 10000 - moves * 5 - seconds * 2);
  }

  function createSolvedState() {
    const arr = [];
    for (let i = 1; i < size * size; i++) arr.push(i);
    arr.push(0);
    return arr;
  }

  function shuffleBoard(numMoves) {
    tiles = createSolvedState();
    emptyIdx = tiles.length - 1;

    let lastMove = -1;
    for (let i = 0; i < numMoves; i++) {
      const neighbors = getNeighbors(emptyIdx).filter(n => n !== lastMove);
      const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
      tiles[emptyIdx] = tiles[pick];
      tiles[pick] = 0;
      lastMove = emptyIdx;
      emptyIdx = pick;
    }
  }

  function getNeighbors(idx) {
    const row = Math.floor(idx / size);
    const col = idx % size;
    const result = [];
    if (row > 0) result.push(idx - size);
    if (row < size - 1) result.push(idx + size);
    if (col > 0) result.push(idx - 1);
    if (col < size - 1) result.push(idx + 1);
    return result;
  }

  function startTimer() {
    clearInterval(timerInterval);
    seconds = 0;
    timerInterval = setInterval(() => {
      seconds++;
      const el = document.getElementById('fp-time');
      if (el) el.textContent = seconds + 's';
    }, 1000);
  }

  window.startGame = function (diffId, stage) {
    currentDiff = diffId || 'normal';
    const settings = DIFF_SETTINGS[currentDiff] || DIFF_SETTINGS.normal;
    size = settings.size;

    rootEl = document.getElementById('game-root');
    if (!rootEl) return;

    clearInterval(timerInterval);
    moves = 0;
    gameActive = false;

    injectStyles();
    shuffleBoard(settings.shuffleMoves);
    buildBoard();
    startTimer();
    gameActive = true;
  };

  document.addEventListener('keydown', (e) => {
    if (!gameActive || !rootEl) return;
    const dir = { ArrowUp: 'down', ArrowDown: 'up', ArrowLeft: 'right', ArrowRight: 'left' }[e.key];
    if (!dir) return;
    e.preventDefault();
    const eRow = Math.floor(emptyIdx / size);
    const eCol = emptyIdx % size;
    let targetIdx = -1;
    if (dir === 'left'  && eCol > 0)         targetIdx = emptyIdx - 1;
    if (dir === 'right' && eCol < size - 1)  targetIdx = emptyIdx + 1;
    if (dir === 'up'    && eRow > 0)         targetIdx = emptyIdx - size;
    if (dir === 'down'  && eRow < size - 1)  targetIdx = emptyIdx + size;
    if (targetIdx !== -1) tryMove(targetIdx);
  });

})();
