// Sand Simulator — Game 5
// Cellular automata sandbox: Sand, Water, Fire, Wall, Erase
(function () {
  'use strict';

  const CFG = window.GAME_CONFIG || {};
  const ROOT = document.getElementById('game-root');

  // ── Constants ──────────────────────────────────────────────────────────────
  const COLS = 160;
  const ROWS = 120;
  const EMPTY = 0;
  const SAND  = 1;
  const WATER = 2;
  const FIRE  = 3;
  const WALL  = 4;
  const SMOKE = 5;

  // Base RGBA per material [r,g,b]
  const COLORS = {
    [EMPTY]: null,
    [SAND]:  () => [194 + (Math.random()*20|0), 160 + (Math.random()*20|0), 80  + (Math.random()*20|0)],
    [WATER]: () => [30  + (Math.random()*15|0), 100 + (Math.random()*20|0), 210 + (Math.random()*20|0)],
    [FIRE]:  () => [230 + (Math.random()*25|0), 80  + (Math.random()*80|0), 10],
    [WALL]:  () => [100, 100, 110],
    [SMOKE]: () => [160 + (Math.random()*30|0), 160 + (Math.random()*30|0), 160 + (Math.random()*30|0)],
  };

  // ── State ──────────────────────────────────────────────────────────────────
  let cells;      // Uint8Array — material type
  let color;      // Uint32Array — packed RGBA per cell (for ImageData)
  let life;       // Uint8Array  — fire lifetime counter
  let simSpeed = 1; // frames per update
  let selectedMat = SAND;
  let brushSize = 3;
  let particleCount = 0;
  let frameCount = 0;
  let animId;
  let imageData;
  let ctx;
  let canvas;
  let cellW, cellH; // pixel size of each cell

  // Mouse state
  let isPointerDown = false;
  let lastPX = -1, lastPY = -1;

  // ── Helpers ────────────────────────────────────────────────────────────────
  function idx(c, r) { return r * COLS + c; }

  function packColor(mat) {
    const fn = COLORS[mat];
    if (!fn) return 0;
    const [r, g, b] = fn();
    return (255 << 24) | (b << 16) | (g << 8) | r; // little-endian ABGR in ImageData
  }

  function setCell(c, r, mat) {
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
    const i = idx(c, r);
    cells[i] = mat;
    color[i] = mat === EMPTY ? 0 : packColor(mat);
    if (mat === FIRE) life[i] = 30 + (Math.random() * 20 | 0);
  }

  function isEmpty(c, r) {
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return false;
    return cells[idx(c, r)] === EMPTY;
  }

  function getCell(c, r) {
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return -1;
    return cells[idx(c, r)];
  }

  function swap(c1, r1, c2, r2) {
    const i1 = idx(c1, r1), i2 = idx(c2, r2);
    const tm = cells[i1]; cells[i1] = cells[i2]; cells[i2] = tm;
    const tc = color[i1]; color[i1] = color[i2]; color[i2] = tc;
    const tl = life[i1];  life[i1]  = life[i2];  life[i2]  = tl;
  }

  function countParticles() {
    let n = 0;
    for (let i = 0; i < cells.length; i++) if (cells[i] !== EMPTY) n++;
    return n;
  }

  // ── Simulation step ────────────────────────────────────────────────────────
  // Process bottom-to-top, alternating left/right direction each frame
  let dir = 1;
  function step() {
    dir = -dir;
    // We use a "processed" flag approach via a second pass array
    const processed = new Uint8Array(COLS * ROWS);

    for (let r = ROWS - 1; r >= 0; r--) {
      const startC = dir > 0 ? 0 : COLS - 1;
      const endC   = dir > 0 ? COLS : -1;
      for (let c = startC; c !== endC; c += dir) {
        const i = idx(c, r);
        if (processed[i]) continue;
        const mat = cells[i];

        if (mat === SAND) {
          // Fall down
          if (r < ROWS - 1 && isEmpty(c, r + 1)) {
            swap(c, r, c, r + 1);
            processed[idx(c, r + 1)] = 1;
          } else if (r < ROWS - 1) {
            // Try diagonal
            const dl = Math.random() < 0.5 ? -1 : 1;
            if (isEmpty(c + dl, r + 1)) {
              swap(c, r, c + dl, r + 1);
              processed[idx(c + dl, r + 1)] = 1;
            } else if (isEmpty(c - dl, r + 1)) {
              swap(c, r, c - dl, r + 1);
              processed[idx(c - dl, r + 1)] = 1;
            }
          }

        } else if (mat === WATER) {
          // Fall down first
          if (r < ROWS - 1 && isEmpty(c, r + 1)) {
            swap(c, r, c, r + 1);
            processed[idx(c, r + 1)] = 1;
          } else if (r < ROWS - 1) {
            // Diagonal
            const dl = Math.random() < 0.5 ? -1 : 1;
            if (isEmpty(c + dl, r + 1)) {
              swap(c, r, c + dl, r + 1);
              processed[idx(c + dl, r + 1)] = 1;
            } else if (isEmpty(c - dl, r + 1)) {
              swap(c, r, c - dl, r + 1);
              processed[idx(c - dl, r + 1)] = 1;
            } else {
              // Flow sideways
              const dl2 = Math.random() < 0.5 ? -1 : 1;
              if (isEmpty(c + dl2, r)) {
                swap(c, r, c + dl2, r);
                processed[idx(c + dl2, r)] = 1;
              } else if (isEmpty(c - dl2, r)) {
                swap(c, r, c - dl2, r);
                processed[idx(c - dl2, r)] = 1;
              }
            }
          } else {
            // At bottom, flow sideways
            const dl = Math.random() < 0.5 ? -1 : 1;
            if (isEmpty(c + dl, r)) {
              swap(c, r, c + dl, r);
              processed[idx(c + dl, r)] = 1;
            } else if (isEmpty(c - dl, r)) {
              swap(c, r, c - dl, r);
              processed[idx(c - dl, r)] = 1;
            }
          }

        } else if (mat === FIRE) {
          // Decrement lifetime
          life[i]--;
          if (life[i] <= 0) {
            // Turn into smoke briefly
            if (Math.random() < 0.3) {
              cells[i] = SMOKE;
              color[i] = packColor(SMOKE);
              life[i] = 20 + (Math.random() * 15 | 0);
            } else {
              cells[i] = EMPTY;
              color[i] = 0;
            }
            processed[i] = 1;
            continue;
          }
          // Refresh color for flicker
          color[i] = packColor(FIRE);

          // Rise upward (sometimes)
          if (r > 0 && isEmpty(c, r - 1) && Math.random() < 0.3) {
            swap(c, r, c, r - 1);
            processed[idx(c, r - 1)] = 1;
          }

          // Spread: ignite adjacent sand / empty
          const neighbors = [
            [c - 1, r], [c + 1, r],
            [c, r - 1], [c, r + 1],
            [c - 1, r - 1], [c + 1, r - 1],
          ];
          for (const [nc, nr] of neighbors) {
            if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
            const ni = idx(nc, nr);
            if (cells[ni] === SAND && Math.random() < 0.012) {
              cells[ni] = FIRE;
              color[ni] = packColor(FIRE);
              life[ni] = 30 + (Math.random() * 25 | 0);
              processed[ni] = 1;
            }
            if (cells[ni] === EMPTY && Math.random() < 0.005 && r > 0) {
              cells[ni] = FIRE;
              color[ni] = packColor(FIRE);
              life[ni] = 15 + (Math.random() * 15 | 0);
              processed[ni] = 1;
            }
          }

        } else if (mat === SMOKE) {
          life[i]--;
          if (life[i] <= 0) {
            cells[i] = EMPTY;
            color[i] = 0;
            processed[i] = 1;
            continue;
          }
          color[i] = packColor(SMOKE);
          // Rise upward
          if (r > 0) {
            const dl = Math.random() < 0.5 ? -1 : 1;
            if (isEmpty(c, r - 1) && Math.random() < 0.5) {
              swap(c, r, c, r - 1);
              processed[idx(c, r - 1)] = 1;
            } else if (isEmpty(c + dl, r - 1) && Math.random() < 0.3) {
              swap(c, r, c + dl, r - 1);
              processed[idx(c + dl, r - 1)] = 1;
            }
          }
        }
      }
    }
  }

  // ── Rendering ──────────────────────────────────────────────────────────────
  function render() {
    const data32 = new Uint32Array(imageData.data.buffer);
    for (let i = 0; i < COLS * ROWS; i++) {
      if (cells[i] === EMPTY) {
        data32[i] = 0xFF1a1a2e; // background dark blue
      } else {
        data32[i] = color[i] | 0xFF000000;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    // Scale up to canvas display size
    ctx.imageSmoothingEnabled = false;
  }

  // ── Paint ──────────────────────────────────────────────────────────────────
  function paintAt(px, py) {
    const c = (px / cellW) | 0;
    const r = (py / cellH) | 0;
    for (let dc = -brushSize; dc <= brushSize; dc++) {
      for (let dr = -brushSize; dr <= brushSize; dr++) {
        if (dc * dc + dr * dr <= brushSize * brushSize) {
          const nc = c + dc, nr = r + dr;
          if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
          if (selectedMat === EMPTY) {
            setCell(nc, nr, EMPTY);
          } else if (selectedMat !== WALL || getCell(nc, nr) !== WALL) {
            // Don't overwrite wall with non-erase unless placing wall
            if (getCell(nc, nr) !== WALL || selectedMat === WALL) {
              setCell(nc, nr, selectedMat);
            }
          } else {
            setCell(nc, nr, selectedMat);
          }
        }
      }
    }
  }

  function paintLine(x0, y0, x1, y1) {
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      paintAt(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx)  { err += dx; y0 += sy; }
    }
  }

  // ── Pointer events ─────────────────────────────────────────────────────────
  function getPos(e, el) {
    const r = el.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return [src.clientX - r.left, src.clientY - r.top];
  }

  function onPointerDown(e) {
    e.preventDefault();
    isPointerDown = true;
    const [x, y] = getPos(e, canvas);
    lastPX = x; lastPY = y;
    paintAt(x, y);
  }

  function onPointerMove(e) {
    e.preventDefault();
    if (!isPointerDown) return;
    const [x, y] = getPos(e, canvas);
    paintLine(lastPX, lastPY, x, y);
    lastPX = x; lastPY = y;
  }

  function onPointerUp(e) {
    isPointerDown = false;
    lastPX = -1; lastPY = -1;
  }

  // ── Loop ──────────────────────────────────────────────────────────────────
  function loop() {
    animId = requestAnimationFrame(loop);
    frameCount++;
    for (let s = 0; s < simSpeed; s++) step();
    render();
    // Update particle count every 15 frames
    if (frameCount % 15 === 0) {
      particleCount = countParticles();
      const pc = document.getElementById('ss-pcount');
      if (pc) pc.textContent = '입자: ' + particleCount.toLocaleString();
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function initGrid() {
    cells = new Uint8Array(COLS * ROWS);
    color = new Uint32Array(COLS * ROWS);
    life  = new Uint8Array(COLS * ROWS);
  }

  function buildUI() {
    ROOT.innerHTML = '';
    ROOT.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px;user-select:none;';

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;justify-content:center;padding:6px;background:#16213e;border-radius:8px;';

    const mats = [
      { id: SAND,  label: '🏖 모래',  color: '#c8a050' },
      { id: WATER, label: '💧 물',    color: '#3a7ad5' },
      { id: FIRE,  label: '🔥 불',    color: '#e05020' },
      { id: WALL,  label: '🧱 벽',    color: '#707080' },
      { id: EMPTY, label: '🧹 지우기', color: '#444466' },
    ];

    const btns = {};
    mats.forEach(m => {
      const btn = document.createElement('button');
      btn.textContent = m.label;
      btn.style.cssText = `padding:6px 12px;border:2px solid ${m.color};border-radius:6px;background:${m.id === selectedMat ? m.color : '#1e1e3a'};color:#fff;cursor:pointer;font-size:13px;transition:all .15s;`;
      btn.addEventListener('click', () => {
        selectedMat = m.id;
        mats.forEach(mm => {
          const b = btns[mm.id];
          if (b) b.style.background = mm.id === m.id ? mm.color : '#1e1e3a';
        });
      });
      btns[m.id] = btn;
      toolbar.appendChild(btn);
    });

    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.textContent = '🗑 초기화';
    resetBtn.style.cssText = 'padding:6px 12px;border:2px solid #884444;border-radius:6px;background:#1e1e3a;color:#ff8888;cursor:pointer;font-size:13px;transition:all .15s;';
    resetBtn.addEventListener('click', () => { initGrid(); });
    toolbar.appendChild(resetBtn);

    // Particle count
    const pcount = document.createElement('span');
    pcount.id = 'ss-pcount';
    pcount.style.cssText = 'display:flex;align-items:center;padding:0 8px;color:#aaa;font-size:12px;';
    pcount.textContent = '입자: 0';
    toolbar.appendChild(pcount);

    ROOT.appendChild(toolbar);

    // Canvas wrapper (for scaling)
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;border:2px solid #333355;border-radius:4px;overflow:hidden;cursor:crosshair;touch-action:none;';

    canvas = document.createElement('canvas');
    // Display size
    const maxW = Math.min(window.innerWidth - 32, 640);
    const maxH = Math.min(window.innerHeight - 160, 480);
    const scaleX = maxW / COLS;
    const scaleY = maxH / ROWS;
    const scale = Math.min(scaleX, scaleY);
    const dispW = (COLS * scale) | 0;
    const dispH = (ROWS * scale) | 0;

    canvas.width  = COLS;
    canvas.height = ROWS;
    canvas.style.width  = dispW + 'px';
    canvas.style.height = dispH + 'px';
    canvas.style.imageRendering = 'pixelated';

    cellW = COLS / dispW;  // grid cells per display pixel
    cellH = ROWS / dispH;

    ctx = canvas.getContext('2d');
    imageData = ctx.createImageData(COLS, ROWS);

    // Events
    canvas.addEventListener('mousedown',  onPointerDown, { passive: false });
    canvas.addEventListener('mousemove',  onPointerMove, { passive: false });
    canvas.addEventListener('mouseup',    onPointerUp);
    canvas.addEventListener('mouseleave', onPointerUp);
    canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    canvas.addEventListener('touchmove',  onPointerMove, { passive: false });
    canvas.addEventListener('touchend',   onPointerUp);

    wrapper.appendChild(canvas);
    ROOT.appendChild(wrapper);

    // Hint text
    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:12px;color:#666;text-align:center;';
    hint.textContent = '클릭·드래그로 재료를 칠하세요';
    ROOT.appendChild(hint);
  }

  // ── startGame ─────────────────────────────────────────────────────────────
  window.startGame = function (diffId) {
    if (animId) cancelAnimationFrame(animId);

    // Sim speed by difficulty
    const speedMap = { easy: 1, normal: 2, hard: 3, expert: 4 };
    simSpeed = speedMap[diffId] || 2;

    initGrid();
    buildUI();
    loop();
  };

  // Auto-start if embedded without template
  if (!CFG.gameId) {
    window.startGame('normal');
  }
})();
