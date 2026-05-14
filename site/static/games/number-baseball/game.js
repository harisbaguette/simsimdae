/* number-baseball/game.js — 숫자 야구 (Bulls and Cows) */
(function () {
  'use strict';

  const CONFIG = window.GAME_CONFIG || { gameId: 'number-baseball' };

  const DIFF_SETTINGS = {
    easy:   { digits: 3, maxGuesses: 15, label: '쉬움 (3자리)' },
    normal: { digits: 4, maxGuesses: 10, label: '보통 (4자리)' },
    hard:   { digits: 5, maxGuesses: 10, label: '어려움 (5자리)' },
    expert: { digits: 4, maxGuesses:  7, label: '전문가 (4자리, 7회)' },
  };

  let root, gs;

  function pickSecret(digits) {
    const pool = [1,2,3,4,5,6,7,8,9,0];
    // shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    // ensure first digit isn't 0
    if (pool[0] === 0) {
      for (let i = 1; i < pool.length; i++) {
        if (pool[i] !== 0) { [pool[0], pool[i]] = [pool[i], pool[0]]; break; }
      }
    }
    return pool.slice(0, digits).map(String);
  }

  function evaluate(secret, guess) {
    let S = 0, B = 0;
    for (let i = 0; i < secret.length; i++) {
      if (secret[i] === guess[i]) S++;
      else if (secret.includes(guess[i])) B++;
    }
    return { S, B, O: secret.length - S - B };
  }

  function init() {
    root = document.getElementById('game-root');
    const css = document.createElement('style');
    css.textContent = `
      #nb-root { font-family:"Malgun Gothic",sans-serif; max-width:520px; margin:0 auto; }
      #nb-header { background:linear-gradient(135deg,#1a1a4e,#2a2a7e); color:#fff; padding:16px; border-radius:8px 8px 0 0; text-align:center; }
      #nb-header h2 { margin:0 0 4px; font-size:22px; }
      #nb-header p { margin:0; color:#aac; font-size:14px; }
      #nb-body { background:#f8f9ff; border:2px solid #aac; border-top:none; padding:16px; }
      #nb-input-area { display:flex; gap:8px; align-items:center; margin-bottom:16px; }
      #nb-input { flex:1; padding:12px; font-size:22px; text-align:center; letter-spacing:8px; border:2px solid #aac; border-radius:6px; outline:none; font-weight:bold; }
      #nb-input:focus { border-color:#4477ff; }
      #nb-submit { padding:12px 20px; background:#4477ff; color:#fff; border:none; border-radius:6px; font-size:16px; cursor:pointer; white-space:nowrap; }
      #nb-submit:hover { background:#2255dd; }
      #nb-submit:disabled { background:#aaa; }
      #nb-history { max-height:280px; overflow-y:auto; }
      table { width:100%; border-collapse:collapse; font-size:15px; }
      th { background:#e8eeff; padding:8px; text-align:center; border-bottom:2px solid #aac; }
      td { padding:8px; text-align:center; border-bottom:1px solid #dde; }
      tr:last-child td { border-bottom:none; }
      .nb-row-win td { background:#e8ffe8; font-weight:bold; color:#228822; }
      .nb-strike { color:#ff4444; font-weight:bold; }
      .nb-ball  { color:#ff8800; font-weight:bold; }
      .nb-out   { color:#888; }
      #nb-footer { display:flex; justify-content:space-between; margin-top:10px; font-size:14px; color:#666; padding-top:10px; border-top:1px solid #dde; }
      #nb-msg { text-align:center; padding:12px; font-size:18px; font-weight:bold; border-radius:6px; margin-top:12px; display:none; }
      #nb-msg.win { background:#e8ffe8; color:#228822; display:block; }
      #nb-msg.lose { background:#ffe8e8; color:#aa2222; display:block; }
      .nb-result-badge { display:inline-block; padding:2px 8px; border-radius:10px; font-size:13px; margin:0 2px; }
      .badge-s { background:#ffe8e8; color:#cc2222; }
      .badge-b { background:#fff3e0; color:#cc7700; }
      .badge-o { background:#f0f0f0; color:#666; }
    `;
    document.head.appendChild(css);

    root.innerHTML = `
      <div id="nb-root">
        <div id="nb-header">
          <h2>⚾ 숫자 야구</h2>
          <p id="nb-subtitle"></p>
        </div>
        <div id="nb-body">
          <div id="nb-input-area">
            <input id="nb-input" type="text" maxlength="5" placeholder="숫자 입력" autocomplete="off" inputmode="numeric" />
            <button id="nb-submit">추측</button>
          </div>
          <div id="nb-history">
            <table>
              <thead><tr><th>#</th><th>추측</th><th>결과</th></tr></thead>
              <tbody id="nb-tbody"></tbody>
            </table>
          </div>
          <div id="nb-footer">
            <span>남은 기회: <strong id="nb-remain"></strong></span>
            <span>점수: <strong id="nb-score">0</strong></span>
          </div>
          <div id="nb-msg"></div>
        </div>
      </div>
    `;
  }

  function updateFooter() {
    document.getElementById('nb-remain').textContent = gs.remaining;
    document.getElementById('nb-score').textContent = gs.score;
    if (window.updateScore) window.updateScore(gs.score);
  }

  function addHistoryRow(guess, res, rowClass = '') {
    const tbody = document.getElementById('nb-tbody');
    const tr = document.createElement('tr');
    if (rowClass) tr.className = rowClass;
    tr.innerHTML = `
      <td>${gs.guessCount}</td>
      <td style="letter-spacing:6px;font-size:18px;font-weight:bold">${guess.join(' ')}</td>
      <td>
        <span class="nb-result-badge badge-s">${res.S}S</span>
        <span class="nb-result-badge badge-b">${res.B}B</span>
        <span class="nb-result-badge badge-o">${res.O}O</span>
      </td>
    `;
    tbody.appendChild(tr);
    document.getElementById('nb-history').scrollTop = 9999;
  }

  function showMsg(text, type) {
    const el = document.getElementById('nb-msg');
    el.textContent = text;
    el.className = type;
  }

  function handleGuess() {
    if (!gs.running) return;
    const inp = document.getElementById('nb-input');
    const raw = inp.value.trim();
    inp.value = '';

    const digits = raw.split('');
    const d = gs.settings.digits;

    if (digits.length !== d || digits.some(c => !/[0-9]/.test(c))) {
      inp.style.borderColor = '#ff4444';
      setTimeout(() => inp.style.borderColor = '#aac', 400);
      return;
    }
    if (new Set(digits).size !== d) {
      inp.style.borderColor = '#ff8800';
      setTimeout(() => inp.style.borderColor = '#aac', 400);
      showMsg('중복 없는 숫자를 입력하세요!', 'lose');
      setTimeout(() => { document.getElementById('nb-msg').style.display = 'none'; }, 1500);
      return;
    }

    gs.guessCount++;
    gs.remaining--;
    const res = evaluate(gs.secret, digits);
    const isWin = res.S === d;
    addHistoryRow(digits, res, isWin ? 'nb-row-win' : '');
    updateFooter();

    if (isWin) {
      gs.running = false;
      gs.score = 100 * (gs.settings.maxGuesses - gs.guessCount + 1);
      if (window.updateScore) window.updateScore(gs.score);
      document.getElementById('nb-score').textContent = gs.score;
      showMsg(`🎉 정답! ${gs.guessCount}번 만에 맞췄습니다! 점수: ${gs.score}`, 'win');
      document.getElementById('nb-submit').disabled = true;
      document.dispatchEvent(new CustomEvent('gameClear', { detail: { score: gs.score } }));
    } else if (gs.remaining <= 0) {
      gs.running = false;
      showMsg(`💀 실패! 정답은 ${gs.secret.join('')} 였습니다.`, 'lose');
      document.getElementById('nb-submit').disabled = true;
      document.dispatchEvent(new CustomEvent('gameOver', { detail: { score: gs.score, cleared: false } }));
    }
  }

  window.startGame = function (diffId = 'normal', stage = 1) {
    const settings = DIFF_SETTINGS[diffId] || DIFF_SETTINGS.normal;
    init();

    gs = {
      running: true,
      settings,
      secret: pickSecret(settings.digits),
      guessCount: 0,
      remaining: settings.maxGuesses,
      score: 0,
    };

    document.getElementById('nb-subtitle').textContent =
      `${settings.label} | 최대 ${settings.maxGuesses}번 시도`;
    document.getElementById('nb-input').maxLength = settings.digits;
    document.getElementById('nb-input').placeholder = '0'.repeat(settings.digits);
    updateFooter();

    const inp = document.getElementById('nb-input');
    const btn = document.getElementById('nb-submit');
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') handleGuess(); });
    btn.addEventListener('click', handleGuess);
    btn.addEventListener('touchend', e => { e.preventDefault(); handleGuess(); });
    inp.focus();
  };
})();
