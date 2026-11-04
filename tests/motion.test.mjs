// Three infinite background animations (including a rotating, blurred,
// viewport-sized gradient) run forever. Users who ask the OS for reduced
// motion must get a still page (WCAG 2.3.3), and it saves battery.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { css, loadPlaywright, serve } from './helpers.mjs';

test('stylesheet has a prefers-reduced-motion override', () => {
  assert.match(css(), /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
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

const animations = (page) => page.evaluate(() =>
  [null, '::before', '::after'].map((p) => getComputedStyle(document.body, p).animationName));

test('no animations run when reduced motion is requested', { skip }, async () => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(server.url);
  const names = await animations(page);
  assert.deepEqual(names, ['none', 'none', 'none']);
  assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
  // Hover nudge is motion too.
  await page.hover('.link');
  assert.equal(await page.locator('.link').first().evaluate((el) => getComputedStyle(el).transform), 'none');
  await ctx.close();
});

test('animations still run by default', { skip }, async () => {
  const ctx = await browser.newContext({ reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  await page.goto(server.url);
  assert.ok(await page.evaluate(() => document.getAnimations().length) >= 3);
  await ctx.close();
});
