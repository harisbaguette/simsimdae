// Bubble Shooter — Game 8
// Classic hex-grid bubble shooter with cannon, wall bouncing, and combo scoring
(function () {
  'use strict';

  const ROOT = document.getElementById('game-root');

  // ── Canvas ─────────────────────────────────────────────────────────────────
  const CW = 420, CH = 640;

  // ── Hex grid config ────────────────────────────────────────────────────────
  const R = 18;           // bubble radius
  const DIAM = R * 2;
  const HEX_W = DIAM;
  const HEX_H = R * Math.sqrt(3);  // row height for hex grid

  const COLS_EVEN = Math.floor((CW - R) / HEX_W);  // 11
  const COLS_ODD  = COLS_EVEN - 1;
  const GRID_ROWS = 14; // playfield rows
  const GRID_OFFSET_X = R + 2;
  const GRID_OFFSET_Y = R + 4;

  // ── Colors ─────────────────────────────────────────────────────────────────
  const COLORS = ['#e74c3c','#3498db','#2ecc71','#f1c40f','#9b59b6','#e67e22'];
  const COLOR_GLOWS = ['#ff6666','#66aaff','#66ff99','#ffee66','#cc88ff','#ffaa44'];
  const NUM_COLORS = COLORS.length;

  // ── State ──────────────────────────────────────────────────────────────────
  let canvas, ctx, animId;
  let grid = [];         // grid[row][col] = colorIdx or -1 (empty)
  let projectile = null; // flying bubble
  let nextColor = 0;
  let currentColor = 0;
  let score = 0;
  let shotsUntilNewRow = 5;
  let shotsPerNewRow = 5;  // difficulty-adjusted reset value
  let running = false;
  let aimX = CW / 2, aimY = 100;
  let pops = [];         // pop animations
  let fallers = [];      // disconnected bubbles falling off
  let comboCount = 0;

  // ── Cannon ────────────────────────────────────────────────────────────────
  const CANNON_X = CW / 2;
  const CANNON_Y = CH - 55;
  let cannonAngle = -Math.PI / 2; // points up

  // ── Grid helpers ──────────────────────────────────────────────────────────
  function colsForRow(row) {
    return row % 2 === 0 ? COLS_EVEN : COLS_ODD;
  }

  function cellX(col, row) {
    const offset = row % 2 === 0 ? 0 : R;
    return GRID_OFFSET_X + col * HEX_W + offset;
  }

  function cellY(row) {
    return GRID_OFFSET_Y + row * HEX_H;
  }

  function initGrid() {
    grid = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      const cols = colsForRow(r);
      const row = [];
      for (let c = 0; c < cols; c++) {
        row.push(r < 5 ? (Math.random() * NUM_COLORS | 0) : -1);
      }
      grid.push(row);
    }
  }

  function addNewRow() {
    // Shift all rows down by 1 (push new row at top).
    // Because row parity determines column count (even=COLS_EVEN, odd=COLS_ODD),
    // we must copy cell values while respecting each destination row's column count.
    for (let r = GRID_ROWS - 1; r > 0; r--) {
      const destCols = colsForRow(r);
      const srcCols  = colsForRow(r - 1);
      const newRow = [];
      for (let c = 0; c < destCols; c++) {
        // Source row r-1 may have fewer or more columns; treat out-of-bounds as empty
        newRow.push(c < srcCols ? grid[r - 1][c] : -1);
      }
      grid[r] = newRow;
    }
    // Fill new top row
    const topCols = colsForRow(0);
    const newTop = [];
    for (let c = 0; c < topCols; c++) {
      newTop.push(Math.random() * NUM_COLORS | 0);
    }
    grid[0] = newTop;
  }

  function getCell(r, c) {
    if (r < 0 || r >= GRID_ROWS) return -1;
    if (c < 0 || c >= colsForRow(r)) return -1;
    return grid[r][c];
  }

  function setCell(r, c, val) {
    if (r < 0 || r >= GRID_ROWS) return;
    if (c < 0 || c >= colsForRow(r)) return;
    grid[r][c] = val;
  }

  // ── Hex neighbors ─────────────────────────────────────────────────────────
  function neighbors(r, c) {
    const result = [];
    if (r % 2 === 0) {
      // Even row
      const dirs = [[-1,-1],[-1,0],[0,-1],[0,1],[1,-1],[1,0]];
      dirs.forEach(([dr, dc]) => {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < colsForRow(nr)) {
          result.push([nr, nc]);
        }
      });
    } else {
      // Odd row
      const dirs = [[-1,0],[-1,1],[0,-1],[0,1],[1,0],[1,1]];
      dirs.forEach(([dr, dc]) => {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < colsForRow(nr)) {
          result.push([nr, nc]);
        }
      });
    }
    return result;
  }

  // ── BFS flood fill for match detection ────────────────────────────────────
  function findConnected(startR, startC, color) {
    const visited = new Set();
    const queue = [[startR, startC]];
    const key = (r, c) => r * 100 + c;
    visited.add(key(startR, startC));
    const result = [[startR, startC]];

    while (queue.length) {
      const [r, c] = queue.shift();
      for (const [nr, nc] of neighbors(r, c)) {
        const k = key(nr, nc);
        if (!visited.has(k) && getCell(nr, nc) === color) {
          visited.add(k);
          queue.push([nr, nc]);
          result.push([nr, nc]);
        }
      }
    }
    return result;
  }

  // ── Find all bubbles connected to top row ─────────────────────────────────
  function findAnchored() {
    const visited = new Set();
    const key = (r, c) => r * 100 + c;
    const queue = [];

    // Seed from top row
    for (let c = 0; c < colsForRow(0); c++) {
      if (getCell(0, c) !== -1) {
        const k = key(0, c);
        if (!visited.has(k)) {
          visited.add(k);
          queue.push([0, c]);
        }
      }
    }

    while (queue.length) {
      const [r, c] = queue.shift();
      for (const [nr, nc] of neighbors(r, c)) {
        const k = key(nr, nc);
        if (!visited.has(k) && getCell(nr, nc) !== -1) {
          visited.add(k);
          queue.push([nr, nc]);
        }
      }
    }
    return visited;
  }

  // ── Snap pixel → grid ──────────────────────────────────────────────────────
  function snapToGrid(px, py) {
    // Find nearest hex cell center
    let bestDist = Infinity, bestR = -1, bestC = -1;
    // Only check rows near py
    const nearRow = Math.round((py - GRID_OFFSET_Y) / HEX_H);
    for (let r = Math.max(0, nearRow - 2); r < Math.min(GRID_ROWS, nearRow + 3); r++) {
      const cols = colsForRow(r);
      for (let c = 0; c < cols; c++) {
        if (getCell(r, c) !== -1) continue;
        const cx2 = cellX(c, r), cy2 = cellY(r);
        const d = (px - cx2) ** 2 + (py - cy2) ** 2;
        if (d < bestDist) { bestDist = d; bestR = r; bestC = c; }
      }
    }
    return [bestR, bestC];
  }

  // ── Projectile ───────────────────────────────────────────────────────────
  function fireProjectile() {
    if (projectile) return;
    if (Math.abs(cannonAngle - (-Math.PI / 2)) < 0.05 && false) return; // allow straight up
    const SPEED = 8;
    projectile = {
      x: CANNON_X,
      y: CANNON_Y,
      vx: Math.cos(cannonAngle) * SPEED,
      vy: Math.sin(cannonAngle) * SPEED,
      color: currentColor,
      bounced: false,
    };
    currentColor = nextColor;
    nextColor = Math.random() * NUM_COLORS | 0;
  }

  function updateProjectile() {
    if (!projectile) return;
    projectile.x += projectile.vx;
    projectile.y += projectile.vy;

    // Bounce off walls
    if (projectile.x - R < 0) {
      projectile.x = R;
      projectile.vx = Math.abs(projectile.vx);
      if (!projectile.bounced) projectile.bounced = true;
    }
    if (projectile.x + R > CW) {
      projectile.x = CW - R;
      projectile.vx = -Math.abs(projectile.vx);
      if (!projectile.bounced) projectile.bounced = true;
    }

    // Hit top wall
    if (projectile.y - R <= GRID_OFFSET_Y) {
      placeProjectile(projectile.x, GRID_OFFSET_Y + R);
      return;
    }

    // Collision with grid bubbles
    const nearRow = Math.round((projectile.y - GRID_OFFSET_Y) / HEX_H);
    for (let r = Math.max(0, nearRow - 2); r < Math.min(GRID_ROWS, nearRow + 3); r++) {
      const cols = colsForRow(r);
      for (let c = 0; c < cols; c++) {
        if (getCell(r, c) === -1) continue;
        const bx = cellX(c, r), by = cellY(r);
        const dist = Math.sqrt((projectile.x - bx) ** 2 + (projectile.y - by) ** 2);
        if (dist < DIAM - 2) {
          placeProjectile(projectile.x, projectile.y);
          return;
        }
      }
    }

    // Out of bounds bottom
    if (projectile.y > CH + R) {
      projectile = null;
    }
  }

  function placeProjectile(px, py) {
    const col = projectile.color;
    projectile = null;

    const [r, c] = snapToGrid(px, py);
    if (r < 0 || c < 0) return;

    setCell(r, c, col);

    // Check matches
    const matched = findConnected(r, c, col);
    if (matched.length >= 3) {
      matched.forEach(([mr, mc]) => setCell(mr, mc, -1));

      // Find floaters
      const anchored = findAnchored();
      const floaters = [];
      for (let gr = 0; gr < GRID_ROWS; gr++) {
        for (let gc = 0; gc < colsForRow(gr); gc++) {
          if (getCell(gr, gc) !== -1 && !anchored.has(gr * 100 + gc)) {
            floaters.push([gr, gc, getCell(gr, gc)]);
            setCell(gr, gc, -1);
          }
        }
      }

      // Animate matched + floaters
      const allPopped = [...matched, ...floaters.map(([r2, c2]) => [r2, c2])];
      allPopped.forEach(([pr, pc]) => {
        const bx = cellX(pc, pr), by = cellY(pr);
        const bcolor = (matched.some(([mr, mc]) => mr === pr && mc === pc)) ? col : floaters.find(([r2, c2]) => r2 === pr && c2 === pc)?.[2] ?? col;
        pops.push({ x: bx, y: by, life: 1, r: R, color: bcolor });
        spawnBurst(bx, by, bcolor);
      });

      // Score
      const baseScore = matched.length * 10;
      const floaterScore = floaters.length * 20;
      comboCount++;
      const comboMult = Math.min(comboCount, 5);
      const gained = (baseScore + floaterScore) * comboMult;
      score += gained;
      if (typeof window.updateScore === 'function') window.updateScore(score);
    } else {
      comboCount = 0;
    }

    // Every 5 shots add new row
    shotsUntilNewRow--;
    if (shotsUntilNewRow <= 0) {
      addNewRow();
      shotsUntilNewRow = shotsPerNewRow;
    }

    // Check game over: any bubble in last grid row
    for (let c2 = 0; c2 < colsForRow(GRID_ROWS - 1); c2++) {
      if (getCell(GRID_ROWS - 1, c2) !== -1) {
        running = false;
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('gameOver', { detail: { score } }));
          document.dispatchEvent(new CustomEvent('gameOver', { detail: { score }, bubbles: true }));
        }, 500);
        return;
      }
    }
  }

  // ── Burst particles ───────────────────────────────────────────────────────
  const bursts = [];
  function spawnBurst(x, y, colorIdx) {
    const hsl = COLORS[colorIdx] || '#fff';
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 1.5 + Math.random() * 3;
      bursts.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.04 + Math.random() * 0.03,
        r: 3 + Math.random() * 4,
        color: hsl,
      });
    }
  }

  function updateBursts() {
    for (let i = bursts.length - 1; i >= 0; i--) {
      const p = bursts[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.1;
      p.life -= p.decay;
      if (p.life <= 0) bursts.splice(i, 1);
    }
  }

  function drawBursts() {
    bursts.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // ── Pop animations ────────────────────────────────────────────────────────
  function updatePops() {
    for (let i = pops.length - 1; i >= 0; i--) {
      pops[i].life -= 0.06;
      pops[i].r += 1.5;
      if (pops[i].life <= 0) pops.splice(i, 1);
    }
  }

  function drawPops() {
    pops.forEach(p => {
      const colorIdx = p.color;
      ctx.save();
      ctx.globalAlpha = p.life * 0.7;
      ctx.strokeStyle = COLORS[colorIdx] || '#fff';
      ctx.lineWidth = 3 * p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  // ── Draw bubble ───────────────────────────────────────────────────────────
  function drawBubble(x, y, colorIdx, alpha) {
    alpha = alpha !== undefined ? alpha : 1;
    const col   = COLORS[colorIdx]      || '#888';
    const glow  = COLOR_GLOWS[colorIdx] || '#fff';

    ctx.save();
    ctx.globalAlpha = alpha;

    // Outer glow
    ctx.shadowBlur = 8;
    ctx.shadowColor = glow;

    // Main circle
    const grad = ctx.createRadialGradient(x - R * 0.35, y - R * 0.35, R * 0.05, x, y, R);
    grad.addColorStop(0, lighten(col, 0.6));
    grad.addColorStop(0.5, col);
    grad.addColorStop(1, darken(col, 0.4));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, R - 1, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight
    ctx.shadowBlur = 0;
    const hgrad = ctx.createRadialGradient(x - R * 0.3, y - R * 0.3, 0, x - R * 0.3, y - R * 0.3, R * 0.5);
    hgrad.addColorStop(0, 'rgba(255,255,255,0.75)');
    hgrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hgrad;
    ctx.beginPath();
    ctx.arc(x, y, R - 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function lighten(hex, amount) {
    return blendHex(hex, '#ffffff', amount);
  }
  function darken(hex, amount) {
    return blendHex(hex, '#000000', amount);
  }
  function blendHex(hex1, hex2, t) {
    const p = (h) => parseInt(h.slice(1), 16);
    const a = p(hex1), b = p(hex2);
    const r = ((a >> 16) * (1 - t) + (b >> 16) * t) | 0;
    const g = (((a >> 8) & 0xff) * (1 - t) + ((b >> 8) & 0xff) * t) | 0;
    const bl = ((a & 0xff) * (1 - t) + (b & 0xff) * t) | 0;
    return `rgb(${r},${g},${bl})`;
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, CH);
    grad.addColorStop(0, '#0d0d1a');
    grad.addColorStop(1, '#1a0d2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CW, CH);

    // Side walls subtle glow
    ctx.fillStyle = 'rgba(100,80,200,0.05)';
    ctx.fillRect(0, 0, 4, CH);
    ctx.fillRect(CW - 4, 0, 4, CH);
  }

  function drawGrid() {
    for (let r = 0; r < GRID_ROWS; r++) {
      const cols = colsForRow(r);
      for (let c = 0; c < cols; c++) {
        const colorIdx = getCell(r, c);
        if (colorIdx === -1) continue;
        drawBubble(cellX(c, r), cellY(r), colorIdx);
      }
    }
  }

  function drawCannon() {
    ctx.save();
    ctx.translate(CANNON_X, CANNON_Y);
    ctx.rotate(cannonAngle + Math.PI / 2);

    // Barrel
    const bgrad = ctx.createLinearGradient(-10, -30, 10, -30);
    bgrad.addColorStop(0, '#888');
    bgrad.addColorStop(0.5, '#ddd');
    bgrad.addColorStop(1, '#888');
    ctx.fillStyle = bgrad;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(-9, -42, 18, 38, 4) : ctx.rect(-9, -42, 18, 38);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Base circle
    const cgrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
    cgrad.addColorStop(0, '#aaaacc');
    cgrad.addColorStop(1, '#444466');
    ctx.fillStyle = cgrad;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#666688';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  function drawAimLine() {
    ctx.save();
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(CANNON_X, CANNON_Y);

    // Simulate aim path including one wall bounce
    let ax = CANNON_X, ay = CANNON_Y;
    let avx = Math.cos(cannonAngle), avy = Math.sin(cannonAngle);
    let bounced = false;
    for (let i = 0; i < 500; i++) {
      ax += avx * 3;
      ay += avy * 3;
      if (ax - R < 0 && !bounced) { ax = R; avx = Math.abs(avx); bounced = true; }
      if (ax + R > CW && !bounced) { ax = CW - R; avx = -Math.abs(avx); bounced = true; }
      if (ay < GRID_OFFSET_Y + R) break;
      ctx.lineTo(ax, ay);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawProjectile() {
    if (!projectile) return;
    drawBubble(projectile.x, projectile.y, projectile.color);
  }

  function drawCurrentAndNext() {
    // Current bubble preview in cannon
    drawBubble(CANNON_X, CANNON_Y, currentColor, 0.85);

    // Next bubble preview bottom right
    const nx = CW - 40, ny = CANNON_Y;
    ctx.save();
    ctx.font = '11px "Segoe UI",sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('NEXT', nx, ny - R - 6);
    ctx.restore();
    drawBubble(nx, ny, nextColor, 0.7);
  }

  function drawHUD() {
    // Score
    ctx.save();
    ctx.font = 'bold 18px "Segoe UI",sans-serif';
    ctx.fillStyle = '#ffffcc';
    ctx.textAlign = 'right';
    ctx.fillText(`${score.toLocaleString()} 점`, CW - 70, CH - 12);
    ctx.textAlign = 'left';

    // Shots until new row
    ctx.font = '13px "Segoe UI",sans-serif';
    ctx.fillStyle = shotsUntilNewRow <= 2 ? '#ff8888' : '#aaaacc';
    ctx.fillText(`다음 줄: ${shotsUntilNewRow}`, 10, CH - 12);

    // Combo
    if (comboCount > 1) {
      ctx.font = `bold ${16 + comboCount * 2}px "Segoe UI",sans-serif`;
      ctx.fillStyle = `hsl(${comboCount * 40},100%,65%)`;
      ctx.textAlign = 'center';
      ctx.fillText(`${comboCount}x 콤보!`, CW / 2, CH - 12);
      ctx.textAlign = 'left';
    }

    ctx.restore();

    // Danger line
    const lastFilledRow = getLastFilledRow();
    if (lastFilledRow > GRID_ROWS - 4) {
      const alpha = (lastFilledRow - (GRID_ROWS - 4)) / 3;
      ctx.save();
      ctx.fillStyle = `rgba(255,50,50,${alpha * 0.15})`;
      ctx.fillRect(0, 0, CW, CH);
      ctx.restore();
    }
  }

  function getLastFilledRow() {
    for (let r = GRID_ROWS - 1; r >= 0; r--) {
      for (let c = 0; c < colsForRow(r); c++) {
        if (getCell(r, c) !== -1) return r;
      }
    }
    return 0;
  }

  // ── Main loop ─────────────────────────────────────────────────────────────
  function loop() {
    animId = requestAnimationFrame(loop);

    if (running) updateProjectile();
    updatePops();
    updateBursts();

    drawBackground();
    drawAimLine();
    drawGrid();
    drawPops();
    drawBursts();
    drawProjectile();
    drawCannon();
    drawCurrentAndNext();
    drawHUD();
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    const scaleX = CW / rect.width;
    const scaleY = CH / rect.height;
    return [(src.clientX - rect.left) * scaleX, (src.clientY - rect.top) * scaleY];
  }

  function updateAim(x, y) {
    const dx = x - CANNON_X, dy = y - CANNON_Y;
    cannonAngle = Math.atan2(dy, dx);
    // Clamp: prevent shooting downward or horizontal
    const minAngle = -Math.PI + 0.15;
    const maxAngle = -0.15;
    if (cannonAngle > maxAngle || cannonAngle < minAngle) {
      // Clamp to nearest valid angle
      if (cannonAngle > 0 && cannonAngle < Math.PI) {
        cannonAngle = (cannonAngle < Math.PI / 2) ? maxAngle : minAngle;
      }
    }
    cannonAngle = Math.max(minAngle, Math.min(maxAngle, cannonAngle));
  }

  function onMove(e) {
    e.preventDefault();
    const [x, y] = getCanvasPos(e);
    updateAim(x, y);
  }

  function onClick(e) {
    e.preventDefault();
    if (!running) return;
    const [x, y] = getCanvasPos(e);
    updateAim(x, y);
    if (!projectile) fireProjectile();
  }

  // ── Build UI ──────────────────────────────────────────────────────────────
  function buildUI() {
    ROOT.innerHTML = '';
    ROOT.style.cssText = 'display:flex;flex-direction:column;align-items:center;';

    canvas = document.createElement('canvas');
    canvas.width  = CW;
    canvas.height = CH;
    const maxW = Math.min(window.innerWidth - 16, CW);
    canvas.style.width  = maxW + 'px';
    canvas.style.height = (maxW * CH / CW) + 'px';
    canvas.style.borderRadius = '8px';
    canvas.style.border = '2px solid #334';
    canvas.style.display = 'block';
    canvas.style.cursor = 'crosshair';
    canvas.style.touchAction = 'none';

    ctx = canvas.getContext('2d');

    canvas.addEventListener('mousemove',  onMove, { passive: false });
    canvas.addEventListener('click',      onClick, { passive: false });
    canvas.addEventListener('touchmove',  onMove, { passive: false });
    canvas.addEventListener('touchstart', onClick, { passive: false });

    ROOT.appendChild(canvas);

    const hint = document.createElement('div');
    hint.style.cssText = 'margin-top:8px;font-size:12px;color:#556;text-align:center;';
    hint.textContent = '마우스·터치로 조준 후 클릭/탭으로 발사';
    ROOT.appendChild(hint);
  }

  // ── startGame ─────────────────────────────────────────────────────────────
  window.startGame = function (diffId) {
    if (animId) cancelAnimationFrame(animId);

    score = 0;
    comboCount = 0;
    shotsUntilNewRow = 5;
    projectile = null;
    pops.length = 0;
    bursts.length = 0;
    cannonAngle = -Math.PI / 2;
    running = true;

    // Difficulty: affects shots per new row and starting rows
    const startRows = { easy: 3, normal: 5, hard: 7, expert: 9 };
    const newRowShots = { easy: 7, normal: 5, hard: 4, expert: 3 };
    shotsPerNewRow = newRowShots[diffId] || 5;
    shotsUntilNewRow = shotsPerNewRow;

    currentColor = Math.random() * NUM_COLORS | 0;
    nextColor    = Math.random() * NUM_COLORS | 0;

    if (typeof window.updateScore === 'function') window.updateScore(0);

    initGrid();

    buildUI();
    requestAnimationFrame(loop);
  };

  const CFG = window.GAME_CONFIG || {};
  if (!CFG.gameId) window.startGame('normal');
})();
