// The QR code is the page's main job at an event: it must render with
// crisp, evenly sized modules so phone cameras lock on quickly.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, css, loadPlaywright, serve, tags } from './helpers.mjs';

const png = readFileSync(join(ROOT, 'qr.png'));
const natural = { w: png.readUInt32BE(16), h: png.readUInt32BE(20) }; // IHDR

test('img declares its size to avoid layout shift', () => {
  const img = tags('img').find((i) => i.src === 'qr.png');
  assert.ok(img.width && img.height, 'width/height attributes missing');
  assert.equal(img.width, img.height);
});

test('qr.png is square and nearest-neighbour scaled', () => {
  assert.equal(natural.w, natural.h);
  assert.match(css(), /image-rendering:\s*pixelated/);
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

for (const width of [320, 420, 1280]) {
  test(`whole CSS pixels per module at ${width}px wide`, { skip }, async () => {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(server.url);
    const r = await page.locator('.qr-card img').evaluate(async (img) => {
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, c.width, c.height);
      const dark = (x, y) => data[(y * c.width + x) * 4] < 128;
      // Top edge of the top-left finder pattern is 7 modules of dark.
      let y0 = -1, x0 = -1;
      outer: for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
        if (dark(x, y)) { y0 = y; x0 = x; break outer; }
      }
      let run = 0;
      while (dark(x0 + run, y0)) run++;
      const cs = getComputedStyle(img);
      return {
        modulePx: run / 7,
        quietPx: x0,
        content: img.getBoundingClientRect().width
          - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
      };
    });
    assert.ok(Number.isInteger(r.modulePx), `uneven source modules: ${r.modulePx}`);
    assert.ok(r.quietPx >= 4 * r.modulePx, 'quiet zone under 4 modules');
    const modules = natural.w / r.modulePx;
    const cssPerModule = r.content / modules;
    assert.ok(Number.isInteger(cssPerModule), `${cssPerModule} CSS px per module (blurry)`);
    assert.ok(cssPerModule >= 4, 'modules too small to scan comfortably');
    await page.close();
  });
}
