/* share.js — 점수 공유 기능 */
function shareScore(gameTitle, score, gameId) {
  const text = `${gameTitle}에서 ${score.toLocaleString()}점 달성! 🎮`;
  const url = `${location.origin}/games/${gameId}/`;
  if (navigator.share) {
    navigator.share({ title: gameTitle, text, url }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(`${text}\n${url}`)
      .then(() => {
        const t = document.createElement('div');
        t.textContent = '클립보드에 복사됐어요!';
        Object.assign(t.style, {
          position:'fixed', bottom:'24px', left:'50%', transform:'translateX(-50%)',
          background:'#7c3aed', color:'#fff', padding:'10px 20px',
          borderRadius:'8px', fontSize:'.85rem', fontWeight:'700', zIndex:'9999'
        });
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2200);
      }).catch(() => {});
  }
}
