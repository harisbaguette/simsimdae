/* Word Search - word-search/game.js */
(function () {
  'use strict';

  const CONFIG = window.GAME_CONFIG || { gameId: 'word-search', difficulties: [], hasLeaderboard: false, scoreType: 'high' };

  const DIFF_SETTINGS = {
    easy:   { timeLimit: 180 },
    normal: { timeLimit: 120 },
    hard:   { timeLimit: 90 },
    expert: { timeLimit: 60 },
  };

  const WORD_POOL = [
    '사과','하늘','바다','산','강','나무','꽃','별','달','태양',
    '구름','눈','비','바람','불','물','땅','돌','모래','얼음',
    '숲','새','물고기','사자','호랑이','토끼','개','고양이','곰','여우',
  ];

  // Korean syllable fillers
  const FILLER_SYLLABLES = [
    '가','나','다','라','마','바','사','아','자','차',
    '카','타','파','하','기','니','디','리','미','비',
    '시','이','지','치','키','티','피','히','고','노',
    '도','로','모','보','소','오','조','초','코','토',
  ];

  const GRID_SIZE = 15;

  let canvas, ctx, rootEl;
  let grid = [];         // 2D of syllables
  let placedWords = [];  // [{word, cells:[{r,c}], found, color}]
  let wordListToUse = [];
  let score = 0;
  let timeLeft = 120;
  let timerInterval = null;
  let gameActive = false;
  let currentDiff = 'normal';

  // Selection
  let selecting = false;
  let selStart = null;   // {r, c}
  let selCurrent = null; // {r, c}
  let selCells = [];     // [{r, c}]

  let cellSize = 30;
  const FOUND_COLORS = [
    'rgba(255, 87, 34, 0.5)',
    'rgba(33, 150, 243, 0.5)',
    'rgba(76, 175, 80, 0.5)',
    'rgba(156, 39, 176, 0.5)',
    'rgba(255, 193, 7, 0.5)',
    'rgba(0, 188, 212, 0.5)',
    'rgba(233, 30, 99, 0.5)',
    'rgba(121, 85, 72, 0.5)',
    'rgba(255, 152, 0, 0.5)',
    'rgba(63, 81, 181, 0.5)',
  ];

  function shuffleArr(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function randomFiller() {
    return FILLER_SYLLABLES[Math.floor(Math.random() * FILLER_SYLLABLES.length)];
  }

  // Split Korean word into syllable array
  function syllables(word) {
    return Array.from(word);
  }

  function tryPlaceWord(word) {
    const syls = syllables(word);
    const len = syls.length;
    const dirs = [[0, 1], [1, 0], [1, 1]]; // right, down, diagonal

    const attempts = 80;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      const [dr, dc] = dir;
      const maxR = GRID_SIZE - dr * (len - 1) - 1;
      const maxC = GRID_SIZE - dc * (len - 1) - 1;
      if (maxR < 0 || maxC < 0) continue;
      const startR = Math.floor(Math.random() * (maxR + 1));
      const startC = Math.floor(Math.random() * (maxC + 1));

      // Check if fits
      let fits = true;
      const cells = [];
      for (let i = 0; i < len; i++) {
        const r = startR + dr * i;
        const c = startC + dc * i;
        if (grid[r][c] && grid[r][c] !== syls[i]) { fits = false; break; }
        cells.push({ r, c });
      }
      if (!fits) continue;

      // Place
      for (let i = 0; i < len; i++) {
        const { r, c } = cells[i];
        grid[r][c] = syls[i];
      }
      return cells;
    }
    return null;
  }

  function buildPuzzle() {
    // Init empty grid
    grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    placedWords = [];

    const wordCount = 15;
    const words = shuffleArr(WORD_POOL).slice(0, wordCount);
    // Sort by length descending (easier to place longer words first)
    words.sort((a, b) => b.length - a.length);

    const colorCopy = shuffleArr(FOUND_COLORS);
    words.forEach((word, i) => {
      const cells = tryPlaceWord(word);
      if (cells) {
        placedWords.push({
          word,
          cells,
          found: false,
          color: colorCopy[i % colorCopy.length],
        });
      }
    });

    // Fill empty cells with filler
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!grid[r][c]) grid[r][c] = randomFiller();
      }
    }
  }

  // ---- Canvas ----
  function resize() {
    if (!canvas || !rootEl) return;
    const wordListW = 120;
    const maxW = Math.min((rootEl.clientWidth || 600) - wordListW - 20, 500);
    const maxH = Math.min((window.innerHeight || 700) - 100, 520);
    cellSize = Math.min(Math.floor(maxW / GRID_SIZE), Math.floor(maxH / GRID_SIZE), 32);
    canvas.width = cellSize * GRID_SIZE;
    canvas.height = cellSize * GRID_SIZE;
  }

  function getSelCells() {
    if (!selStart || !selCurrent) return [];
    const dr = selCurrent.r - selStart.r;
    const dc = selCurrent.c - selStart.c;
    const len = Math.max(Math.abs(dr), Math.abs(dc)) + 1;
    // Snap to nearest valid dir: H, V, diagonal
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    let bestDir = [0, 1];
    let bestDot = -Infinity;
    if (len > 1) {
      for (const [r, c] of dirs) {
        const dot = dr * r + dc * c;
        if (dot > bestDot) { bestDot = dot; bestDir = [r, c]; }
      }
    }
    // Only allow right, down, diagonal (no reverse)
    const allowed = [[0, 1], [1, 0], [1, 1]];
    const isAllowed = allowed.some(([r, c]) => r === bestDir[0] && c === bestDir[1]);

    const cells = [];
    for (let i = 0; i < len; i++) {
      const r = selStart.r + bestDir[0] * i;
      const c = selStart.c + bestDir[1] * i;
      if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) cells.push({ r, c });
    }
    return cells;
  }

  function checkWord(cells) {
    if (!cells.length) return;
    const selected = cells.map(({ r, c }) => grid[r][c]).join('');
    for (const pw of placedWords) {
      if (pw.found) continue;
      if (pw.word === selected) {
        pw.found = true;
        const wordLen = syllables(pw.word).length;
        const timeBonus = Math.floor(timeLeft * 2);
        const pts = wordLen * 50 + timeBonus;
        score += pts;
        if (typeof window.updateScore === 'function') window.updateScore(score);
        updateScoreEl();
        updateWordList();

        if (placedWords.every(w => w.found)) {
          gameActive = false;
          clearInterval(timerInterval);
          showMsg(`🎉 모든 단어를 찾았습니다! 점수: ${score}`);
          document.dispatchEvent(new CustomEvent('gameClear', { detail: { score } }));
        }
        return;
      }
    }
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = '#16213e';
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= GRID_SIZE; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * cellSize); ctx.lineTo(canvas.width, r * cellSize); ctx.stroke();
    }
    for (let c = 0; c <= GRID_SIZE; c++) {
      ctx.beginPath(); ctx.moveTo(c * cellSize, 0); ctx.lineTo(c * cellSize, canvas.height); ctx.stroke();
    }

    // Found word highlights
    for (const pw of placedWords) {
      if (!pw.found) continue;
      ctx.fillStyle = pw.color;
      for (const { r, c } of pw.cells) {
        ctx.fillRect(c * cellSize + 1, r * cellSize + 1, cellSize - 2, cellSize - 2);
      }
    }

    // Current selection highlight
    const currentSel = getSelCells();
    if (currentSel.length) {
      ctx.fillStyle = 'rgba(255, 255, 100, 0.3)';
      for (const { r, c } of currentSel) {
        ctx.fillRect(c * cellSize + 1, r * cellSize + 1, cellSize - 2, cellSize - 2);
      }
    }

    // Letters
    const fontSize = Math.max(10, Math.floor(cellSize * 0.5));
    ctx.font = `bold ${fontSize}px "Malgun Gothic", "Apple SD Gothic Neo", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const syl = grid[r][c] || '';
        // Color: white if in selection, found = bright, else dim
        const isInSel = currentSel.some(s => s.r === r && s.c === c);
        const isFound = placedWords.some(pw => pw.found && pw.cells.some(cell => cell.r === r && cell.c === c));
        ctx.fillStyle = isInSel ? '#fff700' : isFound ? '#ffffff' : '#8892b0';
        ctx.fillText(syl, c * cellSize + cellSize / 2, r * cellSize + cellSize / 2);
      }
    }
  }

  function canvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let cx, cy;
    if (e.touches) {
      cx = (e.touches[0].clientX - rect.left) * scaleX;
      cy = (e.touches[0].clientY - rect.top) * scaleY;
    } else {
      cx = (e.clientX - rect.left) * scaleX;
      cy = (e.clientY - rect.top) * scaleY;
    }
    return {
      r: Math.floor(cy / cellSize),
      c: Math.floor(cx / cellSize),
    };
  }

  function onDown(e) {
    if (!gameActive) return;
    e.preventDefault();
    const pos = canvasPos(e);
    if (pos.r < 0 || pos.r >= GRID_SIZE || pos.c < 0 || pos.c >= GRID_SIZE) return;
    selecting = true;
    selStart = pos;
    selCurrent = pos;
    draw();
  }

  function onMove(e) {
    if (!selecting || !gameActive) return;
    e.preventDefault();
    const pos = canvasPos(e);
    if (pos.r < 0 || pos.r >= GRID_SIZE || pos.c < 0 || pos.c >= GRID_SIZE) return;
    selCurrent = pos;
    draw();
  }

  function onUp(e) {
    if (!selecting || !gameActive) return;
    e.preventDefault();
    const cells = getSelCells();
    if (cells.length >= 2) checkWord(cells);
    selecting = false;
    selStart = null;
    selCurrent = null;
    draw();
  }

  function updateScoreEl() {
    const el = document.getElementById('ws-score');
    if (el) el.textContent = score;
  }

  function updateWordList() {
    const el = document.getElementById('ws-words');
    if (!el) return;
    el.innerHTML = placedWords.map(pw =>
      `<div class="ws-word${pw.found ? ' ws-found' : ''}">${pw.found ? '✓ ' : ''}${pw.word}</div>`
    ).join('');
  }

  function updateTimer() {
    timeLeft--;
    const el = document.getElementById('ws-timer');
    if (el) {
      el.textContent = timeLeft + 's';
      if (timeLeft <= 10) el.style.color = '#f44336';
    }
    if (timeLeft <= 0) {
      gameActive = false;
      clearInterval(timerInterval);
      showMsg('시간 초과! 게임 오버');
      document.dispatchEvent(new CustomEvent('gameOver', { detail: { score, cleared: false } }));
    }
  }

  function showMsg(msg) {
    const el = document.getElementById('ws-msg');
    if (el) el.textContent = msg;
  }

  function buildUI() {
    rootEl.innerHTML = '';

    const styleId = 'ws-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        #ws-wrapper { display: flex; flex-direction: column; align-items: center; padding: 8px; width: 100%; box-sizing: border-box; font-family: "Malgun Gothic", "Apple SD Gothic Neo", Arial, sans-serif; }
        #ws-header { display: flex; gap: 12px; margin-bottom: 8px; flex-wrap: wrap; justify-content: center; }
        .ws-stat { background: #0f3460; color: #e94560; border-radius: 8px; padding: 5px 14px; font-weight: bold; text-align: center; }
        .ws-stat span { display: block; font-size: 10px; color: #aaa; }
        .ws-stat strong { font-size: 18px; }
        #ws-main { display: flex; gap: 12px; align-items: flex-start; }
        #ws-canvas { display: block; touch-action: none; border-radius: 6px; border: 1px solid #0f3460; }
        #ws-words { display: flex; flex-direction: column; gap: 3px; min-width: 90px; max-height: 480px; overflow-y: auto; }
        .ws-word { font-size: 13px; padding: 3px 6px; border-radius: 4px; background: #0f3460; color: #ccd6f6; transition: all 0.2s; }
        .ws-word.ws-found { background: #1a5c2a; color: #69ff89; text-decoration: line-through; }
        #ws-msg { margin-top: 8px; font-size: 16px; font-weight: bold; color: #e94560; min-height: 24px; text-align: center; }
      `;
      document.head.appendChild(style);
    }

    const wrapper = document.createElement('div');
    wrapper.id = 'ws-wrapper';

    const header = document.createElement('div');
    header.id = 'ws-header';
    header.innerHTML = `
      <div class="ws-stat"><span>점수</span><strong id="ws-score">0</strong></div>
      <div class="ws-stat"><span>시간</span><strong id="ws-timer">${timeLeft}s</strong></div>
    `;

    const main = document.createElement('div');
    main.id = 'ws-main';

    canvas = document.createElement('canvas');
    canvas.id = 'ws-canvas';
    resize();

    const wordListEl = document.createElement('div');
    wordListEl.id = 'ws-words';

    const msgEl = document.createElement('div');
    msgEl.id = 'ws-msg';

    main.appendChild(canvas);
    main.appendChild(wordListEl);

    wrapper.appendChild(header);
    wrapper.appendChild(main);
    wrapper.appendChild(msgEl);
    rootEl.appendChild(wrapper);

    ctx = canvas.getContext('2d');

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mouseleave', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onUp, { passive: false });
  }

  window.startGame = function (diffId, stage) {
    currentDiff = diffId || 'normal';
    const settings = DIFF_SETTINGS[currentDiff] || DIFF_SETTINGS.normal;
    timeLeft = settings.timeLimit;
    score = 0;
    gameActive = false;
    selecting = false;
    selStart = null;
    selCurrent = null;

    rootEl = document.getElementById('game-root');
    if (!rootEl) return;

    clearInterval(timerInterval);

    buildPuzzle();
    buildUI();
    resize();
    updateWordList();
    draw();

    gameActive = true;
    timerInterval = setInterval(updateTimer, 1000);
  };

})();
