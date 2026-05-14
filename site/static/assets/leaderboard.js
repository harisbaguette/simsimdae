/* leaderboard.js — localStorage 기반 점수 관리 */
const LB = {
  _key: id => `lb_${id}`,
  _bestKey: id => `best_${id}`,

  getBest(gameId) {
    return parseInt(localStorage.getItem(this._bestKey(gameId)) || '0');
  },

  submit(gameId, score, nickname) {
    const best = this.getBest(gameId);
    if (score > best) localStorage.setItem(this._bestKey(gameId), score);
    if (nickname) localStorage.setItem('player_name', nickname);

    const key = this._key(gameId);
    const board = JSON.parse(localStorage.getItem(key) || '[]');
    board.push({ name: nickname || '익명', score, ts: Date.now() });
    board.sort((a, b) => b.score - a.score);
    localStorage.setItem(key, JSON.stringify(board.slice(0, 10)));
    this.render(gameId, 'local');
  },

  _sessionScores: {},
  submitSession(gameId, score, nickname) {
    if (!this._sessionScores[gameId]) this._sessionScores[gameId] = [];
    this._sessionScores[gameId].push({ name: nickname || '익명', score, ts: Date.now() });
    this._sessionScores[gameId].sort((a, b) => b.score - a.score);
    this._sessionScores[gameId] = this._sessionScores[gameId].slice(0, 10);
  },

  render(gameId, scope = 'local') {
    const el = document.getElementById('lb-list');
    if (!el) return;
    let board = [];
    if (scope === 'local') {
      board = JSON.parse(localStorage.getItem(this._key(gameId)) || '[]');
    } else if (scope === 'session') {
      board = this._sessionScores[gameId] || [];
    }
    if (!board.length) {
      el.innerHTML = '<li style="color:var(--c-muted);font-size:.83rem;padding:8px 0">아직 기록이 없어요 🙂</li>';
      return;
    }
    el.innerHTML = board.map((e, i) => `
      <li class="lb-item">
        <span class="lb-rank ${i < 3 ? 'top' : ''}">${['🥇','🥈','🥉'][i] || (i+1)}</span>
        <span class="lb-name">${escHtml(e.name)}</span>
        <span class="lb-score">${e.score.toLocaleString()}</span>
      </li>`).join('');
  },

  switchTab(btn, scope, gameId) {
    document.querySelectorAll('.lb-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this.render(gameId, scope);
  },

  init(gameId) {
    this.render(gameId, 'local');
    const shareBtn = document.getElementById('share-btn');
    if (!shareBtn) return;
    shareBtn.addEventListener('click', () => {
      const best = this.getBest(gameId);
      const text = `${document.title}에서 ${best.toLocaleString()}점 달성! 🎮`;
      if (navigator.share) {
        navigator.share({ title: document.title, text, url: location.href }).catch(() => {});
      } else {
        navigator.clipboard?.writeText(`${text}\n${location.href}`)
          .then(() => showToast('클립보드에 복사됐어요!'))
          .catch(() => {});
      }
    });
  }
};

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function showToast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style, {
    position:'fixed', bottom:'24px', left:'50%', transform:'translateX(-50%)',
    background:'var(--c-brand)', color:'#fff', padding:'10px 20px',
    borderRadius:'8px', fontSize:'.85rem', fontWeight:'700',
    zIndex:'9999', pointerEvents:'none',
    animation:'score-pop .4s ease'
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

function showScoreSubmit(gameId, score) {
  const saved = localStorage.getItem('player_name') || '';
  const name = (prompt(`점수: ${score.toLocaleString()}\n닉네임 (최대 10자):`, saved) || '익명').slice(0, 10);
  LB.submit(gameId, score, name);
  LB.submitSession(gameId, score, name);
}
