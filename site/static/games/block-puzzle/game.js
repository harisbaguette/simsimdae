/* Block Puzzle - block-puzzle/game.js */
(function () {
  'use strict';

  const CONFIG = window.GAME_CONFIG || { gameId: 'block-puzzle', difficulties: [], hasLeaderboard: false, scoreType: 'high' };

  const DIFF_SETTINGS = {
    easy:   { gridSize: 8 },
    normal: { gridSize: 9 },
    hard:   { gridSize: 10 },
    expert: { gridSize: 10 },
  };

  // Piece definitions: array of [row, col] offsets from top-left anchor
  const PIECES = [
    // Tetrominoes
    { name: 'I-H', cells: [[0,0],[0,1],[0,2],[0,3]], color: '#00bcd4' },
    { name: 'I-V', cells: [[0,0],[1,0],[2,0],[3,0]], color: '#00bcd4' },
    { name: 'O',   cells: [[0,0],[0,1],[1,0],[1,1]], color: '#ffc107' },
    { name: 'T',   cells: [[0,0],[0,1],[0,2],[1,1]], color: '#9c27b0' },
    { name: 'T2',  cells: [[0,1],[1,0],[1,1],[2,1]], color: '#9c27b0' },
    { name: 'L',   cells: [[0,0],[1,0],[2,0],[2,1]], color: '#ff9800' },
    { name: 'L2',  cells: [[0,0],[0,1],[0,2],[1,0]], color: '#ff9800' },
    { name: 'J',   cells: [[0,1],[1,1],[2,0],[2,1]], color: '#2196f3' },
    { name: 'J2',  cells: [[0,0],[1,0],[1,1],[1,2]], color: '#2196f3' },
    { name: 'S',   cells: [[0,1],[0,2],[1,0],[1,1]], color: '#4caf50' },
    { name: 'Z',   cells: [[0,0],[0,1],[1,1],[1,2]], color: '#f44336' },
    // Pentominoes / extras
    { name: '2x3', cells: [[0,0],[0,1],[1,0],[1,1],[2,0]], color: '#e91e63' },
    { name: 'P',   cells: [[0,0],[0,1],[1,0],[1,1],[2,1]], color: '#673ab7' },
    { name: 'plus',cells: [[0,1],[1,0],[1,1],[1,2],[2,1]], color: '#009688' },
    { name: '3H',  cells: [[0,0],[0,1],[0,2]],             color: '#8bc34a' },
    { name: '3V',  cells: [[0,0],[1,0],[2,0]],             color: '#8bc34a' },
    { name: '2H',  cells: [[0,0],[0,1]],                   color: '#cddc39' },
    { name: '2V',  cells: [[0,0],[1,0]],                   color: '#cddc39' },
    { name: '1',   cells: [[0,0]],                         color: '#ff5722' },
    { name: 'L3',  cells: [[0,0],[1,0],[2,0],[2,1],[2,2]], color: '#795548' },
    { name: 'Z2',  cells: [[0,0],[1,0],[1,1],[2,1],[2,2]], color: '#607d8b' },
  ];

  let canvas, ctx;
  let rootEl;
  let gridSize = 9;
  let cellSize = 48;
  let grid = [];       // 2D array of color string or null
  let tray = [];       // 3 piece objects { pieceIdx, cells, color, name }
  let score = 0;
  let gameActive = false;
  let currentDiff = 'normal';

  // Drag state
  let dragging = null; // { trayIdx, cells, color, offsetX, offsetY, x, y }
  let ghostCells = []; // { row, col } valid placement preview
  let ghostValid = false;

  const GRID_PAD = 4;
  const TRAY_H_RATIO = 0.28; // tray occupies bottom 28% of canvas height

  function initGrid() {
    grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
  }

  function randPiece() {
    const idx = Math.floor(Math.random() * PIECES.length);
    const p = PIECES[idx];
    return { pieceIdx: idx, cells: p.cells, color: p.color, name: p.name };
  }

  function genTray() {
    tray = [randPiece(), randPiece(), randPiece()];
  }

  function canPlace(cells, row, col) {
    for (const [dr, dc] of cells) {
      const r = row + dr, c = col + dc;
      if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) return false;
      if (grid[r][c]) return false;
    }
    return true;
  }

  function placePiece(cells, color, row, col) {
    for (const [dr, dc] of cells) {
      grid[row + dr][col + dc] = color;
    }
  }

  function clearLines() {
    let clearedRows = 0, clearedCols = 0;
    let rowsToClear = [], colsToClear = [];

    for (let r = 0; r < gridSize; r++) {
      if (grid[r].every(c => c)) rowsToClear.push(r);
    }
    for (let c = 0; c < gridSize; c++) {
      if (grid.every(row => row[c])) colsToClear.push(c);
    }

    for (const r of rowsToClear) grid[r].fill(null);
    for (const c of colsToClear) {
      for (let r = 0; r < gridSize; r++) grid[r][c] = null;
    }

    clearedRows = rowsToClear.length;
    clearedCols = colsToClear.length;
    const totalLines = clearedRows + clearedCols;
    if (!totalLines) return 0;

    let pts = totalLines * 10 * gridSize;
    // Combo bonus
    if (totalLines >= 2) pts += (totalLines - 1) * 50;
    return pts;
  }

  function anyTrayFits() {
    for (const piece of tray) {
      if (!piece) continue;
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          if (canPlace(piece.cells, r, c)) return true;
        }
      }
    }
    return false;
  }

  // ---- Canvas sizing ----
  function resize() {
    if (!canvas || !rootEl) return;
    const maxW = Math.min((rootEl.clientWidth || 520) - 8, 520);
    const headerH = 50;
    const maxH = Math.min((window.innerHeight || 700) - headerH - 20, 620);
    // Canvas: square grid + tray
    const gridPx = Math.min(maxW, maxH * 0.76);
    cellSize = Math.floor((gridPx - GRID_PAD * 2) / gridSize);
    const actualGrid = cellSize * gridSize + GRID_PAD * 2;
    const trayH = Math.floor(actualGrid * 0.28);
    canvas.width = actualGrid;
    canvas.height = actualGrid + trayH + 10;
  }

  function gridOffsetX() { return GRID_PAD; }
  function gridOffsetY() { return GRID_PAD; }
  function trayOffsetY() { return cellSize * gridSize + GRID_PAD * 2 + 10; }
  function trayH() { return canvas.height - trayOffsetY(); }

  // ---- Drawing ----
  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, cellSize * gridSize + GRID_PAD * 2);

    // Grid cells
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const x = gridOffsetX() + c * cellSize;
        const y = gridOffsetY() + r * cellSize;
        const color = grid[r][c];
        if (color) {
          drawCell(x, y, cellSize, color);
        } else {
          ctx.fillStyle = '#16213e';
          ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
          ctx.strokeStyle = '#0f3460';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        }
      }
    }

    // Ghost preview
    if (dragging && ghostCells.length) {
      ctx.globalAlpha = ghostValid ? 0.45 : 0.25;
      for (const { row, col } of ghostCells) {
        if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
          const x = gridOffsetX() + col * cellSize;
          const y = gridOffsetY() + row * cellSize;
          drawCell(x, y, cellSize, ghostValid ? dragging.color : '#ff4444');
        }
      }
      ctx.globalAlpha = 1;
    }

    // Tray background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, trayOffsetY() - 6, canvas.width, trayH() + 6);

    // Tray pieces
    const tw = canvas.width / 3;
    const th = trayH();
    tray.forEach((piece, i) => {
      if (!piece) return;
      const tx = i * tw;
      const ty = trayOffsetY();
      drawTrayPiece(piece, tx, ty, tw, th, i);
    });

    // Dragging piece (on top)
    if (dragging) {
      ctx.globalAlpha = 0.9;
      for (const [dr, dc] of dragging.cells) {
        const x = dragging.x + dc * cellSize - dragging.offsetX;
        const y = dragging.y + dr * cellSize - dragging.offsetY;
        drawCell(x, y, cellSize, dragging.color);
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawCell(x, y, size, color) {
    const r = 4;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, size - 2, size - 2, r);
    ctx.fill();
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, size - 4, Math.floor(size / 3), r);
    ctx.fill();
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.roundRect(x + 2, y + Math.floor(size * 0.6), size - 4, Math.floor(size * 0.35), r);
    ctx.fill();
  }

  function drawTrayPiece(piece, tx, ty, tw, th, trayIdx) {
    const cells = piece.cells;
    const maxR = Math.max(...cells.map(([r]) => r));
    const maxC = Math.max(...cells.map(([, c]) => c));
    const minR = Math.min(...cells.map(([r]) => r));
    const minC = Math.min(...cells.map(([, c]) => c));
    const pRows = maxR - minR + 1;
    const pCols = maxC - minC + 1;
    const cs = Math.min(Math.floor(tw / (pCols + 1)), Math.floor(th / (pRows + 1)), 36);
    const startX = tx + Math.floor((tw - pCols * cs) / 2);
    const startY = ty + Math.floor((th - pRows * cs) / 2);

    if (dragging && dragging.trayIdx === trayIdx) {
      ctx.globalAlpha = 0.3;
    }
    for (const [dr, dc] of cells) {
      drawCell(startX + (dc - minC) * cs, startY + (dr - minR) * cs, cs, piece.color);
    }
    ctx.globalAlpha = 1;

    // Store tray piece center for drag detection
    piece._cx = startX + (pCols * cs) / 2;
    piece._cy = startY + (pRows * cs) / 2;
    piece._cs = cs;
    piece._minR = minR;
    piece._minC = minC;
  }

  function getGridCell(x, y) {
    const gx = x - gridOffsetX();
    const gy = y - gridOffsetY();
    const col = Math.floor(gx / cellSize);
    const row = Math.floor(gy / cellSize);
    return { row, col };
  }

  function snapGhost(mx, my) {
    if (!dragging) { ghostCells = []; return; }
    const { row: centerRow, col: centerCol } = getGridCell(mx, my);
    // Anchor = place so that piece visually centers under cursor
    const cells = dragging.cells;
    const minR = Math.min(...cells.map(([r]) => r));
    const minC = Math.min(...cells.map(([, c]) => c));
    const anchorRow = centerRow - minR;
    const anchorCol = centerCol - minC;

    ghostCells = cells.map(([dr, dc]) => ({ row: anchorRow + dr, col: anchorCol + dc }));
    ghostValid = canPlace(cells, anchorRow, anchorCol);
    dragging._snapRow = anchorRow;
    dragging._snapCol = anchorCol;
  }

  function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let cx, cy;
    if (e.touches) {
      cx = (e.touches[0].clientX - rect.left) * scaleX;
      cy = (e.touches[0].clientY - rect.top) * scaleY;
    } else {
      cx = (e.clientX - rect.left) * scaleX;
      cy = (e.clientY - rect.top) * scaleY;
    }
    return { x: cx, y: cy };
  }

  function onPointerDown(e) {
    if (!gameActive) return;
    const { x, y } = getCanvasPos(e);
    // Check tray
    const tw = canvas.width / 3;
    if (y >= trayOffsetY()) {
      const trayIdx = Math.floor(x / tw);
      const piece = tray[trayIdx];
      if (!piece) return;
      dragging = {
        trayIdx,
        cells: piece.cells,
        color: piece.color,
        name: piece.name,
        x, y,
        offsetX: 0, offsetY: 0,
        _snapRow: 0, _snapCol: 0,
      };
      snapGhost(x, y);
      draw();
    }
  }

  function onPointerMove(e) {
    if (!dragging) return;
    e.preventDefault();
    const { x, y } = getCanvasPos(e);
    dragging.x = x;
    dragging.y = y;
    snapGhost(x, y);
    draw();
  }

  function onPointerUp(e) {
    if (!dragging) return;
    e.preventDefault();
    const { x, y } = getCanvasPos(e);
    dragging.x = x;
    dragging.y = y;
    snapGhost(x, y);

    if (ghostValid) {
      const { _snapRow: row, _snapCol: col } = dragging;
      placePiece(dragging.cells, dragging.color, row, col);
      const pts = clearLines();
      score += pts + dragging.cells.length * 5;
      if (typeof window.updateScore === 'function') window.updateScore(score);
      updateScoreEl();
      tray[dragging.trayIdx] = null;

      if (tray.every(p => !p)) genTray();
    }

    dragging = null;
    ghostCells = [];
    ghostValid = false;

    if (!anyTrayFits()) {
      gameActive = false;
      draw();
      showMsg('게임 오버! 더 이상 놓을 공간이 없습니다.');
      document.dispatchEvent(new CustomEvent('gameOver', { detail: { score, cleared: false } }));
    } else {
      draw();
    }
  }

  function updateScoreEl() {
    const el = document.getElementById('bp-score');
    if (el) el.textContent = score;
  }

  function showMsg(msg) {
    const el = document.getElementById('bp-msg');
    if (el) el.textContent = msg;
  }

  function buildUI() {
    rootEl.innerHTML = '';

    const styleId = 'bp-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        #bp-wrapper { display: flex; flex-direction: column; align-items: center; padding: 8px; width: 100%; box-sizing: border-box; font-family: Arial, sans-serif; }
        #bp-header { display: flex; gap: 12px; margin-bottom: 8px; }
        .bp-stat { background: #0f3460; color: #e94560; border-radius: 8px; padding: 6px 16px; font-weight: bold; text-align: center; }
        .bp-stat span { display: block; font-size: 10px; color: #aaa; }
        .bp-stat strong { font-size: 20px; }
        #bp-canvas { display: block; touch-action: none; border-radius: 8px; max-width: 100%; }
        #bp-msg { margin-top: 8px; font-size: 16px; font-weight: bold; color: #e94560; min-height: 24px; text-align: center; }
      `;
      document.head.appendChild(style);
    }

    const wrapper = document.createElement('div');
    wrapper.id = 'bp-wrapper';

    const header = document.createElement('div');
    header.id = 'bp-header';
    header.innerHTML = `<div class="bp-stat"><span>점수</span><strong id="bp-score">0</strong></div>`;

    canvas = document.createElement('canvas');
    canvas.id = 'bp-canvas';
    resize();

    const msgEl = document.createElement('div');
    msgEl.id = 'bp-msg';

    wrapper.appendChild(header);
    wrapper.appendChild(canvas);
    wrapper.appendChild(msgEl);
    rootEl.appendChild(wrapper);

    ctx = canvas.getContext('2d');

    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('mouseleave', onPointerUp);
    canvas.addEventListener('touchstart', onPointerDown, { passive: true });
    canvas.addEventListener('touchmove', onPointerMove, { passive: false });
    canvas.addEventListener('touchend', onPointerUp, { passive: false });
  }

  window.startGame = function (diffId, stage) {
    currentDiff = diffId || 'normal';
    const settings = DIFF_SETTINGS[currentDiff] || DIFF_SETTINGS.normal;
    gridSize = settings.gridSize;
    score = 0;
    gameActive = false;

    rootEl = document.getElementById('game-root');
    if (!rootEl) return;

    buildUI();
    initGrid();
    genTray();
    resize();
    gameActive = true;
    draw();

    // Loop
    function loop() {
      if (gameActive) draw();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  };

})();
