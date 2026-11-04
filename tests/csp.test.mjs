// Defence in depth: the page has no JavaScript, so a strict CSP costs
// nothing and turns any future injected markup into inert text.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { html, loadPlaywright, serve } from './helpers.mjs';

const policy = () => {
  const m = html().match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
  assert.ok(m, 'CSP meta tag missing');
  return Object.fromEntries(m[1].split(';').map((d) => d.trim().split(/\s+/)).map(([k, ...v]) => [k, v]));
};

test('CSP meta comes before anything it governs', () => {
  const h = html();
  const at = h.indexOf('http-equiv="Content-Security-Policy"');
  assert.ok(at > 0 && at < h.indexOf('<style>') && at < h.indexOf('<title>'));
});

test('CSP is deny-by-default with no script sources', () => {
  const p = policy();
  assert.deepEqual(p['default-src'], ["'none'"]);
  assert.equal(p['script-src'], undefined, 'no script-src: falls back to none');
  assert.deepEqual(p['base-uri'], ["'none'"]);
  assert.deepEqual(p['form-action'], ["'none'"]);
  assert.deepEqual(p['img-src'], ["'self'"]);
});

const pw = loadPlaywright();
const skip = pw ? false : 'playwright not installed';
let server, browser;
before(async () => {
  if (skip) return;
  server = await serve();
  browser = await pw.chromium.launch();
});
after(async () => {
  await browser?.close();
  await server?.close();
});

test('page renders fully under the policy', { skip }, async () => {
  const page = await browser.newPage();
  const violations = [];
  page.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) violations.push(m.text()); });
  await page.goto(server.url);
  const ok = await page.evaluate(async () => {
    const img = document.querySelector('.qr-card img');
    await img.decode();
    return { qr: img.naturalWidth > 0, styled: getComputedStyle(document.body).display === 'grid' };
  });
  assert.deepEqual(ok, { qr: true, styled: true });
  assert.deepEqual(violations, []);
  await page.close();
});

test('injected inline script does not run', { skip }, async () => {
  const page = await browser.newPage();
  await page.goto(server.url);
  const ran = await page.evaluate(() => new Promise((resolve) => {
    window.__pwned = false;
    const s = document.createElement('script');
    s.textContent = 'window.__pwned = true';
    document.body.append(s);
    setTimeout(() => resolve(window.__pwned), 50);
  }));
  assert.equal(ran, false);
  await page.close();
});
