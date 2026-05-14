(function () {
  'use strict';

  /* ── Config ─────────────────────────────────────────── */
  const CFG = window.GAME_CONFIG || {};
  const root = document.getElementById('game-root');

  const DIFF_MAP = {
    easy:   { cols: 8,  rows: 12 },
    normal: { cols: 10, rows: 15 },
    hard:   { cols: 12, rows: 18 },
    expert: { cols: 15, rows: 20 },
  };

  /* ── State ───────────────────────────────────────────── */
  let score        = 0;
  let stage        = 1;
  let comboMult    = 1;
  let comboTimer   = null;
  let lastPopTime  = 0;
  let totalBubbles = 0;
  let poppedCount  = 0;
  let currentDiff  = 'normal';
  let clearing     = false;

  /* ── Inject global CSS once ──────────────────────────── */
  if (!document.getElementById('bbl-style')) {
    const style = document.createElement('style');
    style.id = 'bbl-style';
    style.textContent = `
      #bbl-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 12px;
        user-select: none;
        -webkit-user-select: none;
        touch-action: none;
      }
      #bbl-meta {
        display: flex;
        gap: 18px;
        font-size: 0.9rem;
        color: #555;
        margin-bottom: 4px;
      }
      #bbl-meta span { font-weight: 700; color: #1a8fa0; }
      #bbl-grid {
        display: grid;
        gap: 4px;
      }
      .bbl {
        width: 100%;
        aspect-ratio: 1;
        border-radius: 50%;
        background: radial-gradient(circle at 35% 35%,
          #a8e8f0 0%, #5cc8dc 45%, #2da8c0 100%);
        box-shadow: 0 2px 6px rgba(0,0,0,.18), inset 0 1px 2px rgba(255,255,255,.6);
        cursor: pointer;
        transition: transform 80ms ease;
        position: relative;
        overflow: visible;
      }
      .bbl:hover:not(.popped) { transform: scale(1.08); }
      .bbl.popped {
        animation: bbl-pop 280ms ease forwards;
        pointer-events: none;
      }
      @keyframes bbl-pop {
        0%   { transform: scale(1);   opacity: 1; }
        35%  { transform: scale(1.22); opacity: 1; }
        100% { transform: scale(0);   opacity: 0; }
      }
      #bbl-combo {
        font-size: 1.4rem;
        font-weight: 900;
        color: #e06000;
        min-height: 2rem;
        transition: opacity 300ms;
        letter-spacing: 1px;
      }
      .bbl-fresh {
        animation: bbl-appear 220ms ease both;
      }
      @keyframes bbl-appear {
        0%   { transform: scale(0); opacity: 0; }
        70%  { transform: scale(1.12); opacity: 1; }
        100% { transform: scale(1);   opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  /* ── Build grid DOM ──────────────────────────────────── */
  function buildGrid(diff) {
    const { cols, rows } = DIFF_MAP[diff] || DIFF_MAP.normal;
    root.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.id = 'bbl-wrap';

    // Meta bar
    const meta = document.createElement('div');
    meta.id = 'bbl-meta';
    meta.innerHTML = `스테이지: <span id="bbl-stage">${stage}</span>&nbsp;&nbsp;남은 버블: <span id="bbl-remaining">0</span>`;
    wrap.appendChild(meta);

    // Combo display
    const comboEl = document.createElement('div');
    comboEl.id = 'bbl-combo';
    wrap.appendChild(comboEl);

    // Grid
    const grid = document.createElement('div');
    grid.id = 'bbl-grid';

    // Responsive cell size: fit in ~360px wide viewport
    const maxW   = Math.min(root.offsetWidth || 360, 480);
    const cellPx = Math.floor((maxW - 12 * 2 - 4 * (cols - 1)) / cols);

    grid.style.gridTemplateColumns = `repeat(${cols}, ${cellPx}px)`;
    grid.style.gridTemplateRows    = `repeat(${rows}, ${cellPx}px)`;

    totalBubbles = cols * rows;
    poppedCount  = 0;

    for (let i = 0; i < totalBubbles; i++) {
      const bbl = document.createElement('div');
      bbl.className = 'bbl bbl-fresh';
      bbl.style.animationDelay = `${(i * 8)}ms`;

      bbl.addEventListener('pointerdown', onBubbleClick, { passive: true });
      grid.appendChild(bbl);
    }

    wrap.appendChild(grid);
    root.appendChild(wrap);
    updateRemaining();
  }

  /* ── Click handler ───────────────────────────────────── */
  function onBubbleClick(e) {
    if (clearing) return;
    const bbl = e.currentTarget;
    if (bbl.classList.contains('popped')) return;

    const now = Date.now();
    const gap = now - lastPopTime;

    // Combo logic
    if (gap < 400) {
      if (comboMult < 2) comboMult = 2;
      else if (comboMult < 3) comboMult = 3;
      else comboMult = 5;
    } else {
      comboMult = 1;
    }
    lastPopTime = now;

    // Reset combo decay timer
    clearTimeout(comboTimer);
    comboTimer = setTimeout(() => {
      comboMult = 1;
      updateComboDisplay();
    }, 600);

    // Pop
    bbl.classList.add('popped');
    poppedCount++;

    const pts = 10 * comboMult;
    score += pts;
    window.updateScore && window.updateScore(score);

    updateComboDisplay();
    updateRemaining();
    spawnScoreLabel(bbl, pts);

    // All popped?
    if (poppedCount >= totalBubbles) {
      clearing = true;
      window.dispatchEvent(new CustomEvent('gameClear', { detail: { score } }));
      setTimeout(() => {
        stage++;
        clearing = false;
        buildGrid(currentDiff);
        if (document.getElementById('bbl-stage')) {
          document.getElementById('bbl-stage').textContent = stage;
        }
      }, 800);
    }
  }

  /* ── Helpers ─────────────────────────────────────────── */
  function updateRemaining() {
    const el = document.getElementById('bbl-remaining');
    if (el) el.textContent = totalBubbles - poppedCount;
  }

  function updateComboDisplay() {
    const el = document.getElementById('bbl-combo');
    if (!el) return;
    if (comboMult > 1) {
      el.textContent = `×${comboMult} 콤보!`;
      el.style.opacity = '1';
    } else {
      el.textContent = '';
      el.style.opacity = '0';
    }
  }

  function spawnScoreLabel(bbl, pts) {
    const label = document.createElement('div');
    label.textContent = `+${pts}`;
    label.style.cssText = `
      position: absolute;
      top: -18px; left: 50%;
      transform: translateX(-50%);
      font-size: 0.75rem;
      font-weight: 900;
      color: #e06000;
      pointer-events: none;
      animation: bbl-score-up 600ms ease forwards;
      white-space: nowrap;
      z-index: 10;
    `;
    bbl.appendChild(label);

    if (!document.getElementById('bbl-score-anim')) {
      const s = document.createElement('style');
      s.id = 'bbl-score-anim';
      s.textContent = `@keyframes bbl-score-up {
        0%   { opacity:1; transform:translateX(-50%) translateY(0); }
        100% { opacity:0; transform:translateX(-50%) translateY(-22px); }
      }`;
      document.head.appendChild(s);
    }
  }

  /* ── Public API ──────────────────────────────────────── */
  window.startGame = function (diffId, stageNum) {
    score       = 0;
    stage       = stageNum || 1;
    comboMult   = 1;
    lastPopTime = 0;
    clearing    = false;
    currentDiff = diffId || 'normal';
    window.updateScore && window.updateScore(0);
    buildGrid(currentDiff);
  };

})();
