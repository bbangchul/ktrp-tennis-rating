import test from 'node:test';
import assert from 'node:assert/strict';
import { bindLinkShare, SITE_URL } from '../src/ui/share-link.js';
function setup(browser) {
  const nodes = new Map();
  let click;
  const root = { querySelector(key) { if (!nodes.has(key)) nodes.set(key, { hidden: true, disabled: false, textContent: '', addEventListener(_, fn) { click = fn; } }); return nodes.get(key); } };
  bindLinkShare(root, browser);
  return { nodes, click: () => click() };
}
test('사이트 공유 URL과 클립보드 대체', async () => {
  let data;
  const native = setup({ share: async input => { data = input; } });
  await native.click();
  assert.equal(data.url, SITE_URL);
  assert.ok(!data.url.includes('?'));
  let copied;
  const copy = setup({ clipboard: { writeText: async value => { copied = value; } } });
  await copy.click();
  assert.equal(copied, SITE_URL);
  assert.match(copy.nodes.get('#linkShareStatus').textContent, /복사했어요/);
});
test('공유 취소, 오류, 클립보드 거부 대응', async () => {
  let copies = 0;
  const browser = { share: async () => { throw Object.assign(Error(), { name: 'AbortError' }); }, clipboard: { writeText: async () => { copies++; } } };
  const cancelled = setup(browser);
  await cancelled.click();
  assert.equal(copies, 0);
  assert.equal(cancelled.nodes.get('#shareLink').disabled, false);
  browser.share = async () => { throw Error('unsupported'); };
  await setup(browser).click();
  assert.equal(copies, 1);
  const denied = setup({ clipboard: { writeText: async () => { throw Error('denied'); } } });
  await denied.click();
  assert.equal(denied.nodes.get('#shareLinkFallback').hidden, false);
  assert.equal(denied.nodes.get('#shareLink').disabled, false);
});
