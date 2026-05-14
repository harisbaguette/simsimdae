/* hangul-type/game.js — Korean Typing Game */
(function () {
  'use strict';

  const CONFIG = window.GAME_CONFIG || { gameId: 'hangul-type', difficulties: {}, hasLeaderboard: false, scoreType: 'high' };

  const WORDS = [
    '사과','바나나','포도','수박','딸기','복숭아','오렌지','레몬','키위','망고',
    '학교','선생님','학생','공부','책상','칠판','교실','운동장','도서관','급식',
    '하늘','구름','비','눈','바람','태양','달','별','무지개','천둥',
    '고양이','강아지','토끼','햄스터','금붕어','앵무새','거북이','다람쥐','펭귄','기린',
    '자동차','버스','기차','비행기','배','자전거','오토바이','택시','트럭','헬리콥터',
    '밥','김치','된장찌개','불고기','비빔밥','삼겹살','냉면','떡볶이','순대','어묵',
    '엄마','아빠','형','누나','동생','할머니','할아버지','이모','삼촌','사촌',
    '봄','여름','가을','겨울','날씨','온도','기온','습도','폭풍','홍수',
    '음악','영화','게임','독서','그림','춤','노래','운동','여행','요리',
    '컴퓨터','핸드폰','텔레비전','냉장고','세탁기','전자레인지','청소기','에어컨','선풍기','라디오',
    '사랑','행복','슬픔','기쁨','화남','두려움','놀람','부끄러움','설레임','그리움',
    '빨강','파랑','노랑','초록','보라','분홍','주황','하얀','검정','회색',
    '하나','둘','셋','넷','다섯','여섯','일곱','여덟','아홉','열',
    '동쪽','서쪽','남쪽','북쪽','위쪽','아래쪽','왼쪽','오른쪽','앞','뒤',
    '산','강','바다','호수','섬','사막','평원','계곡','폭포','동굴',
    '의사','간호사','경찰','소방관','선생님','요리사','운동선수','가수','배우','화가',
    '장미','튤립','해바라기','벚꽃','국화','라일락','진달래','개나리','코스모스','수선화',
    '사자','호랑이','코끼리','하마','악어','뱀','독수리','상어','고래','문어',
    '피아노','기타','바이올린','드럼','플루트','트럼펫','하모니카','첼로','색소폰','하프',
    '축구','야구','농구','배구','수영','테니스','골프','스키','태권도','유도',
    '나무','꽃','풀','이끼','버섯','선인장','대나무','소나무','단풍나무','벚나무',
    '빵','케이크','쿠키','초콜릿','사탕','아이스크림','도넛','머핀','크래커','젤리',
    '커피','녹차','주스','우유','콜라','물','맥주','와인','소주','막걸리',
    '서울','부산','대구','인천','광주','대전','울산','수원','창원','성남',
    '한국','미국','일본','중국','프랑스','독일','영국','이탈리아','스페인','러시아',
    '도전','성공','실패','노력','희망','꿈','목표','결심','포기','극복',
    '친구','우정','사랑','결혼','이별','만남','약속','신뢰','배신','용서',
    '아침','점심','저녁','밤','새벽','오전','오후','정오','자정','황혼',
    '월요일','화요일','수요일','목요일','금요일','토요일','일요일','주말','평일','휴일',
    '일월','이월','삼월','사월','오월','유월','칠월','팔월','구월','시월',
  ];

  const DIFF_SETTINGS = {
    easy:   { speed: 40,  interval: 2500, lives: 5, scoreMulti: 1 },
    normal: { speed: 70,  interval: 1800, lives: 3, scoreMulti: 2 },
    hard:   { speed: 110, interval: 1300, lives: 3, scoreMulti: 3 },
    expert: { speed: 160, interval: 900,  lives: 2, scoreMulti: 5 },
  };

  let root, gameState, animFrame, spawnTimer;

  function $(sel) { return root.querySelector(sel); }

  function init() {
    root = document.getElementById('game-root');
    root.innerHTML = '';
    root.style.cssText = 'position:relative;width:100%;max-width:600px;margin:0 auto;font-family:"Malgun Gothic",sans-serif;';

    const css = document.createElement('style');
    css.textContent = `
      #ht-arena { position:relative; width:100%; height:420px; background:linear-gradient(180deg,#0a0a2e 0%,#1a1a4e 100%); overflow:hidden; border-radius:8px 8px 0 0; }
      #ht-controls { background:#1e1e3e; padding:12px; border-radius:0 0 8px 8px; display:flex; gap:8px; align-items:center; }
      #ht-input { flex:1; padding:10px 14px; font-size:18px; border:2px solid #4444aa; border-radius:6px; background:#0a0a2e; color:#fff; outline:none; }
      #ht-input:focus { border-color:#8888ff; }
      #ht-hud { display:flex; justify-content:space-between; padding:8px 12px; background:#12123a; color:#ccc; font-size:14px; border-radius:4px; margin-bottom:4px; }
      .ht-word { position:absolute; color:#88ddff; font-size:20px; font-weight:bold; text-shadow:0 0 8px #4488ff; white-space:nowrap; cursor:default; transition:color 0.1s; }
      .ht-word.match { color:#ffff44; text-shadow:0 0 12px #ffaa00; }
      .ht-word.destroying { animation:ht-pop 0.3s forwards; }
      @keyframes ht-pop { 0%{transform:scale(1.4);opacity:1} 100%{transform:scale(0);opacity:0} }
      .ht-life { display:inline-block; margin-right:4px; }
      #ht-overlay { position:absolute; inset:0; background:rgba(0,0,0,0.8); display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff; z-index:10; }
      #ht-overlay h2 { font-size:32px; margin:0 0 12px; }
      #ht-overlay p { font-size:18px; margin:6px 0; color:#aaa; }
      #ht-score-particle { position:absolute; font-size:16px; font-weight:bold; color:#ffff44; pointer-events:none; animation:ht-rise 0.8s forwards; }
      @keyframes ht-rise { 0%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-40px)} }
    `;
    document.head.appendChild(css);

    root.innerHTML = `
      <div id="ht-hud">
        <span>❤️ <span id="ht-lives"></span></span>
        <span>점수: <span id="ht-score-display">0</span></span>
        <span>레벨: <span id="ht-level">1</span></span>
      </div>
      <div id="ht-arena"></div>
      <div id="ht-controls">
        <input id="ht-input" type="text" placeholder="단어를 입력하세요..." autocomplete="off" autocorrect="off" spellcheck="false" />
      </div>
    `;
  }

  function showOverlay(title, lines) {
    const arena = $('#ht-arena');
    let el = document.getElementById('ht-overlay');
    if (el) el.remove();
    el = document.createElement('div');
    el.id = 'ht-overlay';
    el.innerHTML = `<h2>${title}</h2>${lines.map(l=>`<p>${l}</p>`).join('')}`;
    arena.appendChild(el);
  }

  function formatLives(n) {
    let s = '';
    for (let i = 0; i < n; i++) s += '<span class="ht-life">❤️</span>';
    for (let i = n; i < gameState.maxLives; i++) s += '<span class="ht-life">🖤</span>';
    return s;
  }

  function updateHUD() {
    document.getElementById('ht-lives').innerHTML = formatLives(gameState.lives);
    document.getElementById('ht-score-display').textContent = gameState.score;
    document.getElementById('ht-level').textContent = gameState.level;
    if (window.updateScore) window.updateScore(gameState.score);
  }

  function spawnWord() {
    if (!gameState.running) return;
    const arena = document.getElementById('ht-arena');
    const w = WORDS[Math.floor(Math.random() * WORDS.length)];
    const el = document.createElement('div');
    el.className = 'ht-word';
    el.textContent = w;
    el.dataset.word = w;
    const maxX = Math.max(10, arena.clientWidth - w.length * 22 - 20);
    el.style.left = Math.floor(Math.random() * maxX) + 'px';
    el.style.top = '0px';
    el.style.zIndex = 2;
    arena.appendChild(el);
    gameState.activeWords.push({ el, word: w, y: 0 });
  }

  function destroyWord(wordObj, score) {
    const { el } = wordObj;
    gameState.activeWords = gameState.activeWords.filter(w => w !== wordObj);
    el.classList.add('destroying');
    // score particle
    const p = document.createElement('div');
    p.className = 'ht-score-particle';
    p.textContent = '+' + score;
    p.style.left = el.style.left;
    p.style.top = el.style.top;
    document.getElementById('ht-arena').appendChild(p);
    setTimeout(() => { el.remove(); p.remove(); }, 400);
  }

  function highlightWords(typed) {
    gameState.activeWords.forEach(w => {
      if (typed && w.word.startsWith(typed)) {
        w.el.classList.add('match');
      } else {
        w.el.classList.remove('match');
      }
    });
  }

  function trySubmit(typed) {
    const found = gameState.activeWords.find(w => w.word === typed);
    if (found) {
      const bonus = Math.ceil(gameState.settings.speed / 20);
      const pts = found.word.length * bonus;
      gameState.score += pts;
      gameState.wordsDestroyed++;
      if (gameState.wordsDestroyed % 10 === 0) {
        gameState.level++;
        gameState.settings = {
          ...gameState.settings,
          speed: gameState.settings.speed + 10,
          interval: Math.max(500, gameState.settings.interval - 100),
        };
        clearInterval(spawnTimer);
        spawnTimer = setInterval(spawnWord, gameState.settings.interval);
      }
      destroyWord(found, pts);
      updateHUD();
      return true;
    }
    // flash input red
    const inp = document.getElementById('ht-input');
    inp.style.borderColor = '#ff4444';
    setTimeout(() => { inp.style.borderColor = '#4444aa'; }, 300);
    return false;
  }

  function gameLoop(ts) {
    if (!gameState.running) return;
    const dt = ts - (gameState.lastTs || ts);
    gameState.lastTs = ts;
    const arena = document.getElementById('ht-arena');
    const arenaH = arena.clientHeight;
    const speed = gameState.settings.speed * (dt / 1000);

    const dead = [];
    gameState.activeWords.forEach(w => {
      w.y += speed;
      w.el.style.top = w.y + 'px';
      if (w.y + 40 > arenaH) dead.push(w);
    });

    dead.forEach(w => {
      w.el.remove();
      gameState.activeWords = gameState.activeWords.filter(x => x !== w);
      gameState.lives--;
      updateHUD();
      if (gameState.lives <= 0) {
        endGame();
        return;
      }
    });

    if (gameState.running) animFrame = requestAnimationFrame(gameLoop);
  }

  function endGame() {
    gameState.running = false;
    cancelAnimationFrame(animFrame);
    clearInterval(spawnTimer);
    // kill all words
    gameState.activeWords.forEach(w => w.el.remove());
    gameState.activeWords = [];
    showOverlay('게임 오버', [`최종 점수: ${gameState.score}`, `파괴한 단어: ${gameState.wordsDestroyed}개`]);
    document.dispatchEvent(new CustomEvent('gameOver', { detail: { score: gameState.score, cleared: false } }));
  }

  window.startGame = function (diffId = 'normal', stage = 1) {
    const settings = { ...(DIFF_SETTINGS[diffId] || DIFF_SETTINGS.normal) };
    init();

    gameState = {
      running: true, lives: settings.lives, maxLives: settings.lives,
      score: 0, level: 1, wordsDestroyed: 0,
      settings, activeWords: [], lastTs: 0,
    };

    updateHUD();

    const inp = document.getElementById('ht-input');
    inp.addEventListener('input', () => highlightWords(inp.value));
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const val = inp.value.trim();
        if (val) {
          trySubmit(val);
          inp.value = '';
          highlightWords('');
        }
      }
    });

    // On mobile, show a submit button next to input
    const submitBtn = document.createElement('button');
    submitBtn.textContent = '입력';
    submitBtn.style.cssText = 'padding:10px 16px;background:#4477ff;color:#fff;border:none;border-radius:6px;font-size:16px;cursor:pointer;';
    document.getElementById('ht-controls').appendChild(submitBtn);
    const doSubmit = () => {
      const val = inp.value.trim();
      if (val) { trySubmit(val); inp.value = ''; highlightWords(''); }
    };
    submitBtn.addEventListener('click', doSubmit);
    submitBtn.addEventListener('touchend', e => { e.preventDefault(); doSubmit(); });

    spawnTimer = setInterval(spawnWord, settings.interval);
    spawnWord();
    animFrame = requestAnimationFrame(gameLoop);
  };
})();
