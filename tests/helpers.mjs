// Shared helpers for the zero-dependency test suite (node:test).
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

export function read(rel) {
  return readFileSync(join(ROOT, rel), 'utf8');
}

export const html = () => read('index.html');

/** Return the inline <style> contents of index.html. */
export function css() {
  const m = html().match(/<style>([\s\S]*?)<\/style>/);
  if (!m) throw new Error('no <style> block in index.html');
  return m[1];
}

/** Parse every start tag of a given name into an attribute map. */
export function tags(name, source = html()) {
  const re = new RegExp(`<${name}\\b([^>]*)>`, 'gi');
  const out = [];
  for (const m of source.matchAll(re)) {
    const attrs = {};
    for (const a of m[1].matchAll(/([\w:-]+)(?:\s*=\s*"([^"]*)")?/g)) {
      attrs[a[1].toLowerCase()] = a[2] ?? '';
    }
    out.push(attrs);
  }
  return out;
}

/**
 * Load Playwright if it is available (it is preinstalled in some dev
 * containers). Browser tests skip cleanly when it is not, so the suite
 * never needs a network install.
 */
export function loadPlaywright() {
  try {
    return createRequire(import.meta.url)('playwright');
  } catch {
    return null;
  }
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.css': 'text/css',
  '.js': 'text/javascript',
};

/** Serve the repo root over HTTP on an ephemeral localhost port. */
export async function serve() {
  const server = createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = normalize(join(ROOT, p));
    if (!file.startsWith(ROOT + sep) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  return { url: `http://127.0.0.1:${port}/`, close: () => new Promise((r) => server.close(r)) };
}
