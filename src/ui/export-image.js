import { CONFIG } from '../data/config.js';

export const IMAGE_SIZE = Object.freeze({ width: 1080, height: 2400 });
const signed = n => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(2)}`;

// 외부 이미지 없이 같은 PNG를 미리보기와 저장에 사용합니다.
export async function createResultImage(result) {
  await document.fonts?.ready;
  const canvas = document.createElement('canvas');
  canvas.width = IMAGE_SIZE.width;
  canvas.height = IMAGE_SIZE.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw Error('이 브라우저에서 이미지 생성을 지원하지 않습니다.');
  const text = (value, x, y, size = 36, color = '#eff6ed', weight = 500) => {
    ctx.font = `${weight} ${size}px -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(value, x, y);
  };
  const box = (x, y, w, h, color, radius = 32) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();
  };
  ctx.fillStyle = '#094235';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // 테니스 코트 선을 배경 장식으로 사용합니다.
  ctx.strokeStyle = '#285b4b';
  ctx.lineWidth = 3;
  ctx.strokeRect(54, 54, 972, 2292);
  ctx.strokeRect(110, 54, 860, 2292);
  ctx.beginPath(); ctx.moveTo(54, 1200); ctx.lineTo(1026, 1200); ctx.stroke();
  text('KTRP', 96, 172, 72, '#d6f36a', 900);
  text('KOREA TENNIS RATING PROGRAM', 96, 226, 25, '#adc8b8');
  text('MY TENNIS RATING', 96, 368, 28, '#d6f36a', 700);
  text('지금의 나를, 코트 위의 숫자로.', 96, 438, 43, '#ffffff', 700);
  box(80, 510, 920, 610, '#d6f36a', 44);
  text('나의 첫 KTRP', 130, 600, 38, '#094235', 700);
  text('P · 잠정 레이팅', 130, 661, 28, '#34593c');
  text(result.rating.toFixed(2), 120, 900, 206, '#094235', 900);
  const scoreWidth = ctx.measureText(result.rating.toFixed(2)).width;
  text('P', Math.min(850, 140 + scoreWidth), 900, 60, '#094235', 800);
  text(`공개 등급 ${result.publicGrade.toFixed(1)}${result.publicGrade >= 7.5 ? ' · 선수급' : ''}`, 130, 1010, 42, '#094235', 700);
  text('내부 레이팅은 소수점으로 유지됩니다.', 130, 1070, 28, '#34593c');
  text('점수의 구성', 96, 1230, 38, '#ffffff', 700);
  const rows = [
    [result.source + ' Base', result.base.toFixed(2)],
    ['수행능력 보정', signed(result.skill)],
    ['운동배경 보정', signed(result.background)],
    ['대회 스코어 보정', signed(result.scoreAdjustment)],
  ];
  if (result.rangeAdjustment) rows.push(['최종 범위 조정', signed(result.rangeAdjustment)]);
  rows.forEach(([label, value], i) => {
    const y = 1270 + i * 92;
    box(80, y, 920, 76, '#164e3f', 16);
    text(label, 112, y + 50, 32);
    ctx.textAlign = 'right'; text(value, 960, y + 50, 36, '#d6f36a', 700); ctx.textAlign = 'left';
  });
  const y = 1798;
  text('측정 근거 신뢰도 · ' + result.confidence, 96, y, 34, '#ffffff', 700);
  if (result.tournament) {
    const t = result.tournament;
    const finish = t.finish === -1 ? '본선 진출' : t.finish === 0 ? '예선 탈락' : t.finish === 1 ? '우승' : t.finish === 2 ? '준우승' : `${t.finish}강`;
    text(CONFIG.tournaments[t.type].label, 96, y + 66, 32);
    text(`${t.teams}팀${t.teamsAtLeast ? ' 이상' : ''} · ${finish}`, 96, y + 120, 30, '#adc8b8');
  } else {
    text('선수경력·구력 및 자기평가 설문 기반', 96, y + 66, 30, '#adc8b8');
    text('경기 기록이 쌓이면 더 정확해집니다.', 96, y + 120, 30, '#adc8b8');
  }
  text('KNOW YOUR GAME. KEEP PLAYING.', 96, 2270, 25, '#d6f36a', 700);
  text(`KTRP ${result.algorithmVersion} · 7.5+ 척도`, 96, 2316, 23, '#adc8b8');
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw Error('이미지를 만들지 못했습니다. 다시 시도해주세요.');
  return blob;
}

export function bindImageExport(result, root = document) {
  const save = root.querySelector('#saveImage');
  const status = root.querySelector('#imageStatus');
  const preview = root.querySelector('#imagePreview');
  const actions = root.querySelector('#imageActions');
  const download = root.querySelector('#downloadImage');
  const share = root.querySelector('#shareImage');
  let file;
  let url;
  save.addEventListener('click', async () => {
    save.disabled = true;
    status.textContent = '저장용 카드를 만들고 있어요…';
    try {
      const blob = await createResultImage(result);
      file = new File([blob], `KTRP-${result.rating.toFixed(2)}.png`, { type: 'image/png' });
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(blob);
      preview.src = url;
      preview.hidden = false;
      actions.hidden = false;
      download.href = url;
      download.download = file.name;
      share.hidden = !navigator.canShare?.({ files: [file] });
      status.textContent = '1080 × 2400 PNG · 아이폰에서는 공유 → 이미지 저장을 선택하세요. 미리보기를 길게 눌러 저장할 수도 있어요.';
      save.textContent = '이미지 다시 만들기';
    } catch (error) { status.textContent = error.message; }
    finally { save.disabled = false; }
  });
  share.addEventListener('click', async () => {
    try { await navigator.share({ files: [file], title: '나의 KTRP' }); }
    catch (error) { if (error.name !== 'AbortError') status.textContent = '공유하지 못했어요. 이미지 다운로드 또는 미리보기 저장을 이용해주세요.'; }
  });
  return () => { if (url) URL.revokeObjectURL(url); };
}
