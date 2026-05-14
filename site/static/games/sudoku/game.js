(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════
     SUDOKU – game.js
     API: window.GAME_CONFIG, window.startGame, window.updateScore
          CustomEvent 'gameOver' / 'gameClear'
  ═══════════════════════════════════════════════════════════ */

  const CFG  = window.GAME_CONFIG || {};
  const root = document.getElementById('game-root');

  /* ── Difficulty → given count ──────────────────────────── */
  const DIFF_GIVENS = {
    easy:   40,
    normal: 34,
    hard:   28,
    expert: 22,
  };

  /* ════════════════════════════════════════════════════════
     SEEDED RANDOM – simple LCG so puzzles are deterministic
  ════════════════════════════════════════════════════════ */
  function seededRNG(seed) {
    let s = (seed ^ 0xdeadbeef) >>> 0;
    return function () {
      s = (Math.imul(1664525, s) + 1013904223) >>> 0;
      return s / 0x100000000;
    };
  }

  /* ════════════════════════════════════════════════════════
     SUDOKU GENERATOR
     1. Fill diagonal 3×3 boxes randomly (independent).
     2. Solve the rest with backtracking.
     3. Remove cells until target givens reached.
  ════════════════════════════════════════════════════════ */
  function generatePuzzle(seed, givens) {
    const rng = seededRNG(seed);
    const board = Array.from({ length: 9 }, () => new Array(9).fill(0));

    // Shuffle helper
    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    // Fill a 3×3 box at (boxR, boxC) with shuffled 1-9
    function fillBox(boxR, boxC) {
      const nums = shuffle([1,2,3,4,5,6,7,8,9]);
      let k = 0;
      for (let r = boxR; r < boxR + 3; r++)
        for (let c = boxC; c < boxC + 3; c++)
          board[r][c] = nums[k++];
    }

    // Valid check
    function isValid(r, c, num) {
      for (let i = 0; i < 9; i++) {
        if (board[r][i] === num) return false;
        if (board[i][c] === num) return false;
      }
      const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
          if (board[br+i][bc+j] === num) return false;
      return true;
    }

    // Backtracking solver
    function solve() {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r][c] !== 0) continue;
          const nums = shuffle([1,2,3,4,5,6,7,8,9]);
          for (const n of nums) {
            if (isValid(r, c, n)) {
              board[r][c] = n;
              if (solve()) return true;
              board[r][c] = 0;
            }
          }
          return false;
        }
      }
      return true; // all filled
    }

    // Step 1: Fill 3 diagonal boxes
    fillBox(0, 0);
    fillBox(3, 3);
    fillBox(6, 6);

    // Step 2: Solve the rest
    solve();

    // Save solution
    const solution = board.map(row => [...row]);

    // Step 3: Remove cells to reach target givens
    // Collect all positions and shuffle
    const positions = [];
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        positions.push([r, c]);
    shuffle(positions);

    let removed = 0;
    const target = 81 - givens;

    for (const [r, c] of positions) {
      if (removed >= target) break;
      const backup = board[r][c];
      board[r][c] = 0;
      // Verify unique solution (count solutions, stop at 2)
      if (countSolutions(board) === 1) {
        removed++;
      } else {
        board[r][c] = backup;
      }
    }

    return { puzzle: board, solution };
  }

  /* Count solutions (up to max, default 2) */
  function countSolutions(board, max = 2) {
    const b = board.map(r => [...r]);
    let count = 0;

    function isValidLocal(r, c, num) {
      for (let i = 0; i < 9; i++) {
        if (b[r][i] === num || b[i][c] === num) return false;
      }
      const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
          if (b[br+i][bc+j] === num) return false;
      return true;
    }

    function solve() {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (b[r][c] !== 0) continue;
          for (let n = 1; n <= 9; n++) {
            if (isValidLocal(r, c, n)) {
              b[r][c] = n;
              solve();
              if (count >= max) return;
              b[r][c] = 0;
            }
          }
          return;
        }
      }
      count++;
    }

    solve();
    return count;
  }

  /* ── State ─────────────────────────────────────────────── */
  let puzzle       = [];   // 9×9, 0 = empty given
  let solution     = [];   // 9×9, complete solution
  let userGrid     = [];   // 9×9, user input (0 = empty)
  let pencilGrid   = [];   // 9×9 of Set (candidate numbers)
  let givens       = [];   // 9×9 boolean (true = pre-filled, cannot edit)
  let selectedCell = null; // {r, c}
  let pencilMode   = false;
  let hintsLeft    = 3;
  let errors       = 0;
  let errorCells   = new Set(); // "r,c" keys
  let gameActive   = false;
  let startTime    = null;
  let timerInterval = null;
  let currentDiff  = 'easy';
  let currentStage = 1;

  /* ── CSS ───────────────────────────────────────────────── */
  if (!document.getElementById('sdk-style')) {
    const s = document.createElement('style');
    s.id = 'sdk-style';
    s.textContent = `
      #sdk-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 8px;
        gap: 8px;
        font-family: 'Segoe UI', 'Nanum Gothic', sans-serif;
        user-select: none;
        -webkit-user-select: none;
      }
      #sdk-meta {
        display: flex;
        gap: 16px;
        font-size: 0.85rem;
        color: #555;
        flex-wrap: wrap;
        justify-content: center;
      }
      #sdk-meta strong { color: #1a8fa0; }
      #sdk-board {
        display: grid;
        grid-template-columns: repeat(9, 1fr);
        border: 3px solid #222;
        border-radius: 4px;
        overflow: hidden;
        width: min(450px, 96vw);
        aspect-ratio: 1;
        touch-action: none;
      }
      .sdk-cell {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #bbb;
        cursor: pointer;
        background: #fff;
        transition: background 100ms;
        aspect-ratio: 1;
      }
      /* Thick borders for 3×3 boxes */
      .sdk-cell[data-c="0"] { border-left: 2px solid #555; }
      .sdk-cell[data-c="3"] { border-left: 2px solid #555; }
      .sdk-cell[data-c="6"] { border-left: 2px solid #555; }
      .sdk-cell[data-r="0"] { border-top: 2px solid #555; }
      .sdk-cell[data-r="3"] { border-top: 2px solid #555; }
      .sdk-cell[data-r="6"] { border-top: 2px solid #555; }
      .sdk-cell.given {
        background: #f0f0f0;
        cursor: default;
      }
      .sdk-cell.selected { background: #ffd700 !important; }
      .sdk-cell.highlight-group { background: #ddeeff; }
      .sdk-cell.highlight-same { background: #b8e0ff; }
      .sdk-cell.error { background: #ffe0e0 !important; }
      .sdk-cell.error .sdk-num { color: #cc0000 !important; }
      .sdk-cell.given .sdk-num { color: #1a1a2e; font-weight: 800; }
      .sdk-num {
        font-size: clamp(14px, 3.5vw, 24px);
        font-weight: 600;
        color: #2255aa;
        pointer-events: none;
        line-height: 1;
      }
      .sdk-pencil-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-template-rows: repeat(3, 1fr);
        width: 100%;
        height: 100%;
        padding: 1px;
        box-sizing: border-box;
        pointer-events: none;
      }
      .sdk-pencil-num {
        font-size: clamp(6px, 1.4vw, 9px);
        color: #888;
        text-align: center;
        line-height: 1.2;
      }
      #sdk-numpad {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 5px;
        width: min(320px, 90vw);
      }
      .sdk-np-btn {
        padding: 10px 0;
        border: 2px solid #ccc;
        border-radius: 8px;
        background: #fff;
        font-size: 1.1rem;
        font-weight: 700;
        cursor: pointer;
        transition: background 120ms, transform 80ms, border-color 150ms;
        color: #333;
        text-align: center;
      }
      .sdk-np-btn:hover { background: #e0f0ff; border-color: #3498db; transform: scale(1.05); }
      .sdk-np-btn.erase { color: #cc3333; }
      .sdk-np-btn.complete { border-color: #aaa; color: #888; font-size: 0.65rem; }
      #sdk-controls {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: center;
      }
      .sdk-ctrl-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 700;
        background: #3498db;
        color: #fff;
        transition: background 150ms, transform 80ms;
      }
      .sdk-ctrl-btn:hover { background: #2980b9; transform: scale(1.04); }
      .sdk-ctrl-btn.pencil-on { background: #f39c12; }
      .sdk-ctrl-btn.danger { background: #e74c3c; }
      #sdk-msg {
        font-size: 0.88rem;
        color: #e05050;
        font-weight: 700;
        min-height: 1.2em;
        text-align: center;
      }
    `;
    document.head.appendChild(s);
  }

  /* ── Build DOM ─────────────────────────────────────────── */
  let boardEl;

  function buildUI() {
    root.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.id = 'sdk-wrap';

    const meta = document.createElement('div');
    meta.id = 'sdk-meta';
    meta.innerHTML = `
      <span>시간: <strong id="sdk-time">0:00</strong></span>
      <span>오류: <strong id="sdk-errors">0</strong></span>
      <span>힌트: <strong id="sdk-hints">3</strong></span>
      <span>점수: <strong id="sdk-score">10000</strong></span>
    `;

    boardEl = document.createElement('div');
    boardEl.id = 'sdk-board';

    // Build 81 cells
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = document.createElement('div');
        cell.className = 'sdk-cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.id = `sdk-cell-${r}-${c}`;

        if (givens[r][c]) {
          cell.classList.add('given');
          const num = document.createElement('span');
          num.className = 'sdk-num';
          num.id = `sdk-num-${r}-${c}`;
          num.textContent = puzzle[r][c];
          cell.appendChild(num);
        } else {
          const num = document.createElement('span');
          num.className = 'sdk-num';
          num.id = `sdk-num-${r}-${c}`;
          num.textContent = userGrid[r][c] || '';
          cell.appendChild(num);
        }

        cell.addEventListener('click', () => selectCell(r, c));
        cell.addEventListener('touchend', e => { e.preventDefault(); selectCell(r, c); });
        boardEl.appendChild(cell);
      }
    }

    // Numpad
    const numpad = document.createElement('div');
    numpad.id = 'sdk-numpad';
    for (let n = 1; n <= 9; n++) {
      const btn = document.createElement('button');
      btn.className = 'sdk-np-btn';
      btn.textContent = n;
      btn.addEventListener('click', () => enterNumber(n));
      numpad.appendChild(btn);
    }
    const eraseBtn = document.createElement('button');
    eraseBtn.className = 'sdk-np-btn erase';
    eraseBtn.textContent = '지우기';
    eraseBtn.addEventListener('click', () => enterNumber(0));
    numpad.appendChild(eraseBtn);

    // Controls
    const controls = document.createElement('div');
    controls.id = 'sdk-controls';

    const pencilBtn = document.createElement('button');
    pencilBtn.className = 'sdk-ctrl-btn';
    pencilBtn.id = 'sdk-pencil-btn';
    pencilBtn.textContent = '✏️ 메모 모드';
    pencilBtn.addEventListener('click', () => {
      pencilMode = !pencilMode;
      pencilBtn.classList.toggle('pencil-on', pencilMode);
      pencilBtn.textContent = pencilMode ? '✏️ 메모 ON' : '✏️ 메모 모드';
    });

    const hintBtn = document.createElement('button');
    hintBtn.className = 'sdk-ctrl-btn danger';
    hintBtn.id = 'sdk-hint-btn';
    hintBtn.textContent = `💡 힌트 (${hintsLeft}회)`;
    hintBtn.addEventListener('click', useHint);

    controls.appendChild(pencilBtn);
    controls.appendChild(hintBtn);

    const msg = document.createElement('div');
    msg.id = 'sdk-msg';
    msg.textContent = '숫자를 선택하고 칸을 클릭하거나, 칸 선택 후 숫자를 누르세요!';

    wrap.appendChild(meta);
    wrap.appendChild(boardEl);
    wrap.appendChild(numpad);
    wrap.appendChild(controls);
    wrap.appendChild(msg);
    root.appendChild(wrap);

    // Keyboard support
    document.addEventListener('keydown', onKeyDown);
    updateNumberCompletion();
  }

  /* ── Select cell ───────────────────────────────────────── */
  function selectCell(r, c) {
    if (!gameActive) return;
    selectedCell = { r, c };
    applyHighlight();
  }

  /* ── Highlight ─────────────────────────────────────────── */
  function applyHighlight() {
    // Clear
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = document.getElementById(`sdk-cell-${r}-${c}`);
        if (!cell) continue;
        cell.classList.remove('selected', 'highlight-group', 'highlight-same');
      }
    }

    if (!selectedCell) return;
    const { r, c } = selectedCell;

    const selCell = document.getElementById(`sdk-cell-${r}-${c}`);
    if (selCell) selCell.classList.add('selected');

    // Get the value at selected cell
    const selVal = userGrid[r][c] || puzzle[r][c];

    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (i === r && j === c) continue;
        const cell = document.getElementById(`sdk-cell-${i}-${j}`);
        if (!cell) continue;
        const sameGroup = i === r || j === c ||
          (Math.floor(i/3) === Math.floor(r/3) && Math.floor(j/3) === Math.floor(c/3));
        if (sameGroup) {
          cell.classList.add('highlight-group');
        }
        // Same number highlight
        const val = userGrid[i][j] || puzzle[i][j];
        if (selVal && val && val === selVal) {
          cell.classList.remove('highlight-group');
          cell.classList.add('highlight-same');
        }
      }
    }
  }

  /* ── Enter number ──────────────────────────────────────── */
  function enterNumber(n) {
    if (!gameActive || !selectedCell) return;
    const { r, c } = selectedCell;
    if (givens[r][c]) return;

    if (pencilMode && n !== 0) {
      // Toggle pencil candidate
      const s = pencilGrid[r][c];
      if (s.has(n)) s.delete(n); else s.add(n);
      renderCell(r, c);
      return;
    }

    // Clear pencil marks
    pencilGrid[r][c].clear();

    if (n === 0) {
      userGrid[r][c] = 0;
      errorCells.delete(`${r},${c}`);
      renderCell(r, c);
      applyHighlight();
      updateErrorDisplay();
      return;
    }

    const prev = userGrid[r][c];
    userGrid[r][c] = n;

    // Check validity
    const correct = solution[r][c] === n;
    if (!correct) {
      if (prev !== n) errors++;
      errorCells.add(`${r},${c}`);
    } else {
      errorCells.delete(`${r},${c}`);
    }

    // Clear pencil candidates in same row/col/box
    if (correct) {
      clearPencilCandidates(r, c, n);
    }

    renderCell(r, c);
    applyHighlight();
    updateErrorDisplay();
    updateScore();
    updateNumberCompletion();

    // Check win
    if (isBoardComplete()) {
      gameActive = false;
      clearInterval(timerInterval);
      const score = computeScore();
      window.updateScore && window.updateScore(score);
      const msg = document.getElementById('sdk-msg');
      if (msg) msg.textContent = '🎉 완성! 축하합니다!';
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('gameClear', { detail: { score } }));
        window.dispatchEvent(new CustomEvent('gameClear', { detail: { score } }));
      }, 500);
    }
  }

  function clearPencilCandidates(r, c, n) {
    for (let i = 0; i < 9; i++) {
      pencilGrid[r][i].delete(n);
      pencilGrid[i][c].delete(n);
    }
    const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        pencilGrid[br+i][bc+j].delete(n);
  }

  /* ── Render single cell ────────────────────────────────── */
  function renderCell(r, c) {
    const cell = document.getElementById(`sdk-cell-${r}-${c}`);
    if (!cell) return;
    if (givens[r][c]) return;

    cell.classList.toggle('error', errorCells.has(`${r},${c}`));

    const numEl = document.getElementById(`sdk-num-${r}-${c}`);
    if (!numEl) return;

    if (userGrid[r][c]) {
      // Remove pencil grid if present
      const pg = cell.querySelector('.sdk-pencil-grid');
      if (pg) pg.remove();
      numEl.style.display = '';
      numEl.textContent = userGrid[r][c];
    } else if (pencilGrid[r][c].size > 0) {
      numEl.style.display = 'none';
      let pg = cell.querySelector('.sdk-pencil-grid');
      if (!pg) {
        pg = document.createElement('div');
        pg.className = 'sdk-pencil-grid';
        cell.appendChild(pg);
      }
      pg.innerHTML = '';
      for (let n = 1; n <= 9; n++) {
        const sp = document.createElement('span');
        sp.className = 'sdk-pencil-num';
        sp.textContent = pencilGrid[r][c].has(n) ? n : '';
        pg.appendChild(sp);
      }
    } else {
      const pg = cell.querySelector('.sdk-pencil-grid');
      if (pg) pg.remove();
      numEl.style.display = '';
      numEl.textContent = '';
    }
  }

  /* ── Board complete check ──────────────────────────────── */
  function isBoardComplete() {
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (!givens[r][c] && userGrid[r][c] !== solution[r][c]) return false;
    return true;
  }

  /* ── Hint ──────────────────────────────────────────────── */
  function useHint() {
    if (!gameActive || hintsLeft <= 0) return;
    // Find a random empty/wrong cell
    const cells = [];
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (!givens[r][c] && userGrid[r][c] !== solution[r][c])
          cells.push([r, c]);
    if (!cells.length) return;

    const idx = Math.floor(Math.random() * cells.length);
    const [r, c] = cells[idx];
    hintsLeft--;
    userGrid[r][c] = solution[r][c];
    errorCells.delete(`${r},${c}`);
    pencilGrid[r][c].clear();
    clearPencilCandidates(r, c, solution[r][c]);
    renderCell(r, c);

    const hintBtn = document.getElementById('sdk-hint-btn');
    if (hintBtn) hintBtn.textContent = `💡 힌트 (${hintsLeft}회)`;
    const hintMeta = document.getElementById('sdk-hints');
    if (hintMeta) hintMeta.textContent = hintsLeft;
    if (hintsLeft <= 0 && hintBtn) { hintBtn.disabled = true; hintBtn.style.opacity = '0.5'; }

    updateScore();
    applyHighlight();
    updateNumberCompletion();
    if (isBoardComplete()) enterNumber(solution[r][c]); // trigger win check via re-entry
  }

  /* ── Score ─────────────────────────────────────────────── */
  function computeScore() {
    const secs = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    const usedHints = 3 - hintsLeft;
    return Math.max(0, 10000 - secs * 5 - usedHints * 500 - errors * 50);
  }

  function updateScore() {
    const score = computeScore();
    const el = document.getElementById('sdk-score');
    if (el) el.textContent = score.toLocaleString();
    window.updateScore && window.updateScore(score);
  }

  function updateErrorDisplay() {
    const el = document.getElementById('sdk-errors');
    if (el) el.textContent = errors;
  }

  /* ── Number completion indicator ───────────────────────── */
  function updateNumberCompletion() {
    for (let n = 1; n <= 9; n++) {
      let count = 0;
      for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++)
          if ((givens[r][c] ? puzzle[r][c] : userGrid[r][c]) === n && solution[r][c] === n)
            count++;
      // Find numpad button
      const btns = document.querySelectorAll('.sdk-np-btn');
      btns.forEach(btn => {
        if (btn.textContent.trim() === String(n)) {
          btn.classList.toggle('complete', count >= 9);
          if (count >= 9) {
            btn.style.opacity = '0.3';
            btn.style.pointerEvents = 'none';
          } else {
            btn.style.opacity = '';
            btn.style.pointerEvents = '';
          }
        }
      });
    }
  }

  /* ── Timer ─────────────────────────────────────────────── */
  function startTimer() {
    clearInterval(timerInterval);
    startTime = Date.now();
    timerInterval = setInterval(() => {
      if (!gameActive) return;
      const secs = Math.floor((Date.now() - startTime) / 1000);
      const el = document.getElementById('sdk-time');
      if (el) {
        const m = Math.floor(secs / 60);
        el.textContent = `${m}:${String(secs % 60).padStart(2, '0')}`;
      }
      updateScore();
    }, 1000);
  }

  /* ── Keyboard ──────────────────────────────────────────── */
  function onKeyDown(e) {
    if (!gameActive) return;

    if (e.key >= '1' && e.key <= '9') {
      enterNumber(parseInt(e.key));
      return;
    }
    if (e.key === '0' || e.key === 'Delete' || e.key === 'Backspace') {
      enterNumber(0);
      return;
    }
    if (!selectedCell) return;

    const { r, c } = selectedCell;
    const moves = {
      ArrowUp:    [-1, 0],
      ArrowDown:  [ 1, 0],
      ArrowLeft:  [ 0,-1],
      ArrowRight: [ 0, 1],
    };
    if (moves[e.key]) {
      e.preventDefault();
      const [dr, dc] = moves[e.key];
      const nr = Math.max(0, Math.min(8, r + dr));
      const nc = Math.max(0, Math.min(8, c + dc));
      selectCell(nr, nc);
    }
    if (e.key === 'p' || e.key === 'P') {
      pencilMode = !pencilMode;
      const pb = document.getElementById('sdk-pencil-btn');
      if (pb) {
        pb.classList.toggle('pencil-on', pencilMode);
        pb.textContent = pencilMode ? '✏️ 메모 ON' : '✏️ 메모 모드';
      }
    }
    if (e.key === 'h' || e.key === 'H') useHint();
  }

  /* ── Cleanup keyboard listener on restart ──────────────── */
  let _keyHandlerAttached = false;
  const _keyHandler = e => onKeyDown(e);

  /* ── Start game ────────────────────────────────────────── */
  window.startGame = function (diffId, stage) {
    currentDiff  = diffId  || 'easy';
    currentStage = stage   || 1;
    pencilMode   = false;
    hintsLeft    = 3;
    errors       = 0;
    selectedCell = null;
    gameActive   = false;
    errorCells   = new Set();

    clearInterval(timerInterval);

    // Remove old keyboard listener
    document.removeEventListener('keydown', onKeyDown);

    const givensCount = DIFF_GIVENS[currentDiff] || 34;
    // Seed: combine stage and difficulty to get variety
    const diffSeed = { easy: 0, normal: 100, hard: 200, expert: 300 }[currentDiff] || 0;
    const seed = currentStage + diffSeed;

    const result = generatePuzzle(seed, givensCount);
    puzzle   = result.puzzle;
    solution = result.solution;

    givens   = puzzle.map(row => row.map(v => v !== 0));
    userGrid = puzzle.map(row => row.map(v => v !== 0 ? 0 : 0));
    pencilGrid = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));

    buildUI();
    startTimer();
    gameActive = true;

    document.addEventListener('keydown', onKeyDown);
    updateScore();
  };

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    clearInterval(timerInterval);
    document.removeEventListener('keydown', onKeyDown);
  });

})();
