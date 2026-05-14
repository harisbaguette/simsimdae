/* space-miner/game.js — Space Mining Idle/Clicker */
(function () {
  'use strict';

  const CONFIG = window.GAME_CONFIG || { gameId: 'space-miner' };
  const SAVE_KEY = 'idle_space-miner';

  const CANVAS_W = 480, CANVAS_H = 400;

  const RESOURCES = {
    iron:    { name:'철광석',   emoji:'🪨', color:'#a89080', value:1  },
    gold:    { name:'금',       emoji:'🟡', color:'#ffd700', value:5  },
    crystal: { name:'크리스탈', emoji:'💎', color:'#88eeff', value:15 },
    plasma:  { name:'플라즈마', emoji:'⚡', color:'#ff88ff', value:40 },
  };

  const UPGRADES = [
    { id:'drill',   name:'드릴 업그레이드', emoji:'⛏️', baseCost:{ iron:50 },              desc:'클릭당 채굴량 +1',   effect:'click' },
    { id:'robot',   name:'채굴 로봇',       emoji:'🤖', baseCost:{ iron:100, gold:10 },     desc:'자동 채굴 (1/sec)',  effect:'auto'  },
    { id:'scanner', name:'스캐너',          emoji:'📡', baseCost:{ gold:30, crystal:5 },    desc:'희귀 자원 확률 +',  effect:'rare'  },
    { id:'warp',    name:'워프 드라이브',   emoji:'🚀', baseCost:{ crystal:20, plasma:2 },  desc:'새 행성 개방',      effect:'planet' },
  ];

  const PLANETS = [
    { name:'소행성대', color:'#888',   bg:'#0a0a1e', res:['iron'],                      unlock:0     },
    { name:'화성',     color:'#cc5522',bg:'#1a0a0a', res:['iron','gold'],               unlock:100   },
    { name:'토성',     color:'#ddbb88',bg:'#0a0a2a', res:['iron','gold','crystal'],     unlock:500   },
    { name:'은하계',   color:'#aaaaff',bg:'#02020a', res:['gold','crystal','plasma'],   unlock:2000  },
  ];

  let canvas, ctx, root, gs, animFrame, tickInterval, saveInterval;
  let asteroids = [];
  let particles = [];
  let robots = [];
  let stars = [];

  function saveState() {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      resources: gs.resources,
      totalValue: gs.totalValue,
      upgradeLevels: gs.upgradeLevels,
      currentPlanet: gs.currentPlanet,
      clickPower: gs.clickPower,
      lastSave: Date.now(),
    }));
  }

  function loadState() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; } }

  function initState() {
    gs = {
      resources: { iron:0, gold:0, crystal:0, plasma:0 },
      totalValue: 0,
      upgradeLevels: { drill:0, robot:0, scanner:0, warp:0 },
      currentPlanet: 0,
      clickPower: 1,
      cleared: false,
    };
  }

  function genStars() {
    stars = [];
    for (let i = 0; i < 80; i++) {
      stars.push({ x:Math.random()*CANVAS_W, y:Math.random()*(CANVAS_H-50), r:Math.random()*1.5+0.3, twinkle:Math.random()*Math.PI*2 });
    }
  }

  function genAsteroids(planet) {
    const resPool = PLANETS[planet].res;
    asteroids = [];
    const count = 6 + planet * 2;
    for (let i = 0; i < count; i++) {
      const res = resPool[Math.floor(Math.random() * resPool.length)];
      const r = RESOURCES[res];
      asteroids.push({
        x: 40 + Math.random() * (CANVAS_W - 80),
        y: 40 + Math.random() * (CANVAS_H - 120),
        radius: 18 + Math.random() * 20,
        color: r.color,
        resId: res,
        hp: 3 + Math.floor(Math.random() * 5),
        maxHp: 8,
        wobble: Math.random() * Math.PI * 2,
        vx: (Math.random()-0.5)*0.3,
        vy: (Math.random()-0.5)*0.2,
        id: Math.random(),
      });
    }
  }

  function spawnParticle(x, y, color) {
    for (let i = 0; i < 5; i++) {
      particles.push({
        x, y, color,
        vx: (Math.random()-0.5)*3,
        vy: (Math.random()-0.5)*3 - 1,
        life: 1, decay: 0.04+Math.random()*0.04,
      });
    }
  }

  function spawnRobots(n) {
    robots = [];
    for (let i = 0; i < n; i++) {
      robots.push({
        x: 10 + Math.random()*60,
        y: CANVAS_H - 80 + Math.random()*20,
        target: null,
        timer: 0,
      });
    }
  }

  function drawBackground() {
    const planet = PLANETS[gs.currentPlanet];
    ctx.fillStyle = planet.bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Stars
    stars.forEach(s => {
      s.twinkle += 0.03;
      const a = 0.4 + 0.6 * Math.abs(Math.sin(s.twinkle));
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
    });

    // Planet name
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = planet.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`🪐 ${planet.name}`, 10, 24);
  }

  function drawAsteroids() {
    asteroids.forEach(a => {
      a.wobble += 0.015;
      a.x += a.vx + Math.sin(a.wobble) * 0.1;
      a.y += a.vy + Math.cos(a.wobble * 0.7) * 0.05;

      if (a.x < 30) { a.x = 30; a.vx = Math.abs(a.vx); }
      if (a.x > CANVAS_W - 30) { a.x = CANVAS_W - 30; a.vx = -Math.abs(a.vx); }
      if (a.y < 30) { a.y = 30; a.vy = Math.abs(a.vy); }
      if (a.y > CANVAS_H - 80) { a.y = CANVAS_H - 80; a.vy = -Math.abs(a.vy); }

      // Body
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.wobble * 0.3);
      ctx.fillStyle = a.color;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      const sides = 7;
      for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const r = a.radius * (0.75 + 0.25 * Math.sin(i * 2.3 + a.id * 10));
        i === 0 ? ctx.moveTo(Math.cos(angle)*r, Math.sin(angle)*r) : ctx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();

      // HP bar
      const bw = a.radius * 2;
      const bx = a.x - a.radius, by = a.y + a.radius + 4;
      ctx.fillStyle = '#333'; ctx.fillRect(bx, by, bw, 4);
      const hpPct = a.hp / a.maxHp;
      ctx.fillStyle = hpPct > 0.5 ? '#44ff44' : hpPct > 0.25 ? '#ffaa00' : '#ff4444';
      ctx.fillRect(bx, by, bw * hpPct, 4);

      // Emoji
      const res = RESOURCES[a.resId];
      ctx.font = '14px serif';
      ctx.textAlign = 'center';
      ctx.fillText(res.emoji, a.x, a.y + 5);
    });
  }

  function drawParticles() {
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      p.life -= p.decay;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    particles = particles.filter(p => p.life > 0);
  }

  function drawRobots() {
    robots.forEach(r => {
      ctx.font = '18px serif';
      ctx.textAlign = 'center';
      ctx.fillText('🤖', r.x, r.y);
    });
  }

  function drawHUD() {
    ctx.fillStyle = 'rgba(0,0,30,0.88)';
    ctx.fillRect(0, CANVAS_H - 46, CANVAS_W, 46);

    const res = gs.resources;
    const entries = [
      [RESOURCES.iron.emoji,   Math.floor(res.iron)],
      [RESOURCES.gold.emoji,   Math.floor(res.gold)],
      [RESOURCES.crystal.emoji,Math.floor(res.crystal)],
      [RESOURCES.plasma.emoji, Math.floor(res.plasma)],
    ];
    ctx.textBaseline = 'middle';
    ctx.font = '13px sans-serif';
    entries.forEach(([em, val], i) => {
      const x = 10 + i * 116;
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.fillText(`${em} ${val}`, x, CANVAS_H - 23);
    });

    ctx.fillStyle = '#ffe066';
    ctx.textAlign = 'right';
    ctx.fillText(`💰 총가치: ${Math.floor(gs.totalValue)}`, CANVAS_W - 8, CANVAS_H - 23);
  }

  function render() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawBackground();
    drawAsteroids();
    drawParticles();
    drawRobots();
    drawHUD();
  }

  function mineAsteroid(a, amount) {
    const res = RESOURCES[a.resId];
    const rareBonus = gs.upgradeLevels.scanner > 0 && Math.random() < 0.1 * gs.upgradeLevels.scanner ? 2 : 1;
    const mined = amount * rareBonus;
    gs.resources[a.resId] = (gs.resources[a.resId] || 0) + mined;
    gs.totalValue += mined * res.value;
    spawnParticle(a.x, a.y, res.color);

    a.hp -= amount;
    if (a.hp <= 0) {
      // Respawn
      const planet = PLANETS[gs.currentPlanet];
      const newRes = planet.res[Math.floor(Math.random() * planet.res.length)];
      a.resId = newRes;
      a.color = RESOURCES[newRes].color;
      a.hp = 3 + Math.floor(Math.random() * 5);
      a.maxHp = a.hp;
      a.x = 40 + Math.random() * (CANVAS_W - 80);
      a.y = 40 + Math.random() * (CANVAS_H - 120);
    }

    if (!gs.cleared && gs.totalValue >= 10000) {
      gs.cleared = true;
      document.dispatchEvent(new CustomEvent('gameClear', { detail: { score: Math.floor(gs.totalValue) } }));
    }
    if (window.updateScore) window.updateScore(Math.floor(gs.totalValue));
  }

  function handleCanvasClick(cx, cy) {
    for (const a of asteroids) {
      const d = Math.hypot(cx - a.x, cy - a.y);
      if (d < a.radius + 6) {
        mineAsteroid(a, gs.clickPower);
        return;
      }
    }
  }

  function robotTick() {
    const n = gs.upgradeLevels.robot;
    if (n === 0) return;
    if (robots.length !== n) spawnRobots(n);

    robots.forEach(robot => {
      robot.timer++;
      if (robot.timer >= 30) { // every ~3s at 10fps tick
        robot.timer = 0;
        if (asteroids.length > 0) {
          const target = asteroids[Math.floor(Math.random() * asteroids.length)];
          mineAsteroid(target, 1);
        }
      }
    });
  }

  function tick() {
    robotTick();
    // Check planet unlock
    const newPlanet = PLANETS.findIndex((p, i) => i > gs.currentPlanet && gs.totalValue >= p.unlock);
    if (newPlanet > gs.currentPlanet && gs.upgradeLevels.warp > 0) {
      gs.currentPlanet = newPlanet;
      genAsteroids(gs.currentPlanet);
    }
  }

  function renderUpgradePanel() {
    const panel = document.getElementById('sm-panel');
    if (!panel) return;
    panel.innerHTML = `
      <div style="padding:10px 12px">
        <strong style="font-size:13px;color:#445">⚙️ 업그레이드:</strong>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px">
          ${UPGRADES.map(u => {
            const level = gs.upgradeLevels[u.id] || 0;
            const costMulti = Math.pow(2, level);
            const costStr = Object.entries(u.baseCost).map(([res, amt]) => {
              const total = Math.ceil(amt * costMulti);
              const have = Math.floor(gs.resources[res] || 0);
              return `${RESOURCES[res].emoji}${total}`;
            }).join(' ');
            const canAfford = Object.entries(u.baseCost).every(([res, amt]) => {
              return (gs.resources[res] || 0) >= Math.ceil(amt * costMulti);
            });
            return `
              <button class="sm-upg" data-id="${u.id}" ${canAfford ? '' : 'disabled'}>
                ${u.emoji} ${u.name} Lv${level}<br>
                <small>${u.desc}</small><br>
                <small style="color:#888">${costStr}</small>
              </button>`;
          }).join('')}
        </div>
        <div style="margin-top:8px;font-size:12px;color:#888">소행성을 클릭하여 채굴하세요!</div>
      </div>
    `;
    panel.querySelectorAll('.sm-upg').forEach(btn => {
      btn.addEventListener('click', () => buyUpgrade(btn.dataset.id));
      btn.addEventListener('touchend', e => { e.preventDefault(); buyUpgrade(btn.dataset.id); });
    });
  }

  function buyUpgrade(id) {
    const u = UPGRADES.find(x => x.id === id);
    if (!u) return;
    const level = gs.upgradeLevels[id] || 0;
    const costMulti = Math.pow(2, level);
    const canAfford = Object.entries(u.baseCost).every(([res, amt]) => (gs.resources[res] || 0) >= Math.ceil(amt * costMulti));
    if (!canAfford) return;
    Object.entries(u.baseCost).forEach(([res, amt]) => {
      gs.resources[res] -= Math.ceil(amt * costMulti);
    });
    gs.upgradeLevels[id] = level + 1;
    if (u.effect === 'click') gs.clickPower = 1 + gs.upgradeLevels.drill;
    if (u.effect === 'auto') spawnRobots(gs.upgradeLevels.robot);
    renderUpgradePanel();
  }

  function loop() {
    render();
    animFrame = requestAnimationFrame(loop);
  }

  window.startGame = function (diffId = 'normal', stage = 1) {
    root = document.getElementById('game-root');
    root.innerHTML = '';

    const saved = loadState();
    if (saved) {
      gs = {
        resources: saved.resources || { iron:0, gold:0, crystal:0, plasma:0 },
        totalValue: saved.totalValue || 0,
        upgradeLevels: saved.upgradeLevels || { drill:0, robot:0, scanner:0, warp:0 },
        currentPlanet: saved.currentPlanet || 0,
        clickPower: 1 + (saved.upgradeLevels?.drill || 0),
        cleared: false,
      };
    } else {
      initState();
    }

    const css = document.createElement('style');
    css.textContent = `
      #sm-wrap { font-family:"Malgun Gothic",sans-serif; max-width:480px; margin:0 auto; }
      #sm-panel { background:#e8eeff; border:2px solid #8899cc; border-top:none; border-radius:0 0 8px 8px; }
      .sm-upg { padding:6px 8px; background:#fff; border:2px solid #bbc; border-radius:6px; cursor:pointer; font-size:12px; line-height:1.5; text-align:left; }
      .sm-upg:disabled { opacity:0.4; cursor:not-allowed; }
      .sm-upg:not(:disabled):hover { background:#e8e8ff; border-color:#6677ff; }
    `;
    document.head.appendChild(css);

    root.innerHTML = `
      <div id="sm-wrap">
        <canvas id="sm-canvas" width="${CANVAS_W}" height="${CANVAS_H}" style="display:block;width:100%;border-radius:8px 8px 0 0;border:2px solid #8899cc;cursor:crosshair"></canvas>
        <div id="sm-panel"></div>
      </div>
    `;

    canvas = document.getElementById('sm-canvas');
    ctx = canvas.getContext('2d');
    particles = [];
    genStars();
    genAsteroids(gs.currentPlanet);

    if (gs.upgradeLevels.robot > 0) spawnRobots(gs.upgradeLevels.robot);
    else robots = [];

    canvas.addEventListener('click', e => {
      const r = canvas.getBoundingClientRect();
      const sx = CANVAS_W / r.width, sy = CANVAS_H / r.height;
      handleCanvasClick((e.clientX - r.left) * sx, (e.clientY - r.top) * sy);
      renderUpgradePanel();
    });
    canvas.addEventListener('touchend', e => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const t = e.changedTouches[0];
      const sx = CANVAS_W / r.width, sy = CANVAS_H / r.height;
      handleCanvasClick((t.clientX - r.left) * sx, (t.clientY - r.top) * sy);
      renderUpgradePanel();
    });

    renderUpgradePanel();

    cancelAnimationFrame(animFrame);
    loop();

    clearInterval(tickInterval);
    tickInterval = setInterval(() => {
      tick();
      renderUpgradePanel();
    }, 300);

    clearInterval(saveInterval);
    saveInterval = setInterval(() => saveState(), 8000);
  };
})();
