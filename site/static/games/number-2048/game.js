/* 2048 Game - number-2048/game.js */
(function () {
  'use strict';

  const CONFIG = window.GAME_CONFIG || { gameId: 'number-2048', difficulties: [], hasLeaderboard: false, scoreType: 'high' };

  // Difficulty settings: { size, target }
  const DIFF_SETTINGS = {
    easy:   { size: 4, target: 1024 },
    normal: { size: 4, target: 2048 },
    hard:   { size: 5, target: 4096 },
    expert: { size: 6, target: 8192 },
  };

  // Tile colors by power of 2 index
  const TILE_COLORS = [
    '#cdc1b4', // empty
    '#eee4da', // 2
    '#ede0c8', // 4
    '#f2b179', // 8
    '#f59563', // 16
    '#f67c5f', // 32
    '#f65e3b', // 64
    '#edcf72', // 128
    '#edcc61', // 256
    '#edc850', // 512
    '#edc53f', // 1024
    '#edc22e', // 2048
    '#3c3a32', // 4096+
  ];
  const TILE_TEXT_COLORS = [
    '#776e65',
    '#776e65',
    '#776e65',
    '#f9f6f2',
    '#f9f6f2',
    '#f9f6f2',
    '#f9f6f2',
    '#f9f6f2',
    '#f9f6f2',
    '#f9f6f2',
    '#f9f6f2',
    '#f9f6f2',
    '#f9f6f2',
  ];

  function getTileColor(value) {
    if (!value) return TILE_COLORS[0];
    const idx = Math.log2(value);
    return TILE_COLORS[Math.min(idx, TILE_COLORS.length - 1)] || '#3c3a32';
  }
  function getTileTextColor(value) {
    if (!value) return TILE_TEXT_COLORS[0];
    const idx = Math.log2(value);
    return TILE_TEXT_COLORS[Math.min(idx, TILE_TEXT_COLORS.length - 1)] || '#f9f6f2';
  }
  function getFontSize(value, size) {
    const str = String(value || '');
    const base = size === 4 ? 36 : size === 5 ? 28 : 22;
    if (str.length >= 5) return Math.floor(base * 0.55);
    if (str.length === 4) return Math.floor(base * 0.7);
    if (str.length === 3) return Math.floor(base * 0.85);
    return base;
  }

  let state = null; // current game state
  let rootEl = null;
  let gridEl = null;
  let scoreEl = null;
  let movesEl = null;
  let undoBtn = null;
  let isAnimating = false;
  let currentDiff = 'normal';
  let currentStage = 1;
  let savedForUndo = null;

  function createState(size) {
    const grid = Array.from({ length: size }, () => Array(size).fill(0));
    return { grid, score: 0, size, won: false, over: false };
  }

  function cloneState(s) {
    return {
      grid: s.grid.map(row => row.slice()),
      score: s.score,
      size: s.size,
      won: s.won,
      over: s.over,
    };
  }

  function spawnTile(s) {
    const empty = [];
    for (let r = 0; r < s.size; r++)
      for (let c = 0; c < s.size; c++)
        if (!s.grid[r][c]) empty.push([r, c]);
    if (!empty.length) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    s.grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  function slideRow(row) {
    // Remove zeros
    let arr = row.filter(x => x);
    let merged = [];
    let score = 0;
    let i = 0;
    while (i < arr.length) {
      if (i + 1 < arr.length && arr[i] === arr[i + 1]) {
        merged.push(arr[i] * 2);
        score += arr[i] * 2;
        i += 2;
      } else {
        merged.push(arr[i]);
        i++;
      }
    }
    while (merged.length < row.length) merged.push(0);
    return { row: merged, score };
  }

  function moveGrid(s, dir) {
    const size = s.size;
    let moved = false;
    let gained = 0;

    function processRow(row) {
      const { row: newRow, score } = slideRow(row);
      gained += score;
      if (newRow.some((v, i) => v !== row[i])) moved = true;
      return newRow;
    }

    if (dir === 'left') {
      for (let r = 0; r < size; r++) {
        s.grid[r] = processRow(s.grid[r]);
      }
    } else if (dir === 'right') {
      for (let r = 0; r < size; r++) {
        s.grid[r] = processRow(s.grid[r].slice().reverse()).reverse();
      }
    } else if (dir === 'up') {
      for (let c = 0; c < size; c++) {
        const col = s.grid.map(row => row[c]);
        const newCol = processRow(col);
        for (let r = 0; r < size; r++) s.grid[r][c] = newCol[r];
      }
    } else if (dir === 'down') {
      for (let c = 0; c < size; c++) {
        const col = s.grid.map(row => row[c]).reverse();
        const newCol = processRow(col).reverse();
        for (let r = 0; r < size; r++) s.grid[r][c] = newCol[r];
      }
    }

    s.score += gained;
    return moved;
  }

  function hasValidMoves(s) {
    const size = s.size;
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++) {
        if (!s.grid[r][c]) return true;
        if (r + 1 < size && s.grid[r][c] === s.grid[r + 1][c]) return true;
        if (c + 1 < size && s.grid[r][c] === s.grid[r][c + 1]) return true;
      }
    return false;
  }

  function hasTarget(s, target) {
    return s.grid.some(row => row.some(v => v >= target));
  }

  function saveUndo(s) {
    savedForUndo = cloneState(s);
    try { localStorage.setItem('2048_undo', JSON.stringify(savedForUndo)); } catch (e) {}
  }

  function loadUndo() {
    try {
      const raw = localStorage.getItem('2048_undo');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  // ---- Render ----
  function render() {
    if (!state || !gridEl) return;
    const size = state.size;
    const cells = gridEl.querySelectorAll('.tile');
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const idx = r * size + c;
        const cell = cells[idx];
        if (!cell) continue;
        const val = state.grid[r][c];
        cell.textContent = val ? String(val) : '';
        cell.style.background = getTileColor(val);
        cell.style.color = getTileTextColor(val);
        cell.style.fontSize = val ? getFontSize(val, size) + 'px' : '0';
        cell.dataset.val = val || 0;
        if (val) {
          cell.classList.add('has-value');
        } else {
          cell.classList.remove('has-value');
        }
      }
    }
    if (scoreEl) scoreEl.textContent = state.score;
    if (typeof window.updateScore === 'function') window.updateScore(state.score);
  }

  function buildGrid() {
    if (!rootEl) return;
    const size = state.size;

    rootEl.innerHTML = '';

    // Inject styles
    const styleId = '2048-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        #g2048-wrapper {
          display: flex; flex-direction: column; align-items: center;
          font-family: 'Arial', sans-serif; user-select: none;
          padding: 12px; box-sizing: border-box; width: 100%;
        }
        #g2048-header {
          display: flex; align-items: center; gap: 12px; margin-bottom: 10px; flex-wrap: wrap; justify-content: center;
        }
        .g2048-score-box {
          background: #bbada0; border-radius: 6px; padding: 6px 14px;
          color: #fff; font-weight: bold; text-align: center; min-width: 80px;
        }
        .g2048-score-box span { display: block; font-size: 11px; opacity: 0.8; }
        .g2048-score-box strong { font-size: 20px; }
        #g2048-undo-btn {
          background: #8f7a66; color: #f9f6f2; border: none; border-radius: 6px;
          padding: 8px 16px; font-size: 14px; font-weight: bold; cursor: pointer;
          transition: background 0.15s;
        }
        #g2048-undo-btn:hover { background: #7a6654; }
        #g2048-grid-wrap {
          background: #bbada0; border-radius: 8px; padding: 8px;
          display: inline-block;
        }
        .g2048-grid {
          display: grid;
          gap: 8px;
        }
        .tile {
          background: #cdc1b4;
          border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 900;
          transition: background 0.12s, transform 0.12s;
          box-sizing: border-box;
          aspect-ratio: 1;
        }
        .tile.has-value {
          animation: pop 0.12s ease;
        }
        @keyframes pop {
          0% { transform: scale(0.85); }
          60% { transform: scale(1.06); }
          100% { transform: scale(1); }
        }
        #g2048-msg {
          margin-top: 10px; font-size: 18px; font-weight: bold; color: #776e65; min-height: 28px; text-align: center;
        }
      `;
      document.head.appendChild(style);
    }

    const wrapper = document.createElement('div');
    wrapper.id = 'g2048-wrapper';

    const header = document.createElement('div');
    header.id = 'g2048-header';

    const scoreBox = document.createElement('div');
    scoreBox.className = 'g2048-score-box';
    scoreBox.innerHTML = '<span>점수</span><strong id="g2048-score">0</strong>';

    undoBtn = document.createElement('button');
    undoBtn.id = 'g2048-undo-btn';
    undoBtn.textContent = '↩ 되돌리기';
    undoBtn.addEventListener('click', doUndo);

    header.appendChild(scoreBox);
    header.appendChild(undoBtn);

    const gridWrap = document.createElement('div');
    gridWrap.id = 'g2048-grid-wrap';

    gridEl = document.createElement('div');
    gridEl.className = 'g2048-grid';

    // Calculate cell size dynamically
    const maxW = Math.min(rootEl.clientWidth || 480, 520);
    const gap = 8;
    const padding = 8;
    const cellSize = Math.floor((maxW - padding * 2 - gap * (size - 1)) / size);

    gridEl.style.gridTemplateColumns = `repeat(${size}, ${cellSize}px)`;
    gridEl.style.gridTemplateRows = `repeat(${size}, ${cellSize}px)`;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.style.width = cellSize + 'px';
        tile.style.height = cellSize + 'px';
        gridEl.appendChild(tile);
      }
    }

    const msgEl = document.createElement('div');
    msgEl.id = 'g2048-msg';

    gridWrap.appendChild(gridEl);
    wrapper.appendChild(header);
    wrapper.appendChild(gridWrap);
    wrapper.appendChild(msgEl);
    rootEl.appendChild(wrapper);

    scoreEl = document.getElementById('g2048-score');
  }

  function showMessage(msg) {
    const el = document.getElementById('g2048-msg');
    if (el) el.textContent = msg;
  }

  function doUndo() {
    const prev = savedForUndo || loadUndo();
    if (!prev) return;
    state = prev;
    savedForUndo = null;
    try { localStorage.removeItem('2048_undo'); } catch (e) {}
    render();
    showMessage('');
  }

  function handleMove(dir) {
    if (!state || state.over || isAnimating) return;
    saveUndo(cloneState(state));
    const moved = moveGrid(state, dir);
    if (!moved) return;
    spawnTile(state);
    render();
    markNewTiles();

    const target = DIFF_SETTINGS[currentDiff]?.target || 2048;
    if (!state.won && hasTarget(state, target)) {
      state.won = true;
      showMessage('🎉 클리어! 계속 도전하세요!');
      document.dispatchEvent(new CustomEvent('gameClear', { detail: { score: state.score } }));
    } else if (!hasValidMoves(state)) {
      state.over = true;
      showMessage('게임 오버! 이동 불가');
      document.dispatchEvent(new CustomEvent('gameOver', { detail: { score: state.score, cleared: false } }));
    }
  }

  function markNewTiles() {
    // trigger pop animation on newly spawned tile
    if (!gridEl) return;
    const cells = gridEl.querySelectorAll('.tile');
    cells.forEach(cell => {
      if (cell.dataset.val && cell.dataset.val !== '0') {
        cell.style.animation = 'none';
        void cell.offsetWidth;
        cell.style.animation = '';
      }
    });
  }

  // Keyboard
  function onKeyDown(e) {
    const map = {
      ArrowLeft: 'left', ArrowRight: 'right',
      ArrowUp: 'up', ArrowDown: 'down',
    };
    if (map[e.key]) {
      e.preventDefault();
      handleMove(map[e.key]);
    }
  }

  // Touch swipe
  let touchStartX = 0, touchStartY = 0;
  function onTouchStart(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
  function onTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      handleMove(dx > 0 ? 'right' : 'left');
    } else {
      handleMove(dy > 0 ? 'down' : 'up');
    }
  }

  function attachInputHandlers() {
    document.addEventListener('keydown', onKeyDown);
    if (rootEl) {
      rootEl.addEventListener('touchstart', onTouchStart, { passive: true });
      rootEl.addEventListener('touchend', onTouchEnd, { passive: true });
    }
  }

  window.startGame = function (diffId, stage) {
    currentDiff = diffId || 'normal';
    currentStage = stage || 1;
    const settings = DIFF_SETTINGS[currentDiff] || DIFF_SETTINGS.normal;

    rootEl = document.getElementById('game-root');
    if (!rootEl) return;

    state = createState(settings.size);
    spawnTile(state);
    spawnTile(state);

    buildGrid();
    render();
    attachInputHandlers();
    showMessage('');
  };

})();
