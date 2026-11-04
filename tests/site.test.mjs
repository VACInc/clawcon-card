// Baseline invariants for the static card page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, html, read, tags } from './helpers.mjs';

test('document basics are present', () => {
  const h = html();
  assert.match(h, /^<!doctype html>/i);
  assert.match(h, /<html lang="[a-z-]+">/);
  assert.match(h, /<meta charset="utf-8">/i);
  assert.match(h, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.match(h, /<title>[^<]+<\/title>/);
  assert.match(h, /<meta name="description" content="[^"]+">/);
});

test('every link is https and new-tab links cannot reach window.opener', () => {
  const links = tags('a');
  assert.ok(links.length >= 1, 'expected at least one link');
  for (const a of links) {
    assert.match(a.href, /^https:\/\//, `non-https link: ${a.href}`);
    if (a.target === '_blank') {
      const rel = (a.rel ?? '').split(/\s+/);
      assert.ok(rel.includes('noopener') || rel.includes('noreferrer'),
        `target=_blank without noopener: ${a.href}`);
    }
  }
});

test('no inline script or event-handler attributes', () => {
  const h = html();
  assert.doesNotMatch(h, /<script\b/i);
  assert.doesNotMatch(h, /\son[a-z]+\s*=/i);
});

test('images exist locally and have alt text', () => {
  for (const img of tags('img')) {
    assert.ok(img.alt && img.alt.trim(), `img without alt: ${img.src}`);
    assert.ok(!/^[a-z]+:/i.test(img.src), `remote image: ${img.src}`);
    assert.ok(existsSync(join(ROOT, img.src)), `missing image: ${img.src}`);
  }
});

test('qr.png is a real PNG', () => {
  const buf = readFileSync(join(ROOT, 'qr.png'));
  assert.deepEqual([...buf.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
});

test('CNAME holds exactly one bare hostname', () => {
  const lines = read('CNAME').split('\n').filter(Boolean);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/);
});

test('ids are unique', () => {
  const ids = [...html().matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length);
});
