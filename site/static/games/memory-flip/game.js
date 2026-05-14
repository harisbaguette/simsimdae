/* Memory Flip Game - memory-flip/game.js */
(function () {
  'use strict';

  const CONFIG = window.GAME_CONFIG || { gameId: 'memory-flip', difficulties: [], hasLeaderboard: false, scoreType: 'high' };

  const DIFF_SETTINGS = {
    easy:   { rows: 4, cols: 4, pairs: 8 },
    normal: { rows: 4, cols: 5, pairs: 10 },
    hard:   { rows: 5, cols: 6, pairs: 15 },
    expert: { rows: 6, cols: 6, pairs: 18 },
  };

  const EMOJIS = [
    '🍎','🍊','🍋','🍇','🍓','🍑','🍒','🍌','🍉','🍍',
    '🥭','🍆','🥦','🥕','🌽','🍄','🦊','🐺','🦁','🐯',
    '🐻','🐼','🦄','🐸','🐙','🦈','🦋','🌸','🌺','🌻',
  ];

  let rootEl = null;
  let cards = [];      // array of card objects
  let flipped = [];    // currently face-up (unmatched) cards, max 2
  let matched = 0;
  let totalPairs = 0;
  let moves = 0;
  let score = 0;
  let startTime = null;
  let lockBoard = false;
  let currentDiff = 'normal';
  let timerInterval = null;
  let gameActive = false;

  const styleId = 'mflip-style';

  function injectStyles() {
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      #mflip-wrapper {
        display: flex; flex-direction: column; align-items: center;
        font-family: Arial, sans-serif; padding: 12px; box-sizing: border-box;
        user-select: none; width: 100%;
      }
      #mflip-header {
        display: flex; gap: 16px; margin-bottom: 12px; flex-wrap: wrap; justify-content: center;
      }
      .mflip-stat {
        background: #4a90d9; color: #fff; border-radius: 8px;
        padding: 6px 14px; font-weight: bold; text-align: center; min-width: 80px;
      }
      .mflip-stat span { display: block; font-size: 10px; opacity: 0.85; }
      .mflip-stat strong { font-size: 18px; }
      #mflip-grid {
        display: grid; gap: 8px;
      }
      .mflip-card {
        perspective: 600px;
        cursor: pointer;
      }
      .mflip-card-inner {
        position: relative; width: 100%; height: 100%;
        transform-style: preserve-3d;
        transition: transform 0.35s cubic-bezier(.4,0,.2,1);
        border-radius: 8px;
      }
      .mflip-card.flipped .mflip-card-inner,
      .mflip-card.matched .mflip-card-inner {
        transform: rotateY(180deg);
      }
      .mflip-face {
        position: absolute; width: 100%; height: 100%;
        backface-visibility: hidden;
        border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.18);
        box-sizing: border-box;
      }
      .mflip-front {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        font-size: 28px; color: #fff; font-weight: bold;
      }
      .mflip-back {
        background: #fff;
        transform: rotateY(180deg);
        font-size: 28px;
        border: 2px solid #e0e0e0;
      }
      .mflip-card.matched .mflip-back {
        background: #e8f8e8;
        border-color: #4caf50;
        animation: matchPop 0.3s ease;
      }
      .mflip-card.wrong .mflip-back {
        background: #fff0f0;
        border-color: #f44336;
      }
      @keyframes matchPop {
        0% { transform: rotateY(180deg) scale(0.9); }
        60% { transform: rotateY(180deg) scale(1.1); }
        100% { transform: rotateY(180deg) scale(1); }
      }
      #mflip-msg {
        margin-top: 10px; font-size: 17px; font-weight: bold; color: #333; min-height: 26px; text-align: center;
      }
    `;
    document.head.appendChild(style);
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function buildGame(diff) {
    const settings = DIFF_SETTINGS[diff] || DIFF_SETTINGS.normal;
    const { rows, cols, pairs } = settings;
    totalPairs = pairs;

    rootEl.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.id = 'mflip-wrapper';

    const header = document.createElement('div');
    header.id = 'mflip-header';
    header.innerHTML = `
      <div class="mflip-stat"><span>점수</span><strong id="mflip-score">0</strong></div>
      <div class="mflip-stat"><span>이동</span><strong id="mflip-moves">0</strong></div>
      <div class="mflip-stat"><span>맞춤</span><strong id="mflip-matched">0/${pairs}</strong></div>
      <div class="mflip-stat"><span>시간</span><strong id="mflip-time">0s</strong></div>
    `;

    const grid = document.createElement('div');
    grid.id = 'mflip-grid';

    // Responsive cell size
    const maxW = Math.min((rootEl.clientWidth || 500) - 24, 560);
    const cellW = Math.floor((maxW - (cols - 1) * 8) / cols);
    const cellH = Math.min(cellW, Math.floor(((window.innerHeight || 700) - 160) / rows));
    const cellSize = Math.min(cellW, cellH, 90);

    grid.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
    grid.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;

    // Build emoji pairs
    const emojiSet = shuffle(EMOJIS.slice()).slice(0, pairs);
    const emojiPairs = shuffle([...emojiSet, ...emojiSet]);

    cards = [];
    flipped = [];
    matched = 0;
    moves = 0;

    emojiPairs.forEach((emoji, idx) => {
      const cardData = { emoji, matched: false, el: null, index: idx };

      const cardEl = document.createElement('div');
      cardEl.className = 'mflip-card';
      cardEl.style.width = cellSize + 'px';
      cardEl.style.height = cellSize + 'px';
      cardEl.innerHTML = `
        <div class="mflip-card-inner">
          <div class="mflip-face mflip-front">?</div>
          <div class="mflip-face mflip-back" style="font-size:${Math.floor(cellSize * 0.45)}px">${emoji}</div>
        </div>
      `;

      cardEl.addEventListener('click', () => onCardClick(cardData));
      cardEl.addEventListener('touchend', (e) => { e.preventDefault(); onCardClick(cardData); }, { passive: false });

      cardData.el = cardEl;
      cards.push(cardData);
      grid.appendChild(cardEl);
    });

    const msgEl = document.createElement('div');
    msgEl.id = 'mflip-msg';

    wrapper.appendChild(header);
    wrapper.appendChild(grid);
    wrapper.appendChild(msgEl);
    rootEl.appendChild(wrapper);

    startTime = Date.now();
    gameActive = true;
    timerInterval = setInterval(updateTimer, 500);
  }

  function updateTimer() {
    const el = document.getElementById('mflip-time');
    if (el && startTime) el.textContent = Math.floor((Date.now() - startTime) / 1000) + 's';
  }

  function onCardClick(card) {
    if (!gameActive || lockBoard || card.matched) return;
    if (flipped.includes(card)) return;
    if (flipped.length >= 2) return;

    card.el.classList.add('flipped');
    flipped.push(card);

    if (flipped.length === 2) {
      moves++;
      document.getElementById('mflip-moves').textContent = moves;
      lockBoard = true;

      const [a, b] = flipped;
      if (a.emoji === b.emoji) {
        // Match
        const elapsed = Date.now() - startTime;
        const timeBonus = Math.max(0, Math.floor(1000 - elapsed / totalPairs));
        score += 500 + timeBonus;
        if (typeof window.updateScore === 'function') window.updateScore(score);
        document.getElementById('mflip-score').textContent = score;

        setTimeout(() => {
          a.matched = b.matched = true;
          a.el.classList.remove('flipped');
          b.el.classList.remove('flipped');
          a.el.classList.add('matched');
          b.el.classList.add('matched');
          matched++;
          document.getElementById('mflip-matched').textContent = `${matched}/${totalPairs}`;
          flipped = [];
          lockBoard = false;

          if (matched === totalPairs) {
            gameActive = false;
            clearInterval(timerInterval);
            const timeSec = Math.floor((Date.now() - startTime) / 1000);
            const timeBonus2 = Math.max(0, (180 - timeSec) * 10);
            score += timeBonus2;
            if (typeof window.updateScore === 'function') window.updateScore(score);
            document.getElementById('mflip-score').textContent = score;
            document.getElementById('mflip-msg').textContent = '🎉 모두 맞췄습니다!';
            document.dispatchEvent(new CustomEvent('gameClear', { detail: { score } }));
          }
        }, 300);
      } else {
        // No match
        a.el.classList.add('wrong');
        b.el.classList.add('wrong');
        setTimeout(() => {
          a.el.classList.remove('flipped', 'wrong');
          b.el.classList.remove('flipped', 'wrong');
          flipped = [];
          lockBoard = false;
        }, 800);
      }
    }
  }

  window.startGame = function (diffId, stage) {
    currentDiff = diffId || 'normal';
    rootEl = document.getElementById('game-root');
    if (!rootEl) return;

    clearInterval(timerInterval);
    score = 0;
    gameActive = false;

    injectStyles();
    buildGame(currentDiff);
  };

})();
