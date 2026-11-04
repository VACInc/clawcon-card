# ClawCon networking card

Static, single-page contact card for VAC: name, a one-line intro, links to
LinkedIn / X / GitHub, and a QR code people can scan to get back to the page.

No build step, no JavaScript, no dependencies. The whole site is
`index.html` (markup plus an inline style block), `qr.png` and `CNAME`.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The page. Edit links and copy here. |
| `qr.png` | QR code image shown on the page. Must encode the public URL below. |
| `CNAME` | Custom domain GitHub Pages serves this repo on (`connect.vacinc.us`). |
| `tests/` | `node:test` suite, no npm install required. |
| `.github/workflows/ci.yml` | Runs the tests on pushes to `main` and on pull requests. |

## Where it is served

- The QR code encodes **`https://vacinc.github.io/`** (the alt text on the
  `<img>` says the same). Whatever is deployed at that URL is what people
  who scan the code see, so after changing this repo, check that URL shows
  the change. If that site is published from a different repository, copy
  the change there too or point the QR code at this repo's own Pages URL.
- `CNAME` asks GitHub Pages to serve this repo on `connect.vacinc.us`. That
  only works when Pages is enabled for this repo (Settings → Pages) and the
  domain's public DNS points at GitHub Pages. Until both are true, do not put
  that domain on printed material.

### Custom domain safety

- Verify `vacinc.us` for the account or organisation (GitHub Settings →
  Pages → Verified domains). This stops anyone else's repository from
  claiming `connect.vacinc.us` if its DNS ever points at GitHub while this
  repo is not serving it (subdomain takeover).
- Keep public DNS records pointing only at public hosts. Records for
  internal addresses belong in internal DNS, not the public zone.
- Turn on "Enforce HTTPS" once the certificate has been issued.

## Editing

1. Change links or text in `index.html`. Keep external links `https://`,
   and keep `rel="me noopener"` plus the visually hidden
   "(opens in new tab)" text on links that use `target="_blank"`.
2. Preview locally:

   ```sh
   python3 -m http.server 8000   # then open http://localhost:8000/
   ```

3. Run the tests (Node 18 or newer):

   ```sh
   node --test tests/*.test.mjs
   ```

   Browser-level tests (scrolling, reduced motion, accessibility tree, QR
   rendering, CSP) use Playwright when it can be `require`d and are skipped
   otherwise. CI runs the static tests only, so run the full set locally
   before changing layout or styles.

## Regenerating the QR code

Only needed if the public URL changes. Use any generator that writes a plain
PNG, for example [segno](https://pypi.org/project/segno/):

```sh
python3 -m venv /tmp/qr && /tmp/qr/bin/pip install segno
/tmp/qr/bin/python -c "import segno; segno.make('https://vacinc.github.io/', error='m', boost_error=False, micro=False).save('qr.png', scale=15, border=4)"
```

Keep a quiet zone of at least 4 modules (`border=4`), update the `alt` text
on the `<img>` to the new URL, and scan the result with a phone before
printing anything. If the URL gets longer and the code grows past 25×25
modules (version 2), adjust the displayed size in `.qr-card img` so it stays
a whole number of CSS pixels per module (for example 33 modules × 5px =
165px); the QR test checks this.
