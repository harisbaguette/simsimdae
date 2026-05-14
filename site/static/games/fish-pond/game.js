/* fish-pond/game.js — Virtual Fish Pond Idle Game */
(function () {
  'use strict';

  const CONFIG = window.GAME_CONFIG || { gameId: 'fish-pond' };
  const SAVE_KEY = 'idle_fish-pond';

  const CANVAS_W = 480, CANVAS_H = 400;

  const FISH_TYPES = {
    crucian:  { name:'붕어',   emoji:'🐟', color:'#cc8844', cps:0.2, cost:0,    maxHunger:30 },
    goldfish: { name:'금붕어', emoji:'🐠', color:'#ff8800', cps:0.5, cost:50,   maxHunger:25 },
    carp:     { name:'잉어',   emoji:'🐡', color:'#aa6622', cps:1.0, cost:150,  maxHunger:40 },
    tropical: { name:'열대어', emoji:'🦈', color:'#0088ff', cps:2.5, cost:400,  maxHunger:20 },
  };

  let canvas, ctx, root, gs, animFrame, tickInterval, saveInterval;

  // --- Fish animation state
  let fishObjs = []; // runtime only

  function saveState() {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      coins: gs.coins,
      totalCoins: gs.totalCoins,
      happiness: gs.happiness,
      fish: gs.fish,
      ownedTypes: gs.ownedTypes,
      lastSave: Date.now(),
    }));
  }

  function loadState() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; }
  }

  function initState() {
    gs = {
      coins: 0, totalCoins: 0, happiness: 0, cleared: false,
      fish: [{ type:'crucian', hunger:30, id:0 }],
      ownedTypes: { crucian:1 },
      lastSave: Date.now(),
      foodParticles: [],
      nextId: 1,
    };
  }

  function spawnFishObj(fish) {
    const angle = Math.random() * Math.PI * 2;
    return {
      id: fish.id,
      x: 80 + Math.random() * (CANVAS_W - 160),
      y: 90 + Math.random() * (CANVAS_H - 200),
      vx: Math.cos(angle) * 0.6,
      vy: Math.sin(angle) * 0.3,
      wander: Math.random() * Math.PI * 2,
      wanderSpeed: 0.015 + Math.random() * 0.02,
      scale: 0.8 + Math.random() * 0.5,
      flipT: 0,
    };
  }

  function syncFishObjs() {
    const existIds = new Set(fishObjs.map(f => f.id));
    gs.fish.forEach(f => {
      if (!existIds.has(f.id)) fishObjs.push(spawnFishObj(f));
    });
    const gsIds = new Set(gs.fish.map(f => f.id));
    fishObjs = fishObjs.filter(f => gsIds.has(f.id));
  }

  // Water wave animation
  let waveOffset = 0;

  function drawWater() {
    const WATER_TOP = 60;
    // Background sky
    const sky = ctx.createLinearGradient(0, 0, 0, WATER_TOP);
    sky.addColorStop(0, '#87ceeb');
    sky.addColorStop(1, '#b8e8f8');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CANVAS_W, WATER_TOP);

    // Water body
    const water = ctx.createLinearGradient(0, WATER_TOP, 0, CANVAS_H - 40);
    water.addColorStop(0, '#1a6ea8');
    water.addColorStop(1, '#0a3a6a');
    ctx.fillStyle = water;
    ctx.fillRect(0, WATER_TOP, CANVAS_W, CANVAS_H - WATER_TOP - 40);

    // Wavy surface
    ctx.beginPath();
    ctx.moveTo(0, WATER_TOP);
    for (let x = 0; x <= CANVAS_W; x += 4) {
      const y = WATER_TOP + Math.sin((x / 30) + waveOffset) * 4 + Math.sin((x / 18) + waveOffset * 1.3) * 2;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(CANVAS_W, 0); ctx.lineTo(0, 0); ctx.closePath();
    ctx.fillStyle = '#87ceeb';
    ctx.fill();

    // Wave highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x <= CANVAS_W; x += 4) {
      const y = WATER_TOP + Math.sin((x / 30) + waveOffset) * 4 + Math.sin((x / 18) + waveOffset * 1.3) * 2;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Sand bottom
    ctx.fillStyle = '#c8a870';
    ctx.fillRect(0, CANVAS_H - 44, CANVAS_W, 44);
    // Pebbles
    [[40,CANVAS_H-30,8],[120,CANVAS_H-26,5],[300,CANVAS_H-32,10],[420,CANVAS_H-28,7]].forEach(([x,y,r]) => {
      ctx.fillStyle = '#a09070'; ctx.beginPath(); ctx.ellipse(x, y, r, r*0.6, 0, 0, Math.PI*2); ctx.fill();
    });
  }

  function drawFish(fo, fishData) {
    const ft = FISH_TYPES[fishData.type];
    const scl = fo.scale;
    ctx.save();
    ctx.translate(fo.x, fo.y);
    if (fo.vx < 0) ctx.scale(-1, 1);
    ctx.scale(scl, scl);

    // Body
    ctx.fillStyle = ft.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tail
    ctx.fillStyle = ft.color;
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(-24, -8 + Math.sin(Date.now() / 200) * 3);
    ctx.lineTo(-24, 8 + Math.sin(Date.now() / 200) * 3);
    ctx.closePath();
    ctx.fill();

    // Eye
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(8, -3, 3.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(9, -3, 2, 0, Math.PI*2); ctx.fill();

    // Fin
    ctx.fillStyle = ft.color;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.quadraticCurveTo(6, -18, 10, -9);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Hunger warning
    const hungerPct = fishData.hunger / FISH_TYPES[fishData.type].maxHunger;
    if (hungerPct < 0.3) {
      ctx.font = '12px serif';
      ctx.fillText('😰', 0, -22);
    }

    ctx.restore();
  }

  function drawFishObjs() {
    fishObjs.forEach(fo => {
      const fd = gs.fish.find(f => f.id === fo.id);
      if (fd) drawFish(fo, fd);
    });
  }

  function drawFood() {
    gs.foodParticles.forEach(fp => {
      const age = (Date.now() - fp.born) / 1000;
      ctx.globalAlpha = Math.max(0, 1 - age / 2);
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(fp.x, fp.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  function drawHUD() {
    ctx.fillStyle = 'rgba(10,30,60,0.88)';
    ctx.fillRect(0, CANVAS_H - 44, CANVAS_W, 44);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#ffe066';
    ctx.fillText(`💰 ${Math.floor(gs.coins)}`, 10, CANVAS_H - 22);
    ctx.fillStyle = '#ff88aa';
    ctx.fillText(`😊 행복: ${Math.floor(gs.happiness)}/50`, 120, CANVAS_H - 22);
    ctx.fillStyle = '#88ddff';
    ctx.fillText(`🐟 물고기: ${gs.fish.length}마리`, 280, CANVAS_H - 22);
  }

  function render() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    waveOffset += 0.025;
    drawWater();
    drawFood();
    drawFishObjs();
    drawHUD();
  }

  function updateFishPhysics(dt) {
    const WATER_TOP = 62, WATER_BOT = CANVAS_H - 46;
    fishObjs.forEach(fo => {
      // Wander
      fo.wander += fo.wanderSpeed;
      fo.vx += Math.cos(fo.wander) * 0.04;
      fo.vy += Math.sin(fo.wander) * 0.02;

      // Seek food
      const nearFood = gs.foodParticles.find(fp => Math.hypot(fp.x - fo.x, fp.y - fo.y) < 60);
      if (nearFood) {
        const dx = nearFood.x - fo.x, dy = nearFood.y - fo.y;
        const d = Math.hypot(dx, dy) || 1;
        fo.vx += (dx / d) * 0.15;
        fo.vy += (dy / d) * 0.1;
        if (d < 12) {
          // Eat food
          gs.foodParticles = gs.foodParticles.filter(fp => fp !== nearFood);
          const fd = gs.fish.find(f => f.id === fo.id);
          if (fd) {
            fd.hunger = Math.min(FISH_TYPES[fd.type].maxHunger, fd.hunger + 8);
            gs.happiness = Math.min(50, gs.happiness + 1);
          }
        }
      }

      // Dampen & clamp speed
      fo.vx *= 0.97; fo.vy *= 0.97;
      const spd = Math.hypot(fo.vx, fo.vy);
      if (spd > 1.5) { fo.vx *= 1.5/spd; fo.vy *= 1.5/spd; }
      if (spd < 0.2) { fo.vx += (Math.random()-0.5)*0.1; fo.vy += (Math.random()-0.5)*0.05; }

      fo.x += fo.vx;
      fo.y += fo.vy;

      // Bounds
      if (fo.x < 20) { fo.x = 20; fo.vx = Math.abs(fo.vx); }
      if (fo.x > CANVAS_W - 20) { fo.x = CANVAS_W - 20; fo.vx = -Math.abs(fo.vx); }
      if (fo.y < WATER_TOP + 10) { fo.y = WATER_TOP + 10; fo.vy = Math.abs(fo.vy); }
      if (fo.y > WATER_BOT - 10) { fo.y = WATER_BOT - 10; fo.vy = -Math.abs(fo.vy); }
    });

    // Remove old food
    gs.foodParticles = gs.foodParticles.filter(fp => Date.now() - fp.born < 4000);
  }

  function tick() {
    // Fish produce coins based on happiness
    const happinessFactor = gs.happiness / 50;
    gs.fish.forEach(f => {
      const ft = FISH_TYPES[f.type];
      const rate = ft.cps * happinessFactor / 10; // per 100ms
      gs.coins += rate;
      gs.totalCoins += rate;

      // Hunger decrease
      f.hunger -= 0.05;
      if (f.hunger <= 0) {
        // Fish dies
        f.hunger = 0;
        gs.happiness = Math.max(0, gs.happiness - 3);
      }
    });

    // Remove dead fish (hunger 0 for too long — simplified: if 0, mark dead after 10 ticks)
    // (simplified: just leave at 0 hunger)

    if (window.updateScore) window.updateScore(Math.floor(gs.totalCoins));

    if (!gs.cleared && gs.happiness >= 50) {
      gs.cleared = true;
      document.dispatchEvent(new CustomEvent('gameClear', { detail: { score: Math.floor(gs.totalCoins) } }));
    }
  }

  function renderShopPanel() {
    const panel = document.getElementById('fp-panel');
    if (!panel) return;
    panel.innerHTML = `
      <div style="padding:10px 12px">
        <strong style="font-size:13px;color:#556">🛒 물고기 구매:</strong>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
          ${Object.entries(FISH_TYPES).filter(([id]) => id !== 'crucian').map(([id, ft]) => `
            <button class="fp-buy" data-id="${id}" ${gs.coins < ft.cost ? 'disabled' : ''}>
              ${ft.emoji} ${ft.name}<br><small>💰${ft.cost} | ${ft.cps}/초</small>
            </button>
          `).join('')}
        </div>
        <div style="margin-top:8px;font-size:12px;color:#888">화면을 클릭하면 먹이를 줍니다 🍞</div>
      </div>
    `;
    panel.querySelectorAll('.fp-buy').forEach(btn => {
      btn.addEventListener('click', () => buyFish(btn.dataset.id));
      btn.addEventListener('touchend', e => { e.preventDefault(); buyFish(btn.dataset.id); });
    });
  }

  function buyFish(typeId) {
    const ft = FISH_TYPES[typeId];
    if (gs.coins < ft.cost) return;
    gs.coins -= ft.cost;
    const newFish = { type: typeId, hunger: ft.maxHunger, id: gs.nextId++ };
    gs.fish.push(newFish);
    gs.ownedTypes[typeId] = (gs.ownedTypes[typeId] || 0) + 1;
    syncFishObjs();
    renderShopPanel();
  }

  function handleCanvasClick(cx, cy) {
    // Drop food
    gs.foodParticles.push({ x: cx, y: cy, born: Date.now() });
    // Add multiple food dots around
    for (let i = 0; i < 4; i++) {
      gs.foodParticles.push({
        x: cx + (Math.random()-0.5)*30,
        y: cy + (Math.random()-0.5)*20,
        born: Date.now(),
      });
    }
  }

  function loop() {
    updateFishPhysics();
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
        happiness: saved.happiness || 0,
        fish: saved.fish || [],
        ownedTypes: saved.ownedTypes || { crucian: 1 },
        cleared: false,
        foodParticles: [],
        nextId: Math.max(...(saved.fish || []).map(f => f.id || 0), 0) + 1,
        lastSave: Date.now(),
      };
    } else {
      initState();
    }

    const css = document.createElement('style');
    css.textContent = `
      #fp-wrap { font-family:"Malgun Gothic",sans-serif; max-width:480px; margin:0 auto; }
      #fp-panel { background:#e8f4ff; border:2px solid #8aaccc; border-top:none; border-radius:0 0 8px 8px; }
      .fp-buy { padding:6px 10px; background:#fff; border:2px solid #aac; border-radius:6px; cursor:pointer; font-size:12px; line-height:1.5; }
      .fp-buy:disabled { opacity:0.4; cursor:not-allowed; }
      .fp-buy:not(:disabled):hover { background:#e8f8ff; border-color:#4488ff; }
    `;
    document.head.appendChild(css);

    root.innerHTML = `
      <div id="fp-wrap">
        <canvas id="fp-canvas" width="${CANVAS_W}" height="${CANVAS_H}" style="display:block;width:100%;border-radius:8px 8px 0 0;border:2px solid #8aaccc;cursor:pointer"></canvas>
        <div id="fp-panel"></div>
      </div>
    `;

    canvas = document.getElementById('fp-canvas');
    ctx = canvas.getContext('2d');
    fishObjs = [];
    syncFishObjs();

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

    renderShopPanel();

    cancelAnimationFrame(animFrame);
    loop();

    clearInterval(tickInterval);
    tickInterval = setInterval(() => {
      tick();
      renderShopPanel();
    }, 100);

    clearInterval(saveInterval);
    saveInterval = setInterval(() => saveState(), 8000);
  };
})();
