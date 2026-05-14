(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════
     NONOGRAM / PICROSS  – game.js
     API: window.GAME_CONFIG, window.startGame, window.updateScore
          CustomEvent 'gameOver' / 'gameClear'
  ═══════════════════════════════════════════════════════════ */

  const CFG  = window.GAME_CONFIG || {};
  const root = document.getElementById('game-root');

  /* ── Embedded Puzzles (20 total) ─────────────────────────
     true = filled black, false = empty
     10×10 puzzles: indices 0-14   (easy/normal)
     15×15 puzzles: indices 15-19  (hard/expert)
  ──────────────────────────────────────────────────────── */
  const PUZZLES = [
    // 0 – Heart (10×10)
    [
      [0,0,1,1,0,0,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,0],
      [1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1],
      [0,1,1,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,1,1,0,0],
      [0,0,0,1,1,1,1,0,0,0],
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
    ],
    // 1 – Star (10×10)
    [
      [0,0,0,0,1,0,0,0,0,0],
      [0,0,0,1,1,1,0,0,0,0],
      [1,1,1,1,1,1,1,1,1,1],
      [0,0,1,1,1,1,1,1,0,0],
      [0,1,1,0,1,1,0,1,1,0],
      [1,1,0,0,1,1,0,0,1,1],
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,1,0,0,1,0,0,0],
      [0,0,1,0,0,0,0,1,0,0],
      [0,0,0,0,0,0,0,0,0,0],
    ],
    // 2 – House (10×10)
    [
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,1,1,1,1,0,0,0],
      [0,0,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,0],
      [1,1,1,1,1,1,1,1,1,1],
      [0,1,1,1,1,1,1,1,1,0],
      [0,1,1,0,0,0,0,1,1,0],
      [0,1,1,0,1,1,0,1,1,0],
      [0,1,1,0,1,1,0,1,1,0],
      [0,1,1,1,1,1,1,1,1,0],
    ],
    // 3 – Cat face (10×10)
    [
      [1,1,0,0,0,0,0,0,1,1],
      [1,1,1,0,0,0,0,1,1,1],
      [0,1,1,1,1,1,1,1,1,0],
      [0,1,0,1,0,0,1,0,1,0],
      [0,1,1,1,1,1,1,1,1,0],
      [0,1,1,0,1,1,0,1,1,0],
      [0,0,1,1,1,1,1,1,0,0],
      [0,0,1,0,0,0,0,1,0,0],
      [0,1,1,0,0,0,0,1,1,0],
      [0,1,1,1,1,1,1,1,1,0],
    ],
    // 4 – Diamond (10×10)
    [
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,1,1,1,1,0,0,0],
      [0,0,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,0],
      [1,1,1,1,1,1,1,1,1,1],
      [0,1,1,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,1,1,0,0],
      [0,0,0,1,1,1,1,0,0,0],
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
    ],
    // 5 – Letter A (10×10)
    [
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,1,1,1,1,0,0,0],
      [0,0,1,1,0,0,1,1,0,0],
      [0,1,1,0,0,0,0,1,1,0],
      [0,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,0],
      [0,1,1,0,0,0,0,1,1,0],
      [0,1,1,0,0,0,0,1,1,0],
      [1,1,1,0,0,0,0,1,1,1],
      [0,0,0,0,0,0,0,0,0,0],
    ],
    // 6 – Smiley (10×10)
    [
      [0,0,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,0],
      [1,1,0,1,1,1,1,0,1,1],
      [1,1,0,1,1,1,1,0,1,1],
      [1,1,1,1,1,1,1,1,1,1],
      [1,1,0,1,1,1,1,0,1,1],
      [1,1,1,0,1,1,0,1,1,1],
      [0,1,1,1,0,0,1,1,1,0],
      [0,0,1,1,1,1,1,1,0,0],
      [0,0,0,0,0,0,0,0,0,0],
    ],
    // 7 – Arrow right (10×10)
    [
      [0,0,0,0,0,1,0,0,0,0],
      [0,0,0,0,1,1,0,0,0,0],
      [1,1,1,1,1,1,0,0,0,0],
      [1,1,1,1,1,1,1,0,0,0],
      [1,1,1,1,1,1,1,1,0,0],
      [1,1,1,1,1,1,1,0,0,0],
      [1,1,1,1,1,1,0,0,0,0],
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,0,1,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
    ],
    // 8 – Tree (10×10)
    [
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,1,1,1,1,0,0,0],
      [0,0,1,1,1,1,1,1,0,0],
      [0,0,0,1,1,1,1,0,0,0],
      [0,0,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,0],
      [1,1,1,1,1,1,1,1,1,1],
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,1,1,1,1,0,0,0],
    ],
    // 9 – Fish (10×10)
    [
      [0,0,0,0,0,0,0,0,1,1],
      [0,0,0,0,0,0,0,1,1,0],
      [0,1,1,1,1,1,1,1,0,0],
      [1,1,1,0,1,1,1,1,1,0],
      [1,1,1,1,1,1,1,1,1,1],
      [1,1,1,0,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,0,0],
      [0,0,0,0,0,0,0,1,1,0],
      [0,0,0,0,0,0,0,0,1,1],
      [0,0,0,0,0,0,0,0,0,0],
    ],
    // 10 – Cross (10×10)
    [
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,1,1,0,0,0,0],
      [1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1],
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
    ],
    // 11 – Flower (10×10)
    [
      [0,0,0,1,1,1,1,0,0,0],
      [0,0,1,1,1,1,1,1,0,0],
      [0,1,1,0,1,1,0,1,1,0],
      [1,1,0,0,1,1,0,0,1,1],
      [1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1],
      [1,1,0,0,1,1,0,0,1,1],
      [0,1,1,0,1,1,0,1,1,0],
      [0,0,1,1,1,1,1,1,0,0],
      [0,0,0,0,1,1,0,0,0,0],
    ],
    // 12 – Moon (10×10)
    [
      [0,0,1,1,1,1,0,0,0,0],
      [0,1,1,1,1,1,1,0,0,0],
      [1,1,1,0,0,1,1,1,0,0],
      [1,1,0,0,0,0,1,1,0,0],
      [1,1,0,0,0,0,1,1,0,0],
      [1,1,0,0,0,0,1,1,0,0],
      [1,1,1,0,0,1,1,1,0,0],
      [0,1,1,1,1,1,1,0,0,0],
      [0,0,1,1,1,1,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
    ],
    // 13 – Boat (10×10)
    [
      [0,0,0,0,1,0,0,0,0,0],
      [0,0,0,1,1,0,0,0,0,0],
      [0,0,1,1,1,0,0,0,0,0],
      [1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1],
      [0,1,1,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,1,1,0,0],
      [0,0,0,1,1,1,1,0,0,0],
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
    ],
    // 14 – Robot (10×10)
    [
      [0,1,1,1,1,1,1,1,1,0],
      [1,1,1,1,1,1,1,1,1,1],
      [1,1,0,0,1,1,0,0,1,1],
      [1,1,0,0,1,1,0,0,1,1],
      [1,1,1,1,1,1,1,1,1,1],
      [1,0,1,1,1,1,1,1,0,1],
      [1,1,1,1,1,1,1,1,1,1],
      [1,1,0,1,1,1,1,0,1,1],
      [1,1,1,1,0,0,1,1,1,1],
      [0,1,1,1,0,0,1,1,1,0],
    ],
    // 15 – Dragon (15×15)
    [
      [0,0,0,1,1,0,0,0,0,0,1,1,0,0,0],
      [0,0,1,1,1,1,0,0,0,1,1,1,1,0,0],
      [0,1,1,0,1,1,1,0,1,1,1,0,1,1,0],
      [1,1,1,0,0,1,1,1,1,1,0,0,1,1,1],
      [1,1,0,0,0,0,1,1,1,0,0,0,0,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
      [0,0,1,1,0,1,1,1,1,1,0,1,1,0,0],
      [0,0,1,1,1,1,1,1,1,1,1,1,1,0,0],
      [0,0,0,1,1,1,0,1,0,1,1,1,0,0,0],
      [0,0,0,0,1,1,1,1,1,1,1,0,0,0,0],
      [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0],
      [0,0,0,0,1,1,0,0,0,1,1,0,0,0,0],
      [0,0,0,1,1,0,0,0,0,0,1,1,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    ],
    // 16 – Castle (15×15)
    [
      [1,0,1,0,0,0,1,1,1,0,0,0,1,0,1],
      [1,1,1,0,0,0,1,1,1,0,0,0,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,0,0,1,1,1,1,1,0,0,1,1,0],
      [0,1,1,0,0,1,1,1,1,1,0,0,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,0,0,1,0,0,1,1,1,1,0],
      [0,1,1,1,1,0,1,1,1,0,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
      [0,0,1,1,0,0,0,1,0,0,0,1,1,0,0],
      [0,0,1,1,0,0,1,1,1,0,0,1,1,0,0],
      [0,0,1,1,1,1,1,1,1,1,1,1,1,0,0],
    ],
    // 17 – Whale (15×15)
    [
      [0,0,0,0,0,1,1,1,1,0,0,0,0,0,0],
      [0,0,0,0,1,1,1,1,1,1,1,0,0,0,0],
      [0,0,0,1,1,1,0,0,1,1,1,1,0,0,0],
      [0,0,1,1,1,0,0,0,0,1,1,1,1,0,0],
      [0,1,1,1,0,0,1,0,0,0,1,1,1,1,0],
      [1,1,1,1,0,0,0,0,0,0,0,1,1,1,1],
      [1,1,1,1,1,0,0,0,0,0,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,1,1,1,1,1,1,1,0,0],
      [0,0,0,1,1,1,1,1,1,1,1,1,0,0,0],
      [0,0,0,0,1,1,1,1,1,1,1,0,0,0,0],
      [0,0,0,0,0,1,1,0,1,1,0,0,0,0,0],
      [0,0,0,0,0,1,1,0,1,1,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    ],
    // 18 – Spaceship (15×15)
    [
      [0,0,0,0,0,0,1,1,0,0,0,0,0,0,0],
      [0,0,0,0,0,1,1,1,1,0,0,0,0,0,0],
      [0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
      [0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
      [0,0,1,1,0,1,1,1,1,0,1,1,0,0,0],
      [0,1,1,0,0,1,1,1,1,0,0,1,1,0,0],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,0,0,1,1,1,1,0,0,1,1,0,0],
      [0,0,1,1,0,1,1,1,1,0,1,1,0,0,0],
      [0,0,0,1,1,1,0,0,1,1,1,0,0,0,0],
      [0,0,0,0,1,0,0,0,0,1,0,0,0,0,0],
      [0,0,0,0,1,0,0,0,0,1,0,0,0,0,0],
      [0,0,0,0,1,0,0,0,0,1,0,0,0,0,0],
    ],
    // 19 – Mountain (15×15)
    [
      [0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,1,1,1,0,0,0,0,0,0],
      [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0],
      [0,0,0,0,1,1,1,1,1,1,1,0,0,0,0],
      [0,0,0,1,1,0,1,1,1,0,1,1,0,0,0],
      [0,0,1,1,0,0,1,1,1,0,0,1,1,0,0],
      [0,1,1,0,0,0,1,1,1,0,0,0,1,1,0],
      [1,1,0,0,0,1,1,1,1,1,0,0,0,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,0,0,1,0,0,1,1,1,1,1],
      [1,1,1,1,0,0,0,1,0,0,0,1,1,1,1],
      [1,1,1,0,0,0,0,1,0,0,0,0,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
  ];

  /* ── Difficulty → puzzle set mapping ──────────────────── */
  const DIFF_CONFIG = {
    easy:   { puzzleIndices: [0,1,2,3,4],              size: 10 },
    normal: { puzzleIndices: [5,6,7,8,9,10,11,12,13,14,0,1,2,3,4], size: 10 },
    hard:   { puzzleIndices: [15,16,17,18,19,15,16,17,18,19], size: 15 },
    expert: { puzzleIndices: [19,18,17,16,15,14,13,12,11,10], size: 15 },
  };

  /* ── State ─────────────────────────────────────────────── */
  let canvas, ctx;
  let solution = [];
  let board    = [];   // 0=empty, 1=filled, 2=marked(X)
  let rowClues = [];
  let colClues = [];
  let gridSize = 10;
  let cellSize = 36;
  let clueAreaW = 0;
  let clueAreaH = 0;
  let startTime, timerInterval;
  let errors = 0;
  let currentDiff = 'easy';
  let currentStage = 1;
  let gameActive = false;
  let flashCells = [];  // [{r,c,color,until}]

  /* ── CSS injection ─────────────────────────────────────── */
  if (!document.getElementById('nono-style')) {
    const s = document.createElement('style');
    s.id = 'nono-style';
    s.textContent = `
      #nono-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 10px;
        gap: 8px;
        font-family: 'Segoe UI', sans-serif;
        user-select: none;
        -webkit-user-select: none;
      }
      #nono-meta {
        display: flex;
        gap: 20px;
        font-size: 0.88rem;
        color: #555;
      }
      #nono-meta strong { color: #1a8fa0; }
      #nono-msg {
        font-size: 1rem;
        font-weight: 700;
        min-height: 1.4em;
        color: #e05050;
      }
      #nono-canvas {
        border: 2px solid #333;
        border-radius: 4px;
        cursor: crosshair;
        touch-action: none;
      }
    `;
    document.head.appendChild(s);
  }

  /* ── Clue Generation ───────────────────────────────────── */
  function computeClues(grid) {
    const N = grid.length;
    const M = grid[0].length;
    const rows = [];
    for (let r = 0; r < N; r++) {
      const clue = [];
      let run = 0;
      for (let c = 0; c < M; c++) {
        if (grid[r][c]) { run++; }
        else if (run) { clue.push(run); run = 0; }
      }
      if (run) clue.push(run);
      rows.push(clue.length ? clue : [0]);
    }
    const cols = [];
    for (let c = 0; c < M; c++) {
      const clue = [];
      let run = 0;
      for (let r = 0; r < N; r++) {
        if (grid[r][c]) { run++; }
        else if (run) { clue.push(run); run = 0; }
      }
      if (run) clue.push(run);
      cols.push(clue.length ? clue : [0]);
    }
    return { rows, cols };
  }

  /* ── Canvas sizing ─────────────────────────────────────── */
  function computeLayout() {
    const maxRowClueNums = Math.max(...rowClues.map(c => c.length));
    const maxColClueNums = Math.max(...colClues.map(c => c.length));
    const maxW = Math.min(window.innerWidth - 24, 600);
    const totalCells = gridSize;
    // We want clueArea + grid ≤ maxW
    // Each cell = cellSize, clue area = clueDigits * cellSize / 2
    const clueColW = Math.max(maxRowClueNums, 2);
    const clueRowH = Math.max(maxColClueNums, 2);
    const available = maxW;
    cellSize = Math.max(20, Math.floor(available / (totalCells + clueColW)));
    clueAreaW = clueColW * cellSize;
    clueAreaH = clueRowH * cellSize;
    canvas.width  = clueAreaW + gridSize * cellSize;
    canvas.height = clueAreaH + gridSize * cellSize;
  }

  /* ── Drawing ───────────────────────────────────────────── */
  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clue background
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(0, 0, clueAreaW, clueAreaH);
    ctx.fillStyle = '#eef4ff';
    ctx.fillRect(0, clueAreaH, clueAreaW, gridSize * cellSize);
    ctx.fillRect(clueAreaW, 0, gridSize * cellSize, clueAreaH);

    // Draw column clues
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let c = 0; c < gridSize; c++) {
      const clue = colClues[c];
      const x = clueAreaW + c * cellSize + cellSize / 2;
      // shade every other column
      if (c % 2 === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.04)';
        ctx.fillRect(clueAreaW + c * cellSize, 0, cellSize, clueAreaH);
      }
      const startY = clueAreaH - clue.length * (cellSize * 0.8);
      for (let i = 0; i < clue.length; i++) {
        const y = startY + i * (cellSize * 0.8) + cellSize * 0.4;
        ctx.fillStyle = clue[i] === 0 ? '#aaa' : '#222';
        ctx.font = `${Math.floor(cellSize * 0.4)}px monospace`;
        ctx.fillText(clue[i], x, y);
      }
    }

    // Draw row clues
    for (let r = 0; r < gridSize; r++) {
      const clue = rowClues[r];
      const y = clueAreaH + r * cellSize + cellSize / 2;
      if (r % 2 === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.04)';
        ctx.fillRect(0, clueAreaH + r * cellSize, clueAreaW, cellSize);
      }
      const startX = clueAreaW - clue.length * (cellSize * 0.8);
      for (let i = 0; i < clue.length; i++) {
        const x = startX + i * (cellSize * 0.8) + cellSize * 0.4;
        ctx.fillStyle = clue[i] === 0 ? '#aaa' : '#222';
        ctx.font = `${Math.floor(cellSize * 0.4)}px monospace`;
        ctx.fillText(clue[i], x, y);
      }
    }

    // Grid cells
    const now = Date.now();
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const x = clueAreaW + c * cellSize;
        const y = clueAreaH + r * cellSize;
        const val = board[r][c];

        // Cell bg
        // 5×5 box separator highlight
        const boxR = Math.floor(r / 5);
        const boxC = Math.floor(c / 5);
        const shade = (boxR + boxC) % 2 === 0;
        ctx.fillStyle = shade ? '#fff' : '#f5f5f5';
        ctx.fillRect(x, y, cellSize, cellSize);

        // Flash overlay
        const flash = flashCells.find(f => f.r === r && f.c === c);
        if (flash && now < flash.until) {
          ctx.fillStyle = flash.color;
          ctx.fillRect(x, y, cellSize, cellSize);
        }

        if (val === 1) {
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        } else if (val === 2) {
          // X mark
          ctx.strokeStyle = '#cc3333';
          ctx.lineWidth = 2;
          const m = cellSize * 0.25;
          ctx.beginPath();
          ctx.moveTo(x + m, y + m);
          ctx.lineTo(x + cellSize - m, y + cellSize - m);
          ctx.moveTo(x + cellSize - m, y + m);
          ctx.lineTo(x + m, y + cellSize - m);
          ctx.stroke();
        }

        // Grid lines
        ctx.strokeStyle = (c % 5 === 0 || r % 5 === 0) ? '#888' : '#ccc';
        ctx.lineWidth = (c % 5 === 0 || r % 5 === 0) ? 1.5 : 0.5;
        ctx.strokeRect(x, y, cellSize, cellSize);
      }
    }

    // Thick border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(clueAreaW, clueAreaH, gridSize * cellSize, gridSize * cellSize);
  }

  /* ── Check completion ──────────────────────────────────── */
  function isBoardFull() {
    for (let r = 0; r < gridSize; r++)
      for (let c = 0; c < gridSize; c++)
        if (board[r][c] === 0) return false;
    return true;
  }

  function checkSolution() {
    let wrong = 0;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const shouldBeFilled = solution[r][c] === 1;
        const isFilled = board[r][c] === 1;
        if (shouldBeFilled !== isFilled) wrong++;
      }
    }
    return wrong === 0;
  }

  /* ── Timer ─────────────────────────────────────────────── */
  function startTimer() {
    clearInterval(timerInterval);
    startTime = Date.now();
    timerInterval = setInterval(() => {
      if (!gameActive) return;
      const secs = Math.floor((Date.now() - startTime) / 1000);
      const el = document.getElementById('nono-time');
      if (el) el.textContent = formatTime(secs);
    }, 500);
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  }

  function calcScore() {
    const secs = Math.floor((Date.now() - startTime) / 1000);
    return Math.max(0, 10000 - secs * 10 - errors * 100);
  }

  /* ── Event → cell ─────────────────────────────────────── */
  function eventToCell(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const px = (clientX - rect.left) * scaleX;
    const py = (clientY - rect.top)  * scaleY;
    const c = Math.floor((px - clueAreaW) / cellSize);
    const r = Math.floor((py - clueAreaH) / cellSize);
    if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) return null;
    return { r, c };
  }

  /* ── Handle click ──────────────────────────────────────── */
  function handleCellAction(r, c, isRight) {
    if (!gameActive) return;
    const prev = board[r][c];

    if (isRight) {
      // right click = mark X
      board[r][c] = prev === 2 ? 0 : 2;
      // penalty if X-marking a correct cell
      if (board[r][c] === 2 && solution[r][c] === 1) {
        errors++;
        updateMeta();
        flashCells.push({ r, c, color: 'rgba(255,100,100,0.5)', until: Date.now() + 300 });
      }
    } else {
      // left click = fill
      board[r][c] = prev === 1 ? 0 : 1;
      if (board[r][c] === 1 && solution[r][c] === 0) {
        errors++;
        updateMeta();
        flashCells.push({ r, c, color: 'rgba(255,80,80,0.6)', until: Date.now() + 400 });
      } else if (board[r][c] === 1 && solution[r][c] === 1) {
        flashCells.push({ r, c, color: 'rgba(80,200,100,0.4)', until: Date.now() + 300 });
      }
    }

    draw();

    // Remove old flashes
    flashCells = flashCells.filter(f => Date.now() < f.until);
    // Re-draw after flash duration
    setTimeout(() => {
      flashCells = flashCells.filter(f => Date.now() < f.until);
      draw();
    }, 420);

    // Auto-check when board is completely filled
    if (isBoardFull()) {
      setTimeout(() => {
        if (checkSolution()) {
          gameActive = false;
          clearInterval(timerInterval);
          const score = calcScore();
          window.updateScore && window.updateScore(score);
          showMsg('🎉 완성!');
          setTimeout(() => {
            document.dispatchEvent(new CustomEvent('gameClear', { detail: { score } }));
            window.dispatchEvent(new CustomEvent('gameClear', { detail: { score } }));
          }, 500);
        } else {
          showMsg('아직 틀린 칸이 있어요!');
          errors += 3;
          updateMeta();
        }
      }, 200);
    }
  }

  /* ── UI helpers ────────────────────────────────────────── */
  function showMsg(text) {
    const el = document.getElementById('nono-msg');
    if (el) el.textContent = text;
  }

  function updateMeta() {
    const secs = Math.floor((Date.now() - startTime) / 1000);
    const scoreEl = document.getElementById('nono-score-calc');
    if (scoreEl) scoreEl.textContent = Math.max(0, 10000 - secs * 10 - errors * 100).toLocaleString();
    const errEl = document.getElementById('nono-errors');
    if (errEl) errEl.textContent = errors;
    window.updateScore && window.updateScore(Math.max(0, 10000 - secs * 10 - errors * 100));
  }

  /* ── Build DOM ─────────────────────────────────────────── */
  function buildUI() {
    root.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.id = 'nono-wrap';

    const meta = document.createElement('div');
    meta.id = 'nono-meta';
    meta.innerHTML = `
      <span>오류: <strong id="nono-errors">0</strong></span>
      <span>시간: <strong id="nono-time">0:00</strong></span>
      <span>예상점수: <strong id="nono-score-calc">10000</strong></span>
    `;

    const msg = document.createElement('div');
    msg.id = 'nono-msg';

    canvas = document.createElement('canvas');
    canvas.id = 'nono-canvas';

    // Prevent context menu
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    canvas.addEventListener('mousedown', e => {
      e.preventDefault();
      const cell = eventToCell(e);
      if (!cell) return;
      handleCellAction(cell.r, cell.c, e.button === 2 || e.ctrlKey);
    });

    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      const cell = eventToCell(e);
      if (!cell) return;
      handleCellAction(cell.r, cell.c, false);
    }, { passive: false });

    wrap.appendChild(meta);
    wrap.appendChild(msg);
    wrap.appendChild(canvas);
    root.appendChild(wrap);
  }

  /* ── Start game ────────────────────────────────────────── */
  window.startGame = function (diffId, stage) {
    currentDiff  = diffId  || 'easy';
    currentStage = stage   || 1;
    gameActive   = false;
    errors       = 0;
    flashCells   = [];

    const dcfg = DIFF_CONFIG[currentDiff] || DIFF_CONFIG.easy;
    gridSize = dcfg.size;

    // Select puzzle
    const idx = dcfg.puzzleIndices[(currentStage - 1) % dcfg.puzzleIndices.length];
    solution = PUZZLES[idx].map(row => [...row]);

    // Pad/trim to gridSize if needed
    while (solution.length < gridSize) solution.push(new Array(gridSize).fill(0));
    solution = solution.slice(0, gridSize).map(row => {
      const r = [...row];
      while (r.length < gridSize) r.push(0);
      return r.slice(0, gridSize);
    });

    // Empty board
    board = Array.from({ length: gridSize }, () => new Array(gridSize).fill(0));

    // Compute clues
    const clues = computeClues(solution);
    rowClues = clues.rows;
    colClues = clues.cols;

    buildUI();
    ctx = canvas.getContext('2d');
    computeLayout();
    draw();
    startTimer();
    gameActive = true;
    showMsg('왼클릭: 채우기 | 우클릭/Ctrl+클릭: X 표시');
    updateMeta();
  };

  // Auto-start if config available
  if (CFG && CFG.difficulties && CFG.difficulties.length) {
    // Wait for template to call startGame
  }

})();
