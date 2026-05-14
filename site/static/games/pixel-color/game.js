(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════
     PIXEL COLOR – Color by Number  – game.js
     API: window.GAME_CONFIG, window.startGame, window.updateScore
          CustomEvent 'gameOver' / 'gameClear'
  ═══════════════════════════════════════════════════════════ */

  const CFG  = window.GAME_CONFIG || {};
  const root = document.getElementById('game-root');

  /* ── Palette: 8 colors (index 0-7) ───────────────────────
     0 = empty/background (not a paintable color)
     1-7 = actual colors                                    */
  const PALETTE = [
    '#ffffff',  // 0 – white/empty (background)
    '#e74c3c',  // 1 – red
    '#f39c12',  // 2 – orange
    '#f1c40f',  // 3 – yellow
    '#2ecc71',  // 4 – green
    '#3498db',  // 5 – blue
    '#9b59b6',  // 6 – purple
    '#1a1a2e',  // 7 – dark/black
  ];

  const COLOR_NAMES = ['배경','빨강','주황','노랑','초록','파랑','보라','검정'];

  /* ── 10 Pixel Art Patterns 30×30 ─────────────────────────
     Each pattern is a 30-row × 30-col 2D array.
     Values: 0 = background, 1-7 = color index.
     We use a compressed builder: RLE rows per pattern.       */

  function makeGrid(rows30) { return rows30; }

  // Helper: expand RLE row spec "[count,val, ...]" → array
  function rle(spec) {
    const out = [];
    for (let i = 0; i < spec.length; i += 2) {
      const cnt = spec[i], val = spec[i+1];
      for (let j = 0; j < cnt; j++) out.push(val);
    }
    return out;
  }

  /* Pattern 0 – Smiley Face */
  const P0 = [
    rle([30,0]),
    rle([30,0]),
    rle([30,0]),
    rle([9,0,12,5,9,0]),
    rle([7,0,16,5,7,0]),
    rle([5,0,20,5,5,0]),
    rle([4,0,22,5,4,0]),
    rle([3,0,24,5,3,0]),
    rle([3,0,3,5,18,0,3,5,3,0]),
    rle([2,0,3,5,20,0,3,5,2,0]),
    rle([2,0,4,5,18,0,4,5,2,0]),
    rle([2,0,4,5,5,0,1,3,5,0,1,3,5,0,4,5,2,0]),
    rle([2,0,3,5,7,0,2,3,3,0,2,3,7,0,3,5,2,0]),
    rle([1,0,3,5,10,0,4,3,10,0,3,5,1,0]),
    rle([1,0,3,5,24,0,3,5,1,0]),
    rle([1,0,3,5,5,0,16,0,5,0,3,5,1,0]),
    rle([1,0,4,5,4,0,1,3,12,3,1,3,4,0,4,5,1,0]),
    rle([1,0,4,5,5,0,12,3,5,0,4,5,1,0]),
    rle([2,0,4,5,6,0,8,3,6,0,4,5,2,0]),
    rle([2,0,4,5,24,0,4,5,2,0]),
    rle([2,0,5,5,20,0,5,5,2,0]),
    rle([3,0,5,5,18,0,5,5,3,0]),
    rle([4,0,22,5,4,0]),
    rle([5,0,20,5,5,0]),
    rle([7,0,16,5,7,0]),
    rle([9,0,12,5,9,0]),
    rle([30,0]),
    rle([30,0]),
    rle([30,0]),
    rle([30,0]),
  ];

  /* Pattern 1 – Heart */
  const P1 = (function() {
    const rows = [];
    const heart = [
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,1,1,1,1,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0],
      [0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0],
      [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0],
      [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0],
      [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0],
      [0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0],
      [0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    ];
    return heart;
  })();

  /* Pattern 2 – Star */
  const P2 = (function() {
    const g = Array.from({length:30}, () => new Array(30).fill(0));
    const pts = [
      [2,14],[2,15],[3,13],[3,14],[3,15],[3,16],
      [4,12],[4,13],[4,14],[4,15],[4,16],[4,17],
      [5,0],[5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8],[5,9],[5,10],[5,11],[5,12],[5,13],[5,14],[5,15],[5,16],[5,17],[5,18],[5,19],[5,20],[5,21],[5,22],[5,23],[5,24],[5,25],[5,26],[5,27],[5,28],[5,29],
    ];
    // Build star shape
    for (let r = 0; r < 30; r++) {
      for (let c = 0; c < 30; c++) {
        const cx = 14.5, cy = 14.5;
        const dx = c - cx, dy = r - cy;
        const angle = Math.atan2(dy, dx);
        const dist = Math.sqrt(dx*dx + dy*dy);
        // 5-pointed star
        const spike = Math.cos(5 * angle) * 0.5 + 0.5;
        const inner = 4, outer = 13;
        const radius = inner + (outer - inner) * spike;
        if (dist <= radius) g[r][c] = 3; // yellow
      }
    }
    return g;
  })();

  /* Pattern 3 – Rainbow */
  const P3 = (function() {
    const g = Array.from({length:30}, () => new Array(30).fill(0));
    const cx = 15, cy = 22;
    const bands = [
      {min:12, max:14, color:1},
      {min:10, max:12, color:2},
      {min:8,  max:10, color:3},
      {min:6,  max:8,  color:4},
      {min:4,  max:6,  color:5},
      {min:2,  max:4,  color:6},
    ];
    for (let r = 0; r < 30; r++) {
      for (let c = 0; c < 30; c++) {
        const dx = c - cx, dy = r - cy;
        if (dy > 0) continue;
        const dist = Math.sqrt(dx*dx + dy*dy);
        for (const b of bands) {
          if (dist >= b.min && dist < b.max) { g[r][c] = b.color; break; }
        }
      }
    }
    return g;
  })();

  /* Pattern 4 – Mushroom */
  const P4 = (function() {
    const g = Array.from({length:30}, () => new Array(30).fill(0));
    for (let r = 0; r < 30; r++) {
      for (let c = 0; c < 30; c++) {
        const cx = 15, topY = 12;
        const dx = c - cx, dy = r - topY;
        // Cap: semicircle top half
        if (dy <= 0 && dx*dx + dy*dy <= 144) {
          g[r][c] = 1; // red cap
          // white spots
          if ((dx+5)*(dx+5)+(dy+4)*(dy+4) < 9 || (dx-4)*(dx-4)+(dy+5)*(dy+5) < 9 ||
              (dx+1)*(dx+1)+(dy+2)*(dy+2) < 4) g[r][c] = 0;
        }
        // Stem
        if (r >= 20 && r < 28 && c >= 11 && c < 20) g[r][c] = 3; // yellow
        // Eye area
        if (r >= 14 && r < 17 && c >= 12 && c < 19) {
          g[r][c] = 3; // face
          if ((c === 13 || c === 17) && r === 15) g[r][c] = 7; // eyes
        }
      }
    }
    return g;
  })();

  /* Pattern 5 – Sun */
  const P5 = (function() {
    const g = Array.from({length:30}, () => new Array(30).fill(0));
    const cx = 15, cy = 15;
    for (let r = 0; r < 30; r++) {
      for (let c = 0; c < 30; c++) {
        const dx = c - cx, dy = r - cy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        // Core
        if (dist < 7) { g[r][c] = 3; continue; }
        // Rays: 8 directions
        const angle = Math.atan2(dy, dx);
        const rayStrength = Math.pow(Math.abs(Math.cos(4*angle)), 3);
        if (dist < 13 && rayStrength > 0.5) g[r][c] = 2; // orange rays
      }
    }
    return g;
  })();

  /* Pattern 6 – Flower */
  const P6 = (function() {
    const g = Array.from({length:30}, () => new Array(30).fill(0));
    const cx = 15, cy = 13;
    for (let r = 0; r < 30; r++) {
      for (let c = 0; c < 30; c++) {
        const dx = c - cx, dy = r - cy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        // Center
        if (dist < 4) { g[r][c] = 3; continue; }
        // Petals: 6 ellipses
        for (let p = 0; p < 6; p++) {
          const angle = (p / 6) * Math.PI * 2;
          const pcx = cx + Math.cos(angle) * 7;
          const pcy = cy + Math.sin(angle) * 7;
          const pdx = c - pcx, pdy = r - pcy;
          if (pdx*pdx*1.5 + pdy*pdy*1.5 < 16) { g[r][c] = 1; break; }
        }
        // Stem
        if (c >= 14 && c <= 16 && r >= 20 && r < 29) g[r][c] = 4;
        // Leaf
        if (r >= 23 && r < 27 && c >= 16 && c < 22) {
          const lx = c - 16, ly = r - 23;
          if (lx + ly < 7) g[r][c] = 4;
        }
      }
    }
    return g;
  })();

  /* Pattern 7 – House */
  const P7 = (function() {
    const g = Array.from({length:30}, () => new Array(30).fill(0));
    // Roof triangle
    for (let r = 4; r < 14; r++) {
      const half = (r - 4) * 1.2;
      const lo = Math.floor(15 - half), hi = Math.ceil(15 + half);
      for (let c = lo; c <= hi; c++) g[r][c] = 1;
    }
    // Walls
    for (let r = 13; r < 28; r++) {
      for (let c = 5; c < 26; c++) g[r][c] = 2;
    }
    // Door
    for (let r = 20; r < 28; r++) {
      for (let c = 12; c < 18; c++) g[r][c] = 7;
    }
    // Windows
    for (let r = 15; r < 20; r++) {
      for (let c = 7; c < 12; c++) g[r][c] = 5;
      for (let c = 19; c < 24; c++) g[r][c] = 5;
    }
    return g;
  })();

  /* Pattern 8 – Rocket */
  const P8 = (function() {
    const g = Array.from({length:30}, () => new Array(30).fill(0));
    const cx = 15;
    // Nose cone
    for (let r = 2; r < 8; r++) {
      const half = (r - 2) * 1.2;
      const lo = Math.floor(cx - half), hi = Math.ceil(cx + half);
      for (let c = lo; c <= hi; c++) g[r][c] = 5;
    }
    // Body
    for (let r = 7; r < 22; r++) {
      for (let c = cx-5; c <= cx+5; c++) g[r][c] = 5;
    }
    // Window
    for (let r = 10; r < 15; r++) {
      for (let c = cx-3; c <= cx+3; c++) {
        const dx = c-cx, dy = r-12;
        if (dx*dx + dy*dy < 8) g[r][c] = 4;
      }
    }
    // Fins
    for (let r = 18; r < 24; r++) {
      for (let c = cx-9; c < cx-4; c++) if (cx-9+r-18 < c) g[r][c] = 1;
      for (let c = cx+4; c < cx+9; c++) if (c < cx+9-(r-18)) g[r][c] = 1;
    }
    // Flame
    for (let r = 22; r < 28; r++) {
      const spread = (r - 22) * 0.7;
      for (let c = Math.floor(cx-spread); c <= Math.ceil(cx+spread); c++) {
        g[r][c] = r < 25 ? 2 : 3;
      }
    }
    return g;
  })();

  /* Pattern 9 – Cat */
  const P9 = (function() {
    const g = Array.from({length:30}, () => new Array(30).fill(0));
    // Head
    for (let r = 5; r < 20; r++) {
      for (let c = 7; c < 24; c++) {
        const dx = c-15, dy = r-13;
        if (dx*dx/64 + dy*dy/49 < 1) g[r][c] = 7;
      }
    }
    // Ears
    for (let r = 2; r < 8; r++) {
      const d = r - 2;
      for (let c = 7; c < 7+d+1; c++) g[r][c] = 7;
      for (let c = 23-d; c < 24; c++) g[r][c] = 7;
    }
    // Eyes
    for (let c = 11; c <= 12; c++) { g[10][c] = 4; g[11][c] = 4; }
    for (let c = 18; c <= 19; c++) { g[10][c] = 4; g[11][c] = 4; }
    // Nose
    g[14][14] = 1; g[14][15] = 1; g[14][16] = 1;
    // Mouth
    g[16][13] = 7; g[16][17] = 7;
    // Whiskers
    for (let c = 2; c < 8; c++) { g[14][c] = 3; g[15][c] = 3; }
    for (let c = 22; c < 28; c++) { g[14][c] = 3; g[15][c] = 3; }
    // Body
    for (let r = 19; r < 28; r++) {
      for (let c = 9; c < 22; c++) {
        if ((r-27)*(r-27)/64 + (c-15)*(c-15)/36 < 1 || r < 24) g[r][c] = 7;
      }
    }
    // Tail
    for (let i = 0; i < 8; i++) {
      const r = 22 + i, c = 22 + Math.floor(i*0.7);
      if (r < 30 && c < 30) g[r][c] = 7;
    }
    return g;
  })();

  const PATTERNS = [P0, P1, P2, P3, P4, P5, P6, P7, P8, P9];
  const PATTERN_NAMES = ['스마일','하트','별','무지개','버섯','태양','꽃','집','로켓','고양이'];

  /* ── Difficulty → pattern mapping ─────────────────────── */
  const DIFF_MAP = {
    easy:   [0,1,2,3,4],
    normal: [5,6,7,8,9,0,1,2,3,4],
    hard:   [0,1,2,3,4,5,6,7,8,9],
    expert: [9,8,7,6,5,4,3,2,1,0],
  };

  /* ── State ─────────────────────────────────────────────── */
  let canvas, ctx;
  let pattern   = [];     // target: 30×30 array of color indices
  let userGrid  = [];     // user painting: 0 = unpainted
  let GRID      = 30;
  let cellSize  = 16;
  let activeColor = 1;
  let errors    = 0;
  let totalToFill = 0;
  let filledCount = 0;
  let gameActive  = false;
  let flashList   = [];   // {r,c,until,color}
  let highlightNext = null;
  let currentDiff   = 'easy';
  let currentStage  = 1;

  /* ── CSS ───────────────────────────────────────────────── */
  if (!document.getElementById('pc-style')) {
    const s = document.createElement('style');
    s.id = 'pc-style';
    s.textContent = `
      #pc-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 8px;
        gap: 8px;
        font-family: 'Segoe UI', sans-serif;
        user-select: none;
        -webkit-user-select: none;
      }
      #pc-meta {
        display: flex;
        gap: 16px;
        font-size: 0.85rem;
        color: #555;
        flex-wrap: wrap;
        justify-content: center;
      }
      #pc-meta strong { color: #1a8fa0; }
      #pc-palette {
        display: flex;
        gap: 5px;
        flex-wrap: wrap;
        justify-content: center;
        padding: 4px;
        background: #f0f0f0;
        border-radius: 8px;
      }
      .pc-color-btn {
        width: 34px; height: 34px;
        border-radius: 6px;
        border: 3px solid transparent;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.65rem;
        font-weight: 700;
        color: rgba(0,0,0,0.6);
        transition: transform 100ms, border-color 100ms;
      }
      .pc-color-btn:hover { transform: scale(1.1); }
      .pc-color-btn.active {
        border-color: #333;
        transform: scale(1.18);
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      }
      #pc-canvas {
        cursor: crosshair;
        border: 2px solid #333;
        border-radius: 4px;
        touch-action: none;
        image-rendering: pixelated;
      }
      #pc-progress-bar {
        width: 100%;
        max-width: 480px;
        height: 10px;
        background: #ddd;
        border-radius: 5px;
        overflow: hidden;
      }
      #pc-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #2ecc71, #27ae60);
        border-radius: 5px;
        transition: width 200ms;
      }
      #pc-hint {
        font-size: 0.8rem;
        color: #888;
        min-height: 1.2em;
      }
    `;
    document.head.appendChild(s);
  }

  /* ── Build UI ──────────────────────────────────────────── */
  function buildUI() {
    root.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.id = 'pc-wrap';

    const meta = document.createElement('div');
    meta.id = 'pc-meta';
    meta.innerHTML = `
      <span>완성: <strong id="pc-pct">0%</strong></span>
      <span>오류: <strong id="pc-err">0</strong></span>
      <span>점수: <strong id="pc-score">0</strong></span>
    `;

    const progressBar = document.createElement('div');
    progressBar.id = 'pc-progress-bar';
    progressBar.innerHTML = '<div id="pc-progress-fill" style="width:0%"></div>';

    // Palette (colors 1-7)
    const palette = document.createElement('div');
    palette.id = 'pc-palette';
    for (let i = 1; i <= 7; i++) {
      const btn = document.createElement('div');
      btn.className = 'pc-color-btn' + (i === activeColor ? ' active' : '');
      btn.style.background = PALETTE[i];
      btn.style.color = i === 7 ? '#aaa' : 'rgba(0,0,0,0.6)';
      btn.textContent = i;
      btn.dataset.color = i;
      btn.addEventListener('click', () => {
        activeColor = i;
        document.querySelectorAll('.pc-color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        highlightNextCell();
        draw();
      });
      palette.appendChild(btn);
    }

    canvas = document.createElement('canvas');
    canvas.id = 'pc-canvas';

    const hint = document.createElement('div');
    hint.id = 'pc-hint';
    hint.textContent = '색상을 선택하고 해당 번호의 칸을 클릭하세요!';

    canvas.addEventListener('mousedown', e => {
      e.preventDefault();
      const cell = eventToCell(e);
      if (cell) handlePaint(cell.r, cell.c);
    });
    canvas.addEventListener('mousemove', e => {
      if (e.buttons !== 1) return;
      const cell = eventToCell(e);
      if (cell) handlePaint(cell.r, cell.c);
    });
    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      const cell = eventToCell(e);
      if (cell) handlePaint(cell.r, cell.c);
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      const cell = eventToCell(e);
      if (cell) handlePaint(cell.r, cell.c);
    }, { passive: false });
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    wrap.appendChild(meta);
    wrap.appendChild(progressBar);
    wrap.appendChild(palette);
    wrap.appendChild(canvas);
    wrap.appendChild(hint);
    root.appendChild(wrap);
  }

  /* ── Layout ────────────────────────────────────────────── */
  function computeLayout() {
    const maxW = Math.min(window.innerWidth - 24, 500);
    cellSize = Math.max(8, Math.floor(maxW / GRID));
    canvas.width  = GRID * cellSize;
    canvas.height = GRID * cellSize;
  }

  /* ── Draw ──────────────────────────────────────────────── */
  function draw() {
    if (!ctx) return;
    const now = Date.now();
    flashList = flashList.filter(f => now < f.until);

    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const x = c * cellSize, y = r * cellSize;
        const target = pattern[r][c];
        const user   = userGrid[r][c];

        if (user > 0) {
          ctx.fillStyle = PALETTE[user];
        } else if (target === 0) {
          ctx.fillStyle = '#f8f8f8';
        } else {
          // Show number hint
          ctx.fillStyle = '#e8e8e8';
        }
        ctx.fillRect(x, y, cellSize, cellSize);

        // Flash overlay
        const fl = flashList.find(f => f.r === r && f.c === c);
        if (fl) {
          ctx.fillStyle = fl.color;
          ctx.fillRect(x, y, cellSize, cellSize);
        }

        // Number hint for unfilled cells
        if (user === 0 && target > 0 && cellSize >= 12) {
          ctx.fillStyle = '#999';
          ctx.font = `${Math.floor(cellSize * 0.55)}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(target, x + cellSize/2, y + cellSize/2);
        }

        // Highlight: next unfilled of active color
        if (highlightNext && highlightNext.r === r && highlightNext.c === c) {
          ctx.strokeStyle = 'rgba(255,200,0,0.9)';
          ctx.lineWidth = 2;
          ctx.strokeRect(x+1, y+1, cellSize-2, cellSize-2);
        }

        // Grid lines
        if (cellSize > 10) {
          ctx.strokeStyle = 'rgba(0,0,0,0.1)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, cellSize, cellSize);
        }
      }
    }
  }

  /* ── Highlight next cell ───────────────────────────────── */
  function highlightNextCell() {
    highlightNext = null;
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if (pattern[r][c] === activeColor && userGrid[r][c] === 0) {
          highlightNext = { r, c };
          return;
        }
      }
    }
  }

  /* ── Event → cell ─────────────────────────────────────── */
  function eventToCell(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const c = Math.floor(cx * scaleX / cellSize);
    const r = Math.floor(cy * scaleY / cellSize);
    if (r < 0 || r >= GRID || c < 0 || c >= GRID) return null;
    return { r, c };
  }

  /* ── Paint cell ────────────────────────────────────────── */
  function handlePaint(r, c) {
    if (!gameActive) return;
    if (userGrid[r][c] !== 0) return;  // already painted
    const target = pattern[r][c];
    if (target === 0) return;  // background

    if (activeColor === target) {
      userGrid[r][c] = activeColor;
      filledCount++;
      flashList.push({ r, c, color: 'rgba(100,220,120,0.5)', until: Date.now() + 250 });
      highlightNextCell();
      updateProgress();
    } else {
      errors++;
      flashList.push({ r, c, color: 'rgba(255,80,80,0.6)', until: Date.now() + 350 });
      updateMeta();
    }
    draw();
    setTimeout(() => draw(), 360);
  }

  /* ── Update progress ───────────────────────────────────── */
  function updateProgress() {
    const pct = totalToFill > 0 ? Math.round(filledCount / totalToFill * 100) : 0;
    const pctEl = document.getElementById('pc-pct');
    if (pctEl) pctEl.textContent = pct + '%';
    const fill = document.getElementById('pc-progress-fill');
    if (fill) fill.style.width = pct + '%';
    const score = Math.max(0, pct * 100 - errors * 5);
    window.updateScore && window.updateScore(score);
    const scoreEl = document.getElementById('pc-score');
    if (scoreEl) scoreEl.textContent = score.toLocaleString();
    if (pct >= 100) {
      gameActive = false;
      const hintEl = document.getElementById('pc-hint');
      if (hintEl) hintEl.textContent = '🎉 완성했습니다!';
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('gameClear', { detail: { score } }));
        window.dispatchEvent(new CustomEvent('gameClear', { detail: { score } }));
      }, 400);
    }
  }

  function updateMeta() {
    const errEl = document.getElementById('pc-err');
    if (errEl) errEl.textContent = errors;
    const pct = totalToFill > 0 ? Math.round(filledCount / totalToFill * 100) : 0;
    const score = Math.max(0, pct * 100 - errors * 5);
    const scoreEl = document.getElementById('pc-score');
    if (scoreEl) scoreEl.textContent = score.toLocaleString();
    window.updateScore && window.updateScore(score);
  }

  /* ── Start Game ────────────────────────────────────────── */
  window.startGame = function (diffId, stage) {
    currentDiff  = diffId  || 'easy';
    currentStage = stage   || 1;
    activeColor  = 1;
    errors       = 0;
    filledCount  = 0;
    flashList    = [];
    highlightNext = null;
    gameActive   = false;

    const diffList = DIFF_MAP[currentDiff] || DIFF_MAP.easy;
    const idx = diffList[(currentStage - 1) % diffList.length];
    pattern = PATTERNS[idx];

    // count total to fill
    totalToFill = 0;
    for (let r = 0; r < GRID; r++)
      for (let c = 0; c < GRID; c++)
        if (pattern[r][c] > 0) totalToFill++;

    userGrid = Array.from({ length: GRID }, () => new Array(GRID).fill(0));

    buildUI();
    ctx = canvas.getContext('2d');
    computeLayout();

    // set active color button
    const firstBtn = document.querySelector('.pc-color-btn');
    if (firstBtn) firstBtn.classList.add('active');

    highlightNextCell();
    draw();
    gameActive = true;
    updateMeta();

    const nameEl = document.getElementById('pc-hint');
    if (nameEl) nameEl.textContent = `패턴: ${PATTERN_NAMES[idx]} | 색상을 선택하고 해당 번호 칸을 클릭!`;
  };

})();
