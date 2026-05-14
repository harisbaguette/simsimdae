/* ads.js — 광고 슬롯 관리 (Phase 1: 플레이스홀더 / Phase 2: AdinPlay 교체) */
let _roundCount = 0;

function onRoundEnd() {
  _roundCount++;
  if (_roundCount % 5 === 0) {
    if (window.adinplay?.showInterstitial) {
      window.adinplay.showInterstitial();
    }
  }
}

function showRewardedAd(callback) {
  if (window.adinplay?.showRewarded) {
    window.adinplay.showRewarded(callback);
  } else {
    callback(); // 광고 미지원 시 즉시 보상
  }
}

// 광고 슬롯 레이블 (Phase 1: 시각적 플레이스홀더)
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.ad-slot span').forEach(el => {
    el.textContent = '광고 (준비 중)';
  });
});
