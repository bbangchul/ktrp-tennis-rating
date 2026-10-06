import { SITE_URL } from "./share-link.js";
import { CONFIG } from "../data/config.js";
import { SKILL_QUESTIONS, getQuestionPosition } from "../data/questions.js";
import { stages, skills } from "./labels.js";
function signed(n) {
  return `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(2)}`;
}
export function resultHtml(r) {
  return `<h2>나의 첫 KTRP</h2>
    <p class="intro">7.5+ 선수급 척도 · 현재 경험과 경기력으로 산출한 잠정 레이팅입니다. 이전 5.0 척도와 직접 비교하지 마세요.</p>
    <div class="score-card">
    <span class="badge">P · PROVISIONAL</span>
    <div class="score">
    ${r.rating.toFixed(2)}<span>P</span>
    </div>
    <div>공개 등급 <strong>
    ${r.publicGrade.toFixed(1)}${r.publicGrade >= 7.5 ? " · 선수급 (7.5+)" : ""}
    </strong> · 내부 레이팅은 소수점으로 유지</div>
    </div>
    <section class="image-export" aria-label="결과 이미지 저장">
      <div class="export-heading"><strong>나의 레이팅을 한 장으로</strong><span>세로 9:20</span></div>
      <p>아이폰 화면에 맞춘 테니스 카드로 저장하세요.</p>
      <button id="saveImage" type="button">결과 이미지 만들기</button>
      <p id="imageStatus" role="status" aria-live="polite"></p>
      <img id="imagePreview" alt="저장용 KTRP 결과 카드 미리보기" width="1080" height="2400" hidden>
      <div id="imageActions" class="image-actions" hidden>
        <button id="shareImage" type="button" hidden>공유 · 이미지 저장</button>
        <a id="downloadImage" class="download-button">PNG 다운로드</a>
      </div>
    </section>
    <section class="link-share" aria-label="사이트 링크 공유">
      <button id="shareLink" type="button" class="secondary">사이트 링크 공유하기</button>
      <p>친구도 자신의 KTRP를 측정할 수 있어요.</p>
      <p id="linkShareStatus" role="status" aria-live="polite"></p>
      <a id="shareLinkFallback" href="${SITE_URL}" hidden>${SITE_URL}</a>
    </section>
    <div class="metrics">
    <div class="metric">
    ${r.source} Base<b>
    ${r.base.toFixed(2)}
    </b>
    </div>
    <div class="metric">수행능력 보정<b>
    ${signed(r.skill)}
    </b>
    </div>
    <div class="metric">운동배경 보정<b>
    ${signed(r.background)}
    </b>
    </div>
    </div>
    <div class="note">
    <b>측정 근거 신뢰도 · ${r.confidence}
    </b>
    <br>자가 입력의 근거 강도를 뜻하며 통계적 확률이 아닙니다. 대회 기록도 아직 미인증입니다.${r.tournament ? `<br>
    ${CONFIG.tournaments[r.tournament.type].label} · ${r.tournament.teams}팀${r.tournament.teamsAtLeast ? " 이상 (계산 기준 96팀)" : ""} · ${r.tournament.finish === -1 ? "본선 진출 / 본선 첫 경기 탈락" : r.tournament.finish === 0 ? "예선 탈락" : r.tournament.finish === 1 ? "우승" : r.tournament.finish === 2 ? "준우승" : r.tournament.finish + "강"}${r.tournament.topPercent === null ? " · 본선 진출 비율 미확인" : ` · 상위 ${r.tournament.topPercent}%${r.tournament.teamsAtLeast ? " 이하 (96팀 기준 근사치)" : " (진출 인원 기준)"}`}` : ""}
    </div>
    <div class="survey-warning" role="note">
    <strong>남녀·대회 부서 간 점수 비교 안내</strong>
    <p>현재 KTRP는 대회 부서별 기준과 설문으로 산출한 잠정 등급입니다. 같은 점수라도 남녀·대회 부서 간 실제 경기력이 동일하다는 뜻은 아닙니다. 신인부·개나리부·국화부는 각각의 대회 기준을 사용합니다. 부서 간 환산은 아직 검증되지 않았습니다.</p>
    </div>
    <details>
    <summary>이 점수가 나온 이유</summary>
    <div class="detail-row">
    <div>
    ${r.source} Base<small>
    ${r.source === "대회 실적" ? "대회 앵커 + 성적 진출 단계 + 참가 규모의 로그 보정" : r.source === "테니스 선수경력" ? `${stages[r.input.stage]} 선수경력 별도 Base 적용` : "실제 테니스 구력 기준표 적용"}
    </small>
    </div>
    <b>
    ${r.base.toFixed(2)}
    </b>
    </div>
    ${r.formerPlayer ? `<div class="note">선수 단계 기준점 ${r.formerPlayer.nominalBase.toFixed(2)} + 경력기간 ${signed(r.formerPlayer.careerAdjustment)} + 은퇴 후 운동 지속 ${signed(r.formerPlayer.activityAdjustment)} = 선수경력 Base ${r.formerPlayer.adjustedBase.toFixed(2)}${r.tournamentBase !== null ? `<br>대회 Base ${r.tournamentBase.toFixed(2)}와 비교하여 높은 쪽 적용. ${r.recordUsed ? "대회 실적 사용" : "선수경력 사용 · 대회 패배 스코어 감점 제외"}` : ""}<br>검증 전 잠정 기준이며 경기 결과로 재평가가 필요합니다.</div>` : ""}${skills.map((s, i) => `<div class="detail-row">
    <div>
    ${s}<small>영역별 문항 가중 합계 · 영역 비중 ${Math.round(CONFIG.weights[i] * 100)}%</small>
    </div>
    <b>
    ${signed(r.skillParts[i])}
    </b>
    </div>`).join("")}<details>
    <summary>수행능력 22문항 응답 내역</summary>
    ${SKILL_QUESTIONS.map((q, i) => `<div class="detail-row">
    <div>
    ${i + 1}. ${q.title}<small>
    ${q.options[r.input.skills[i]]} · 영역 내 비중 ${Math.round(CONFIG.questionWeights[q.group][getQuestionPosition(i)] * 100)}%</small>
    </div>
    <b>
    ${signed(r.skillQuestionParts[i])}
    </b>
    </div>`).join("")}
    </details>
    ${r.tournament?.lossScore ? `<div class="detail-row">
    <div>최종 패배 스코어 보정<small>내 ${r.tournament.lossScore.ownGames} – 상대 ${r.tournament.lossScore.opponentGames} · ${r.recordUsed ? `게임 수 비율에 따라 최대 −${CONFIG.lossScore.maxDeduction.toFixed(2)}` : "선수경력 Base 사용으로 스코어 감점 제외"}
    </small>
    </div>
    <b>
    ${signed(r.scoreAdjustment)}
    </b>
    </div>` : ""}${r.backgroundParts.map((p) => `<div class="detail-row">
    <div>
    ${p.label}<small>
    ${p.reason}
    </small>
    </div>
    <b>
    ${signed(p.value)}
    </b>
    </div>`).join("")}${r.backgroundClamp ? `<div class="detail-row">운동배경 범위 제한<b>
    ${signed(r.backgroundClamp)}
    </b>
    </div>` : ""}${r.rangeAdjustment ? `<div class="detail-row">
    <div>최종 범위 조정<small>설문 범위 1.0~9.0 · 선수급 7.5+ 적용</small>
    </div>
    <b>
    ${signed(r.rangeAdjustment)}
    </b>
    </div>` : ""}<p class="review">Base ${r.base.toFixed(2)} + 수행 ${signed(r.skill)} + 운동 ${signed(r.background)} + 스코어 ${signed(r.scoreAdjustment)}${r.rangeAdjustment ? " + 범위 조정 " + signed(r.rangeAdjustment) : ""} = <b>
    ${r.rating.toFixed(2)}P</b>
    <br>
    <small>각 항목 표시값은 반올림되어 합계와 0.01 차이가 날 수 있습니다.</small>
    </p>
    </details>
    <details>
    <summary>KTRP 기준과 다음 측정</summary>
    <table>
    <tr>
    <th>등급</th>
    <th>한국 동호인 기준</th>
    </tr>
    ${[
    ["1.0~1.5", "입문·기초"],
    ["2.0", "테린이 대회 입문"],
    ["2.5", "테린이 8강권"],
    ["3.0", "테린이 상위·지역 개나리부 16강권·지역 신인부 입문"],
    ["3.5", "지역 신인부·전국 개나리부 16강권"],
    ["4.0", "지역 신인부 입상·전국 개나리부 상위권·전국 신인부 입문"],
    ["4.5", "전국 신인부 16강권·전국 개나리부 우승 기준"],
    ["5.0", "전국 신인부 상위권·국화부 경쟁권"],
    ["5.5", "전국 신인부 최상위·오픈부 입문·국화부 상위권"],
    ["6.0", "오픈부 경쟁권·국화부 우승 기준"],
    ["6.5", "오픈부 상위권"],
    ["7.0", "오픈부 최상위"],
    ["7.5+", "선수급"],
  ]
    .map(([a, b]) => `<tr>
    <td>
    ${a}
    </td>
    <td>
    ${b}
    </td>
    </tr>`)
    .join(
      "",
    )}
    </table>
    <p class="intro">현재는 설문 결과만 산출합니다. 향후 상대 KTRP와 스코어가 포함된 인증 경기로 업데이트할 수 있도록 데이터 구조를 준비했습니다. 아직 인증 경기 등록과 갱신 기능은 제공하지 않습니다.</p>
    </details>`;
}
