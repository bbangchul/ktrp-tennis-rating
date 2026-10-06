import test from 'node:test';
import assert from 'node:assert/strict';
import { createResultImage, IMAGE_SIZE } from '../src/ui/export-image.js';
import { calculate } from '../src/rating.js';

test('저장 카드 9:20 크기와 점수·보정·대회 표시', async () => {
  const previous = globalThis.document;
  const texts = [];
  const ctx = { fillRect() {}, strokeRect() {}, beginPath() {}, roundRect() {}, fill() {}, moveTo() {}, lineTo() {}, stroke() {}, fillText(value) { texts.push(value); }, measureText() { return { width: 450 }; } };
  const canvas = { getContext() { return ctx; }, toBlob(callback, type) { callback(new Blob(['png'], { type })); } };
  globalThis.document = { fonts: { ready: Promise.resolve() }, createElement() { return canvas; } };
  try {
    for (const input of [{}, { athlete: 'tennis', stage: 'pro', skills: Array(22).fill(4) }, { experience: 'yes', type: 'national', teams: 96, finish: 16 }]) {
      const result = calculate(input);
      const blob = await createResultImage(result);
      assert.equal(blob.type, 'image/png');
      assert.equal(canvas.width, 1080);
      assert.equal(canvas.height, 2400);
      assert.equal(IMAGE_SIZE.width / IMAGE_SIZE.height, 9 / 20);
      assert.ok(texts.includes(result.rating.toFixed(2)));
    }
    assert.ok(texts.includes('전국 신인부'));
    assert.ok(texts.includes('대회 스코어 보정'));
    canvas.toBlob = cb => cb(null);
    await assert.rejects(createResultImage(calculate({})), /이미지를 만들지 못/);
  } finally { globalThis.document = previous; }
});
