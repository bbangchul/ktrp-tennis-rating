import test from "node:test";
import assert from "node:assert/strict";
test("22문항 5페이지 진행, 이전 응답 유지, 결과와 재측정", async () => {
  const nodes = new Map();
  const handlers = {};
  const node = (s) => {
    if (!nodes.has(s))
      nodes.set(s, {
        innerHTML: "",
        textContent: "",
        values: [],
        addEventListener: (name, fn) => (handlers[s + name] = fn),
        scrollIntoView() {},
        setAttribute() {},
        focus() {},
      });
    return nodes.get(s);
  };
  const previousDocument = globalThis.document,
    previousFormData = globalThis.FormData;
  globalThis.document = { querySelector: node };
  globalThis.FormData = class {
    constructor(form) {
      this.items = form.values;
    }
    [Symbol.iterator]() {
      return this.items[Symbol.iterator]();
    }
  };
  try {
    await import("../src/app.js");
    const submit = () => handlers["#formsubmit"]({ preventDefault() {} });
    const back = () => handlers["#backclick"]();
    const content = () => node("#content").innerHTML;
    submit();
    assert.match(content(), /스트로크 영역/);
    assert.equal((content().match(/class="skill"/g) || []).length, 6);
    node("#form").values = [["skill0", "4"]];
    submit();
    node("#form").values = [];
    assert.match(content(), /플랫 서브/);
    back();
    assert.match(content(), /value="4" selected/);
    submit();
    for (const label of ["리턴", "네트플레이", "경기운영"]) {
      submit();
      assert.ok(content().includes(label));
      assert.equal((content().match(/class="skill"/g) || []).length, 4);
    }
    submit();
    assert.match(content(), /어떤 운동 배경/);
    submit();
    assert.match(content(), /최근의 코트 생활/);
    submit();
    assert.match(content(), /수행능력 22문항 응답 내역/);
    assert.match(content(), /2.18/);
    back();
    assert.match(content(), /최근의 코트 생활/);
    submit();
    submit();
    assert.match(content(), /대회에 참가한 적/);
  } finally {
    globalThis.document = previousDocument;
    globalThis.FormData = previousFormData;
  }
});

test("대회 선택 화면의 새 종류와 고정 참가 규모", async () => {
  const nodes = new Map(),
    handlers = {};
  const node = (key) => {
    if (!nodes.has(key))
      nodes.set(key, {
        innerHTML: "",
        values: [],
        addEventListener: (event, fn) => (handlers[key + event] = fn),
        scrollIntoView() {},
        setAttribute() {},
        focus() {},
      });
    return nodes.get(key);
  };
  const oldDoc = globalThis.document,
    oldForm = globalThis.FormData;
  globalThis.document = { querySelector: node };
  globalThis.FormData = class {
    constructor(form) {
      this.items = form.values;
    }
    [Symbol.iterator]() {
      return this.items[Symbol.iterator]();
    }
  };
  try {
    await import("../src/app.js?tournamentBuckets");
    node("#form").values = [["experience", "yes"]];
    handlers["#formchange"]({ target: { name: "experience" } });
    const html = node("#content").innerHTML;
    assert.match(html, /지도자부/);
    assert.doesNotMatch(html, /슈퍼 국화부/);
    assert.match(html, /지역 개나리부/);
    assert.match(html, /전국 개나리부/);
    assert.match(html, /value="chrysanthemum"/);
    assert.match(html, /실업선출 대회/);
    assert.match(html, /96팀 이상/);
    assert.match(html, /<select id="teams"/);
    assert.doesNotMatch(html, /<input id="teams"/);
    node("#form").values = [["lossScoreStatus", "completed"]];
    handlers["#formchange"]({ target: { name: "lossScoreStatus" } });
    const scoredHtml = node("#content").innerHTML;
    assert.match(scoredHtml, /내가 딴 게임 수/);
    assert.match(scoredHtml, /상대가 딴 게임 수/);
    assert.match(scoredHtml, /step="1"/);
  } finally {
    globalThis.document = oldDoc;
    globalThis.FormData = oldForm;
  }
});


test("선출 은퇴 후 운동 질문 표시와 결과 반영", async () => {
  const nodes = new Map(), handlers = {};
  const node = (key) => {
    if (!nodes.has(key)) nodes.set(key, { innerHTML: "", values: [], addEventListener: (e, f) => handlers[key + e] = f, scrollIntoView() {}, setAttribute() {}, focus() {} });
    return nodes.get(key);
  };
  const oldDoc = globalThis.document, oldForm = globalThis.FormData;
  globalThis.document = { querySelector: node };
  globalThis.FormData = class { constructor(form) { this.items = form.values; } [Symbol.iterator]() { return this.items[Symbol.iterator](); } };
  try {
    await import("../src/app.js?formerActivity");
    const submit = () => handlers["#formsubmit"]({ preventDefault() {} });
    submit();
    for (let i = 0; i < 5; i++) submit();
    node("#form").values = [["athlete", "tennis"]];
    handlers["#formchange"]({ target: { name: "athlete" } });
    assert.match(node("#content").innerHTML, /은퇴 후 운동을 계속했나요/);
    node("#form").values = [["retirementActivity", "none"], ["retired", "10"]];
    submit();
    node("#form").values = [];
    submit();
    assert.match(node("#content").innerHTML, /4.30/);
    assert.match(node("#content").innerHTML, /은퇴 후 운동 지속/);
  } finally { globalThis.document = oldDoc; globalThis.FormData = oldForm; }
});
