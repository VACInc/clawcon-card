// Older Safari (iOS < 18 for backdrop-filter, < 15.4 for mask-image)
// only understands the -webkit- forms; browsers without svh need a vh
// fallback. Conference crowds skew towards whatever phone they own.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { css } from './helpers.mjs';

for (const prop of ['backdrop-filter', 'mask-image']) {
  test(`${prop} has a -webkit- twin with the same value`, () => {
    const s = css();
    for (const m of s.matchAll(new RegExp(`(?<![-\\w])${prop}:\\s*([^;]+);`, 'g'))) {
      assert.ok(s.includes(`-webkit-${prop}: ${m[1]};`), `missing -webkit-${prop}: ${m[1]}`);
    }
  });
}

test('svh units have a vh fallback right before them', () => {
  const s = css();
  for (const m of s.matchAll(/([\w-]+):\s*(\d+)svh;/g)) {
    assert.ok(s.includes(`${m[1]}: ${m[2]}vh;\n      ${m[1]}: ${m[2]}svh;`), `no vh fallback for ${m[0]}`);
  }
});
