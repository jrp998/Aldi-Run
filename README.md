# ALDI Run — GitHub upload package

Upload **all files in this folder** to the same folder in your GitHub Pages repository.

Replace your existing:
- `index.html`
- `sw.js`

Add:
- `manifest.webmanifest`
- `icon-192.png`
- `icon-512.png`
- `icon-maskable-512.png`
- `apple-touch-icon.png`
- `favicon-32.png`

`aldi-run-icon-master.png` is optional and is only the full-size source artwork.

After GitHub Pages updates:
1. Open the site in your phone browser.
2. Remove the old home-screen shortcut/app if it still shows the old icon.
3. Fully close the browser.
4. Reopen the site and choose **Add to Home Screen** / **Install app** again.

The service-worker cache has been bumped to `aldirun-v2.0.1`.
