(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════
     KOREAN CROSSWORD – game.js
     API: window.GAME_CONFIG, window.startGame, window.updateScore
          CustomEvent 'gameOver' / 'gameClear'
  ═══════════════════════════════════════════════════════════ */

  const CFG  = window.GAME_CONFIG || {};
  const root = document.getElementById('game-root');

  /* ── Puzzles ─────────────────────────────────────────────
     grid: null = black cell, string number = word-start cell
           '' = ordinary white cell
     All answers are Korean (Hangul).
     Grid size: 10 columns × 10 rows (0-indexed).
     Cell format: null (black) | '' (empty fillable) | number-string (clue #, fillable)
  ──────────────────────────────────────────────────────── */

  /*
   Puzzle layout notation:
   '#' = black, '.' = empty white, '1'-'9' etc = numbered cell
   Each puzzle is an array of 10 strings of length 10.
  */

  // Helper: build grid from string layout
  function parseLayout(lines) {
    return lines.map(line =>
      line.split('').map(ch => {
        if (ch === '#') return null;
        if (ch === '.') return '';
        return ch; // number char kept as clue marker
      })
    );
  }

  const PUZZLES = [
    /* ── Puzzle 0 ─────────────────────────────────────────
       Simple colors + basic nouns, 10×10 grid
    ────────────────────────────────────────────────────── */
    {
      layout: [
        '1##2#3####',
        '.##.#.####',
        '.##.#.####',
        '4...#5.....',
        '####.#####',
        '####6.....',
        '####.#####',
        '7...#8....',
        '####.#####',
        '####.#####',
      ].map(r => r.replace(/\./g, '.')), // just for clarity
      across: [
        { num:1, row:0, col:0, len:1, answer:'빨', clue:'빨간색의 첫 글자' },
        { num:2, row:0, col:3, len:1, answer:'파', clue:'파란색의 첫 글자' },
        { num:3, row:0, col:5, len:1, answer:'노', clue:'노란색의 첫 글자' },
        { num:4, row:3, col:0, len:4, answer:'사과', clue:'빨간 과일 (4칸이지만 2글자, 나머지는 채움)' },
        { num:5, row:3, col:5, len:5, answer:'하늘', clue:'파란 하늘' },
        { num:6, row:5, col:4, len:6, answer:'바나나', clue:'노란 과일' },
        { num:7, row:7, col:0, len:4, answer:'봄비', clue:'봄에 오는 비' },
        { num:8, row:7, col:5, len:5, answer:'여름', clue:'덥고 무더운 계절' },
      ],
      down: [
        { num:1, row:0, col:0, len:3, answer:'삼', clue:'1,2,3에서 마지막' },
        { num:2, row:0, col:3, len:3, answer:'파란', clue:'하늘의 색' },
        { num:3, row:0, col:5, len:3, answer:'노래', clue:'음악을 부르다' },
        { num:5, row:3, col:5, len:5, answer:'하나둘', clue:'하나, 둘 셋' },
      ],
    },

    /* ── Puzzle 1 ─────────────────────────────────────────
       Animals + nature
    ────────────────────────────────────────────────────── */
    {
      layout: null, // defined manually below
      across: [],
      down: [],
    },

    /* ── Puzzle 2 ─────────────────────────────────────────
       Food + kitchen
    ────────────────────────────────────────────────────── */
    {
      layout: null,
      across: [],
      down: [],
    },
  ];

  /* ── Rebuild puzzles properly with correct grid structures ── */

  /*
   We'll use a clean declarative format:
   - grid is 10×10 of: null (black) | 0 (white empty) | positive integer (word start)
   - across/down lists have {num, row, col, answer, clue}
  */

  const REAL_PUZZLES = [

    /* ────────── Puzzle 0 ──────────────────────────────────
       10 × 10  Korean vocabulary: colors, seasons, food
       Answer words placed manually on grid.

       Layout (R=row, C=col, 0-indexed):
       Across:
         1→ R0 C2  사과 (4)
         2→ R2 C0  노란 (3)
         3→ R4 C1  바다 (2)
         4→ R4 C5  하늘 (2)
         5→ R6 C0  여름 (2)
         6→ R6 C4  겨울 (2)
         7→ R8 C1  강아지 (3)
       Down:
         1→ R0 C2  산 (산봄여) ... 3 letters: 산→봄→여름
         Let's keep it simple with 2-3 letter words.
    ───────────────────────────────────────────────────────*/
    (function () {
      // 10×10 grid, all null first
      const G = Array.from({ length: 10 }, () => new Array(10).fill(null));
      const across = [], down = [];

      function placeAcross(num, row, col, answer) {
        const chars = [...answer];
        G[row][col] = num;
        for (let i = 0; i < chars.length; i++) {
          if (i > 0 && G[row][col+i] === null) G[row][col+i] = 0;
        }
      }
      function placeDown(num, row, col, answer) {
        const chars = [...answer];
        if (G[row][col] === null || G[row][col] === 0) G[row][col] = num;
        for (let i = 1; i < chars.length; i++) {
          if (G[row+i][col] === null) G[row+i][col] = 0;
        }
      }

      // Across words
      placeAcross(1, 0, 1, '사과');    // row0 col1: 사(1) 과
      placeAcross(2, 0, 5, '봄날');    // row0 col5: 봄(2) 날
      placeAcross(3, 2, 0, '하늘');    // row2 col0: 하(3) 늘
      placeAcross(4, 2, 4, '노랑');    // row2 col4: 노(4) 랑
      placeAcross(5, 4, 1, '바나나');  // row4 col1: 바(5) 나 나
      placeAcross(6, 6, 0, '여름');    // row6 col0: 여(6) 름
      placeAcross(7, 6, 4, '겨울');    // row6 col4: 겨(7) 울
      placeAcross(8, 8, 1, '강아지'); // row8 col1: 강(8) 아 지

      // Down words
      placeDown(1, 0, 1, '사하여강');  // col1: 사 하 (여름줄) 강
      placeDown(2, 0, 5, '봄바겨');    // col5: 봄 (바나나) 겨
      placeDown(3, 2, 0, '하여');      // col0: 하 여
      placeDown(4, 2, 4, '노겨');      // col4: 노 겨
      placeDown(5, 4, 3, '나');        // col3 short

      across.push({ num:1, row:0, col:1, answer:'사과', clue:'빨간 과일, 아이들이 좋아해요' });
      across.push({ num:2, row:0, col:5, answer:'봄날', clue:'봄의 날씨, 따뜻한 계절' });
      across.push({ num:3, row:2, col:0, answer:'하늘', clue:'구름이 떠있는 곳' });
      across.push({ num:4, row:2, col:4, answer:'노랑', clue:'해바라기의 색깔' });
      across.push({ num:5, row:4, col:1, answer:'바나나', clue:'원숭이가 좋아하는 노란 과일' });
      across.push({ num:6, row:6, col:0, answer:'여름', clue:'덥고 무더운 계절' });
      across.push({ num:7, row:6, col:4, answer:'겨울', clue:'눈이 오는 추운 계절' });
      across.push({ num:8, row:8, col:1, answer:'강아지', clue:'멍멍 짖는 반려동물' });

      down.push({ num:1, row:0, col:1, answer:'사하여강', clue:'사과-하늘-여름-강아지의 첫 글자들' });
      down.push({ num:2, row:0, col:5, answer:'봄바겨', clue:'봄-바나나-겨울의 첫 글자' });
      down.push({ num:3, row:2, col:0, answer:'하여', clue:'하늘과 여름의 앞 글자' });
      down.push({ num:4, row:2, col:4, answer:'노겨', clue:'노랑과 겨울의 앞 글자' });

      return { grid: G, across, down };
    })(),

    /* ────────── Puzzle 1 ──────────────────────────────────
       Numbers + body parts
    ───────────────────────────────────────────────────────*/
    (function () {
      const G = Array.from({ length: 10 }, () => new Array(10).fill(null));
      const across = [], down = [];

      // Place cells manually
      // Across: 일(1) row0 col0, 이월(2) row0 col3, 눈코입(3) row2 col0, 손발(5) row4 col2, 머리(6) row6 col1, 배꼽(7) row8 col3
      const acrossWords = [
        { num:1, row:0, col:0, answer:'일월', clue:'1월, 한 해의 첫 번째 달' },
        { num:2, row:0, col:4, answer:'이월', clue:'2월, 밸런타인 데이가 있는 달' },
        { num:3, row:2, col:0, answer:'눈코입', clue:'얼굴에 있는 세 가지' },
        { num:4, row:2, col:5, answer:'귀뺨', clue:'얼굴 양쪽에 있는 것들' },
        { num:5, row:4, col:1, answer:'손발', clue:'팔과 다리 끝에 있는 것' },
        { num:6, row:6, col:0, answer:'머리', clue:'가장 위에 있는 신체 부위' },
        { num:7, row:6, col:4, answer:'어깨', clue:'팔과 목 사이 부위' },
        { num:8, row:8, col:2, answer:'배꼽', clue:'배 가운데 있는 것' },
      ];
      const downWords = [
        { num:1, row:0, col:0, answer:'일눈손', clue:'일월-눈코입-손발의 첫 글자' },
        { num:2, row:0, col:4, answer:'이귀어', clue:'이월-귀뺨-어깨의 첫 글자' },
        { num:3, row:2, col:0, answer:'눈머', clue:'눈코입-머리의 첫 글자' },
        { num:9, row:4, col:3, answer:'발배', clue:'손발-배꼽의 두 번째/첫 번째 글자' },
      ];

      for (const w of acrossWords) {
        const chars = [...w.answer];
        G[w.row][w.col] = w.num;
        for (let i = 1; i < chars.length; i++) {
          if (G[w.row][w.col+i] === null) G[w.row][w.col+i] = 0;
        }
      }
      for (const w of downWords) {
        const chars = [...w.answer];
        if (G[w.row][w.col] === null || G[w.row][w.col] === 0) G[w.row][w.col] = w.num;
        for (let i = 1; i < chars.length; i++) {
          if (G[w.row+i] && G[w.row+i][w.col] === null) G[w.row+i][w.col] = 0;
        }
      }

      return { grid: G, across: acrossWords, down: downWords };
    })(),

    /* ────────── Puzzle 2 ──────────────────────────────────
       Korean food
    ───────────────────────────────────────────────────────*/
    (function () {
      const G = Array.from({ length: 10 }, () => new Array(10).fill(null));
      const across = [
        { num:1, row:0, col:0, answer:'김치', clue:'대표적인 한국 발효 음식' },
        { num:2, row:0, col:4, answer:'된장', clue:'콩으로 만든 발효 장' },
        { num:3, row:2, col:1, answer:'불고기', clue:'달콤한 양념 소고기 구이' },
        { num:4, row:2, col:6, answer:'잡채', clue:'당면과 채소를 볶은 음식' },
        { num:5, row:4, col:0, answer:'비빔밥', clue:'여러 나물을 넣고 비벼 먹는 밥' },
        { num:6, row:6, col:2, answer:'삼겹살', clue:'돼지고기 구이, 소주와 함께' },
        { num:7, row:8, col:1, answer:'냉면', clue:'여름에 먹는 차가운 국수' },
        { num:8, row:8, col:5, answer:'순두부', clue:'부드러운 두부 찌개' },
      ];
      const down = [
        { num:1, row:0, col:0, answer:'김불비삼', clue:'대표 한식 4가지의 첫 글자' },
        { num:2, row:0, col:4, answer:'된잡겹', clue:'된장-잡채-삼겹살의 앞글자' },
        { num:3, row:2, col:1, answer:'불냉', clue:'불고기와 냉면의 앞 글자' },
        { num:9, row:4, col:3, answer:'밥두', clue:'비빔밥-순두부의 마지막/두번째 글자' },
      ];

      for (const w of across) {
        const chars = [...w.answer];
        G[w.row][w.col] = w.num;
        for (let i = 1; i < chars.length; i++) {
          if (G[w.row][w.col+i] === null) G[w.row][w.col+i] = 0;
        }
      }
      for (const w of down) {
        const chars = [...w.answer];
        if (G[w.row][w.col] === null || G[w.row][w.col] === 0) G[w.row][w.col] = w.num;
        for (let i = 1; i < chars.length; i++) {
          if (G[w.row+i] && G[w.row+i][w.col] === null) G[w.row+i][w.col] = 0;
        }
      }

      return { grid: G, across, down };
    })(),
  ];

  /* ── State ─────────────────────────────────────────────── */
  let puzzle       = null;
  let userGrid     = [];    // 2D of user-typed characters ('' = empty)
  let selectedCell = null;  // {r, c}
  let direction    = 'across'; // 'across' | 'down'
  let activeWordNum = null;
  let activeWordDir = null;
  let penalty      = 0;
  let totalCells   = 0;
  let gameActive   = false;
  let currentDiff  = 'easy';
  let currentStage = 1;

  const GRID_SIZE = 10;
  const CELL_PX   = 38;

  /* ── CSS ───────────────────────────────────────────────── */
  if (!document.getElementById('cw-style')) {
    const s = document.createElement('style');
    s.id = 'cw-style';
    s.textContent = `
      #cw-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        padding: 10px;
        font-family: 'Nanum Gothic', 'Malgun Gothic', sans-serif;
        user-select: none;
        -webkit-user-select: none;
      }
      #cw-grid-wrap {
        position: relative;
        display: inline-block;
      }
      #cw-grid {
        display: grid;
        grid-template-columns: repeat(10, ${CELL_PX}px);
        grid-template-rows: repeat(10, ${CELL_PX}px);
        border: 2px solid #333;
        gap: 0;
      }
      .cw-cell {
        width: ${CELL_PX}px;
        height: ${CELL_PX}px;
        border: 1px solid #999;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        background: #fff;
        box-sizing: border-box;
        transition: background 120ms;
      }
      .cw-cell.black {
        background: #222;
        cursor: default;
        border-color: #222;
      }
      .cw-cell.selected {
        background: #ffd700 !important;
      }
      .cw-cell.highlight {
        background: #cce8ff;
      }
      .cw-cell.correct {
        background: #c8f7c5 !important;
      }
      .cw-cell.wrong {
        background: #ffc5c5 !important;
      }
      .cw-cell .cell-num {
        position: absolute;
        top: 1px; left: 2px;
        font-size: 9px;
        color: #555;
        line-height: 1;
        pointer-events: none;
      }
      .cw-cell .cell-char {
        font-size: 16px;
        font-weight: 700;
        color: #111;
        pointer-events: none;
      }
      #cw-clue-panel {
        width: 100%;
        max-width: 420px;
        background: #f0f4ff;
        border: 1px solid #bbd;
        border-radius: 8px;
        padding: 10px 14px;
        font-size: 0.9rem;
        min-height: 48px;
      }
      #cw-clue-panel .clue-dir {
        font-size: 0.75rem;
        color: #888;
        margin-bottom: 2px;
      }
      #cw-clue-panel .clue-text {
        font-weight: 700;
        color: #224;
      }
      #cw-buttons {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: center;
      }
      .cw-btn {
        padding: 8px 18px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 700;
        background: #3498db;
        color: #fff;
        transition: background 150ms, transform 80ms;
      }
      .cw-btn:hover { background: #2980b9; transform: scale(1.04); }
      .cw-btn.danger { background: #e74c3c; }
      .cw-btn.danger:hover { background: #c0392b; }
      #cw-meta {
        font-size: 0.85rem;
        color: #555;
        display: flex;
        gap: 16px;
      }
      #cw-meta strong { color: #1a8fa0; }
      #cw-msg {
        font-size: 0.9rem;
        font-weight: 700;
        color: #e05050;
        min-height: 1.2em;
      }
      #cw-input-hidden {
        position: absolute;
        opacity: 0;
        pointer-events: none;
        width: 1px;
        height: 1px;
      }
    `;
    document.head.appendChild(s);
  }

  /* ── Build DOM ─────────────────────────────────────────── */
  let gridEl, hiddenInput;

  function buildUI() {
    root.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.id = 'cw-wrap';

    const meta = document.createElement('div');
    meta.id = 'cw-meta';
    meta.innerHTML = `<span>패널티: <strong id="cw-penalty">0</strong></span><span>점수: <strong id="cw-score">10000</strong></span>`;

    const gridWrap = document.createElement('div');
    gridWrap.id = 'cw-grid-wrap';

    gridEl = document.createElement('div');
    gridEl.id = 'cw-grid';

    hiddenInput = document.createElement('input');
    hiddenInput.id = 'cw-input-hidden';
    hiddenInput.type = 'text';
    hiddenInput.autocomplete = 'off';
    hiddenInput.setAttribute('inputmode', 'text');

    gridWrap.appendChild(gridEl);
    gridWrap.appendChild(hiddenInput);

    const cluePanel = document.createElement('div');
    cluePanel.id = 'cw-clue-panel';
    cluePanel.innerHTML = '<div class="clue-dir">단어를 선택하세요</div><div class="clue-text">가로 또는 세로 단어를 클릭하세요</div>';

    const buttons = document.createElement('div');
    buttons.id = 'cw-buttons';

    const checkBtn = document.createElement('button');
    checkBtn.className = 'cw-btn';
    checkBtn.textContent = '✔ 정답 확인';
    checkBtn.addEventListener('click', checkAnswers);

    const revealBtn = document.createElement('button');
    revealBtn.className = 'cw-btn danger';
    revealBtn.textContent = '💡 정답 보기 (-1000점)';
    revealBtn.addEventListener('click', revealAll);

    buttons.appendChild(checkBtn);
    buttons.appendChild(revealBtn);

    const msg = document.createElement('div');
    msg.id = 'cw-msg';

    wrap.appendChild(meta);
    wrap.appendChild(gridWrap);
    wrap.appendChild(cluePanel);
    wrap.appendChild(buttons);
    wrap.appendChild(msg);
    root.appendChild(wrap);

    renderGrid();
    setupInput();
  }

  /* ── Render grid ───────────────────────────────────────── */
  function renderGrid() {
    if (!gridEl) return;
    gridEl.innerHTML = '';

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = document.createElement('div');
        cell.className = 'cw-cell';
        cell.dataset.r = r;
        cell.dataset.c = c;

        const gv = puzzle.grid[r][c];

        if (gv === null) {
          cell.classList.add('black');
        } else {
          if (typeof gv === 'number' && gv > 0) {
            const numSpan = document.createElement('span');
            numSpan.className = 'cell-num';
            numSpan.textContent = gv;
            cell.appendChild(numSpan);
          }
          const charSpan = document.createElement('span');
          charSpan.className = 'cell-char';
          charSpan.id = `cw-char-${r}-${c}`;
          charSpan.textContent = userGrid[r][c] || '';
          cell.appendChild(charSpan);

          cell.addEventListener('click', () => onCellClick(r, c));
          cell.addEventListener('touchend', e => { e.preventDefault(); onCellClick(r, c); });
        }

        gridEl.appendChild(cell);
      }
    }
    applyHighlight();
  }

  /* ── Cell click ────────────────────────────────────────── */
  function onCellClick(r, c) {
    if (!gameActive) return;
    if (puzzle.grid[r][c] === null) return;

    // Toggle direction if clicking the same cell
    if (selectedCell && selectedCell.r === r && selectedCell.c === c) {
      direction = direction === 'across' ? 'down' : 'across';
    }

    selectedCell = { r, c };
    findActiveWord();
    applyHighlight();
    updateCluePanel();

    // Focus hidden input for keyboard
    hiddenInput && hiddenInput.focus();
  }

  /* ── Find active word from selected cell + direction ───── */
  function findActiveWord() {
    if (!selectedCell) return;
    const { r, c } = selectedCell;
    const wordList = direction === 'across' ? puzzle.across : puzzle.down;

    for (const w of wordList) {
      const chars = [...w.answer];
      const inRange = direction === 'across'
        ? w.row === r && c >= w.col && c < w.col + chars.length
        : w.col === c && r >= w.row && r < w.row + chars.length;
      if (inRange) {
        activeWordNum = w.num;
        activeWordDir = direction;
        return;
      }
    }
    // Try other direction
    const otherDir = direction === 'across' ? 'down' : 'across';
    const otherList = otherDir === 'across' ? puzzle.across : puzzle.down;
    for (const w of otherList) {
      const chars = [...w.answer];
      const inRange = otherDir === 'across'
        ? w.row === r && c >= w.col && c < w.col + chars.length
        : w.col === c && r >= w.row && r < w.row + chars.length;
      if (inRange) {
        activeWordNum = w.num;
        activeWordDir = otherDir;
        direction = otherDir;
        return;
      }
    }
    activeWordNum = null;
    activeWordDir = null;
  }

  /* ── Highlight cells in active word ───────────────────── */
  function applyHighlight() {
    // Clear all highlights
    document.querySelectorAll('.cw-cell').forEach(el => {
      el.classList.remove('selected', 'highlight');
    });

    if (!selectedCell) return;

    const { r, c } = selectedCell;
    const selEl = document.querySelector(`.cw-cell[data-r="${r}"][data-c="${c}"]`);
    if (selEl) selEl.classList.add('selected');

    if (!activeWordNum) return;

    const wordList = activeWordDir === 'across' ? puzzle.across : puzzle.down;
    const word = wordList.find(w => w.num === activeWordNum);
    if (!word) return;

    const chars = [...word.answer];
    for (let i = 0; i < chars.length; i++) {
      const wr = activeWordDir === 'across' ? word.row : word.row + i;
      const wc = activeWordDir === 'across' ? word.col + i : word.col;
      if (wr === r && wc === c) continue;
      const el = document.querySelector(`.cw-cell[data-r="${wr}"][data-c="${wc}"]`);
      if (el) el.classList.add('highlight');
    }
  }

  /* ── Update clue panel ─────────────────────────────────── */
  function updateCluePanel() {
    const panel = document.getElementById('cw-clue-panel');
    if (!panel) return;
    if (!activeWordNum) {
      panel.innerHTML = '<div class="clue-dir">단어를 선택하세요</div><div class="clue-text">가로 또는 세로 단어를 클릭하세요</div>';
      return;
    }
    const wordList = activeWordDir === 'across' ? puzzle.across : puzzle.down;
    const word = wordList.find(w => w.num === activeWordNum);
    if (!word) return;
    const dirLabel = activeWordDir === 'across' ? '→ 가로' : '↓ 세로';
    panel.innerHTML = `<div class="clue-dir">${word.num}번 ${dirLabel}</div><div class="clue-text">${word.clue}</div>`;
  }

  /* ── Keyboard input ────────────────────────────────────── */
  function setupInput() {
    if (!hiddenInput) return;

    hiddenInput.addEventListener('keydown', e => {
      if (!gameActive || !selectedCell) return;
      const { r, c } = selectedCell;

      if (e.key === 'ArrowRight') { moveSelection(0, 1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { moveSelection(0, -1); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { moveSelection(1, 0); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { moveSelection(-1, 0); e.preventDefault(); }
      else if (e.key === 'Backspace') {
        e.preventDefault();
        if (userGrid[r][c]) {
          userGrid[r][c] = '';
          updateCellChar(r, c);
        } else {
          // move backward
          if (activeWordDir === 'across') moveSelection(0, -1);
          else moveSelection(-1, 0);
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        // Accept any character (Korean IME fires 'input' event instead)
        e.preventDefault();
        typeChar(e.key);
      }
    });

    // For Korean IME / mobile keyboards
    hiddenInput.addEventListener('input', e => {
      if (!gameActive || !selectedCell) return;
      const val = hiddenInput.value;
      if (!val) return;
      hiddenInput.value = '';
      // Type each character
      for (const ch of val) {
        typeChar(ch);
      }
    });
  }

  function typeChar(ch) {
    if (!selectedCell) return;
    const { r, c } = selectedCell;
    if (puzzle.grid[r][c] === null) return;
    userGrid[r][c] = ch;
    updateCellChar(r, c);
    // Remove check colors
    const el = document.querySelector(`.cw-cell[data-r="${r}"][data-c="${c}"]`);
    if (el) { el.classList.remove('correct', 'wrong'); }
    // Advance
    advanceCursor();
    updateScore();
  }

  function updateCellChar(r, c) {
    const el = document.getElementById(`cw-char-${r}-${c}`);
    if (el) el.textContent = userGrid[r][c] || '';
  }

  function advanceCursor() {
    if (!selectedCell) return;
    if (activeWordDir === 'across') moveSelection(0, 1);
    else moveSelection(1, 0);
  }

  function moveSelection(dr, dc) {
    if (!selectedCell) return;
    let { r, c } = selectedCell;
    r += dr; c += dc;
    // Find next valid cell
    while (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
      if (puzzle.grid[r][c] !== null) {
        selectedCell = { r, c };
        findActiveWord();
        applyHighlight();
        updateCluePanel();
        return;
      }
      r += dr; c += dc;
    }
  }

  /* ── Check answers ─────────────────────────────────────── */
  function checkAnswers() {
    let correct = 0, total = 0;
    const allWords = [...puzzle.across, ...puzzle.down];

    // Clear previous check colors
    document.querySelectorAll('.cw-cell').forEach(el => el.classList.remove('correct', 'wrong'));

    for (const word of allWords) {
      const chars = [...word.answer];
      const isAcross = puzzle.across.includes(word);
      for (let i = 0; i < chars.length; i++) {
        const wr = isAcross ? word.row : word.row + i;
        const wc = isAcross ? word.col + i : word.col;
        total++;
        const typed = userGrid[wr][wc] || '';
        if (typed === chars[i]) {
          correct++;
          const el = document.querySelector(`.cw-cell[data-r="${wr}"][data-c="${wc}"]`);
          if (el && !el.classList.contains('wrong')) el.classList.add('correct');
        } else if (typed !== '') {
          const el = document.querySelector(`.cw-cell[data-r="${wr}"][data-c="${wc}"]`);
          if (el) { el.classList.remove('correct'); el.classList.add('wrong'); }
        }
      }
    }

    const score = computeScore(correct, total);
    window.updateScore && window.updateScore(score);
    const msg = document.getElementById('cw-msg');
    if (msg) msg.textContent = `${correct}/${total} 칸 정답! (점수: ${score.toLocaleString()})`;

    if (correct === total) {
      gameActive = false;
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('gameClear', { detail: { score } }));
        window.dispatchEvent(new CustomEvent('gameClear', { detail: { score } }));
      }, 400);
    }
  }

  /* ── Reveal all ────────────────────────────────────────── */
  function revealAll() {
    penalty += 1000;
    const allWords = [...puzzle.across, ...puzzle.down];
    for (const word of allWords) {
      const chars = [...word.answer];
      const isAcross = puzzle.across.includes(word);
      for (let i = 0; i < chars.length; i++) {
        const wr = isAcross ? word.row : word.row + i;
        const wc = isAcross ? word.col + i : word.col;
        userGrid[wr][wc] = chars[i];
        updateCellChar(wr, wc);
        const el = document.querySelector(`.cw-cell[data-r="${wr}"][data-c="${wc}"]`);
        if (el) { el.classList.remove('wrong'); el.classList.add('correct'); }
      }
    }
    updateScore();
    const msg = document.getElementById('cw-msg');
    if (msg) msg.textContent = `정답이 공개되었습니다 (-1000점 패널티)`;
  }

  function computeScore(correct, total) {
    const raw = total > 0 ? Math.round(correct / total * 10000) : 0;
    return Math.max(0, raw - penalty);
  }

  function updateScore() {
    const penEl = document.getElementById('cw-penalty');
    if (penEl) penEl.textContent = penalty;
    // Count correct
    const allWords = [...puzzle.across, ...puzzle.down];
    let correct = 0, total = 0;
    for (const word of allWords) {
      const chars = [...word.answer];
      const isAcross = puzzle.across.includes(word);
      for (let i = 0; i < chars.length; i++) {
        const wr = isAcross ? word.row : word.row + i;
        const wc = isAcross ? word.col + i : word.col;
        total++;
        if ((userGrid[wr][wc] || '') === chars[i]) correct++;
      }
    }
    const score = computeScore(correct, total);
    const scoreEl = document.getElementById('cw-score');
    if (scoreEl) scoreEl.textContent = score.toLocaleString();
    window.updateScore && window.updateScore(score);
  }

  /* ── Start game ────────────────────────────────────────── */
  window.startGame = function (diffId, stage) {
    currentDiff  = diffId  || 'easy';
    currentStage = stage   || 1;
    penalty      = 0;
    selectedCell = null;
    direction    = 'across';
    activeWordNum = null;
    activeWordDir = null;
    gameActive   = false;

    const pidx = (currentStage - 1) % REAL_PUZZLES.length;
    puzzle = REAL_PUZZLES[pidx];

    userGrid = Array.from({ length: GRID_SIZE }, () => new Array(GRID_SIZE).fill(''));
    totalCells = 0;
    for (let r = 0; r < GRID_SIZE; r++)
      for (let c = 0; c < GRID_SIZE; c++)
        if (puzzle.grid[r][c] !== null) totalCells++;

    buildUI();
    gameActive = true;
    updateScore();
  };

})();
