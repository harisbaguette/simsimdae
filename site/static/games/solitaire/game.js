/* Klondike Solitaire - solitaire/game.js */
(function () {
  'use strict';

  const CONFIG = window.GAME_CONFIG || { gameId: 'solitaire', difficulties: [], hasLeaderboard: false, scoreType: 'high' };

  // Card constants
  const SUITS = ['♠','♥','♦','♣'];
  const SUIT_COLORS = { '♠': '#1a1a2e', '♥': '#c0392b', '♦': '#c0392b', '♣': '#1a1a2e' };
  const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const RANK_VAL = { A:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,10:10,J:11,Q:12,K:13 };

  function isRed(suit) { return suit === '♥' || suit === '♦'; }

  // Game state
  let root, canvas, ctx, difficulty, stage;
  let stock, waste, foundations, tableau;
  let score, startTime, timerInterval;
  let dragging = null; // { cards, fromPile, fromIdx, ox, oy, x, y }
  let animating = false;
  let autoCompleteActive = false;

  // Layout constants (computed)
  let CW, CH, GAP, TOP_Y, TAB_Y, TAB_STEP, W, H;

  function calcLayout() {
    const avail = Math.min(root.clientWidth - 8, 680);
    GAP = Math.floor(avail * 0.013);
    CW = Math.floor((avail - GAP * 8) / 7);
    CH = Math.floor(CW * 1.45);
    W = CW * 7 + GAP * 8;
    TOP_Y = GAP;
    TAB_Y = TOP_Y + CH + GAP * 2;
    TAB_STEP = Math.floor(CH * 0.28);
    H = TAB_Y + CH + TAB_STEP * 18 + GAP * 2;
  }

  /* ── Deck ────────────────────────────────────────────── */
  function makeDeck() {
    const deck = [];
    for (const suit of SUITS)
      for (const rank of RANKS)
        deck.push({ suit, rank, faceUp: false });
    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function deal() {
    const deck = makeDeck();
    tableau = Array.from({ length: 7 }, () => []);
    // Standard Klondike: col i gets (i+1) cards — i face-down then 1 face-up on top
    for (let col = 0; col < 7; col++) {
      for (let i = 0; i < col; i++) {
        const card = deck.pop();
        card.faceUp = false;
        tableau[col].push(card);
      }
      const topCard = deck.pop();
      topCard.faceUp = true;
      tableau[col].push(topCard);
    }
    stock = deck.map(c => ({ ...c, faceUp: false }));
    waste = [];
    foundations = [[], [], [], []];
  }

  /* ── Score helpers ───────────────────────────────────── */
  function addScore(n) {
    score += n;
    if (score < 0) score = 0;
    if (typeof window.updateScore === 'function') window.updateScore(score);
  }

  /* ── Drawing ─────────────────────────────────────────── */
  const CORNER_R = 6;

  function drawCard(card, x, y, highlight) {
    ctx.save();
    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;

    // Card background
    ctx.fillStyle = '#fff';
    if (highlight) ctx.fillStyle = '#fffbe6';
    roundRect(ctx, x, y, CW, CH, CORNER_R);
    ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

    // Border
    ctx.strokeStyle = highlight ? '#f59e0b' : '#d1d5db';
    ctx.lineWidth = highlight ? 2 : 1;
    roundRect(ctx, x, y, CW, CH, CORNER_R);
    ctx.stroke();

    if (!card.faceUp) {
      // Back pattern
      ctx.fillStyle = '#3b4f8e';
      roundRect(ctx, x + 3, y + 3, CW - 6, CH - 6, CORNER_R - 2);
      ctx.fill();
      ctx.fillStyle = '#4c63b6';
      const sz = Math.floor(CW / 5);
      for (let r = 0; r < 5; r++)
        for (let c = 0; c < 4; c++)
          if ((r + c) % 2 === 0) {
            ctx.fillRect(x + 4 + c * sz, y + 4 + r * sz, sz - 2, sz - 2);
          }
      ctx.restore();
      return;
    }

    const color = SUIT_COLORS[card.suit];
    const fontSize = Math.max(9, Math.floor(CW * 0.26));
    const suitSize = Math.max(10, Math.floor(CW * 0.32));

    ctx.fillStyle = color;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(card.rank, x + 4, y + 2);
    ctx.font = `${Math.floor(fontSize * 0.85)}px sans-serif`;
    ctx.fillText(card.suit, x + 4, y + fontSize + 2);

    // Bottom-right mirror
    ctx.save();
    ctx.translate(x + CW, y + CH);
    ctx.rotate(Math.PI);
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(card.rank, 4, 2);
    ctx.font = `${Math.floor(fontSize * 0.85)}px sans-serif`;
    ctx.fillText(card.suit, 4, fontSize + 2);
    ctx.restore();

    // Center suit
    ctx.font = `${suitSize}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(card.suit, x + CW / 2, y + CH / 2);

    ctx.restore();
  }

  function drawEmpty(x, y, label) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    roundRect(ctx, x, y, CW, CH, CORNER_R);
    ctx.stroke();
    ctx.setLineDash([]);
    if (label) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = `${Math.floor(CW * 0.4)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, x + CW / 2, y + CH / 2);
    }
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function colX(c) { return GAP + c * (CW + GAP); }

  function drawAll(dragExclude) {
    ctx.clearRect(0, 0, W, H);
    // Background
    ctx.fillStyle = '#1a5f3a';
    ctx.fillRect(0, 0, W, H);

    // Stock
    const sx = colX(0);
    if (stock.length > 0) {
      drawCard({ faceUp: false }, sx, TOP_Y, false);
    } else {
      drawEmpty(sx, TOP_Y, '↺');
    }

    // Waste
    const wx = colX(1);
    if (waste.length > 0) {
      const wc = waste[waste.length - 1];
      const isDragging = dragging && dragging.fromPile === 'waste' && !dragExclude;
      if (!isDragging) drawCard(wc, wx, TOP_Y, false);
    } else {
      drawEmpty(wx, TOP_Y, '');
    }

    // Foundations
    for (let f = 0; f < 4; f++) {
      const fx = colX(f + 3);
      if (foundations[f].length > 0) {
        const top = foundations[f][foundations[f].length - 1];
        const isDragging = dragging && dragging.fromPile === 'foundation' && dragging.fromIdx === f && !dragExclude;
        if (!isDragging) drawCard(top, fx, TOP_Y, false);
      } else {
        drawEmpty(fx, TOP_Y, SUITS[f]);
      }
    }

    // Tableau
    for (let col = 0; col < 7; col++) {
      const tx = colX(col);
      const pile = tableau[col];
      if (pile.length === 0) {
        drawEmpty(tx, TAB_Y, 'K');
        continue;
      }
      for (let i = 0; i < pile.length; i++) {
        const card = pile[i];
        const cy = TAB_Y + i * TAB_STEP;
        const isDragging = dragging && dragging.fromPile === 'tableau' && dragging.fromIdx === col
          && i >= dragging.fromCardIdx && !dragExclude;
        if (!isDragging) drawCard(card, tx, cy, false);
      }
    }

    // Dragging cards
    if (dragging && !dragExclude) {
      for (let i = 0; i < dragging.cards.length; i++) {
        drawCard(dragging.cards[i], dragging.x, dragging.y + i * TAB_STEP, true);
      }
    }
  }

  /* ── Hit Testing ─────────────────────────────────────── */
  function hitTest(mx, my) {
    // Stock
    const sx = colX(0);
    if (mx >= sx && mx <= sx + CW && my >= TOP_Y && my <= TOP_Y + CH) return { pile: 'stock' };

    // Waste
    const wx = colX(1);
    if (waste.length > 0 && mx >= wx && mx <= wx + CW && my >= TOP_Y && my <= TOP_Y + CH)
      return { pile: 'waste', idx: waste.length - 1 };

    // Foundations
    for (let f = 0; f < 4; f++) {
      const fx = colX(f + 3);
      if (mx >= fx && mx <= fx + CW && my >= TOP_Y && my <= TOP_Y + CH)
        return { pile: 'foundation', idx: f };
    }

    // Tableau (bottom-up to get topmost card)
    for (let col = 0; col < 7; col++) {
      const tx = colX(col);
      if (mx < tx || mx > tx + CW) continue;
      const pile = tableau[col];
      if (pile.length === 0) {
        if (my >= TAB_Y && my <= TAB_Y + CH) return { pile: 'tableau', col, cardIdx: -1 };
        continue;
      }
      // Find which card
      for (let i = pile.length - 1; i >= 0; i--) {
        const cy = TAB_Y + i * TAB_STEP;
        const bottom = i === pile.length - 1 ? cy + CH : TAB_Y + (i + 1) * TAB_STEP;
        if (my >= cy && my <= bottom) return { pile: 'tableau', col, cardIdx: i };
      }
    }

    return null;
  }

  /* ── Drop Target ─────────────────────────────────────── */
  function dropTarget(mx, my) {
    // Foundations
    for (let f = 0; f < 4; f++) {
      const fx = colX(f + 3);
      if (mx >= fx && mx <= fx + CW && my >= TOP_Y && my <= TOP_Y + CH)
        return { pile: 'foundation', idx: f };
    }
    // Tableau
    for (let col = 0; col < 7; col++) {
      const tx = colX(col);
      if (mx < tx - GAP/2 || mx > tx + CW + GAP/2) continue;
      const pile = tableau[col];
      const pileBottom = pile.length === 0 ? TAB_Y + CH : TAB_Y + (pile.length - 1) * TAB_STEP + CH;
      if (my >= TAB_Y - 10 && my <= pileBottom + 10) return { pile: 'tableau', col };
    }
    return null;
  }

  /* ── Move Validation ─────────────────────────────────── */
  function canDropOnFoundation(card, fIdx) {
    const pile = foundations[fIdx];
    if (dragging && dragging.cards.length > 1) return false;
    if (pile.length === 0) return card.rank === 'A';
    const top = pile[pile.length - 1];
    return top.suit === card.suit && RANK_VAL[card.rank] === RANK_VAL[top.rank] + 1;
  }

  function canDropOnTableau(cards, col) {
    const pile = tableau[col];
    const card = cards[0];
    if (pile.length === 0) return card.rank === 'K';
    const top = pile[pile.length - 1];
    if (!top.faceUp) return false;
    return isRed(card.suit) !== isRed(top.suit) && RANK_VAL[card.rank] === RANK_VAL[top.rank] - 1;
  }

  /* ── Actions ─────────────────────────────────────────── */
  function clickStock() {
    if (stock.length === 0) {
      // Reset
      stock = waste.reverse().map(c => ({ ...c, faceUp: false }));
      waste = [];
      addScore(-100);
    } else {
      const card = stock.pop();
      card.faceUp = true;
      waste.push(card);
      addScore(5);
    }
    drawAll();
  }

  function tryAutoFoundation(card, fromPile, fromIdx, cardIdx) {
    for (let f = 0; f < 4; f++) {
      if (canDropOnFoundation(card, f)) {
        // Move card
        if (fromPile === 'waste') { waste.pop(); }
        else if (fromPile === 'tableau') { tableau[fromIdx].splice(cardIdx, 1); flipTop(fromIdx); }
        foundations[f].push({ ...card, faceUp: true });
        addScore(10);
        drawAll();
        checkAutoComplete();
        return true;
      }
    }
    return false;
  }

  function flipTop(col) {
    const pile = tableau[col];
    if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
      pile[pile.length - 1].faceUp = true;
      addScore(5);
    }
  }

  /* ── Drag & Drop ─────────────────────────────────────── */
  function startDrag(mx, my) {
    const hit = hitTest(mx, my);
    if (!hit) return;

    if (hit.pile === 'stock') { clickStock(); return; }

    if (hit.pile === 'waste') {
      if (waste.length === 0) return;
      const card = waste[waste.length - 1];
      dragging = { cards: [card], fromPile: 'waste', fromIdx: 0, fromCardIdx: waste.length - 1,
        x: colX(1), y: TOP_Y, ox: mx - colX(1), oy: my - TOP_Y };
      return;
    }

    if (hit.pile === 'foundation') {
      const f = hit.idx;
      if (foundations[f].length === 0) return;
      const card = foundations[f][foundations[f].length - 1];
      dragging = { cards: [card], fromPile: 'foundation', fromIdx: f, fromCardIdx: foundations[f].length - 1,
        x: colX(f + 3), y: TOP_Y, ox: mx - colX(f + 3), oy: my - TOP_Y };
      return;
    }

    if (hit.pile === 'tableau') {
      const { col, cardIdx } = hit;
      if (cardIdx < 0) return;
      const card = tableau[col][cardIdx];
      if (!card.faceUp) return;
      const cards = tableau[col].slice(cardIdx);
      const cy = TAB_Y + cardIdx * TAB_STEP;
      dragging = { cards, fromPile: 'tableau', fromIdx: col, fromCardIdx: cardIdx,
        x: colX(col), y: cy, ox: mx - colX(col), oy: my - cy };
    }
  }

  function moveDrag(mx, my) {
    if (!dragging) return;
    dragging.x = mx - dragging.ox;
    dragging.y = my - dragging.oy;
    drawAll();
  }

  function endDrag(mx, my) {
    if (!dragging) return;
    const dt = dropTarget(mx, my);
    let moved = false;

    if (dt) {
      if (dt.pile === 'foundation' && canDropOnFoundation(dragging.cards[0], dt.idx)) {
        placeDragOnFoundation(dt.idx);
        moved = true;
      } else if (dt.pile === 'tableau' && canDropOnTableau(dragging.cards, dt.col)) {
        placeDragOnTableau(dt.col);
        moved = true;
      }
    }

    if (!moved) {
      // Snap back (already drawn correctly)
    }
    dragging = null;
    drawAll();
    if (moved) checkAutoComplete();
  }

  function placeDragOnFoundation(fIdx) {
    const card = dragging.cards[0];
    if (dragging.fromPile === 'waste') waste.pop();
    else if (dragging.fromPile === 'tableau') { tableau[dragging.fromIdx].splice(dragging.fromCardIdx, 1); flipTop(dragging.fromIdx); }
    else if (dragging.fromPile === 'foundation') { foundations[dragging.fromIdx].pop(); }
    foundations[fIdx].push({ ...card, faceUp: true });
    addScore(10);
  }

  function placeDragOnTableau(col) {
    const cards = dragging.cards;
    if (dragging.fromPile === 'waste') { waste.pop(); }
    else if (dragging.fromPile === 'tableau') { tableau[dragging.fromIdx].splice(dragging.fromCardIdx, cards.length); flipTop(dragging.fromIdx); }
    else if (dragging.fromPile === 'foundation') { foundations[dragging.fromIdx].pop(); }
    tableau[col].push(...cards.map(c => ({ ...c, faceUp: true })));
    addScore(3);
  }

  /* ── Double click to auto-foundation ────────────────── */
  function handleDblClick(mx, my) {
    const hit = hitTest(mx, my);
    if (!hit) return;
    if (hit.pile === 'waste' && waste.length > 0) {
      tryAutoFoundation(waste[waste.length - 1], 'waste', 0, waste.length - 1);
    } else if (hit.pile === 'tableau') {
      const { col, cardIdx } = hit;
      if (cardIdx < 0 || !tableau[col][cardIdx].faceUp) return;
      if (cardIdx !== tableau[col].length - 1) return; // Only top card
      tryAutoFoundation(tableau[col][cardIdx], 'tableau', col, cardIdx);
    }
  }

  /* ── Auto Complete ───────────────────────────────────── */
  function checkAutoComplete() {
    // All cards face up?
    if (stock.length > 0) return;
    if (waste.length > 0 && !waste[waste.length - 1].faceUp) return;
    const allFaceUp = tableau.every(col => col.every(c => c.faceUp));
    if (!allFaceUp) return;
    if (!autoCompleteActive) {
      autoCompleteActive = true;
      runAutoComplete();
    }
  }

  function runAutoComplete() {
    if (!autoCompleteActive) return;

    // Check if complete
    if (foundations.every(f => f.length === 13)) {
      finishGame();
      return;
    }

    // Move one card to foundation
    let moved = false;
    // Try waste
    if (waste.length > 0) {
      const card = waste[waste.length - 1];
      for (let f = 0; f < 4; f++) {
        if (canDropOnFoundation(card, f)) {
          waste.pop();
          foundations[f].push({ ...card, faceUp: true });
          addScore(10);
          moved = true;
          break;
        }
      }
    }
    // Try tableau
    if (!moved) {
      outer: for (let col = 0; col < 7; col++) {
        const pile = tableau[col];
        if (!pile.length) continue;
        const card = pile[pile.length - 1];
        for (let f = 0; f < 4; f++) {
          if (canDropOnFoundation(card, f)) {
            pile.pop();
            foundations[f].push({ ...card, faceUp: true });
            addScore(10);
            moved = true;
            break outer;
          }
        }
      }
    }

    drawAll();
    if (moved) setTimeout(runAutoComplete, 60);
    else autoCompleteActive = false;
  }

  function finishGame() {
    stopTimer();
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const timeBonus = Math.max(0, 700000 / Math.max(elapsed, 30));
    const finalScore = score + Math.floor(timeBonus);
    if (typeof window.updateScore === 'function') window.updateScore(finalScore);
    drawAll();

    setTimeout(() => {
      const div = document.createElement('div');
      div.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border-radius:14px;padding:24px 36px;text-align:center;font-family:sans-serif;box-shadow:0 8px 32px rgba(0,0,0,0.35);z-index:100;';
      div.innerHTML = `
        <div style="font-size:28px;font-weight:700;color:#16a34a;margin-bottom:8px;">클리어! 🎉</div>
        <div style="font-size:15px;color:#555;margin-bottom:4px;">시간: ${elapsed}초</div>
        <div style="font-size:20px;font-weight:700;color:#5a67d8;margin-bottom:14px;">최종 점수: ${finalScore}</div>
        <button id="sol-replay" style="padding:10px 28px;font-size:16px;font-weight:600;border:none;border-radius:8px;background:#1a5f3a;color:#fff;cursor:pointer;">다시 하기</button>
      `;
      const wrapper = canvas.parentElement;
      wrapper.style.position = 'relative';
      wrapper.appendChild(div);
      document.getElementById('sol-replay').addEventListener('click', () => window.startGame(difficulty, stage));
    }, 500);

    document.dispatchEvent(new CustomEvent('gameClear', { detail: { score: finalScore } }));
  }

  function stopTimer() { clearInterval(timerInterval); }

  /* ── Event Binding ───────────────────────────────────── */
  let lastClickTime = 0, lastClickPos = null;

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width, scaleY = H / rect.height;
    if (e.touches) {
      return [(e.touches[0].clientX - rect.left) * scaleX, (e.touches[0].clientY - rect.top) * scaleY];
    }
    return [(e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY];
  }
  function getChangedPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width, scaleY = H / rect.height;
    return [(e.changedTouches[0].clientX - rect.left) * scaleX, (e.changedTouches[0].clientY - rect.top) * scaleY];
  }

  function bindEvents() {
    canvas.addEventListener('mousedown', (e) => {
      const [mx, my] = getPos(e);
      const now = Date.now();
      if (now - lastClickTime < 300 && lastClickPos &&
          Math.abs(mx - lastClickPos[0]) < 10 && Math.abs(my - lastClickPos[1]) < 10) {
        dragging = null;
        handleDblClick(mx, my);
        return;
      }
      lastClickTime = now;
      lastClickPos = [mx, my];
      startDrag(mx, my);
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const [mx, my] = getPos(e);
      moveDrag(mx, my);
    });

    canvas.addEventListener('mouseup', (e) => {
      if (!dragging) return;
      const [mx, my] = getPos(e);
      endDrag(mx, my);
    });

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const [mx, my] = getPos(e);
      startDrag(mx, my);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!dragging) return;
      const [mx, my] = getPos(e);
      moveDrag(mx, my);
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (!dragging) return;
      const [mx, my] = getChangedPos(e);
      endDrag(mx, my);
    }, { passive: false });
  }

  /* ── Setup ──────────────────────────────────────────── */
  window.startGame = function (diffId, stageId) {
    difficulty = diffId || 'normal';
    stage = stageId || 1;
    score = 0;
    autoCompleteActive = false;

    root = document.getElementById('game-root');
    root.style.cssText = 'padding:8px;box-sizing:border-box;max-width:700px;margin:0 auto;font-family:sans-serif;';
    root.innerHTML = '';

    const info = document.createElement('div');
    info.style.cssText = 'display:flex;justify-content:space-between;font-size:14px;font-weight:600;margin-bottom:6px;color:#1a5f3a;';
    info.innerHTML = '<span id="sol-score">점수: 0</span><span id="sol-timer">⏱ 0s</span><span style="font-size:11px;color:#9ca3af;">더블클릭으로 자동 이동</span>';
    root.appendChild(info);

    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    root.appendChild(wrapper);

    canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;border-radius:8px;cursor:pointer;touch-action:none;max-width:100%;';
    wrapper.appendChild(canvas);
    ctx = canvas.getContext('2d');

    calcLayout();
    canvas.width = W; canvas.height = H;

    deal();

    // Hook updateScore to show in our bar
    const origUpdate = window.updateScore;
    window.updateScore = function (n) {
      const el = document.getElementById('sol-score');
      if (el) el.textContent = `점수: ${n}`;
      if (typeof origUpdate === 'function') origUpdate(n);
    };

    startTime = Date.now();
    timerInterval = setInterval(() => {
      const el = document.getElementById('sol-timer');
      if (el) el.textContent = `⏱ ${Math.floor((Date.now() - startTime) / 1000)}s`;
    }, 1000);

    bindEvents();
    drawAll();
  };

  if (CONFIG.gameId === 'solitaire' && document.getElementById('game-root')) {
    window.startGame((CONFIG.difficulties && CONFIG.difficulties[0]) || 'normal', 1);
  }
})();
