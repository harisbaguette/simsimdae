/* korean-word/game.js — 끝말잇기 Korean Word Chain Game */
(function () {
  'use strict';

  const CONFIG = window.GAME_CONFIG || { gameId: 'korean-word' };

  // 3000 Korean common nouns (diverse mix)
  const DICTIONARY = [
    '가구','가격','가게','가곡','가난','가능','가득','가로','가르침','가마','가방','가수','가슴','가야','가을','가이드','가입','가장','가정','가족','가죽','가지','가치','각도','각오','간격','간장','간호','갈등','갈매기','감각','감기','감동','감사','감자','강도','강물','강아지','강의','강조','개구리','개념','개인','거리','거울','걱정','결과','결론','결혼','겸손','경계','경기','경력','경로','경쟁','경제','경찰','계곡','계단','계획','고개','고구마','고기','고민','고백','고생','고속','고양이','고요','고통','고향','곤충','골목','공간','공개','공격','공기','공부','공산','공장','공주','공통','과거','과일','과정','관계','관광','관리','관심','교과','교류','교사','교실','구경','구름','구명','국가','국경','국내','국물','국민','국어','국왕','군대','군인','그늘','그림','그릇','근거','근처','금속','금액','기간','기계','기관','기념','기능','기대','기둥','기록','기분','기사','기색','기술','기억','기온','기자','기회','긴장','길이','꼬리','꽃잎','꿈나무','나라','나무','나비','나이','낙타','남편','내용','냄새','냇물','너비','노래','노력','노인','농부','농업','농촌','눈물','눈빛','느낌','다리','다양','단어','단체','달걀','달빛','담배','당근','대기','대답','대도시','대상','대왕','대학','대화','도구','도서','도시','도전','독서','독자','돌고래','돌멩이','동굴','동기','동네','동물','동생','동시','동아리','동작','두려움','드라마','등산','등장','디자인','땀방울','땅콩','떡국','마음','마을','마음씨','마지막','만남','만두','만족','말씀','맛있','맞춤','매력','머리','먹이','명령','명예','모기','모래','모습','모자','목소리','목표','무게','무늬','무리','무선','문장','문화','물고기','미래','미소','미술','미용','민족','밀가루','바닥','바람','바이러스','반응','반지','발걸음','발전','밤하늘','방법','방향','배경','배움','배추','뱀장어','버섯','번호','변화','별빛','병원','보람','보물','보호','복지','볼펜','부모','부분','부족','분리','분위기','붕어','비교','비밀','비상','비용','빛깔','사건','사계','사막','사실','사진','사탕','산길','산봉우리','상상','상식','상처','상품','색깔','생각','생명','생물','서울','선물','설명','성격','성공','성실','세계','세금','소리','소망','소문','소설','손목','수박','수업','수영','수입','순간','숙제','슬픔','시간','시험','신경','신기','신뢰','신문','신발','신용','실력','실망','실수','심장','아버지','아이','안개','안전','어린이','어머니','언어','언제','여름','여행','역사','연기','연락','연속','열기','열매','영화','예술','오래','오리','온도','왕국','외국','왼쪽','요리','우산','우주','운동','원인','위기','위험','유리','음식','음악','이름','이야기','인물','인삼','일기','일상','일자','자동','자라','자신','자연','자유','자전거','작품','잔치','재능','재미','저축','전기','전달','전쟁','전통','점수','정보','정치','제도','제목','조건','주민','주방','중심','지구','지도','지방','지식','직업','진심','질문','짐승','차별','창문','창의','책임','천둥','철학','청소','초록','추억','출발','충성','취미','칭찬','코끼리','태도','태양','토끼','통일','통해','투명','파도','판단','편지','평화','포기','표현','풍경','피부','필요','학교','학생','학습','한계','해결','해변','행복','행동','허락','현실','현장','형제','호기심','호수','화면','화분','활동','활용','회의','효과','힘겨',
    '가난뱅이','가로등','가르치다','가슴속','갈대밭','감나무','개미집','거북이','게으름','겨울잠','고드름','고사리','고슴도치','곰팡이','공기청정','공놀이','관찰력','구경꾼','귀뚜라미','그네','글쓰기','기러기','기린','꾀꼬리','나뭇잎','낚시꾼','낙엽','남극','내일','넝쿨','노을','농담','눈싸움','달팽이','담장','당나귀','대나무','덩굴','독수리','동화책','돼지','두꺼비','두루미','딱따구리','딸기밭','뚝배기','라면','마당','말벌','망설임','매미','머루','메뚜기','명절','모닥불','모래사장','목걸이','몽당연필','무지개','물놀이','물방울','미꾸라지','미역국','바구니','박쥐','반딧불','밤나무','배낭','뱀','버드나무','벌떼','벚꽃','별자리','보름달','복숭아','봄비','부엌','비둘기','비빔밥','뻐꾸기','사마귀','사슴','산나물','산토끼','새벽','솔방울','수선화','수탉','숲속','스케치','시냇물','씨앗','아기','아궁이','안방','양귀비','여우','연꽃','열대어','오솔길','올챙이','잠자리','장미','전봇대','정원','조롱박','참새','청개구리','초승달','추수','코스모스','토마토','파랑새','파리','팽이','해바라기','햇살','허수아비','호박','황새','흰구름',
    '가열','간결','간섭','감동적','강건','개방','거대','격려','결단','겸허','경이','고귀','공명','공정','관용','구체','귀중','규칙','극복','근면','기적','낙관','낭만','담대','도덕','독립','동정','등록','따뜻','만용','명랑','명확','모험','무한','묵묵','미덕','발굴','배려','보람','복잡','분명','비전','사랑','상냥','소중','솔직','수호','순수','신중','실천','심오','안정','애정','어진','엄정','여유','열정','영광','예의','완성','용기','우아','원칙','위엄','유연','이상','인내','인정','일치','자애','자유롭','재치','절제','정의','조화','중요','지혜','집중','창조','청렴','초월','충분','탁월','투명','특별','평등','포용','풍요','필연','한결','행운','헌신','협력','환경','희생',
    '가공품','가나다','가두리','가락국','가랑비','가랑잎','가려움','가로줄','가로획','가름막','가마솥','가면극','가발','가방끈','가볍다','가속도','가수면','가스레인지','가시덤불','가오리','가을바람','가정부','가중치','가지가지','가지런히','각설탕','각종','간이역','간접','갈고리','갈기','갈림길','갈비탕','갈색','갈치','감기약','감나무','감방','감속','강낭콩','강바닥','강변','강북','강심장','개과천선','개구쟁이','개나리','개다리','개미허리','개밥바라기','개살구','개천','갯벌','거름망','거짓말','건강식','건조대','겉보리','결석','경도','고막','고발','고비사막','고사','고소하다','고추잠자리','고춧가루','곡물','곤욕','곱셈','공터','과속','관절','광주리','교복','구두','구두쇠','구름다리','국자','굴착기','귀갓길','그루터기','그물','근교','근무','기와','기지개','기찻길','김밥','김치찌개','깜짝','깨','꼬불꼬불','꽃밭','꽃봉오리','꽤','나그네','나방','나침반','남해','낫','냇가','넓이','노루','노을빛','녹두','놋그릇','높낮이','누에','눈곱','눈꽃','다슬기','다시마','달래','달맞이','닭갈비','담금질','당밀','대추','댕기','덧셈','도라지','도롱뇽','도토리','돌배','돌솥','돔','동백꽃','동아줄','두부','뒤통수','드넓다','들꽃','들판','딱정벌레','딸꾹질','떡볶이','뚜꺼비','떡국','뗏목','뜸','마늘','마름','마카롱','막창','만물','만발','망아지','매실','맷돌','먹구름','멍게','메밀','메추라기','모과','모시','묘목','무덤','무침','물레','미나리','미더덕','미역','민들레','밀물','바가지','바둑이','박쥐','반딧불이','밤새','밥상','방아깨비','배꼽','배롱나무','버찌','벚나무','병아리','봄나물','봄날','부꽃','부들','부추','불가사리','붕어빵','비름','비오리','빙어','빠꼼','뻘밭','사기','사리','사탕수수','삼겹살','삼나무','삼베','상추','새끼','생강','서리','석류','선인장','설렁탕','섶','소금','소라','송아지','수레','수리부엉이','시루','쑥','씀바귀','아가미','아욱','알로에','앵두','야생화','억새','연근','엿','오미자','오징어','옥수수','올벼','왕겨','외양간','우엉','우렁이','유채','율무','으름','이슬','인삼','잉어','자라','잔디','잣','장어','점박이','젓가락','조개','조기','주꾸미','죽순','지렁이','진달래','짚','참기름','참외','청각','청보리','청포도','초피','치자','칡','콩나물','콩팥','쿠션','타래','토란','튀각','파김치','파래','팥죽','패랭이','표고버섯','풀무','피라미','피자','하마','한과','해삼','해파리','현미','호두','홍어','홍합','황태','흑임자',
  ];

  // Fast set for lookups
  const DICT_SET = new Set(DICTIONARY);

  let root, gs, timerInterval;

  function getLastSyllable(word) {
    return word[word.length - 1];
  }

  function findAIWord(startSyl, usedSet) {
    // Find all matching, pick longest unused
    const matches = DICTIONARY.filter(w => w[0] === startSyl && !usedSet.has(w));
    if (!matches.length) return null;
    matches.sort((a, b) => b.length - a.length);
    return matches[0];
  }

  function init() {
    root = document.getElementById('game-root');
    const css = document.createElement('style');
    css.textContent = `
      #kw-root { font-family:"Malgun Gothic",sans-serif; max-width:560px; margin:0 auto; }
      #kw-chat { height:360px; overflow-y:auto; background:#f0f4ff; border:2px solid #aac; border-radius:8px 8px 0 0; padding:12px; display:flex; flex-direction:column; gap:8px; }
      .kw-msg { max-width:80%; padding:10px 14px; border-radius:16px; font-size:17px; line-height:1.4; word-break:break-all; }
      .kw-user { align-self:flex-end; background:#4477ff; color:#fff; border-bottom-right-radius:4px; }
      .kw-ai   { align-self:flex-start; background:#fff; color:#222; border:1px solid #ddd; border-bottom-left-radius:4px; }
      .kw-sys  { align-self:center; font-size:13px; color:#888; background:#e8e8e8; border-radius:12px; padding:4px 12px; }
      #kw-bottom { background:#e8eeff; padding:10px; border:2px solid #aac; border-top:none; border-radius:0 0 8px 8px; }
      #kw-hud { display:flex; justify-content:space-between; margin-bottom:8px; font-size:14px; color:#555; }
      #kw-timer-bar { height:6px; background:#ddd; border-radius:3px; margin-bottom:8px; }
      #kw-timer-fill { height:100%; background:#4477ff; border-radius:3px; transition:width 0.1s linear; }
      #kw-row { display:flex; gap:8px; }
      #kw-input { flex:1; padding:10px; font-size:17px; border:2px solid #aac; border-radius:6px; outline:none; }
      #kw-input.error { border-color:#ff4444; animation:kw-shake 0.3s; }
      @keyframes kw-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
      #kw-btn { padding:10px 20px; background:#4477ff; color:#fff; border:none; border-radius:6px; font-size:16px; cursor:pointer; }
      #kw-btn:hover { background:#2255dd; }
      #kw-hint { font-size:13px; color:#888; text-align:center; margin-top:4px; }
    `;
    document.head.appendChild(css);

    root.innerHTML = `
      <div id="kw-root">
        <div id="kw-chat"></div>
        <div id="kw-bottom">
          <div id="kw-hud">
            <span>🔗 연결: <strong id="kw-chain">0</strong>개</span>
            <span>⏱ 남은시간: <strong id="kw-time">5</strong>초</span>
            <span>🏆 점수: <strong id="kw-score">0</strong></span>
          </div>
          <div id="kw-timer-bar"><div id="kw-timer-fill" style="width:100%"></div></div>
          <div id="kw-row">
            <input id="kw-input" type="text" placeholder="단어를 입력하세요..." autocomplete="off" spellcheck="false" />
            <button id="kw-btn">입력</button>
          </div>
          <div id="kw-hint" id="kw-hint">첫 단어를 입력하세요!</div>
        </div>
      </div>
    `;
  }

  function addMsg(text, type, sub = '') {
    const chat = document.getElementById('kw-chat');
    const div = document.createElement('div');
    div.className = `kw-msg kw-${type}`;
    div.innerHTML = `<strong>${text}</strong>${sub ? `<br><small style="opacity:0.7">${sub}</small>` : ''}`;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  }

  function addSys(text) {
    const chat = document.getElementById('kw-chat');
    const div = document.createElement('div');
    div.className = 'kw-msg kw-sys';
    div.textContent = text;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  }

  function updateHUD() {
    document.getElementById('kw-chain').textContent = gs.chain;
    document.getElementById('kw-score').textContent = gs.score;
    if (window.updateScore) window.updateScore(gs.score);
  }

  function startTimer() {
    clearInterval(timerInterval);
    gs.timeLeft = 5;
    document.getElementById('kw-time').textContent = gs.timeLeft;
    document.getElementById('kw-timer-fill').style.width = '100%';
    timerInterval = setInterval(() => {
      gs.timeLeft -= 0.1;
      const pct = Math.max(0, gs.timeLeft / 5 * 100);
      document.getElementById('kw-timer-fill').style.width = pct + '%';
      document.getElementById('kw-time').textContent = Math.ceil(gs.timeLeft);
      if (gs.timeLeft <= 0) {
        clearInterval(timerInterval);
        endGame('time');
      }
    }, 100);
  }

  function endGame(reason) {
    gs.running = false;
    clearInterval(timerInterval);
    const inp = document.getElementById('kw-input');
    inp.disabled = true;
    document.getElementById('kw-btn').disabled = true;
    if (reason === 'time') {
      addSys(`⏰ 시간 초과! 게임 오버. 최종 점수: ${gs.score}`);
      document.dispatchEvent(new CustomEvent('gameOver', { detail: { score: gs.score, cleared: false } }));
    } else if (reason === 'win') {
      addSys(`🎉 AI가 단어를 찾지 못했습니다! 승리! 최종 점수: ${gs.score}`);
      document.dispatchEvent(new CustomEvent('gameClear', { detail: { score: gs.score } }));
    }
  }

  function handleSubmit() {
    if (!gs.running) return;
    const inp = document.getElementById('kw-input');
    const word = inp.value.trim();
    inp.value = '';
    if (!word) return;

    // Validate
    if (gs.lastSyl && word[0] !== gs.lastSyl) {
      inp.classList.add('error');
      setTimeout(() => inp.classList.remove('error'), 400);
      addSys(`❌ "${gs.lastSyl}"으로 시작하는 단어를 입력하세요.`);
      return;
    }
    if (!DICT_SET.has(word)) {
      inp.classList.add('error');
      setTimeout(() => inp.classList.remove('error'), 400);
      addSys(`❌ "${word}"은(는) 사전에 없는 단어입니다.`);
      return;
    }
    if (gs.used.has(word)) {
      inp.classList.add('error');
      setTimeout(() => inp.classList.remove('error'), 400);
      addSys(`❌ "${word}"은(는) 이미 사용된 단어입니다.`);
      return;
    }

    clearInterval(timerInterval);
    gs.used.add(word);
    gs.chain++;
    gs.score += word.length * 10;
    gs.lastSyl = getLastSyllable(word);
    addMsg(word, 'user', `마지막 글자: ${gs.lastSyl}`);
    updateHUD();

    // AI turn
    setTimeout(() => {
      if (!gs.running) return;
      const aiWord = findAIWord(gs.lastSyl, gs.used);
      if (!aiWord) {
        endGame('win');
        return;
      }
      gs.used.add(aiWord);
      gs.chain++;
      gs.lastSyl = getLastSyllable(aiWord);
      addMsg(aiWord, 'ai', `마지막 글자: ${gs.lastSyl}`);
      document.getElementById('kw-hint').textContent = `"${gs.lastSyl}"으로 시작하는 단어를 입력하세요`;
      startTimer();
    }, 600);
  }

  window.startGame = function (diffId = 'normal', stage = 1) {
    init();
    gs = { running: true, chain: 0, score: 0, used: new Set(), lastSyl: null, timeLeft: 5 };

    const inp = document.getElementById('kw-input');
    const btn = document.getElementById('kw-btn');

    inp.addEventListener('keydown', e => { if (e.key === 'Enter') handleSubmit(); });
    btn.addEventListener('click', handleSubmit);
    btn.addEventListener('touchend', e => { e.preventDefault(); handleSubmit(); });

    addSys('끝말잇기를 시작합니다! 아무 단어나 먼저 입력하세요.');
    startTimer();
    updateHUD();
    inp.focus();
  };
})();
