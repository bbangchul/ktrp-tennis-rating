import { bindLinkShare } from "./ui/share-link.js";
import { bindImageExport } from "./ui/export-image.js";
import { resultHtml } from "./ui/results.js";
import { titles, stages } from "./ui/labels.js";
import { SKILL_GROUPS, SKILL_QUESTIONS } from "./data/questions.js";
import {
  CONFIG,
  DEFAULT,
  calculate,
  validate,
  usesLossScore,
} from "./rating.js";
let disposeImageExport;
let state = { ...DEFAULT, skills: [...DEFAULT.skills] },
  step = 0,
  skillPage = 0,
  result;
const $ = (s) => document.querySelector(s);

const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function select(key, label, options) {
  return `<div class="field"><label for="${key}">${label}</label><select id="${key}" name="${key}">${options.map(([v, t]) => `<option value="${v}" ${String(state[key]) === String(v) ? "selected" : ""}>${t}</option>`).join("")}</select></div>`;
}
function number(key, label, min, max) {
  return `<div class="field"><label for="${key}">${label}</label><input id="${key}" name="${key}" type="number" min="${min}" max="${max}" step="${["teams", "lossOwnGames", "lossOpponentGames"].includes(key) ? 1 : 0.5}" required value="${state[key]}"></div>`;
}
const frequencies = [
  [0, "없음"],
  [1, "주 1회 이하"],
  [2, "주 2~3회"],
  [3, "주 4회 이상"],
];
function capture() {
  for (const [key, v] of new FormData($("#form"))) {
    if (key.startsWith("skill")) state.skills[Number(key.slice(5))] = Number(v);
    else
      state[key] = [
        "tenure",
        "teams",
        "finish",
        "lossOwnGames",
        "lossOpponentGames",
        "career",
        "retired",
        "gap",
        "general",
        "fitness",
        "tennis",
        "games",
      ].includes(key)
        ? Number(v)
        : v;
  }
}
function render() {
  disposeImageExport?.();
  disposeImageExport = undefined;
  $("#error").textContent = "";
  $("#steps").innerHTML = titles
    .map(
      (t, i) =>
        `<li class="${i === Math.min(step, 3) ? "active" : ""}"><b>${step > i ? "✓" : i + 1}</b>${t}</li>`,
    )
    .join("");
  $("#stepLabel").textContent =
    step === 4 ? "측정 완료" : `STEP 0${step + 1} · ${titles[step]}`;
  $("#progressText").textContent =
    step === 4
      ? "100%"
      : step === 1
        ? `수행능력 ${skillPage + 1} / 5 · 전체 ${SKILL_QUESTIONS.findIndex((q) => q.group === skillPage) + 1}~${SKILL_QUESTIONS.findIndex((q) => q.group === skillPage) + SKILL_QUESTIONS.filter((q) => q.group === skillPage).length} / ${SKILL_QUESTIONS.length}문항`
        : `${step + 1} / 4`;
  $("#progress").value = Math.min(step + 1, 4);
  $("#back").disabled = step === 0;
  $("#next").textContent =
    step === 3
      ? "나의 KTRP 확인"
      : step === 4
        ? "다시 측정"
        : step === 1 && skillPage < 4
          ? "다음 영역"
          : "다음 단계";
  let html = "";
  if (step === 0) {
    html = `<h2>대회에 참가한 적이 있나요?</h2><p class="intro">최근 2년 내 현재 실력을 가장 잘 보여주는 기록을 선택해주세요.</p><div class="choices">${[
      ["yes", "대회 경험이 있어요", "대회 종류와 성적으로 시작"],
      ["no", "아직 대회 경험이 없어요", "테니스를 친 기간으로 시작"],
    ]
      .map(
        ([v, t, d]) =>
          `<label class="choice"><input type="radio" name="experience" value="${v}" ${state.experience === v ? "checked" : ""}>${t}<small>${d}</small></label>`,
      )
      .join("")}</div>`;
    if (state.experience === "yes")
      html +=
        select(
          "type",
          "대회 종류",
          Object.entries(CONFIG.tournaments).map(([v, c]) => [v, c.label]),
        ) +
        `<div class="grid">${select(
          "teams",
          "전체 참가팀 수",
          CONFIG.teamSizes.map((n) => [n, n === 96 ? "96팀 이상" : `${n}팀`]),
        )}${select("finish", "본인 최종 성적", [
          [0, "예선 탈락"],
          [-1, "본선 진출 / 본선 첫 경기 탈락 (몇 강인지 모름)"],
          [64, "64강"],
          [32, "32강"],
          [16, "16강"],
          [8, "8강"],
          [4, "4강"],
          [2, "준우승"],
          [1, "우승"],
        ])}</div><div class="note">같은 16강도 참가 규모에 따라 점수가 달라집니다. 96팀 이상은 계산상 96팀으로 고정합니다. 복식 대회는 선수 수가 아닌 팀 수를 입력하세요.</div>`;
    else
      html +=
        `<div class="survey-warning" role="status"><strong>대회 경험이 없는 경우 측정 정확도가 낮습니다.</strong><p>구력과 자기평가 설문만으로 계산하므로 결과가 실제 경기력과 다를 수 있습니다. 결과는 참고용 잠정 등급(P)으로 활용해주세요.</p></div>` +
        select("tenure", "실제로 테니스를 친 기간", [
          [0, "6개월 미만"],
          [1, "6개월~1년 미만"],
          [2, "1~2년 미만"],
          [3, "2~4년 미만"],
          [4, "4~7년 미만"],
          [5, "7년 이상"],
        ]) +
        `<div class="note">선수로 활동한 적이 있다면 다음 선수경력 단계에서 별도 Base가 적용됩니다.</div>`;
  }
  if (step === 0 && usesLossScore(state)) {
    html += select("lossScoreStatus", "최종 패배 경기의 스코어", [
      ["unknown", "스코어를 모르거나 기록 없음"],
      ["completed", "정상 종료된 경기 스코어 입력"],
      ["incomplete", "기권·중단·부전패 (보정 제외)"],
    ]);
    if (state.lossScoreStatus === "completed")
      html += `<div class="grid">${number("lossOwnGames", "내가 딴 게임 수", 0, 29)}${number("lossOpponentGames", "상대가 딴 게임 수", 1, 30)}</div><p class="note">선택한 최종 성적에서 탈락한 경기의 게임 스코어를 입력하세요. 5–6 접전은 적게, 0–6 완패는 크게 감점합니다. 단일 세트·프로세트 기준이며 타이브레이크 포인트는 게임 수로 입력하지 마세요. 여러 세트 경기는 이 보정에서 제외합니다.</p>`;
  }
  if (step === 1)
    html = `<h2>${SKILL_GROUPS[skillPage]} 영역을 살펴볼까요?</h2><p class="intro">5개 영역 중 ${skillPage + 1}번째 · 이 영역 ${SKILL_QUESTIONS.filter((q) => q.group === skillPage).length}문항<br>실제 게임에서 반복할 수 있는 수준을 골라주세요.</p><div class="skill-tabs" aria-label="수행능력 영역">${SKILL_GROUPS.map((g, i) => `<span class="${i === skillPage ? "current" : ""}">${i < skillPage ? "✓ " : ""}${g}</span>`).join("")}</div>${SKILL_QUESTIONS.map((q, i) => (q.group === skillPage ? `<div class="skill"><label class="question-title" for="skill${i}">${String(i + 1).padStart(2, "0")} · ${q.title}</label><p class="question-prompt">${q.prompt}</p><select id="skill${i}" name="skill${i}">${q.options.map((d, v) => `<option value="${v}" ${state.skills[i] === v ? "selected" : ""}>${v + 1}단계 · ${d}</option>`).join("")}</select></div>` : "")).join("")}`;
  if (step === 2) {
    html = `<h2>어떤 운동 배경이 있나요?</h2><p class="intro">선수경력은 등록 선수 또는 전문 선수 활동을 뜻합니다.</p>${select(
      "athlete",
      "선수 출신 여부",
      [
        ["none", "선수경력 없음"],
        ["tennis", "테니스 선수 출신"],
        ["other", "타 종목 선수 출신"],
      ],
    )}`;
    if (state.athlete !== "none") {
      if (state.athlete === "other")
        html +=
          select("sport", "선수 활동 종목", [
            ["soft", "정구 (소프트테니스)"],
            ["badminton", "배드민턴"],
            ["squash", "스쿼시"],
            ["table", "탁구"],
            ["ball", "기타 구기종목"],
            ["other", "기타 종목"],
          ]) +
          `<div class="field"><label for="otherSport">구체적인 종목명 (선택)</label><input id="otherSport" name="otherSport" maxlength="40" value="${escape(state.otherSport)}" placeholder="예: 축구, 수영"></div>`;
      html +=
        select("stage", "최고 선수 단계", Object.entries(stages)) +
        `<div class="grid">${number("career", "총 선수경력 (년)", 0, 80)}${number("retired", "은퇴 후 경과 (년) · 현역은 0", 0, 80)}</div>`;
    }
    if (state.athlete === "tennis")
      html += select("retirementActivity", "은퇴 후 운동을 계속했나요?", [
        ["unknown", "선택해주세요 / 기억이 불확실함 (중립)"],
        ["tennis", "테니스를 꾸준히 계속함"],
        ["fitness", "테니스는 쉬었지만 다른 운동·체력운동을 계속함"],
        ["none", "테니스와 다른 운동을 대부분 쉬었음"],
      ]) + `<div class="note">은퇴 이후 전반적인 생활을 선택하세요. 최근 3개월 운동량은 다음 단계에서 따로 받습니다. 현역(은퇴 0년)은 은퇴 후 보정을 적용하지 않습니다.</div>`;
    html += `<div class="note">테니스 선출 기준점: 초등 5.0 · 중등 5.75 · 고등 6.5 · 대학 7.0 · 실업·프로 7.5+. 선수경력 기간과 은퇴 후 운동 지속 상태로 조정합니다. 대회 기준점과 비교해 높은 쪽을 사용하며 초등 선출의 별도 상한은 없습니다.</div>`;
  }
  if (step === 3)
    html = `<h2>최근의 코트 생활은 어떤가요?</h2><p class="intro">최근 3개월을 기준으로 답해주세요. 레슨과 실제 게임을 구분합니다.</p>${select(
      "general",
      "일반 스포츠 경험",
      [
        [0, "없음"],
        [1, "가끔 즐김"],
        [2, "1~3년 꾸준히 참여"],
        [3, "3년 이상 꾸준히 참여"],
      ],
    )}<div class="grid">${select("fitnessType", "현재 체력운동 종류", [
      ["러닝", "러닝"],
      ["헬스", "헬스"],
      ["러닝·헬스", "러닝·헬스"],
      ["기타", "기타 운동"],
      ["없음", "없음"],
    ])}${select("fitness", "현재 체력운동 빈도", frequencies)}</div><div class="grid">${select("tennis", "테니스 활동 빈도", frequencies)}${select("games", "실제 게임 빈도", frequencies)}</div>${number("gap", "테니스를 연속으로 쉰 최장 기간 (년)", 0, 80)}<div class="note">운동배경과 활동량 전체 보정은 −0.30~+0.50으로 제한됩니다. 선수 은퇴 후에도 테니스를 쳤다면 은퇴기간을 공백으로 입력하지 마세요.</div>`;
  if (step === 4) html = resultHtml(result);
  $("#content").innerHTML = html;
  if (step === 4) {
    disposeImageExport = bindImageExport(result);
    bindLinkShare();
  }
  $("#back").textContent = step === 4 ? "답변 수정" : "이전";
}
$("#form").addEventListener("change", (e) => {
  capture();
  if (
    ["experience", "athlete", "type", "finish", "lossScoreStatus"].includes(
      e.target.name,
    )
  )
    render();
});
$("#form").addEventListener("submit", (e) => {
  e.preventDefault();
  capture();
  try {
    validate(state);
    if (state.games > state.tennis && step === 3)
      throw Error("실제 게임 빈도는 전체 테니스 활동 빈도를 넘을 수 없습니다.");
    if (state.fitnessType === "없음" && state.fitness !== 0 && step === 3)
      throw Error("체력운동 종류가 없음이면 빈도도 없음으로 선택해주세요.");
    if (step === 4) {
      state = { ...DEFAULT, skills: [...DEFAULT.skills] };
      step = 0;
      skillPage = 0;
    } else if (step === 1 && skillPage < 4) {
      skillPage++;
    } else if (step === 3) {
      result = calculate(state);
      step = 4;
    } else step++;
    render();
    $(".workspace").scrollIntoView({ behavior: "smooth", block: "start" });
    $("#content h2").setAttribute("tabindex", "-1");
    $("#content h2").focus({ preventScroll: true });
  } catch (err) {
    $("#error").textContent = err.message;
  }
});
$("#back").addEventListener("click", () => {
  capture();
  if (step === 1 && skillPage > 0) skillPage--;
  else if (step > 0) {
    step--;
    if (step === 1) skillPage = 4;
  }
  render();
});
render();
if (document.modelContext?.registerTool) {
  try {
    Promise.resolve(
      document.modelContext.registerTool({
        name: "read_ktrp_result",
        title: "현재 KTRP 결과 읽기",
        description: "현재 화면에서 완료된 초기 KTRP 설문 결과를 읽습니다.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute(input) {
          if (Object.keys(input).length)
            throw Error("추가 입력은 허용되지 않습니다.");
          if (step !== 4 || !result) throw Error("먼저 설문을 완료해주세요.");
          return {
            rating: result.rating,
            publicGrade: result.publicGrade,
            status: result.status,
            algorithmVersion: result.algorithmVersion,
            scaleId: result.scaleId,
          };
        },
      }),
    ).catch(() => {});
  } catch {}
}
