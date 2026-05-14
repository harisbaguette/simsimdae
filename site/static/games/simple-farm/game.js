/* simple-farm/game.js — Simple Farming Idle Game */
(function () {
  'use strict';

  const CONFIG = window.GAME_CONFIG || { gameId: 'simple-farm' };
  const SAVE_KEY = 'idle_simple-farm';

  const CROPS = {
    carrot: { name:'당근', emoji:'🥕', cost:5,   reward:12,  growTime:5000,  color:'#ff8800' },
    potato: { name:'감자', emoji:'🥔', cost:8,   reward:22,  growTime:10000, color:'#cc8844' },
    wheat:  { name:'밀',   emoji:'🌾', cost:12,  reward:35,  growTime:15000, color:'#ddaa00' },
    corn:   { name:'옥수수',emoji:'🌽', cost:20,  reward:60,  growTime:25000, color:'#ffcc00' },
    tomato: { name:'토마토',emoji:'🍅', cost:30,  reward:90,  growTime:35000, color:'#ff4444' },
    melon:  { name:'참외', emoji:'🍈', cost:50,  reward:150, growTime:50000, color:'#aacc44' },
  };

  const PLOT_COUNT = 6;
  const CANVAS_W = 480, CANVAS_H = 400;

  let canvas, ctx, root, gs, animFrame, tickInterval, saveInterval;
  let autoHarvestInterval = null;

  // Plot layout
  const PLOTS = [];
  for (let i = 0; i < PLOT_COUNT; i++) {
    const col = i % 3, row = Math.floor(i / 3);
    PLOTS.push({
      x: 20 + col * 148,
      y: 30 + row * 160,
      w: 130, h: 140,
    });
  }

  function saveState() {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      coins: gs.coins,
      totalCoins: gs.totalCoins,
      plots: gs.plots.map(p => ({
        cropId: p.cropId,
        plantedAt: p.plantedAt,
        ready: p.ready,
      })),
      autoHarvest: gs.autoHarvest,
      lastSave: Date.now(),
    }));
  }

  function loadState() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; }
  }

  function initState() {
    gs = {
      coins: 30, totalCoins: 0, plots: [], selectedCrop: 'carrot',
      autoHarvest: false, cleared: false,
    };
    for (let i = 0; i < PLOT_COUNT; i++) gs.plots.push({ cropId: null, plantedAt: 0, ready: false });
  }

  function growthPct(plot) {
    if (!plot.cropId || plot.ready) return plot.ready ? 1 : 0;
    const crop = CROPS[plot.cropId];
    return Math.min(1, (Date.now() - plot.plantedAt) / crop.growTime);
  }

  function drawPlot(i, hover) {
    const p = PLOTS[i];
    const plot = gs.plots[i];
    const pct = growthPct(plot);

    // Ground
    ctx.fillStyle = '#8B5E3C';
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.w, p.h, 10);
    ctx.fill();

    ctx.fillStyle = '#6B3F1E';
    ctx.fillRect(p.x + 6, p.y + 6, p.w - 12, p.h - 12);

    // Tilled rows
    ctx.strokeStyle = '#7B4E2E';
    ctx.lineWidth = 2;
    for (let r = 0; r < 4; r++) {
      const ry = p.y + 20 + r * 26;
      ctx.beginPath();
      ctx.moveTo(p.x + 10, ry);
      ctx.lineTo(p.x + p.w - 10, ry);
      ctx.stroke();
    }

    if (hover) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, 10); ctx.fill();
    }

    if (!plot.cropId) {
      // Empty — show add icon
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '32px serif';
      ctx.textAlign = 'center';
      ctx.fillText('+', p.x + p.w / 2, p.y + p.h / 2 + 12);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#ffddaa';
      ctx.fillText('씨앗 심기', p.x + p.w / 2, p.y + p.h - 14);
    } else {
      const crop = CROPS[plot.cropId];
      if (plot.ready) {
        // Full grown — emoji + harvest prompt
        ctx.font = '40px serif';
        ctx.textAlign = 'center';
        ctx.fillText(crop.emoji, p.x + p.w / 2, p.y + 70);
        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = '#88ff88';
        ctx.fillText('수확하기!', p.x + p.w / 2, p.y + 100);
        ctx.fillStyle = `rgba(100,255,100,${0.3 + 0.15 * Math.sin(Date.now() / 300)})`;
        ctx.beginPath(); ctx.roundRect(p.x + 8, p.y + 106, p.w - 16, 22, 6); ctx.fill();
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.fillText(`+${crop.reward} 코인`, p.x + p.w / 2, p.y + 121);
      } else {
        // Growing
        const stage = pct < 0.33 ? '🌱' : pct < 0.66 ? '🌿' : crop.emoji.slice(0,2) || '🌾';
        const h = 20 + pct * 34;
        ctx.font = `${h}px serif`;
        ctx.textAlign = 'center';
        ctx.fillText(stage, p.x + p.w / 2, p.y + 50 + pct * 30);
        // Progress bar
        const bx = p.x + 10, by = p.y + p.h - 24, bw = p.w - 20;
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.roundRect(bx, by, bw, 10, 5); ctx.fill();
        ctx.fillStyle = crop.color;
        ctx.beginPath(); ctx.roundRect(bx, by, bw * pct, 10, 5); ctx.fill();
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.fillText(Math.floor(pct * 100) + '%', p.x + p.w / 2, by + 9);
        // Crop name
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#ffddaa';
        ctx.fillText(crop.name, p.x + p.w / 2, p.y + p.h - 10);
      }
    }
  }

  function drawHUD() {
    ctx.fillStyle = '#2a5e1e';
    ctx.fillRect(0, CANVAS_H - 50, CANVAS_W, 50);
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#ffe066';
    ctx.textAlign = 'left';
    ctx.fillText(`💰 ${gs.coins} 코인`, 14, CANVAS_H - 26);
    ctx.fillStyle = '#aaffaa';
    ctx.font = '12px sans-serif';
    ctx.fillText(`총 수익: ${gs.totalCoins}`, 14, CANVAS_H - 10);
    ctx.textAlign = 'right';
    ctx.fillStyle = gs.autoHarvest ? '#88ff88' : '#ff8888';
    ctx.font = '12px sans-serif';
    ctx.fillText(gs.autoHarvest ? '🤖 자동수확 ON' : '🤖 자동수확 OFF', CANVAS_W - 10, CANVAS_H - 26);
  }

  function render() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    bg.addColorStop(0, '#87ceeb');
    bg.addColorStop(0.6, '#98fb98');
    bg.addColorStop(0.6, '#5a8a3e');
    bg.addColorStop(1, '#3d6b2a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Sun
    ctx.fillStyle = '#ffe066';
    ctx.beginPath(); ctx.arc(420, 40, 28, 0, Math.PI * 2); ctx.fill();

    // Clouds
    function cloud(x, y) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 20, y - 6, 22, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 42, y, 16, 0, Math.PI * 2); ctx.fill();
    }
    cloud(30, 35); cloud(180, 50);

    for (let i = 0; i < PLOT_COUNT; i++) drawPlot(i, false);
    drawHUD();
  }

  function renderPanel() {
    const panel = document.getElementById('sf-panel');
    if (!panel) return;
    panel.innerHTML = `
      <div style="padding:10px 12px;">
        <strong style="font-size:13px;color:#555">씨앗 선택:</strong>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
          ${Object.entries(CROPS).map(([id, c]) => `
            <button class="sf-seed${gs.selectedCrop === id ? ' sel' : ''}" data-id="${id}">
              ${c.emoji} ${c.name}<br>
              <small>💰${c.cost} → +${c.reward}</small>
            </button>
          `).join('')}
        </div>
        <div style="margin-top:10px;display:flex;gap:8px">
          <button id="sf-auto-btn" style="padding:6px 12px;background:${gs.autoHarvest ? '#4CAF50' : '#888'};color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">
            ${gs.autoHarvest ? '🤖 자동수확 ON' : '🤖 자동수확 구매 (200코인)'}
          </button>
        </div>
      </div>
    `;
    panel.querySelectorAll('.sf-seed').forEach(btn => {
      btn.addEventListener('click', () => { gs.selectedCrop = btn.dataset.id; renderPanel(); });
      btn.addEventListener('touchend', e => { e.preventDefault(); gs.selectedCrop = btn.dataset.id; renderPanel(); });
    });
    const autoBtn = document.getElementById('sf-auto-btn');
    if (autoBtn) {
      autoBtn.addEventListener('click', toggleAuto);
      autoBtn.addEventListener('touchend', e => { e.preventDefault(); toggleAuto(); });
    }
  }

  function toggleAuto() {
    if (gs.autoHarvest) return;
    if (gs.coins >= 200) {
      gs.coins -= 200;
      gs.autoHarvest = true;
      startAutoHarvest();
      renderPanel();
    }
  }

  function startAutoHarvest() {
    clearInterval(autoHarvestInterval);
    if (!gs.autoHarvest) return;
    autoHarvestInterval = setInterval(() => {
      gs.plots.forEach((plot, i) => {
        if (plot.ready && plot.cropId) {
          const crop = CROPS[plot.cropId];
          gs.coins += crop.reward;
          gs.totalCoins += crop.reward;
          plot.cropId = null;
          plot.ready = false;
          checkClear();
        }
      });
    }, 5000);
  }

  function handleCanvasClick(cx, cy) {
    for (let i = 0; i < PLOT_COUNT; i++) {
      const p = PLOTS[i];
      if (cx >= p.x && cx <= p.x + p.w && cy >= p.y && cy <= p.y + p.h) {
        const plot = gs.plots[i];
        if (plot.ready && plot.cropId) {
          // Harvest
          const crop = CROPS[plot.cropId];
          gs.coins += crop.reward;
          gs.totalCoins += crop.reward;
          plot.cropId = null;
          plot.ready = false;
          checkClear();
        } else if (!plot.cropId) {
          // Plant
          const crop = CROPS[gs.selectedCrop];
          if (gs.coins >= crop.cost) {
            gs.coins -= crop.cost;
            plot.cropId = gs.selectedCrop;
            plot.plantedAt = Date.now();
            plot.ready = false;
          }
        }
        renderPanel();
        break;
      }
    }
    if (window.updateScore) window.updateScore(gs.totalCoins);
  }

  function checkClear() {
    if (!gs.cleared && gs.totalCoins >= 500) {
      gs.cleared = true;
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('gameClear', { detail: { score: gs.totalCoins } }));
      }, 300);
    }
  }

  function tick() {
    gs.plots.forEach(plot => {
      if (plot.cropId && !plot.ready) {
        const crop = CROPS[plot.cropId];
        if (Date.now() - plot.plantedAt >= crop.growTime) {
          plot.ready = true;
        }
      }
    });
  }

  function loop() {
    tick();
    render();
    animFrame = requestAnimationFrame(loop);
  }

  window.startGame = function (diffId = 'normal', stage = 1) {
    root = document.getElementById('game-root');
    root.innerHTML = '';

    const saved = loadState();
    if (saved) {
      gs = {
        coins: saved.coins,
        totalCoins: saved.totalCoins || 0,
        plots: [],
        selectedCrop: 'carrot',
        autoHarvest: saved.autoHarvest || false,
        cleared: false,
      };
      const now = Date.now();
      saved.plots.forEach((sp, i) => {
        const plot = { cropId: sp.cropId, plantedAt: sp.plantedAt, ready: sp.ready };
        // Calculate offline growth
        if (plot.cropId && !plot.ready) {
          const elapsed = Math.min(now - saved.lastSave, 30 * 60 * 1000);
          const crop = CROPS[plot.cropId];
          if (now - plot.plantedAt >= crop.growTime) plot.ready = true;
        }
        gs.plots.push(plot);
      });
      while (gs.plots.length < PLOT_COUNT) gs.plots.push({ cropId: null, plantedAt: 0, ready: false });
    } else {
      initState();
    }

    const css = document.createElement('style');
    css.textContent = `
      #sf-wrap { font-family:"Malgun Gothic",sans-serif; max-width:480px; margin:0 auto; }
      #sf-panel { background:#f5f5e8; border:2px solid #aab080; border-top:none; border-radius:0 0 8px 8px; }
      .sf-seed { padding:6px 10px; background:#fff; border:2px solid #ccc; border-radius:6px; cursor:pointer; font-size:12px; line-height:1.5; }
      .sf-seed.sel { border-color:#4CAF50; background:#e8ffe8; }
      .sf-seed:hover { background:#f5fff5; }
    `;
    document.head.appendChild(css);

    root.innerHTML = `
      <div id="sf-wrap">
        <canvas id="sf-canvas" width="${CANVAS_W}" height="${CANVAS_H}" style="display:block;width:100%;border-radius:8px 8px 0 0;border:2px solid #aab080;cursor:pointer"></canvas>
        <div id="sf-panel"></div>
      </div>
    `;

    canvas = document.getElementById('sf-canvas');
    ctx = canvas.getContext('2d');

    canvas.addEventListener('click', e => {
      const r = canvas.getBoundingClientRect();
      const sx = CANVAS_W / r.width, sy = CANVAS_H / r.height;
      handleCanvasClick((e.clientX - r.left) * sx, (e.clientY - r.top) * sy);
    });
    canvas.addEventListener('touchend', e => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const t = e.changedTouches[0];
      const sx = CANVAS_W / r.width, sy = CANVAS_H / r.height;
      handleCanvasClick((t.clientX - r.left) * sx, (t.clientY - r.top) * sy);
    });

    renderPanel();
    if (gs.autoHarvest) startAutoHarvest();

    cancelAnimationFrame(animFrame);
    loop();

    clearInterval(saveInterval);
    saveInterval = setInterval(() => {
      saveState();
      if (window.updateScore) window.updateScore(gs.totalCoins);
    }, 5000);
  };
})();
