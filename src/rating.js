import { SKILL_QUESTIONS, getQuestionPosition } from "./data/questions.js";
import { CONFIG, DEFAULT } from "./data/config.js";
export { CONFIG, DEFAULT } from "./data/config.js";
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export function validate(x) {
  if (
    !["yes", "no"].includes(x.experience) ||
    !Number.isInteger(x.tenure) ||
    x.tenure < 0 ||
    x.tenure > 5
  )
    throw Error("대회 경험과 구력을 확인해주세요.");
  if (
    !Array.isArray(x.skills) ||
    x.skills.length !== SKILL_QUESTIONS.length ||
    x.skills.some((v) => !Number.isInteger(v) || v < 0 || v > 4)
  )
    throw Error("수행능력 22개 항목을 모두 선택해주세요.");
  if (
    !["none", "tennis", "other"].includes(x.athlete) ||
    !CONFIG.stage.includes(x.stage) ||
    !Object.hasOwn(CONFIG.similarity, x.sport)
  )
    throw Error("선수경력을 확인해주세요.");
  if (x.athlete === "tennis" && !Object.hasOwn(CONFIG.formerActivity, x.retirementActivity))
    throw Error(" 은퇴 후 운동 지속 여부를 확인해주세요.");
  for (const k of ["career", "retired", "gap"])
    if (!Number.isFinite(x[k]) || x[k] < 0 || x[k] > 80)
      throw Error("경력과 공백기간은 0~80년으로 입력해주세요.");
  for (const k of ["general", "fitness", "tennis", "games"])
    if (!Number.isInteger(x[k]) || x[k] < 0 || x[k] > 3)
      throw Error("운동량 항목을 확인해주세요.");
  if (
    x.experience === "yes" &&
    (!CONFIG.tournaments[x.type] ||
      !Number.isInteger(x.teams) ||
      !CONFIG.teamSizes.includes(x.teams) ||
      ![-1, 1, 2, 4, 8, 16, 32, 64, 0].includes(x.finish) ||
      x.finish > x.teams)
  )
    throw Error(
      "참가팀 수와 성적을 확인해주세요. 해당 강보다 참가팀 수가 적을 수 없습니다.",
    );
  if (
    usesLossScore(x) &&
    !["unknown", "completed", "incomplete"].includes(x.lossScoreStatus)
  )
    throw Error("패배 스코어의 기록 상태를 확인해주세요.");
  if (
    usesLossScore(x) &&
    x.lossScoreStatus === "completed" &&
    (!Number.isInteger(x.lossOwnGames) ||
      !Number.isInteger(x.lossOpponentGames) ||
      x.lossOwnGames < 0 ||
      x.lossOpponentGames < 1 ||
      x.lossOpponentGames > 30 ||
      x.lossOwnGames >= x.lossOpponentGames)
  )
    throw Error(
      "패배 스코어는 내 게임 수보다 상대 게임 수가 커야 합니다. 0~30 사이 정수로 입력해주세요.",
    );
}
export function tournamentBase(x) {
  const c = CONFIG.tournaments[x.type];
  const finish = x.finish > 0 ? x.finish : x.teams;
  if (x.finish === 1 && c.winnerBase !== undefined) return c.winnerBase;
  const value =
    c.anchor +
    c.progress * Math.log2(c.finish / finish) +
    c.scale * Math.log2(x.teams / c.teams);
  return clamp(value, c.minBase ?? -Infinity, c.maxBase ?? Infinity);
}
export function usesLossScore(x) {
  return (
    x.experience === "yes" &&
    CONFIG.lossScore.types.includes(x.type) &&
    (x.finish === -1 || x.finish >= 2)
  );
}
export function lossScoreAdjustment(x) {
  if (!usesLossScore(x) || x.lossScoreStatus !== "completed") return 0;
  return (
    -CONFIG.lossScore.maxDeduction * (1 - x.lossOwnGames / x.lossOpponentGames)
  );
}
export function calculate(input) {
  const x = {
    ...DEFAULT,
    ...input,
    skills: [...(input.skills || DEFAULT.skills)],
  };
  validate(x);
  const tournament = x.experience === "yes";
  const former = x.athlete === "tennis";
  const formerNominal = former ? CONFIG.tennisBase[x.stage] : null;
  const careerAdjustment = former
    ? x.career < 1 ? CONFIG.formerCareer.short : x.career >= 6 ? CONFIG.formerCareer.long : 0
    : 0;
  // 은퇴가 아닌 실제 운동 지속 상태를 반영. 현역과 미응답은 중립.
  const activityAdjustment = former && x.retired > 0
    ? CONFIG.formerActivity[x.retirementActivity] * Math.min(1, x.retired / 5)
    : 0;
  const formerBase = former ? formerNominal + careerAdjustment + activityAdjustment : null;
  const recordBase = tournament ? tournamentBase(x) : null;
  const useRecord = tournament && (!former || recordBase >= formerBase);
  const base = useRecord ? recordBase : former ? formerBase : CONFIG.tenure[x.tenure];
  const source = useRecord ? "대회 실적" : former ? "테니스 선수경력" : "테니스 구력";
  const limit = tournament
    ? CONFIG.tournamentSkillLimit
    : former
      ? x.stage === "pro"
        ? CONFIG.proSkillLimit
        : CONFIG.formerSkillLimit
      : CONFIG.skillLimit;
  const questionParts = x.skills.map(
    (v, i) =>
      CONFIG.answerScores[v] *
      CONFIG.weights[SKILL_QUESTIONS[i].group] *
      CONFIG.questionWeights[SKILL_QUESTIONS[i].group][getQuestionPosition(i)] *
      limit,
  );
  const skillParts = CONFIG.weights.map((_, g) =>
    questionParts.reduce(
      (sum, p, i) => sum + (SKILL_QUESTIONS[i].group === g ? p : 0),
      0,
    ),
  );
  const skill = questionParts.reduce((a, b) => a + b, 0);
  const parts = [];
  const add = (label, value, reason) =>
    parts.push({ label, value: round(value), reason });
  if (x.athlete === "other") {
    const cat = ["soft", "badminton", "squash", "table"].includes(x.sport)
      ? "racket"
      : x.sport;
    const duration =
      x.career < 1 ? -0.05 : x.career < 3 ? 0 : x.career < 6 ? 0.05 : 0.1;
    const decay =
      x.retired <= 5 ? 1 : x.retired <= 10 ? 0.9 : x.retired <= 20 ? 0.8 : 0.7;
    add(
      "타 종목 선수경력",
      Math.max(
        0,
        (CONFIG.athlete[cat][CONFIG.stage.indexOf(x.stage)] *
          CONFIG.similarity[x.sport] +
          duration) *
          decay,
      ),
      "종목 유사도 × 선수 단계, 경력기간 가감 후 은퇴기간 감쇠",
    );
  }
  add(
    "일반 스포츠 경험",
    [0, 0.02, 0.04, 0.06][x.general],
    "지속적인 운동 경험의 보조 효과",
  );
  add(
    "현재 체력운동",
    [0, 0.02, 0.04, 0.06][x.fitness],
    "최근 러닝·헬스 등 주간 빈도",
  );
  add(
    "최근 테니스 빈도",
    [-0.1, 0, 0.05, 0.1][x.tennis],
    "최근 3개월 코트 활동",
  );
  add(
    "실제 게임 빈도",
    [-0.05, 0, 0.05, 0.1][x.games],
    "레슨과 구분한 실제 경기 경험",
  );
  add(
    "테니스 공백",
    x.gap >= 20 ? -0.25 : x.gap >= 10 ? -0.2 : x.gap >= 5 ? -0.1 : 0,
    "실제 테니스를 쉰 연수로 감점; 은퇴기간과 구분",
  );
  const rawBackground = parts.reduce((a, b) => a + b.value, 0),
    background = clamp(
      rawBackground,
      CONFIG.backgroundMin,
      CONFIG.backgroundMax,
    );
  const scoreAdjustment = useRecord ? lossScoreAdjustment(x) : 0;
  const raw = base + skill + background + scoreAdjustment;
  const cap = CONFIG.maxSurvey;
  const rating = clamp(raw, CONFIG.min, cap);
  const publicGrade = Math.round(rating * 2) / 2;
  const confidence = tournament
    ? [
        "national",
        "nationalGaenari",
        "open",
        "chrysanthemum",
        "coach",
        "formerPro",
      ].includes(x.type)
      ? "상대적으로 높음"
      : "중간"
    : former
      ? "중간"
      : "낮음";
  return {
    schemaVersion: 1,
    scaleId: "ktrp-7.5plus-v1",
    algorithmVersion: CONFIG.version,
    status: "provisional",
    rating: round(rating),
    publicGrade,
    base: round(base),
    source,
    formerPlayer: former ? { nominalBase: formerNominal, careerAdjustment, activityAdjustment, adjustedBase: round(formerBase), retirementActivity: x.retirementActivity } : null,
    tournamentBase: recordBase === null ? null : round(recordBase),
    recordUsed: useRecord,
    skill: round(skill),
    skillLimit: limit,
    scoreAdjustment: round(scoreAdjustment),
    skillParts: skillParts.map(round),
    skillQuestionParts: questionParts.map(round),
    background: round(background),
    backgroundParts: parts,
    backgroundClamp: round(background - rawBackground),
    rangeAdjustment: round(rating - raw),
    cap,
    tournament: tournament
      ? {
          type: x.type,
          teams: x.teams,
          teamsAtLeast: x.teams === 96,
          finish: x.finish,
          lossScore:
            usesLossScore(x) && x.lossScoreStatus === "completed"
              ? { ownGames: x.lossOwnGames, opponentGames: x.lossOpponentGames }
              : null,
          topPercent:
            x.finish === -1
              ? null
              : round(((x.finish || x.teams) / x.teams) * 100),
          verified: false,
        }
      : null,
    confidence,
    input: x,
    verifiedMatches: [],
    history: [
      {
        kind: "survey",
        algorithmVersion: CONFIG.version,
        rating: round(rating),
      },
    ],
  };
}
