import test from "node:test";
import assert from "node:assert/strict";
import { calculate, DEFAULT, CONFIG } from "../src/rating.js";
const run = (x) => calculate({ ...DEFAULT, ...x });
for (const [name, x, base] of [
  ["실업선출", { athlete: "tennis", stage: "pro" }, 7.5],
  ["초등선출", { athlete: "tennis", stage: "elementary" }, 5],
  ["중등선출", { athlete: "tennis", stage: "middle" }, 5.75],
  [
    "전국 신인부 16강",
    { experience: "yes", type: "national", teams: 96, finish: 16 },
    4.5,
  ],
  [
    "테린이 8강",
    { experience: "yes", type: "beginner", teams: 48, finish: 8 },
    2.5,
  ],
])
  test(name, () => {
    const r = run(x);
    assert.equal(r.base, base);
    assert.equal(r.rating, base);
    assert.equal(r.scaleId, "ktrp-7.5plus-v1");
    console.log(name, r.rating + "P");
  });
test("대회 종류·규모·성적의 단조 증가와 구간", () => {
  const common = { experience: "yes", teams: 64, finish: 16 };
  const ratings = [
    "beginner",
    "local",
    "national",
    "open",
    "coach",
    "formerPro",
  ].map((type) => run({ ...common, type }).base);
  ratings.forEach((v, i) => {
    if (i) assert.ok(v > ratings[i - 1]);
  });
  for (const type of [
    "beginner",
    "local",
    "national",
    "open",
    "coach",
    "formerPro",
  ]) {
    let last = 0;
    for (const finish of [32, 16, 8, 4, 2, 1]) {
      const r = run({ ...common, type, finish });
      assert.ok(r.base > last);
      last = r.base;
    }
    assert.ok(
      run({ ...common, type, teams: 96 }).base >
        run({ ...common, type, teams: 48 }).base,
    );
  }
  assert.equal(
    run({ ...common, type: "national", teams: 96, finish: 2 }).base,
    5.25,
  );
  assert.equal(run({ ...common, type: "open", finish: 1 }).base, 6.95);
});
test("초등 무대회 상한 제거와 대회 예외", () => {
  assert.equal(
    run({
      athlete: "tennis",
      career: 8,
      skills: Array(22).fill(4),
      tennis: 3,
      games: 3,
    }).rating,
    6.5,
  );
  assert.ok(
    run({
      athlete: "tennis",
      experience: "yes",
      type: "open",
      teams: 96,
      finish: 1,
    }).rating > 5.5,
  );
});
test("±1.7 일반, ±0.5 대회, 선수별 보정과 7.5+", () => {
  for (const [answer, expected] of [
    [0, -1.7],
    [2, 0],
    [4, 1.7],
  ])
    assert.equal(run({ skills: Array(22).fill(answer) }).skill, expected);
  assert.equal(
    run({ experience: "yes", skills: Array(22).fill(4) }).skill,
    0.5,
  );
  assert.equal(
    run({ athlete: "tennis", skills: Array(22).fill(4) }).skill,
    1.2,
  );
  assert.equal(
    run({ athlete: "tennis", stage: "pro", skills: Array(22).fill(4) }).skill,
    0.8,
  );
  assert.ok(
    run({
      athlete: "tennis",
      stage: "pro",
      skills: Array(22).fill(4),
      tennis: 3,
      games: 3,
    }).rating > 7.5,
  );
  assert.ok(
    run({
      athlete: "tennis",
      stage: "middle",
      gap: 20,
      skills: Array(22).fill(1),
    }).rating < 5.75,
  );
});
test("문항별 가중치·답변단계 단조성과 집계", () => {
  const s = Array(22).fill(2);
  s.fill(4, 0, 6);
  assert.equal(run({ skills: s }).skill, 0.48);
  assert.equal(run({ skills: s }).skillQuestionParts.length, 22);
  assert.ok(
    CONFIG.questionWeights.every(
      (g) => Math.abs(g.reduce((a, b) => a + b, 0) - 1) < 1e-10,
    ),
  );
  for (let i = 0; i < 22; i++) {
    let prior = -Infinity;
    for (let answer = 0; answer < 5; answer++) {
      const s = Array(22).fill(2);
      s[i] = answer;
      const r = run({ skills: s });
      assert.ok(r.skill >= prior);
      prior = r.skill;
    }
  }
  const a = Array(22).fill(2),
    b = [...a];
  a[6] = 4;
  b[9] = 4;
  assert.ok(run({ skills: b }).skill > run({ skills: a }).skill);
});
test("하한·상한·배경 제한 및 입력 오류", () => {
  assert.equal(
    run({ tenure: 0, skills: Array(22).fill(0), tennis: 0, games: 0, gap: 20 })
      .rating,
    1,
  );
  assert.equal(
    run({
      experience: "yes",
      type: "open",
      teams: 96,
      finish: 1,
      skills: Array(22).fill(4),
      athlete: "other",
      sport: "soft",
      stage: "pro",
      career: 8,
      general: 3,
      fitness: 3,
      tennis: 3,
      games: 3,
    }).rating,
    8.03,
  );
  assert.equal(
    run({
      athlete: "other",
      sport: "soft",
      stage: "pro",
      career: 8,
      general: 3,
      fitness: 3,
      tennis: 3,
      games: 3,
    }).background,
    0.5,
  );
  for (const x of [
    { teams: 7, finish: 16, experience: "yes" },
    { skills: Array(19).fill(2) },
    { skills: Array(23).fill(2) },
    { skills: Array(22).fill(5) },
    { gap: -1 },
  ])
    assert.throws(() => run(x));
});

test("참가 규모 구간 및 선수 대회 앵커", () => {
  for (const teams of CONFIG.teamSizes) {
    const r = run({ experience: "yes", type: "formerPro", teams, finish: 8 });
    assert.equal(r.tournament.teamsAtLeast, teams === 96);
  }
  assert.equal(
    run({ experience: "yes", type: "coach", teams: 32, finish: 8 }).base,
    6.5,
  );
  assert.equal(
    run({ experience: "yes", type: "formerPro", teams: 32, finish: 8 }).base,
    7.5,
  );
  for (const teams of [15, 24, 65, 128])
    assert.throws(() => run({ experience: "yes", teams, finish: 8 }));
});

test("접전과 완패 차이, 무기록·기권·다른 종목 제외", () => {
  const common = {
    experience: "yes",
    type: "local",
    teams: 48,
    finish: 16,
    lossScoreStatus: "completed",
    lossOpponentGames: 6,
  };
  const close = run({ ...common, lossOwnGames: 5 }),
    blowout = run({ ...common, lossOwnGames: 0 });
  assert.equal(close.scoreAdjustment, -0.08);
  assert.equal(blowout.scoreAdjustment, -0.5);
  assert.equal(close.rating, 3.42);
  assert.equal(blowout.rating, 3);
  for (let own = 0; own < 5; own++)
    assert.ok(
      run({ ...common, lossOwnGames: own }).rating <
        run({ ...common, lossOwnGames: own + 1 }).rating,
    );
  for (const type of ["beginner", "local", "national"])
    assert.equal(
      run({ ...common, type, finish: -1, lossOwnGames: 0 }).scoreAdjustment,
      -0.5,
    );
  for (const x of [
    { lossScoreStatus: "unknown" },
    { lossScoreStatus: "incomplete" },
    { type: "open" },
    { type: "coach" },
    { type: "formerPro" },
    { finish: 1 },
    { finish: 0 },
    { experience: "no" },
  ])
    assert.equal(run({ ...common, lossOwnGames: 0, ...x }).scoreAdjustment, 0);
  for (const own of [-1, 6, 7, 1.5])
    assert.throws(() => run({ ...common, lossOwnGames: own }));
  assert.equal(
    run({ ...common, finish: -1, lossOwnGames: 5 }).tournament.topPercent,
    null,
  );
});

test("국화 우승 Base 6 유지", () => {
  for (const teams of CONFIG.teamSizes) {
    const winner = run({
      experience: "yes",
      type: "chrysanthemum",
      teams,
      finish: 1,
    });
    assert.equal(winner.base, 6);
    assert.equal(winner.rating, 6);
  }
  assert.equal(
    run({ experience: "yes", type: "chrysanthemum", teams: 64, finish: 2 })
      .base,
    5.7,
  );
  assert.equal(
    run({ experience: "yes", type: "open", teams: 64, finish: 1 }).base,
    6.95,
  );
});

test("개나리부 별도 Base와 스코어 보정", () => {
  const common = { experience: "yes", finish: 16 };
  assert.equal(run({ ...common, type: "localGaenari", teams: 48 }).base, 3);
  assert.equal(
    run({ ...common, type: "nationalGaenari", teams: 96 }).base,
    3.5,
  );
  assert.equal(
    run({ ...common, type: "nationalGaenari", teams: 96, finish: 1 }).base,
    4.5,
  );
  assert.equal(run({ ...common, type: "local", teams: 48 }).base, 3.5);
  assert.equal(run({ ...common, type: "national", teams: 96 }).base, 4.5);
  for (const type of ["localGaenari", "nationalGaenari"]) {
    const r = run({
      ...common,
      type,
      teams: 48,
      lossScoreStatus: "completed",
      lossOwnGames: 0,
      lossOpponentGames: 6,
    });
    assert.equal(r.scoreAdjustment, -0.5);
    assert.ok(
      run({ ...common, type, teams: 96 }).base >
        run({ ...common, type, teams: 48 }).base,
    );
  }
});


test("선출 은퇴 후 운동 지속, 현역, 미응답과 대회 Base 보호", () => {
  const common = { athlete: "tennis", retired: 10 };
  assert.equal(run({ ...common, retirementActivity: "tennis" }).base, 5.2);
  assert.equal(run({ ...common, retirementActivity: "fitness" }).base, 4.7);
  assert.equal(run({ ...common, retirementActivity: "none" }).base, 4.3);
  assert.equal(run({ ...common, retired: 0, retirementActivity: "none" }).base, 5);
  assert.equal(run({ ...common, retired: 1, retirementActivity: "none" }).base, 4.86);
  assert.throws(() => run({ ...common, retirementActivity: "invalid" }));
  const low = run({ ...common, experience: "yes", type: "beginner", finish: 8, lossScoreStatus: "completed", lossOwnGames: 0 });
  assert.equal(low.base, 5);
  assert.equal(low.recordUsed, false);
  assert.equal(low.scoreAdjustment, 0);
  assert.equal(low.tournamentBase, 2.5);
  const high = run({ ...common, experience: "yes", type: "open", teams: 64, finish: 1 });
  assert.equal(high.base, 6.95);
  assert.equal(high.recordUsed, true);
  assert.equal(run({ ...common, career: 0.5 }).base, 4.6);
});
