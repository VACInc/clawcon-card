// Screen-reader output and keyboard focus for the card.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { html, loadPlaywright, serve, tags } from './helpers.mjs';

test('decorative arrows are hidden from assistive tech', () => {
  const arrows = [...html().matchAll(/<span class="arrow"[^>]*>/g)].map((m) => m[0]);
  assert.ok(arrows.length > 0);
  for (const a of arrows) assert.match(a, /aria-hidden="true"/);
});

test('new-tab links say so to screen readers', () => {
  const blanks = tags('a').filter((a) => a.target === '_blank').length;
  const hints = html().match(/<span class="sr-only"> \(opens in new tab\)<\/span>/g) ?? [];
  assert.equal(hints.length, blanks);
});

const pw = loadPlaywright();
const skip = pw ? false : 'playwright not installed';
let server, browser, page;
before(async () => {
  if (skip) return;
  server = await serve();
  browser = await pw.chromium.launch();
  page = await browser.newPage();
  await page.goto(server.url);
});
after(async () => {
  await browser?.close();
  await server?.close();
});

test('accessibility tree reads cleanly', { skip }, async () => {
  const snap = await page.locator('body').ariaSnapshot();
  assert.match(snap, /heading "VACinc" \[level=1\]/, 'heading should read as one word');
  assert.match(snap, /text: Contact card\n/, 'decorative "VAC" watermark must not be announced');
  assert.doesNotMatch(snap, /→/, 'arrow glyphs must not be announced');
  for (const n of ['LinkedIn', 'X / Twitter', 'GitHub']) {
    assert.ok(snap.includes(`link "${n} (opens in new tab)"`), `missing link name for ${n}`);
  }
});

test('decorative watermark still renders', { skip }, async () => {
  const content = await page.locator('.hero').evaluate((el) => getComputedStyle(el, '::before').content);
  assert.match(content, /VAC/);
});

test('keyboard focus draws a visible outline', { skip }, async () => {
  await page.keyboard.press('Tab');
  const s = await page.evaluate(() => {
    const cs = getComputedStyle(document.activeElement);
    return { cls: document.activeElement.className, style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) };
  });
  assert.equal(s.cls, 'link');
  assert.notEqual(s.style, 'none');
  assert.ok(s.width >= 2, `outline too thin: ${s.width}px`);
});
