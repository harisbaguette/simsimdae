/* cookie-clicker/game.js — Cookie Clicker Idle Game */
(function () {
  'use strict';

  const CONFIG = window.GAME_CONFIG || { gameId: 'cookie-clicker' };
  const SAVE_KEY = 'idle_cookie-clicker';

  const UPGRADES = [
    { id:'cursor',  name:'커서',  emoji:'👆', baseCost:15,   cps:0.1,  desc:'자동으로 클릭합니다' },
    { id:'grandma', name:'할머니',emoji:'👵', baseCost:100,  cps:0.5,  desc:'열심히 구워드립니다' },
    { id:'farm',    name:'농장',  emoji:'🌾', baseCost:500,  cps:2,    desc:'쿠키 농장을 운영합니다' },
    { id:'mine',    name:'광산',  emoji:'⛏️', baseCost:2000, cps:8,    desc:'깊은 곳에서 쿠키를 캡니다' },
    { id:'factory', name:'공장',  emoji:'🏭', baseCost:8000, cps:20,   desc:'대량 생산합니다' },
  ];

  const ACHIEVEMENTS = [
    { threshold:100,       label:'🍪 쿠키 100개!',   msg:'쿠키 100개 달성!' },
    { threshold:1000,      label:'🍪 천 개 달성!',   msg:'쿠키 1,000개!' },
    { threshold:10000,     label:'🍪 만 개 달성!',   msg:'쿠키 10,000개!' },
    { threshold:100000,    label:'🍪 십만 달성!',    msg:'쿠키 100,000개!' },
    { threshold:1000000,   label:'🎂 백만 달성!',    msg:'백만 쿠키 달성! 게임 클리어!' },
  ];

  let root, gs, tickInterval, uiInterval;
  let achievedSet;

  function abbrev(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return Math.floor(n).toString();
  }

  function saveState() {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      cookies: gs.cookies,
      lifetime: gs.lifetime,
      clickPower: gs.clickPower,
      upgrades: gs.upgrades,
      lastSave: Date.now(),
    }));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  }

  function getTotalCPS() {
    return UPGRADES.reduce((sum, u) => {
      const count = gs.upgrades[u.id] || 0;
      return sum + u.cps * count;
    }, 0);
  }

  function getUpgradeCost(upg) {
    const count = gs.upgrades[upg.id] || 0;
    return Math.floor(upg.baseCost * Math.pow(1.15, count));
  }

  function showToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 20px;border-radius:20px;z-index:9999;font-size:15px;pointer-events:none;animation:cc-toast 2.5s forwards';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }

  function checkAchievements() {
    ACHIEVEMENTS.forEach(a => {
      if (gs.lifetime >= a.threshold && !achievedSet.has(a.threshold)) {
        achievedSet.add(a.threshold);
        showToast('🏆 ' + a.msg);
        if (a.threshold >= 1000000) {
          gs.cleared = true;
          document.dispatchEvent(new CustomEvent('gameClear', { detail: { score: Math.floor(gs.lifetime) } }));
        }
      }
    });
  }

  function init(fromSave) {
    root = document.getElementById('game-root');
    achievedSet = new Set();

    const css = document.createElement('style');
    css.textContent = `
      @keyframes cc-toast { 0%{opacity:0;transform:translateX(-50%) translateY(10px)} 15%,85%{opacity:1;transform:translateX(-50%) translateY(0)} 100%{opacity:0} }
      @keyframes cc-bounce { 0%,100%{transform:scale(1)} 50%{transform:scale(0.92)} }
      #cc-root { font-family:"Malgun Gothic",sans-serif; display:flex; gap:0; max-width:640px; margin:0 auto; border-radius:8px; overflow:hidden; border:2px solid #8B4513; }
      #cc-left { flex:1; background:linear-gradient(180deg,#3a1a00,#5a2a00); padding:20px 16px; display:flex; flex-direction:column; align-items:center; min-width:180px; }
      #cc-cookie { font-size:80px; cursor:pointer; user-select:none; transition:transform 0.1s; display:inline-block; text-shadow:0 4px 12px rgba(0,0,0,0.5); }
      #cc-cookie:hover { filter:brightness(1.1); }
      #cc-cookie:active { animation:cc-bounce 0.1s; }
      #cc-count { color:#ffe0b2; font-size:22px; font-weight:bold; margin:12px 0 4px; text-align:center; }
      #cc-cps { color:#ffcc80; font-size:14px; margin-bottom:8px; }
      #cc-click-power { color:#ffaa44; font-size:12px; margin-bottom:12px; }
      #cc-lifetime { color:#cc8844; font-size:11px; }
      #cc-right { width:240px; background:#fdf3e3; overflow-y:auto; max-height:500px; }
      #cc-shop-title { background:#8B4513; color:#fff; padding:10px 14px; font-size:15px; font-weight:bold; text-align:center; }
      .cc-upg { display:flex; align-items:center; gap:10px; padding:10px 12px; border-bottom:1px solid #f0dfc0; cursor:pointer; transition:background 0.1s; }
      .cc-upg:hover { background:#f5e8d0; }
      .cc-upg.cant { opacity:0.5; cursor:not-allowed; }
      .cc-upg-emoji { font-size:28px; flex-shrink:0; }
      .cc-upg-info { flex:1; min-width:0; }
      .cc-upg-name { font-size:14px; font-weight:bold; color:#4a2800; }
      .cc-upg-desc { font-size:11px; color:#888; }
      .cc-upg-cps  { font-size:11px; color:#4477aa; }
      .cc-upg-right { text-align:right; flex-shrink:0; }
      .cc-upg-cost { font-size:13px; font-weight:bold; color:#8B4513; }
      .cc-upg-count { font-size:11px; color:#888; }
    `;
    document.head.appendChild(css);

    root.innerHTML = `
      <div id="cc-root">
        <div id="cc-left">
          <div id="cc-cookie">🍪</div>
          <div id="cc-count">0</div>
          <div id="cc-cps">초당 0 쿠키</div>
          <div id="cc-click-power">클릭당 1 쿠키</div>
          <div id="cc-lifetime">총 획득: 0</div>
        </div>
        <div id="cc-right">
          <div id="cc-shop-title">🛒 업그레이드 상점</div>
          <div id="cc-shop"></div>
        </div>
      </div>
    `;

    // Events
    document.getElementById('cc-cookie').addEventListener('click', () => {
      gs.cookies += gs.clickPower;
      gs.lifetime += gs.clickPower;
      updateDisplay();
    });
    document.getElementById('cc-cookie').addEventListener('touchend', e => {
      e.preventDefault();
      gs.cookies += gs.clickPower;
      gs.lifetime += gs.clickPower;
      updateDisplay();
    });
  }

  function renderShop() {
    const shop = document.getElementById('cc-shop');
    shop.innerHTML = '';
    UPGRADES.forEach(u => {
      const cost = getUpgradeCost(u);
      const count = gs.upgrades[u.id] || 0;
      const canAfford = gs.cookies >= cost;
      const div = document.createElement('div');
      div.className = 'cc-upg' + (canAfford ? '' : ' cant');
      div.innerHTML = `
        <div class="cc-upg-emoji">${u.emoji}</div>
        <div class="cc-upg-info">
          <div class="cc-upg-name">${u.name}</div>
          <div class="cc-upg-desc">${u.desc}</div>
          <div class="cc-upg-cps">초당 ${u.cps} 쿠키</div>
        </div>
        <div class="cc-upg-right">
          <div class="cc-upg-cost">${abbrev(cost)}</div>
          <div class="cc-upg-count">보유: ${count}</div>
        </div>
      `;
      div.addEventListener('click', () => buyUpgrade(u));
      div.addEventListener('touchend', e => { e.preventDefault(); buyUpgrade(u); });
      shop.appendChild(div);
    });
  }

  function buyUpgrade(u) {
    const cost = getUpgradeCost(u);
    if (gs.cookies < cost) return;
    gs.cookies -= cost;
    gs.upgrades[u.id] = (gs.upgrades[u.id] || 0) + 1;
    updateDisplay();
  }

  function updateDisplay() {
    const cps = getTotalCPS();
    document.getElementById('cc-count').textContent = abbrev(gs.cookies) + ' 🍪';
    document.getElementById('cc-cps').textContent = `초당 ${cps.toFixed(1)} 쿠키`;
    document.getElementById('cc-click-power').textContent = `클릭당 ${gs.clickPower} 쿠키`;
    document.getElementById('cc-lifetime').textContent = `총 획득: ${abbrev(gs.lifetime)}`;
    renderShop();
    if (window.updateScore) window.updateScore(Math.floor(gs.lifetime));
    checkAchievements();
  }

  window.startGame = function (diffId = 'normal', stage = 1) {
    const saved = loadState();
    let offlineBonus = 0;

    if (saved) {
      const elapsed = Math.min((Date.now() - saved.lastSave) / 1000, 7200);
      gs = { cookies: saved.cookies, lifetime: saved.lifetime, clickPower: 1, upgrades: saved.upgrades || {}, cleared: false };
      const savedCPS = UPGRADES.reduce((s, u) => s + u.cps * (saved.upgrades[u.id] || 0), 0);
      offlineBonus = savedCPS * elapsed;
      gs.cookies += offlineBonus;
      gs.lifetime += offlineBonus;
    } else {
      gs = { cookies: 0, lifetime: 0, clickPower: 1, upgrades: {}, cleared: false };
    }

    UPGRADES.forEach(u => { if (!gs.upgrades[u.id]) gs.upgrades[u.id] = 0; });
    init(!!saved);
    updateDisplay();

    if (offlineBonus > 10) showToast(`💤 오프라인 수익: +${abbrev(offlineBonus)} 🍪`);

    clearInterval(tickInterval);
    clearInterval(uiInterval);

    tickInterval = setInterval(() => {
      const cps = getTotalCPS();
      const gain = cps / 20;
      gs.cookies += gain;
      gs.lifetime += gain;
    }, 50);

    uiInterval = setInterval(() => {
      updateDisplay();
      saveState();
    }, 1000);
  };
})();
