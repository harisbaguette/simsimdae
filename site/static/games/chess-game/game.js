/* Chess - chess-game/game.js */
(function () {
  'use strict';

  const CONFIG = window.GAME_CONFIG || { gameId: 'chess-game', difficulties: [], hasLeaderboard: false, scoreType: 'high' };

  // Piece constants: positive = white, negative = black
  const EMPTY=0, P=1, N=2, B=3, R=4, Q=5, K=6;
  const PIECE_UNICODE = {
    [K]:'♔', [Q]:'♕', [R]:'♖', [B]:'♗', [N]:'♘', [P]:'♙',
    [-K]:'♚', [-Q]:'♛', [-R]:'♜', [-B]:'♝', [-N]:'♞', [-P]:'♟'
  };
  const PIECE_NAMES = { [P]:'P',[N]:'N',[B]:'B',[R]:'R',[Q]:'Q',[K]:'K' };

  const PIECE_VALUES = { [P]:100, [N]:320, [B]:330, [R]:500, [Q]:900, [K]:20000 };

  // Position tables (for white; flip for black)
  const PST = {
    [P]: [
       0,  0,  0,  0,  0,  0,  0,  0,
      50, 50, 50, 50, 50, 50, 50, 50,
      10, 10, 20, 30, 30, 20, 10, 10,
       5,  5, 10, 25, 25, 10,  5,  5,
       0,  0,  0, 20, 20,  0,  0,  0,
       5, -5,-10,  0,  0,-10, -5,  5,
       5, 10, 10,-20,-20, 10, 10,  5,
       0,  0,  0,  0,  0,  0,  0,  0
    ],
    [N]: [
      -50,-40,-30,-30,-30,-30,-40,-50,
      -40,-20,  0,  0,  0,  0,-20,-40,
      -30,  0, 10, 15, 15, 10,  0,-30,
      -30,  5, 15, 20, 20, 15,  5,-30,
      -30,  0, 15, 20, 20, 15,  0,-30,
      -30,  5, 10, 15, 15, 10,  5,-30,
      -40,-20,  0,  5,  5,  0,-20,-40,
      -50,-40,-30,-30,-30,-30,-40,-50
    ],
    [B]: [
      -20,-10,-10,-10,-10,-10,-10,-20,
      -10,  0,  0,  0,  0,  0,  0,-10,
      -10,  0,  5, 10, 10,  5,  0,-10,
      -10,  5,  5, 10, 10,  5,  5,-10,
      -10,  0, 10, 10, 10, 10,  0,-10,
      -10, 10, 10, 10, 10, 10, 10,-10,
      -10,  5,  0,  0,  0,  0,  5,-10,
      -20,-10,-10,-10,-10,-10,-10,-20
    ],
    [R]: [
       0,  0,  0,  0,  0,  0,  0,  0,
       5, 10, 10, 10, 10, 10, 10,  5,
      -5,  0,  0,  0,  0,  0,  0, -5,
      -5,  0,  0,  0,  0,  0,  0, -5,
      -5,  0,  0,  0,  0,  0,  0, -5,
      -5,  0,  0,  0,  0,  0,  0, -5,
      -5,  0,  0,  0,  0,  0,  0, -5,
       0,  0,  0,  5,  5,  0,  0,  0
    ],
    [Q]: [
      -20,-10,-10, -5, -5,-10,-10,-20,
      -10,  0,  0,  0,  0,  0,  0,-10,
      -10,  0,  5,  5,  5,  5,  0,-10,
       -5,  0,  5,  5,  5,  5,  0, -5,
        0,  0,  5,  5,  5,  5,  0, -5,
      -10,  5,  5,  5,  5,  5,  0,-10,
      -10,  0,  5,  0,  0,  0,  0,-10,
      -20,-10,-10, -5, -5,-10,-10,-20
    ],
    [K]: [
      -30,-40,-40,-50,-50,-40,-40,-30,
      -30,-40,-40,-50,-50,-40,-40,-30,
      -30,-40,-40,-50,-50,-40,-40,-30,
      -30,-40,-40,-50,-50,-40,-40,-30,
      -20,-30,-30,-40,-40,-30,-30,-20,
      -10,-20,-20,-20,-20,-20,-20,-10,
       20, 20,  0,  0,  0,  0, 20, 20,
       20, 30, 10,  0,  0, 10, 30, 20
    ]
  };

  function pst(piece, sq, isWhite) {
    const abs = Math.abs(piece);
    if (!PST[abs]) return 0;
    const idx = isWhite ? sq : (7 - Math.floor(sq/8))*8 + (sq%8);
    return PST[abs][idx] || 0;
  }

  let root, canvas, ctx, difficulty, stage;
  let board; // 64-element array, positive=white, negative=black
  let castling, enPassant, turn; // turn: 1=white(player), -1=black(AI)
  let selected, validMoves, gameOver;
  let scoreVal;
  let CELL, W, H;

  /* ── Board Init ─────────────────────────────────────── */
  function startPosition() {
    board = new Int8Array(64);
    const backRank = [R, N, B, Q, K, B, N, R];
    for (let c = 0; c < 8; c++) {
      board[c] = -backRank[c];        // black back rank
      board[8 + c] = -P;              // black pawns
      board[48 + c] = P;              // white pawns
      board[56 + c] = backRank[c];    // white back rank
    }
    castling = { wK: true, wQ: true, bK: true, bQ: true };
    enPassant = -1;
    turn = 1;
    selected = null;
    validMoves = [];
    gameOver = false;
    scoreVal = 0;
  }

  function sq(r, c) { return r * 8 + c; }
  function row(s) { return Math.floor(s / 8); }
  function col(s) { return s % 8; }

  /* ── Move Generation ─────────────────────────────────── */
  function isEnemy(piece, color) { return color > 0 ? piece < 0 : piece > 0; }
  function isFriend(piece, color) { return color > 0 ? piece > 0 : piece < 0; }
  function isEmpty(s) { return board[s] === 0; }

  function addMove(moves, from, to, flags) {
    moves.push({ from, to, flags: flags || {} });
  }

  function genPawnMoves(moves, s, color) {
    const dir = color > 0 ? -1 : 1;
    const r = row(s), c2 = col(s);
    const startRow = color > 0 ? 6 : 1;
    const promRow = color > 0 ? 0 : 7;

    const fwd = s + dir * 8;
    if (fwd >= 0 && fwd < 64 && isEmpty(fwd)) {
      if (row(fwd) === promRow) {
        for (const pt of [Q, R, B, N]) addMove(moves, s, fwd, { promo: pt * color });
      } else {
        addMove(moves, s, fwd);
        if (r === startRow) {
          const fwd2 = s + dir * 16;
          if (isEmpty(fwd2)) addMove(moves, s, fwd2, { doublePush: true });
        }
      }
    }
    for (const dc of [-1, 1]) {
      const cc = c2 + dc;
      if (cc < 0 || cc > 7) continue;
      const cap = fwd + dc - (dir * 8 - dir * 8);
      const capSq = s + dir * 8 + dc;
      if (capSq < 0 || capSq >= 64) continue;
      if (isEnemy(board[capSq], color)) {
        if (row(capSq) === promRow) {
          for (const pt of [Q, R, B, N]) addMove(moves, s, capSq, { promo: pt * color });
        } else {
          addMove(moves, s, capSq);
        }
      }
      if (capSq === enPassant) addMove(moves, s, capSq, { ep: true });
    }
  }

  function slidingMoves(moves, s, color, dirs) {
    for (const [dr, dc] of dirs) {
      let r2 = row(s) + dr, c2 = col(s) + dc;
      while (r2 >= 0 && r2 < 8 && c2 >= 0 && c2 < 8) {
        const t = sq(r2, c2);
        if (isFriend(board[t], color)) break;
        addMove(moves, s, t);
        if (isEnemy(board[t], color)) break;
        r2 += dr; c2 += dc;
      }
    }
  }

  function knightMoves(moves, s, color) {
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      const r2 = row(s) + dr, c2 = col(s) + dc;
      if (r2 < 0 || r2 > 7 || c2 < 0 || c2 > 7) continue;
      const t = sq(r2, c2);
      if (!isFriend(board[t], color)) addMove(moves, s, t);
    }
  }

  function kingMoves(moves, s, color) {
    for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
      const r2 = row(s) + dr, c2 = col(s) + dc;
      if (r2 < 0 || r2 > 7 || c2 < 0 || c2 > 7) continue;
      const t = sq(r2, c2);
      if (!isFriend(board[t], color)) addMove(moves, s, t);
    }
    // Castling — generate candidate castling moves (pass-through/in-check filtering
    // happens in isLegalCastleMove to avoid infinite recursion via isSquareAttacked)
    if (color > 0) {
      if (castling.wK && isEmpty(sq(7,5)) && isEmpty(sq(7,6)))
        addMove(moves, s, sq(7,6), { castle: 'wK' });
      if (castling.wQ && isEmpty(sq(7,3)) && isEmpty(sq(7,2)) && isEmpty(sq(7,1)))
        addMove(moves, s, sq(7,2), { castle: 'wQ' });
    } else {
      if (castling.bK && isEmpty(sq(0,5)) && isEmpty(sq(0,6)))
        addMove(moves, s, sq(0,6), { castle: 'bK' });
      if (castling.bQ && isEmpty(sq(0,3)) && isEmpty(sq(0,2)) && isEmpty(sq(0,1)))
        addMove(moves, s, sq(0,2), { castle: 'bQ' });
    }
  }

  function genMovesForPiece(s, color) {
    const moves = [];
    const p = Math.abs(board[s]);
    if (p === P) genPawnMoves(moves, s, color);
    else if (p === N) knightMoves(moves, s, color);
    else if (p === B) slidingMoves(moves, s, color, [[-1,-1],[-1,1],[1,-1],[1,1]]);
    else if (p === R) slidingMoves(moves, s, color, [[-1,0],[1,0],[0,-1],[0,1]]);
    else if (p === Q) slidingMoves(moves, s, color, [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]);
    else if (p === K) kingMoves(moves, s, color);
    return moves;
  }

  function genAllMoves(color) {
    const moves = [];
    for (let s = 0; s < 64; s++) {
      if (color > 0 ? board[s] > 0 : board[s] < 0)
        moves.push(...genMovesForPiece(s, color));
    }
    return moves;
  }

  /* ── Apply / Undo Move ───────────────────────────────── */
  function applyMove(m) {
    const save = {
      from: m.from, to: m.to, fromPiece: board[m.from], toPiece: board[m.to],
      castling: { ...castling }, enPassant, flags: m.flags || {}
    };
    const piece = board[m.from];
    const abs = Math.abs(piece);
    const color = piece > 0 ? 1 : -1;

    board[m.to] = piece;
    board[m.from] = EMPTY;
    enPassant = -1;

    if (m.flags) {
      if (m.flags.promo) board[m.to] = m.flags.promo;
      if (m.flags.doublePush) enPassant = m.to + (color > 0 ? 8 : -8);
      if (m.flags.ep) board[m.to + (color > 0 ? 8 : -8)] = EMPTY;
      if (m.flags.castle) {
        if (m.flags.castle === 'wK') { board[sq(7,5)] = R; board[sq(7,7)] = EMPTY; }
        else if (m.flags.castle === 'wQ') { board[sq(7,3)] = R; board[sq(7,0)] = EMPTY; }
        else if (m.flags.castle === 'bK') { board[sq(0,5)] = -R; board[sq(0,7)] = EMPTY; }
        else if (m.flags.castle === 'bQ') { board[sq(0,3)] = -R; board[sq(0,0)] = EMPTY; }
      }
    }

    // Update castling rights
    if (abs === K) { if (color > 0) { castling.wK = false; castling.wQ = false; } else { castling.bK = false; castling.bQ = false; } }
    if (m.from === sq(7,0) || m.to === sq(7,0)) castling.wQ = false;
    if (m.from === sq(7,7) || m.to === sq(7,7)) castling.wK = false;
    if (m.from === sq(0,0) || m.to === sq(0,0)) castling.bQ = false;
    if (m.from === sq(0,7) || m.to === sq(0,7)) castling.bK = false;

    return save;
  }

  function undoMove(save) {
    board[save.from] = save.fromPiece;
    board[save.to] = save.toPiece;
    castling = save.castling;
    enPassant = save.enPassant;
    const color = save.fromPiece > 0 ? 1 : -1;

    if (save.flags.ep) board[save.to + (color > 0 ? 8 : -8)] = -color * P;
    if (save.flags.castle) {
      if (save.flags.castle === 'wK') { board[sq(7,7)] = R; board[sq(7,5)] = EMPTY; }
      else if (save.flags.castle === 'wQ') { board[sq(7,0)] = R; board[sq(7,3)] = EMPTY; }
      else if (save.flags.castle === 'bK') { board[sq(0,7)] = -R; board[sq(0,5)] = EMPTY; }
      else if (save.flags.castle === 'bQ') { board[sq(0,0)] = -R; board[sq(0,3)] = EMPTY; }
    }
  }

  /* ── Check Detection ─────────────────────────────────── */
  function findKing(color) {
    const target = color > 0 ? K : -K;
    for (let s = 0; s < 64; s++) if (board[s] === target) return s;
    return -1;
  }

  function isSquareAttacked(s, byColor) {
    const moves = genAllMoves(byColor);
    return moves.some(m => m.to === s);
  }

  function inCheck(color) {
    const kSq = findKing(color);
    if (kSq < 0) return false;
    return isSquareAttacked(kSq, -color);
  }

  // isSquareAttackedSimple: like isSquareAttacked but uses raw move generation
  // without castling moves to avoid infinite recursion
  function isSquareAttackedSimple(s, byColor) {
    for (let from = 0; from < 64; from++) {
      const p = board[from];
      if (byColor > 0 ? p <= 0 : p >= 0) continue;
      const abs = Math.abs(p);
      // Generate non-castling moves for this piece
      const pMoves = [];
      if (abs === P) genPawnMoves(pMoves, from, byColor);
      else if (abs === N) knightMoves(pMoves, from, byColor);
      else if (abs === B) slidingMoves(pMoves, from, byColor, [[-1,-1],[-1,1],[1,-1],[1,1]]);
      else if (abs === R) slidingMoves(pMoves, from, byColor, [[-1,0],[1,0],[0,-1],[0,1]]);
      else if (abs === Q) slidingMoves(pMoves, from, byColor, [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]);
      else if (abs === K) {
        // King normal moves only (no castling) to prevent recursion
        for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
          const r2 = row(from) + dr, c2 = col(from) + dc;
          if (r2 < 0 || r2 > 7 || c2 < 0 || c2 > 7) continue;
          const t = sq(r2, c2);
          if (!isFriend(board[t], byColor)) pMoves.push({ from, to: t, flags: {} });
        }
      }
      if (pMoves.some(pm => pm.to === s)) return true;
    }
    return false;
  }

  function isLegalMove(m, color) {
    // For castling moves, also check that king does not start in check
    // and does not pass through an attacked square
    if (m.flags && m.flags.castle) {
      const opp = -color;
      // King starting square must not be attacked
      if (isSquareAttackedSimple(m.from, opp)) return false;
      // Pass-through square
      const passSq = color > 0
        ? (m.flags.castle === 'wK' ? sq(7,5) : sq(7,3))
        : (m.flags.castle === 'bK' ? sq(0,5) : sq(0,3));
      if (isSquareAttackedSimple(passSq, opp)) return false;
      // Destination square (checked below via applyMove + inCheck)
    }
    const save = applyMove(m);
    const legal = !inCheck(color);
    undoMove(save);
    return legal;
  }

  function legalMoves(color) {
    return genAllMoves(color).filter(m => isLegalMove(m, color));
  }

  /* ── Evaluation ──────────────────────────────────────── */
  function evaluate() {
    let score = 0;
    for (let s = 0; s < 64; s++) {
      const p = board[s];
      if (!p) continue;
      const abs = Math.abs(p);
      const isWhite = p > 0;
      const val = PIECE_VALUES[abs] + pst(p, s, isWhite);
      score += isWhite ? val : -val;
    }
    return score; // positive = white better
  }

  /* ── Minimax ─────────────────────────────────────────── */
  function minimax(depth, alpha, beta, maximizing) {
    if (depth === 0) return evaluate();

    const color = maximizing ? 1 : -1;
    const moves = legalMoves(color);

    if (moves.length === 0) {
      if (inCheck(color)) return maximizing ? -9999 + (10 - depth) : 9999 - (10 - depth);
      return 0; // stalemate
    }

    // Move ordering: captures first
    moves.sort((a, b) => {
      const ca = Math.abs(board[a.to]); const cb = Math.abs(board[b.to]);
      return cb - ca;
    });

    if (maximizing) {
      let best = -Infinity;
      for (const m of moves) {
        const save = applyMove(m);
        best = Math.max(best, minimax(depth - 1, alpha, beta, false));
        undoMove(save);
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (const m of moves) {
        const save = applyMove(m);
        best = Math.min(best, minimax(depth - 1, alpha, beta, true));
        undoMove(save);
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
      return best;
    }
  }

  function getBestMove(color, depth) {
    const moves = legalMoves(color);
    if (!moves.length) return null;

    const isMax = color > 0;
    let bestVal = isMax ? -Infinity : Infinity;
    let bestMove = moves[0];

    moves.sort((a, b) => {
      const ca = Math.abs(board[a.to]); const cb = Math.abs(board[b.to]);
      return cb - ca;
    });

    for (const m of moves) {
      const save = applyMove(m);
      const val = minimax(depth - 1, -Infinity, Infinity, !isMax);
      undoMove(save);
      if (isMax ? val > bestVal : val < bestVal) { bestVal = val; bestMove = m; }
    }
    return bestMove;
  }

  /* ── Drawing ─────────────────────────────────────────── */
  const LIGHT = '#f0d9b5', DARK = '#b58863';
  const SEL_COLOR = 'rgba(255,255,0,0.45)';
  const MOVE_DOT = 'rgba(0,0,0,0.22)';
  const CHECK_COLOR = 'rgba(220,38,38,0.5)';
  const LAST_COLOR = 'rgba(100,200,50,0.35)';

  let lastMoveSquares = [];

  function drawBoard() {
    ctx.clearRect(0, 0, W, H);

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const s = sq(r, c);
        const x = c * CELL, y = r * CELL;
        ctx.fillStyle = (r + c) % 2 === 0 ? LIGHT : DARK;
        ctx.fillRect(x, y, CELL, CELL);

        // Last move highlight
        if (lastMoveSquares.includes(s)) {
          ctx.fillStyle = LAST_COLOR;
          ctx.fillRect(x, y, CELL, CELL);
        }

        // Selected highlight
        if (selected === s) {
          ctx.fillStyle = SEL_COLOR;
          ctx.fillRect(x, y, CELL, CELL);
        }

        // Check highlight
        if (board[s] === K && inCheck(1)) {
          ctx.fillStyle = CHECK_COLOR;
          ctx.fillRect(x, y, CELL, CELL);
        }
        if (board[s] === -K && inCheck(-1)) {
          ctx.fillStyle = CHECK_COLOR;
          ctx.fillRect(x, y, CELL, CELL);
        }

        // Valid move dots
        if (validMoves.some(m => m.to === s)) {
          if (board[s] !== EMPTY) {
            // Capture: ring
            ctx.strokeStyle = MOVE_DOT;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x + CELL/2, y + CELL/2, CELL * 0.46, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            ctx.fillStyle = MOVE_DOT;
            ctx.beginPath();
            ctx.arc(x + CELL/2, y + CELL/2, CELL * 0.17, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Piece
        if (board[s]) {
          const unicode = PIECE_UNICODE[board[s]];
          const isWhitePiece = board[s] > 0;
          const fontSize = Math.floor(CELL * 0.72);
          ctx.font = `${fontSize}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Shadow for contrast
          ctx.fillStyle = isWhitePiece ? 'rgba(80,40,0,0.3)' : 'rgba(0,0,0,0.3)';
          ctx.fillText(unicode, x + CELL/2 + 1, y + CELL/2 + 2);

          ctx.fillStyle = isWhitePiece ? '#fffdf0' : '#1a0a00';
          ctx.fillText(unicode, x + CELL/2, y + CELL/2);
        }
      }
    }

    // Rank/file labels
    ctx.font = `${Math.floor(CELL * 0.18)}px sans-serif`;
    ctx.textBaseline = 'top';
    const files = 'abcdefgh';
    for (let c = 0; c < 8; c++) {
      ctx.fillStyle = c % 2 === 0 ? DARK : LIGHT;
      ctx.textAlign = 'right';
      ctx.fillText(files[c], (c+1) * CELL - 2, 7 * CELL + CELL * 0.82);
    }
    for (let r = 0; r < 8; r++) {
      ctx.fillStyle = r % 2 === 0 ? LIGHT : DARK;
      ctx.textAlign = 'left';
      ctx.fillText(8 - r, 2, r * CELL + 2);
    }
  }

  function updateStatus(msg, color) {
    const el = document.getElementById('chess-status');
    if (el) { el.textContent = msg; el.style.color = color || '#333'; }
  }

  function updateScoreDisplay() {
    const el = document.getElementById('chess-score');
    if (el) el.textContent = `점수: ${scoreVal}`;
    if (typeof window.updateScore === 'function') window.updateScore(scoreVal);
  }

  function calcScore() {
    let s = 0;
    for (let i = 0; i < 64; i++) {
      const p = board[i];
      if (p > 0 && p !== K) s += PIECE_VALUES[p];
      else if (p < 0 && p !== -K) s -= PIECE_VALUES[-p];
    }
    // Material advantage for white * 100
    scoreVal = s; // Can be negative if losing
  }

  /* ── Player interaction ──────────────────────────────── */
  function handleClick(s) {
    if (gameOver || turn !== 1) return; // Only player's turn

    if (selected === null) {
      if (board[s] <= 0) return; // Must click own piece
      selected = s;
      validMoves = legalMoves(1).filter(m => m.from === s);
      drawBoard();
    } else {
      const move = validMoves.find(m => m.to === s);
      if (move) {
        executeMove(move, 1);
      } else if (board[s] > 0) {
        selected = s;
        validMoves = legalMoves(1).filter(m => m.from === s);
        drawBoard();
      } else {
        selected = null;
        validMoves = [];
        drawBoard();
      }
    }
  }

  function executeMove(m, color) {
    lastMoveSquares = [m.from, m.to];
    applyMove(m);
    selected = null;
    validMoves = [];
    calcScore();
    updateScoreDisplay();

    const oppColor = -color;
    const oppMoves = legalMoves(oppColor);

    if (oppMoves.length === 0) {
      if (inCheck(oppColor)) {
        // Checkmate
        drawBoard();
        if (color === 1) {
          updateStatus('체크메이트! 당신이 이겼습니다! 🏆', '#16a34a');
          const finalScore = scoreVal + 5000;
          if (typeof window.updateScore === 'function') window.updateScore(finalScore);
          document.dispatchEvent(new CustomEvent('gameClear', { detail: { score: finalScore } }));
        } else {
          updateStatus('체크메이트! AI가 이겼습니다.', '#dc2626');
          document.dispatchEvent(new CustomEvent('gameOver', { detail: { score: Math.max(0, scoreVal), cleared: false } }));
        }
        gameOver = true;
        showReplayButton();
        return;
      } else {
        drawBoard();
        updateStatus('스테일메이트! 무승부.', '#d97706');
        gameOver = true;
        showReplayButton();
        document.dispatchEvent(new CustomEvent('gameOver', { detail: { score: Math.max(0, scoreVal), cleared: false } }));
        return;
      }
    }

    if (inCheck(oppColor)) {
      updateStatus(oppColor === 1 ? '체크!' : 'AI에게 체크!', '#dc2626');
    } else {
      updateStatus(oppColor === 1 ? '당신의 차례 (백)' : 'AI 생각 중…', oppColor === 1 ? '#555' : '#888');
    }

    turn = oppColor;
    drawBoard();

    if (turn === -1) {
      setTimeout(aiMove, 250);
    }
  }

  function aiMove() {
    if (gameOver || turn !== -1) return;
    const depthMap = { easy: 1, normal: 2, hard: 3, expert: 4 };
    const depth = depthMap[difficulty] || 2;
    const m = getBestMove(-1, depth);
    if (m) executeMove(m, -1);
    else {
      // No moves — already handled in executeMove, but safety
      updateStatus('무승부!', '#d97706');
      gameOver = true;
    }
  }

  function showReplayButton() {
    const btn = document.createElement('button');
    btn.textContent = '다시 하기';
    btn.style.cssText = 'display:block;margin:10px auto 0;padding:10px 28px;font-size:16px;font-weight:600;border:none;border-radius:8px;background:#5a67d8;color:#fff;cursor:pointer;';
    btn.addEventListener('click', () => window.startGame(difficulty, stage));
    root.appendChild(btn);
  }

  /* ── Setup ──────────────────────────────────────────── */
  window.startGame = function (diffId, stageId) {
    difficulty = diffId || 'normal';
    stage = stageId || 1;
    lastMoveSquares = [];

    root = document.getElementById('game-root');
    root.style.cssText = 'padding:8px;box-sizing:border-box;max-width:560px;margin:0 auto;font-family:sans-serif;';
    root.innerHTML = '';

    const info = document.createElement('div');
    info.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:15px;font-weight:600;';
    info.innerHTML = '<span id="chess-status" style="color:#555;">당신의 차례 (백)</span><span id="chess-score" style="color:#5a67d8;">점수: 0</span>';
    root.appendChild(info);

    canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;margin:0 auto;border-radius:4px;cursor:pointer;touch-action:none;box-shadow:0 4px 16px rgba(0,0,0,0.3);max-width:100%;';
    root.appendChild(canvas);
    ctx = canvas.getContext('2d');

    const avail = Math.min(root.clientWidth - 16, 520);
    CELL = Math.floor(avail / 8);
    W = CELL * 8; H = CELL * 8;
    canvas.width = W; canvas.height = H;

    startPosition();

    function posFromEvent(e) {
      const rect = canvas.getBoundingClientRect();
      const scale = W / rect.width;
      let cx, cy;
      if (e.touches) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
      else if (e.changedTouches) { cx = e.changedTouches[0].clientX; cy = e.changedTouches[0].clientY; }
      else { cx = e.clientX; cy = e.clientY; }
      const x = (cx - rect.left) * scale;
      const y = (cy - rect.top) * scale;
      const c2 = Math.floor(x / CELL);
      const r2 = Math.floor(y / CELL);
      if (r2 < 0 || r2 > 7 || c2 < 0 || c2 > 7) return -1;
      return sq(r2, c2);
    }

    canvas.addEventListener('click', (e) => {
      const s = posFromEvent(e);
      if (s >= 0) handleClick(s);
    });
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      const s = posFromEvent(e);
      if (s >= 0) handleClick(s);
    }, { passive: false });

    drawBoard();
    updateScoreDisplay();
  };

  if (CONFIG.gameId === 'chess-game' && document.getElementById('game-root')) {
    window.startGame((CONFIG.difficulties && CONFIG.difficulties[0]) || 'normal', 1);
  }
})();
