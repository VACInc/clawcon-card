// The card is taller than short viewports (landscape phones, split
// screen, large text). The page must stay scrollable so every link and
// the QR code can be reached, without sideways scrolling.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { loadPlaywright, serve } from './helpers.mjs';

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

for (const [w, h] of [[667, 375], [320, 480], [844, 390]]) {
  test(`all content reachable at ${w}x${h}`, { skip }, async () => {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(server.url);
    // Scroll with real wheel input: overflow:hidden still allows scripted
    // scrolling, but blocks the user, which is what matters here.
    await page.mouse.move(w / 2, h / 2);
    for (let i = 0; i < 20; i++) await page.mouse.wheel(0, 200);
    await page.waitForTimeout(150);
    const box = await page.locator('.qr-card').boundingBox();
    assert.ok(box.y >= 0 && box.y + box.height <= h + 1,
      `QR card not scrollable into view: top=${box.y} bottom=${box.y + box.height} viewport=${h}`);
    const { sw, cw } = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
    }));
    assert.ok(sw <= cw, `horizontal overflow: scrollWidth ${sw} > clientWidth ${cw}`);
    await page.close();
  });
}

test('tall content is not vertically centred off the top of the page', { skip }, async () => {
  const page = await browser.newPage({ viewport: { width: 667, height: 375 } });
  await page.goto(server.url);
  const top = await page.locator('.wrap').evaluate((el) => el.getBoundingClientRect().top + scrollY);
  assert.ok(top >= 0, `card starts above the document top (${top}px)`);
  await page.close();
});
