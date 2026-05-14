/* city-clicker/game.js — City Builder Idle/Clicker */
(function () {
  'use strict';

  const CONFIG = window.GAME_CONFIG || { gameId: 'city-clicker' };
  const SAVE_KEY = 'idle_city-clicker';

  const CANVAS_W = 480, CANVAS_H = 480;

  const BUILDING_TYPES = {
    empty: { name:'빈 땅', emoji:'🌿', cps:0, color:'#5a8a3e', baseCost:0 },
    house:    { name:'주택',  emoji:'🏠', cps:0.5,  color:'#e8c88a', baseCost:5,   pop:2 },
    shop:     { name:'상업',  emoji:'🏪', cps:2,    color:'#88c8e8', baseCost:20,  pop:0 },
    factory:  { name:'공장',  emoji:'🏭', cps:8,    color:'#aaa8a8', baseCost:50,  pop:0 },
  };

  // 3×3 grid layout on canvas
  const CELL_W = 140, CELL_H = 140, MARGIN_X = 30, MARGIN_Y = 20, GAP = 10;

  function cellRect(col, row) {
    return {
      x: MARGIN_X + col * (CELL_W + GAP),
      y: MARGIN_Y + row * (CELL_H + GAP),
      w: CELL_W, h: CELL_H,
    };
  }

  let canvas, ctx, root, gs, animFrame, tickInterval, saveInterval;
  let menuOpen = null; // { cellIdx, x, y }

  function saveState() {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      coins: gs.coins,
      totalCoins: gs.totalCoins,
      cells: gs.cells,
      population: gs.population,
      lastSave: Date.now(),
    }));
  }

  function loadState() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; }
  }

  function initState() {
    gs = {
      coins: 20, totalCoins: 0, population: 0, cleared: false,
      cells: Array(9).fill(null).map(() => ({ type: 'empty', level: 1 })),
    };
  }

  function getTotalCPS() {
    return gs.cells.reduce((s, c) => {
      const bt = BUILDING_TYPES[c.type];
      return s + (bt ? bt.cps * c.level : 0);
    }, 0);
  }

  function getPopulation() {
    return gs.cells.reduce((s, c) => {
      const bt = BUILDING_TYPES[c.type];
      return s + (bt && bt.pop ? bt.pop * c.level : 0);
    }, 0);
  }

  function getUpgradeCost(cell) {
    const bt = BUILDING_TYPES[cell.type];
    return Math.floor(bt.baseCost * 3 * cell.level);
  }

  function abbrev(n) {
    if (n >= 1e6) return (n/1e6).toFixed(2)+'M';
    if (n >= 1e3) return (n/1e3).toFixed(1)+'K';
    return Math.floor(n).toString();
  }

  function drawCell(col, row, hover) {
    const idx = row * 3 + col;
    const cell = gs.cells[idx];
    const { x, y, w, h } = cellRect(col, row);
    const bt = BUILDING_TYPES[cell.type];

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.roundRect(x+3, y+3, w, h, 12); ctx.fill();

    // Ground
    ctx.fillStyle = cell.type === 'empty' ? '#5a9a4e' : '#c8b88a';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill();

    // Hover glow
    if (hover) {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill();
    }

    // Building
    ctx.font = `${cell.type === 'empty' ? 36 : 44}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(bt.emoji, x + w / 2, y + h / 2 - 8);

    // Label
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(bt.name + (cell.level > 1 ? ` Lv${cell.level}` : ''), x + w / 2, y + h - 20);

    if (cell.type !== 'empty') {
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#ffe066';
      ctx.fillText(`${(bt.cps * cell.level).toFixed(1)}/초`, x + w / 2, y + h - 6);
    }
  }

  function drawHUD() {
    ctx.fillStyle = '#1a2a4a';
    ctx.fillRect(0, CANVAS_H - 48, CANVAS_W, 48);
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#ffe066';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`💰 ${abbrev(gs.coins)}`, 14, CANVAS_H - 24);
    ctx.fillStyle = '#88ddff';
    ctx.font = '13px sans-serif';
    ctx.fillText(`👥 인구 ${getPopulation()}`, 130, CANVAS_H - 24);
    ctx.fillStyle = '#88ffaa';
    ctx.fillText(`⚡ ${getTotalCPS().toFixed(1)}/초`, 260, CANVAS_H - 24);
    ctx.fillStyle = '#ffaaaa';
    ctx.fillText(`총: ${abbrev(gs.totalCoins)}`, 370, CANVAS_H - 24);
  }

  function drawMenu() {
    if (!menuOpen) return;
    const idx = menuOpen.cellIdx;
    const cell = gs.cells[idx];
    const col = idx % 3, row = Math.floor(idx / 3);
    const { x, y, w, h } = cellRect(col, row);

    const mx = Math.min(x, CANVAS_W - 190);
    const my = Math.min(y + h + 4, CANVAS_H - 200);

    ctx.fillStyle = 'rgba(10,20,50,0.95)';
    ctx.beginPath(); ctx.roundRect(mx, my, 185, cell.type === 'empty' ? 150 : 80, 10); ctx.fill();
    ctx.strokeStyle = '#4477ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(mx, my, 185, cell.type === 'empty' ? 150 : 80, 10); ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('건물 선택', mx + 10, my + 20);

    if (cell.type === 'empty') {
      let oy = my + 38;
      ['house', 'shop', 'factory'].forEach(tid => {
        const bt = BUILDING_TYPES[tid];
        const affordable = gs.coins >= bt.baseCost;
        ctx.fillStyle = affordable ? '#ffe066' : '#888';
        ctx.font = '13px sans-serif';
        ctx.fillText(`${bt.emoji} ${bt.name}  💰${bt.baseCost}  +${bt.cps}/초`, mx + 10, oy);
        oy += 30;
      });
    } else {
      const upgCost = getUpgradeCost(cell);
      const bt = BUILDING_TYPES[cell.type];
      const affordable = gs.coins >= upgCost;
      ctx.font = '13px sans-serif';
      ctx.fillStyle = affordable ? '#88ff88' : '#888';
      ctx.fillText(`⬆ 업그레이드  💰${abbrev(upgCost)}`, mx + 10, my + 40);
      ctx.fillStyle = '#ff8888';
      ctx.fillText(`🗑 철거`, mx + 10, my + 66);
    }
    menuOpen.mx = mx; menuOpen.my = my;
    menuOpen.empty = cell.type === 'empty';
  }

  function render(hoverIdx = -1) {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Sky gradient
    const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    bg.addColorStop(0, '#87ceeb');
    bg.addColorStop(0.5, '#c8e8f8');
    bg.addColorStop(0.5, '#3a7a2e');
    bg.addColorStop(1, '#2a6a1e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 3; col++)
        drawCell(col, row, hoverIdx === row * 3 + col);

    drawHUD();
    drawMenu();
  }

  function getHitIdx(cx, cy) {
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const { x, y, w, h } = cellRect(col, row);
        if (cx >= x && cx <= x + w && cy >= y && cy <= y + h) return row * 3 + col;
      }
    }
    return -1;
  }

  function handleMenuClick(cx, cy) {
    if (!menuOpen) return false;
    const { mx, my, empty, cellIdx } = menuOpen;
    if (cx < mx || cx > mx + 185) return false;
    if (cy < my || cy > my + (empty ? 150 : 80)) return false;

    const cell = gs.cells[cellIdx];
    if (empty) {
      const types = ['house', 'shop', 'factory'];
      const relY = cy - my - 38;
      const tIdx = Math.floor(relY / 30);
      if (tIdx >= 0 && tIdx < 3) {
        const tid = types[tIdx];
        const bt = BUILDING_TYPES[tid];
        if (gs.coins >= bt.baseCost) {
          gs.coins -= bt.baseCost;
          cell.type = tid;
          cell.level = 1;
          menuOpen = null;
        }
      }
    } else {
      const relY = cy - my;
      if (relY >= 28 && relY <= 52) {
        const cost = getUpgradeCost(cell);
        if (gs.coins >= cost) {
          gs.coins -= cost;
          cell.level++;
          menuOpen = null;
        }
      } else if (relY >= 54 && relY <= 78) {
        cell.type = 'empty';
        cell.level = 1;
        menuOpen = null;
      }
    }
    return true;
  }

  function handleClick(cx, cy) {
    if (handleMenuClick(cx, cy)) return;
    const idx = getHitIdx(cx, cy);
    if (idx >= 0) {
      menuOpen = menuOpen && menuOpen.cellIdx === idx ? null : { cellIdx: idx };
    } else {
      menuOpen = null;
    }
    if (window.updateScore) window.updateScore(Math.floor(gs.totalCoins));
  }

  function loop() {
    render();
    animFrame = requestAnimationFrame(loop);
  }

  function checkClear() {
    if (!gs.cleared && gs.totalCoins >= 1000) {
      gs.cleared = true;
      document.dispatchEvent(new CustomEvent('gameClear', { detail: { score: Math.floor(gs.totalCoins) } }));
    }
  }

  window.startGame = function (diffId = 'normal', stage = 1) {
    root = document.getElementById('game-root');
    root.innerHTML = '';

    const saved = loadState();
    if (saved) {
      const elapsed = Math.min((Date.now() - saved.lastSave) / 1000, 3600);
      gs = { coins: saved.coins, totalCoins: saved.totalCoins || 0, cells: saved.cells, cleared: false };
      const cps = gs.cells.reduce((s, c) => s + (BUILDING_TYPES[c.type]?.cps || 0) * c.level, 0);
      const bonus = cps * elapsed;
      gs.coins += bonus;
      gs.totalCoins += bonus;
    } else {
      initState();
    }

    root.innerHTML = `<canvas id="cc2-canvas" width="${CANVAS_W}" height="${CANVAS_H}" style="display:block;width:100%;max-width:480px;margin:0 auto;border-radius:8px;cursor:pointer"></canvas>`;
    canvas = document.getElementById('cc2-canvas');
    ctx = canvas.getContext('2d');

    canvas.addEventListener('click', e => {
      const r = canvas.getBoundingClientRect();
      const sx = CANVAS_W / r.width, sy = CANVAS_H / r.height;
      handleClick((e.clientX - r.left) * sx, (e.clientY - r.top) * sy);
    });
    canvas.addEventListener('touchend', e => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const t = e.changedTouches[0];
      const sx = CANVAS_W / r.width, sy = CANVAS_H / r.height;
      handleClick((t.clientX - r.left) * sx, (t.clientY - r.top) * sy);
    });

    cancelAnimationFrame(animFrame);
    loop();

    clearInterval(tickInterval);
    tickInterval = setInterval(() => {
      const gain = getTotalCPS() / 10;
      gs.coins += gain;
      gs.totalCoins += gain;
      checkClear();
    }, 100);

    clearInterval(saveInterval);
    saveInterval = setInterval(() => {
      saveState();
      if (window.updateScore) window.updateScore(Math.floor(gs.totalCoins));
    }, 5000);
  };
})();
