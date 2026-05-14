// Typing Destroy — Game 7
// Words fall — type them to destroy before they hit the ground!
(function () {
  'use strict';

  const ROOT = document.getElementById('game-root');

  // ── Word Lists ─────────────────────────────────────────────────────────────
  const KR_WORDS = [
    '사과','바나나','포도','딸기','수박','복숭아','오렌지','레몬','키위','망고',
    '하늘','구름','바람','태양','달빛','별빛','눈송이','봄비','여름','가을',
    '학교','교실','선생님','학생','공부','책상','칠판','연필','지우개','가방',
    '가족','부모님','형제','자매','친구','이웃','마을','도시','나라','세계',
    '음악','그림','영화','독서','여행','요리','스포츠','게임','춤','노래',
    '강아지','고양이','토끼','다람쥐','펭귄','코끼리','사자','호랑이','곰','여우',
    '행복','사랑','우정','희망','믿음','용기','지혜','평화','자유','꿈',
    '바다','산','강','호수','폭포','사막','숲속','들판','섬나라','동굴',
    '컴퓨터','스마트폰','인터넷','프로그램','데이터','네트워크','소프트웨어','하드웨어','알고리즘','코딩',
    '아침','점심','저녁','새벽','오전','오후','주말','평일','생일','기념일',
    '냉장고','세탁기','텔레비전','에어컨','전자레인지','청소기','선풍기','가습기','정수기','커피',
    '빨강','파랑','초록','노랑','주황','보라','하양','검정','분홍','하늘색',
    '달리기','수영','자전거','축구','야구','농구','테니스','골프','태권도','검도',
    '피자','햄버거','초밥','라면','비빔밥','불고기','김치','된장국','삼겹살','닭갈비',
    '봄꽃','여름밤','가을단풍','겨울눈','사계절','날씨','기온','습도','바람','소나기',
  ];

  const EN_WORDS = [
    'apple','banana','grape','cherry','mango','orange','lemon','peach','melon','berry',
    'cloud','storm','rain','snow','wind','sunny','foggy','breeze','thunder','lightning',
    'school','class','teacher','student','lesson','pencil','eraser','notebook','library','exam',
    'family','friend','mother','father','sister','brother','cousin','neighbor','partner','team',
    'music','dance','movie','novel','travel','cooking','sports','gaming','drawing','singing',
    'puppy','kitten','rabbit','dragon','phoenix','tiger','eagle','dolphin','penguin','panda',
    'happy','lovely','brave','clever','honest','funny','gentle','strong','smart','kind',
    'ocean','mountain','river','forest','desert','island','valley','canyon','jungle','glacier',
    'coding','python','java','script','kernel','server','database','network','security','pixel',
    'morning','evening','midnight','sunrise','sunset','weekend','holiday','birthday','season','winter',
    'pizza','burger','sushi','ramen','pasta','tacos','curry','salad','steak','waffle',
    'rocket','planet','galaxy','cosmos','orbit','meteor','comet','nebula','pulsar','quasar',
    'sprint','marathon','cycling','tennis','hockey','soccer','boxing','karate','archery','fencing',
    'crimson','indigo','violet','scarlet','turquoise','magenta','cerulean','emerald','amber','ivory',
    'dragon','wizard','knight','archer','warrior','ranger','paladin','mage','rogue','bard',
  ];

  const ALL_WORDS = KR_WORDS.concat(EN_WORDS);

  // ── Canvas dimensions ──────────────────────────────────────────────────────
  const CW = 480, CH = 620;

  // ── Difficulty settings ───────────────────────────────────────────────────
  const DIFF = {
    easy:   { speed: 0.5, spawnMs: 3200, maxWords: 5  },
    normal: { speed: 1.0, spawnMs: 2200, maxWords: 7  },
    hard:   { speed: 1.7, spawnMs: 1500, maxWords: 9  },
    expert: { speed: 2.8, spawnMs: 900,  maxWords: 12 },
  };

  // ── State ──────────────────────────────────────────────────────────────────
  let canvas, ctx, animId;
  let words = [];       // active word objects
  let typed = '';       // current input buffer
  let target = null;    // currently targeted word
  let score = 0;
  let lives = 3;
  let running = false;
  let diff = DIFF.normal;
  let lastSpawn = 0;
  let frameTime = 0;
  let explosions = [];  // explosion particles

  // ── Word object ───────────────────────────────────────────────────────────
  function createWord(text) {
    const fontSize = 16 + (Math.random() * 4 | 0);
    ctx.font = `bold ${fontSize}px monospace`;
    const w = ctx.measureText(text).width + 16;
    const x = 20 + Math.random() * (CW - w - 40);
    const speedBonus = diff.speed * (0.8 + Math.random() * 0.4);
    return {
      text,
      x,
      y: -30,
      speed: speedBonus,
      fontSize,
      w,
      typedIdx: 0,
      flashRed: 0,
      hue: Math.random() * 360 | 0,
    };
  }

  // ── Explosion ─────────────────────────────────────────────────────────────
  function spawnExplosion(x, y, hue) {
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      explosions.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        life: 1,
        decay: 0.025 + Math.random() * 0.02,
        r: 3 + Math.random() * 5,
        hue: hue + Math.random() * 60 - 30,
      });
    }
  }

  function updateExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
      const p = explosions[i];
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.12;
      p.life -= p.decay;
      if (p.life <= 0) explosions.splice(i, 1);
    }
  }

  function drawExplosions() {
    explosions.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      gr.addColorStop(0, `hsl(${p.hue},100%,80%)`);
      gr.addColorStop(1, `hsla(${p.hue},100%,50%,0)`);
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // ── Drawing ────────────────────────────────────────────────────────────────
  function drawBackground() {
    // Star field background
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, CW, CH);
    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let y = 0; y < CH; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke();
    }
    for (let x = 0; x < CW; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke();
    }
    // Danger zone line
    ctx.strokeStyle = 'rgba(255,80,80,0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.moveTo(0, CH - 50); ctx.lineTo(CW, CH - 50); ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawWord(word) {
    const x = word.x, y = word.y;
    const h = word.fontSize + 10;
    const w = word.w;
    const isTarget = word === target;

    // Background rect
    const bgAlpha = isTarget ? 0.9 : 0.55;
    const bgColor = isTarget
      ? `rgba(30,60,30,${bgAlpha})`
      : `rgba(20,20,40,${bgAlpha})`;

    ctx.save();
    ctx.shadowBlur = isTarget ? 12 : 4;
    ctx.shadowColor = isTarget ? `hsl(${word.hue},100%,60%)` : 'rgba(0,0,0,0.5)';

    // Pill background
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y - h / 2, w, h, 6) : ctx.rect(x, y - h / 2, w, h);
    ctx.fill();

    // Border
    const borderColor = isTarget
      ? `hsl(${word.hue},100%,55%)`
      : 'rgba(255,255,255,0.15)';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = isTarget ? 2 : 1;
    ctx.stroke();

    ctx.restore();

    // Word text — split into typed / remaining
    ctx.font = `bold ${word.fontSize}px monospace`;
    ctx.textBaseline = 'middle';

    const pad = 8;
    let drawX = x + pad;

    if (word.flashRed > 0) {
      // Flash red
      ctx.fillStyle = '#ff4444';
      ctx.fillText(word.text, drawX, y + 1);
      word.flashRed--;
    } else if (isTarget) {
      // Typed portion in green
      const typedPart = word.text.slice(0, word.typedIdx);
      const restPart  = word.text.slice(word.typedIdx);

      if (typedPart) {
        ctx.fillStyle = '#66ff66';
        ctx.fillText(typedPart, drawX, y + 1);
        drawX += ctx.measureText(typedPart).width;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillText(restPart, drawX, y + 1);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(word.text, drawX, y + 1);
    }

    // Speed indicator stripe at bottom
    const speedFrac = Math.min(word.speed / 3.5, 1);
    const stripeColor = `hsl(${120 - speedFrac * 120},100%,55%)`;
    ctx.fillStyle = stripeColor;
    ctx.fillRect(x, y + h / 2 - 3, w * speedFrac, 3);
  }

  function drawHUD() {
    // Lives
    ctx.font = 'bold 22px sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ff6666';
    const hearts = '❤️'.repeat(lives);
    ctx.fillText(hearts, 10, 10);

    // Score
    ctx.font = 'bold 18px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffaa';
    ctx.textAlign = 'right';
    ctx.fillText(`${score.toLocaleString()} 점`, CW - 10, 12);
    ctx.textAlign = 'left';

    // Current typed buffer
    if (typed.length > 0) {
      const boxW = 160, boxH = 32;
      const bx = CW / 2 - boxW / 2, by = CH - 38;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(bx, by, boxW, boxH, 6) : ctx.rect(bx, by, boxW, boxH);
      ctx.fill();
      ctx.strokeStyle = '#6688ff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = 'bold 15px monospace';
      ctx.fillStyle = '#88aaff';
      ctx.textAlign = 'center';
      ctx.fillText(typed, CW / 2, by + boxH / 2 + 1);
      ctx.textAlign = 'left';
    }
  }

  // ── Game logic ────────────────────────────────────────────────────────────
  function spawnWord() {
    if (!running) return;
    if (words.length >= diff.maxWords) return;
    const text = ALL_WORDS[Math.random() * ALL_WORDS.length | 0];
    // Avoid duplicates
    if (words.some(w => w.text === text)) return;
    words.push(createWord(text));
  }

  function loseLife(word) {
    lives--;
    if (typeof window.updateScore === 'function') window.updateScore(score);
    // Flash screen red effect via a quick red overlay
    flashRed = 8;

    if (lives <= 0) {
      running = false;
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('gameOver', { detail: { score } }));
        document.dispatchEvent(new CustomEvent('gameOver', { detail: { score }, bubbles: true }));
      }, 400);
    }
  }

  let flashRed = 0;

  function handleKey(char) {
    if (!running) return;

    // If no target, find word starting with char
    if (!target) {
      for (const w of words) {
        if (w.text[0] === char || w.text[0].toLowerCase() === char.toLowerCase()) {
          target = w;
          target.typedIdx = 0;
          break;
        }
      }
      if (!target) return;
    }

    // Check against target
    const expected = target.text[target.typedIdx];
    if (char === expected || char.toLowerCase() === expected.toLowerCase()) {
      target.typedIdx++;
      if (target.typedIdx >= target.text.length) {
        // Word completed!
        const speedBonus = Math.ceil(target.speed * 10);
        const gain = target.text.length * 10 + speedBonus;
        score += gain;
        if (typeof window.updateScore === 'function') window.updateScore(score);

        spawnExplosion(
          target.x + target.w / 2,
          target.y,
          target.hue
        );

        // Remove from array
        words.splice(words.indexOf(target), 1);
        target = null;
        typed = '';
      } else {
        typed = target.text.slice(0, target.typedIdx);
      }
    } else {
      // Wrong key
      target.flashRed = 12;
      target.typedIdx = 0;
      typed = '';
      // Visual shake
    }
  }

  // ── Main loop ─────────────────────────────────────────────────────────────
  function loop(ts) {
    animId = requestAnimationFrame(loop);
    const dt = Math.min(ts - frameTime, 50) / 16.67;
    frameTime = ts;

    if (!running) {
      drawBackground();
      updateExplosions();
      drawExplosions();
      drawHUD();
      return;
    }

    // Spawn
    if (ts - lastSpawn > diff.spawnMs) {
      lastSpawn = ts;
      spawnWord();
    }

    // Update words
    for (let i = words.length - 1; i >= 0; i--) {
      const w = words[i];
      w.y += w.speed * dt;
      if (w.y > CH - 30) {
        if (w === target) { target = null; typed = ''; }
        spawnExplosion(w.x + w.w / 2, CH - 50, 0);
        words.splice(i, 1);
        loseLife(w);
      }
    }

    updateExplosions();

    // Draw
    drawBackground();

    // Red flash overlay
    if (flashRed > 0) {
      ctx.fillStyle = `rgba(255,0,0,${flashRed * 0.025})`;
      ctx.fillRect(0, 0, CW, CH);
      flashRed--;
    }

    drawExplosions();
    words.forEach(drawWord);
    drawHUD();
  }

  // ── Keyboard input ────────────────────────────────────────────────────────
  function onKeyDown(e) {
    if (!running) return;
    if (e.key.length === 1) {
      handleKey(e.key);
    }
    if (e.key === 'Backspace') {
      // Reset targeting
      if (target) {
        target.typedIdx = 0;
        target = null;
        typed = '';
      }
    }
  }

  // ── Build UI ──────────────────────────────────────────────────────────────
  function buildUI() {
    ROOT.innerHTML = '';
    ROOT.style.cssText = 'display:flex;flex-direction:column;align-items:center;';

    canvas = document.createElement('canvas');
    canvas.width  = CW;
    canvas.height = CH;
    const maxW = Math.min(window.innerWidth - 16, CW);
    canvas.style.width  = maxW + 'px';
    canvas.style.height = (maxW * CH / CW) + 'px';
    canvas.style.borderRadius = '8px';
    canvas.style.border = '2px solid #334';
    canvas.style.display = 'block';

    ctx = canvas.getContext('2d');
    ROOT.appendChild(canvas);

    // Virtual keyboard hint on mobile
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.style.cssText = 'position:absolute;opacity:0;pointer-events:none;width:1px;height:1px;';
    inp.setAttribute('autocomplete', 'off');
    inp.setAttribute('autocorrect', 'off');
    inp.setAttribute('autocapitalize', 'off');
    inp.setAttribute('spellcheck', 'false');
    ROOT.appendChild(inp);

    inp.addEventListener('input', e => {
      const val = e.target.value;
      if (val) {
        for (const ch of val) handleKey(ch);
        e.target.value = '';
      }
    });

    // Tap canvas to focus input on mobile
    canvas.addEventListener('touchstart', () => inp.focus(), { passive: true });

    const hint = document.createElement('div');
    hint.style.cssText = 'margin-top:8px;font-size:13px;color:#556;text-align:center;';
    hint.textContent = '키보드로 단어를 입력해 파괴하세요! (백스페이스: 취소)';
    ROOT.appendChild(hint);
  }

  // ── startGame ─────────────────────────────────────────────────────────────
  window.startGame = function (diffId) {
    if (animId) cancelAnimationFrame(animId);
    document.removeEventListener('keydown', onKeyDown);

    diff = DIFF[diffId] || DIFF.normal;
    words = [];
    explosions = [];
    typed = '';
    target = null;
    score = 0;
    lives = 3;
    flashRed = 0;
    lastSpawn = 0;
    frameTime = performance.now();
    running = true;

    if (typeof window.updateScore === 'function') window.updateScore(0);

    buildUI();
    document.addEventListener('keydown', onKeyDown);
    requestAnimationFrame(loop);
  };

  const CFG = window.GAME_CONFIG || {};
  if (!CFG.gameId) window.startGame('normal');
})();
