/* korean-quiz/game.js — 한국 상식 퀴즈 */
(function () {
  'use strict';

  const CONFIG = window.GAME_CONFIG || { gameId: 'korean-quiz' };

  const ALL_QUESTIONS = [
    // 역사 (history)
    { q:'조선을 건국한 인물은?', opts:['이성계','왕건','견훤','김춘추'], a:0, cat:'역사' },
    { q:'한글을 창제한 조선의 왕은?', opts:['태종','세종대왕','성종','영조'], a:1, cat:'역사' },
    { q:'임진왜란이 발생한 해는?', opts:['1392년','1592년','1636년','1776년'], a:1, cat:'역사' },
    { q:'삼국 시대의 나라가 아닌 것은?', opts:['고구려','백제','신라','발해'], a:3, cat:'역사' },
    { q:'고려를 건국한 인물은?', opts:['이성계','왕건','궁예','견훤'], a:1, cat:'역사' },
    { q:'조선의 수도는?', opts:['개성','평양','경주','한양'], a:3, cat:'역사' },
    { q:'3·1 운동이 일어난 해는?', opts:['1910년','1919년','1945년','1950년'], a:1, cat:'역사' },
    { q:'광복절은 몇 월 며칠인가?', opts:['3월 1일','6월 25일','8월 15일','10월 3일'], a:2, cat:'역사' },
    { q:'한국 전쟁이 시작된 해는?', opts:['1945년','1948년','1950년','1953년'], a:2, cat:'역사' },
    { q:'단군왕검이 세운 나라는?', opts:['고조선','고구려','발해','부여'], a:0, cat:'역사' },
    { q:'이순신 장군의 대표적인 전투는?', opts:['살수대첩','귀주대첩','한산도대첩','황산대첩'], a:2, cat:'역사' },
    { q:'조선 제22대 왕으로 대한제국을 선포한 인물은?', opts:['고종','순종','철종','흥선대원군'], a:0, cat:'역사' },
    { q:'신라의 삼국 통일 이후 수도가 된 곳은?', opts:['개성','평양','경주','공주'], a:2, cat:'역사' },
    { q:'6·25 전쟁의 휴전 협정이 맺어진 곳은?', opts:['판문점','개성','평양','서울'], a:0, cat:'역사' },
    { q:'독립운동가 안중근이 이토 히로부미를 저격한 곳은?', opts:['도쿄','하얼빈','상하이','블라디보스토크'], a:1, cat:'역사' },
    // 문화 (culture)
    { q:'한국의 전통 발효 음식으로 세계적으로 유명한 것은?', opts:['된장','김치','고추장','간장'], a:1, cat:'문화' },
    { q:'한국의 전통 가옥은?', opts:['초가집','한옥','양옥','아파트'], a:1, cat:'문화' },
    { q:'한국의 민속놀이가 아닌 것은?', opts:['윷놀이','제기차기','스모','연날리기'], a:2, cat:'문화' },
    { q:'추석에 먹는 전통 음식은?', opts:['떡국','송편','팥죽','식혜'], a:1, cat:'문화' },
    { q:'설날에 먹는 전통 음식은?', opts:['떡국','송편','팥죽','삼계탕'], a:0, cat:'문화' },
    { q:'한국 전통 악기가 아닌 것은?', opts:['가야금','해금','장구','비파'], a:3, cat:'문화' },
    { q:'한국의 전통 무예는?', opts:['가라테','태권도','유도','쿵푸'], a:1, cat:'문화' },
    { q:'한국의 전통 의상은?', opts:['기모노','한복','치파오','사리'], a:1, cat:'문화' },
    { q:'한국의 전통 종이 공예는?', opts:['종이접기','한지공예','우키요에','바티크'], a:1, cat:'문화' },
    { q:'한국의 전통 혼례에서 신부와 신랑이 절을 나누는 예식은?', opts:['고천제','교배례','합근례','폐백'], a:1, cat:'문화' },
    { q:'판소리에서 소리꾼의 노래에 맞장구를 치는 것을 뭐라 하나?', opts:['추임새','창','아니리','발림'], a:0, cat:'문화' },
    { q:'한국 전통 음악 중 느리고 장중한 곡은?', opts:['아리랑','도라지','청산별곡','정간보'], a:0, cat:'문화' },
    { q:'동짓날 먹는 전통 음식은?', opts:['송편','팥죽','떡국','식혜'], a:1, cat:'문화' },
    { q:'한국의 전통 장례 문화에서 사용하는 흰옷을 무엇이라 하나?', opts:['한복','상복','도포','갓'], a:1, cat:'문화' },
    { q:'탈춤에서 사용하는 가면을 무엇이라 하나?', opts:['탈','가면','마스크','복면'], a:0, cat:'문화' },
    // 속담 (proverbs)
    { q:'"가는 말이 고와야 ___"의 빈칸은?', opts:['오는 말이 곱다','오는 정이 있다','받는 말이 좋다','듣는 말이 달다'], a:0, cat:'속담' },
    { q:'"낮말은 새가 듣고 ___은 쥐가 듣는다"의 빈칸은?', opts:['낮말','밤말','속말','겉말'], a:1, cat:'속담' },
    { q:'"등잔 밑이 ___"의 빈칸은?', opts:['밝다','따뜻하다','어둡다','뜨겁다'], a:2, cat:'속담' },
    { q:'"세 살 버릇 ___까지 간다"의 빈칸은?', opts:['열 살','스무 살','여든','백 살'], a:2, cat:'속담' },
    { q:'"콩 심은 데 콩 나고 ___"의 뜻은?', opts:['노력하면 된다','원인에 따라 결과가 생긴다','사람은 변한다','좋은 일은 전파된다'], a:1, cat:'속담' },
    { q:'"하늘이 무너져도 솟아날 구멍이 있다"의 뜻은?', opts:['절망하지 말라','하늘은 크다','구멍을 찾아라','희망을 잃지 말라'], a:3, cat:'속담' },
    { q:'"발 없는 말이 천 리 간다"의 뜻은?', opts:['말은 빠르다','말은 조심해야 한다','말은 힘이 세다','말을 아껴라'], a:1, cat:'속담' },
    { q:'"벼는 익을수록 고개를 숙인다"의 뜻은?', opts:['가을이 왔다','교만하지 말라','높이 뛰어라','공부해라'], a:1, cat:'속담' },
    { q:'"호랑이도 제 말 하면 온다"와 뜻이 비슷한 속담은?', opts:['세 살 버릇 여든까지','말 한마디로 천냥 빚 갚는다','까마귀 날자 배 떨어진다','제 논에 물 대기'], a:2, cat:'속담' },
    { q:'"아니 땐 굴뚝에 연기 나랴"의 뜻은?', opts:['굴뚝이 높으면 연기가 많다','원인 없는 결과는 없다','연기는 항상 난다','불 없이는 살 수 없다'], a:1, cat:'속담' },
    { q:'"빈 수레가 요란하다"의 뜻은?', opts:['빈 수레는 빠르다','실력 없는 사람이 큰소리 친다','조용한 것이 좋다','말보다 행동이 중요하다'], a:1, cat:'속담' },
    { q:'"원숭이도 나무에서 떨어진다"의 뜻은?', opts:['원숭이는 나무에 산다','전문가도 실수할 수 있다','나무는 위험하다','연습하면 잘할 수 있다'], a:1, cat:'속담' },
    { q:'"말 한마디로 천 냥 빚 갚는다"의 뜻은?', opts:['말이 비싸다','말을 아껴야 한다','말의 힘은 크다','빚을 갚아야 한다'], a:2, cat:'속담' },
    { q:'"고생 끝에 낙이 온다"와 가장 뜻이 비슷한 속담은?', opts:['하늘이 무너져도 솟아날 구멍','비 온 뒤에 땅이 굳는다','서울이 무너진다','까마귀 날자 배 떨어진다'], a:1, cat:'속담' },
    { q:'"사공이 많으면 배가 산으로 간다"의 뜻은?', opts:['배는 강에 가야 한다','리더가 너무 많으면 일이 안 된다','사공은 많을수록 좋다','산에서 배를 탄다'], a:1, cat:'속담' },
    // 지리 (geography)
    { q:'한국의 최고봉(가장 높은 산)은?', opts:['지리산','설악산','한라산','백두산'], a:3, cat:'지리' },
    { q:'한강이 흘러가는 바다는?', opts:['동해','서해','남해','황해'], a:1, cat:'지리' },
    { q:'제주도에 있는 한국에서 가장 높은 산은?', opts:['지리산','한라산','설악산','속리산'], a:1, cat:'지리' },
    { q:'경상남도에 위치한 대도시는?', opts:['광주','대전','대구','부산'], a:3, cat:'지리' },
    { q:'한국의 동쪽 바다는?', opts:['서해','남해','동해','황해'], a:2, cat:'지리' },
    { q:'인천광역시에 있는 국제공항은?', opts:['김포공항','인천공항','제주공항','김해공항'], a:1, cat:'지리' },
    { q:'한국에서 가장 큰 섬은?', opts:['거제도','강화도','제주도','울릉도'], a:2, cat:'지리' },
    { q:'DMZ(비무장지대)가 위치한 곳은?', opts:['서울 근처','남북 경계선','동해 연안','제주도'], a:1, cat:'지리' },
    { q:'경복궁이 위치한 도시는?', opts:['경주','부산','수원','서울'], a:3, cat:'지리' },
    { q:'독도가 속한 행정 구역은?', opts:['강원도','경상북도','전라남도','제주도'], a:1, cat:'지리' },
    { q:'한국의 수도는?', opts:['부산','서울','인천','수원'], a:1, cat:'지리' },
    { q:'낙동강이 흐르는 지역은?', opts:['경기도','전라도','경상도','충청도'], a:2, cat:'지리' },
    { q:'설악산이 위치한 도는?', opts:['강원도','경기도','충청도','경상도'], a:0, cat:'지리' },
    { q:'한국에서 가장 긴 강은?', opts:['한강','낙동강','금강','섬진강'], a:1, cat:'지리' },
    { q:'백두대간의 남쪽 끝에 위치한 산맥은?', opts:['지리산','한라산','설악산','소백산'], a:0, cat:'지리' },
  ];

  const TIMER_SECONDS = 30;
  let root, gs, timerInterval, animFrame;

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function init() {
    root = document.getElementById('game-root');
    const css = document.createElement('style');
    css.textContent = `
      #kq-root { font-family:"Malgun Gothic",sans-serif; max-width:560px; margin:0 auto; }
      #kq-header { background:linear-gradient(135deg,#1a3a6e,#2a5aae); color:#fff; padding:14px 20px; border-radius:8px 8px 0 0; display:flex; justify-content:space-between; align-items:center; }
      #kq-header h2 { margin:0; font-size:20px; }
      #kq-progress-bar { height:8px; background:#dde; }
      #kq-progress-fill { height:100%; background:#4477ff; transition:width 0.3s; }
      #kq-body { background:#fff; border:2px solid #aac; border-top:none; border-radius:0 0 8px 8px; padding:20px; }
      #kq-cat { font-size:13px; color:#888; background:#eef; padding:3px 10px; border-radius:10px; display:inline-block; margin-bottom:12px; }
      #kq-question { font-size:20px; font-weight:bold; color:#222; margin-bottom:20px; line-height:1.5; }
      #kq-timer-bar { height:6px; background:#eee; border-radius:3px; margin-bottom:16px; overflow:hidden; }
      #kq-timer-fill { height:100%; background:#4CAF50; border-radius:3px; transition:width 0.1s linear; }
      .kq-opt { display:block; width:100%; padding:14px 18px; margin:8px 0; font-size:17px; text-align:left; background:#f8f9ff; border:2px solid #dde; border-radius:8px; cursor:pointer; transition:all 0.15s; }
      .kq-opt:hover:not(:disabled) { background:#e8f0ff; border-color:#4477ff; }
      .kq-opt.correct { background:#e8ffe8; border-color:#22aa22; color:#228822; }
      .kq-opt.wrong   { background:#ffe8e8; border-color:#aa2222; color:#aa2222; }
      .kq-opt:disabled { cursor:default; }
      #kq-feedback { text-align:center; font-size:18px; font-weight:bold; min-height:28px; margin-top:12px; }
      #kq-hud { display:flex; justify-content:space-between; font-size:14px; color:#888; margin-top:14px; border-top:1px solid #eee; padding-top:10px; }
      #kq-end { text-align:center; padding:30px 20px; }
      #kq-end h2 { font-size:28px; margin:0 0 12px; }
      #kq-end .kq-grade { font-size:64px; margin:16px 0; }
      #kq-end p { font-size:18px; color:#555; margin:6px 0; }
    `;
    document.head.appendChild(css);

    root.innerHTML = `
      <div id="kq-root">
        <div id="kq-header">
          <h2>🇰🇷 한국 상식 퀴즈</h2>
          <span id="kq-qnum">1 / 10</span>
        </div>
        <div id="kq-progress-bar"><div id="kq-progress-fill" style="width:10%"></div></div>
        <div id="kq-body" id="kq-body"></div>
      </div>
    `;
  }

  function renderQuestion() {
    const body = document.getElementById('kq-body');
    const q = gs.questions[gs.qIndex];
    const opts = shuffle(q.opts.map((o, i) => ({ text: o, orig: i })));
    gs.currentOpts = opts;

    body.innerHTML = `
      <span id="kq-cat">${catEmoji(q.cat)} ${q.cat}</span>
      <div id="kq-question">${q.q}</div>
      <div id="kq-timer-bar"><div id="kq-timer-fill" style="width:100%"></div></div>
      ${opts.map((o, i) => `<button class="kq-opt" data-idx="${i}">${numLabel(i)} ${o.text}</button>`).join('')}
      <div id="kq-feedback"></div>
      <div id="kq-hud">
        <span>⏱ <span id="kq-tsec">${TIMER_SECONDS}</span>초</span>
        <span>✅ ${gs.correct} / 🟡 ${gs.qIndex}</span>
        <span>🏆 ${gs.score}점</span>
      </div>
    `;

    document.getElementById('kq-qnum').textContent = `${gs.qIndex + 1} / 10`;
    document.getElementById('kq-progress-fill').style.width = ((gs.qIndex + 1) / 10 * 100) + '%';

    body.querySelectorAll('.kq-opt').forEach(btn => {
      btn.addEventListener('click', () => handleAnswer(+btn.dataset.idx));
      btn.addEventListener('touchend', e => { e.preventDefault(); handleAnswer(+btn.dataset.idx); });
    });

    startQTimer();
  }

  function catEmoji(c) {
    return { '역사':'📜', '문화':'🎭', '속담':'💬', '지리':'🗺️' }[c] || '❓';
  }
  function numLabel(i) {
    return ['①','②','③','④'][i] || (i+1)+'.';
  }

  function startQTimer() {
    clearInterval(timerInterval);
    gs.timeLeft = TIMER_SECONDS;
    timerInterval = setInterval(() => {
      gs.timeLeft -= 0.1;
      const pct = Math.max(0, gs.timeLeft / TIMER_SECONDS * 100);
      const fill = document.getElementById('kq-timer-fill');
      const tsec = document.getElementById('kq-tsec');
      if (fill) fill.style.width = pct + '%';
      if (fill) fill.style.background = pct > 40 ? '#4CAF50' : pct > 20 ? '#ff8800' : '#ff4444';
      if (tsec) tsec.textContent = Math.ceil(gs.timeLeft);
      if (gs.timeLeft <= 0) {
        clearInterval(timerInterval);
        handleAnswer(-1); // timeout
      }
    }, 100);
  }

  function handleAnswer(optIdx) {
    if (!gs.running) return;
    clearInterval(timerInterval);
    const q = gs.questions[gs.qIndex];
    const fb = document.getElementById('kq-feedback');
    const opts = document.querySelectorAll('.kq-opt');
    opts.forEach(b => b.disabled = true);

    let correct = false;
    if (optIdx >= 0) {
      const chosen = gs.currentOpts[optIdx];
      correct = chosen.orig === q.a;
      // highlight
      opts.forEach((b, i) => {
        if (gs.currentOpts[i].orig === q.a) b.classList.add('correct');
        else if (i === optIdx) b.classList.add('wrong');
      });
    } else {
      // timeout — highlight correct
      opts.forEach((b, i) => {
        if (gs.currentOpts[i].orig === q.a) b.classList.add('correct');
      });
    }

    if (correct) {
      const pts = Math.ceil(gs.timeLeft) * 10;
      gs.score += pts;
      gs.correct++;
      if (fb) fb.innerHTML = `<span style="color:#228822">✅ 정답! +${pts}점</span>`;
    } else if (optIdx === -1) {
      if (fb) fb.innerHTML = `<span style="color:#888">⏰ 시간 초과!</span>`;
    } else {
      if (fb) fb.innerHTML = `<span style="color:#aa2222">❌ 오답!</span>`;
    }

    if (window.updateScore) window.updateScore(gs.score);
    gs.qIndex++;

    if (gs.qIndex >= 10) {
      setTimeout(showResults, 1200);
    } else {
      setTimeout(renderQuestion, 1400);
    }
  }

  function showResults() {
    gs.running = false;
    const body = document.getElementById('kq-body');
    const pct = Math.round(gs.correct / 10 * 100);
    const grade = pct >= 90 ? '🏆' : pct >= 70 ? '🥇' : pct >= 50 ? '🥈' : '🥉';
    body.innerHTML = `
      <div id="kq-end">
        <h2>퀴즈 완료!</h2>
        <div class="kq-grade">${grade}</div>
        <p>정답: <strong>${gs.correct}</strong> / 10</p>
        <p>정확도: <strong>${pct}%</strong></p>
        <p>최종 점수: <strong style="font-size:24px;color:#4477ff">${gs.score}점</strong></p>
      </div>
    `;
    document.dispatchEvent(new CustomEvent('gameClear', { detail: { score: gs.score } }));
  }

  window.startGame = function (diffId = 'normal', stage = 1) {
    init();
    // pick 10 random questions (balanced across categories)
    const bycat = {};
    ALL_QUESTIONS.forEach(q => {
      if (!bycat[q.cat]) bycat[q.cat] = [];
      bycat[q.cat].push(q);
    });
    const cats = Object.keys(bycat);
    let pool = [];
    cats.forEach(c => pool = pool.concat(shuffle(bycat[c]).slice(0, 3)));
    pool = shuffle(pool).slice(0, 10);

    gs = { running: true, questions: pool, qIndex: 0, correct: 0, score: 0, timeLeft: TIMER_SECONDS, currentOpts: [] };
    renderQuestion();
  };
})();
