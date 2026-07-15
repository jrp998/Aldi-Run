[README.md](https://github.com/user-attachments/files/30032081/README.md)
# Aldi Run v2 — setup

A shared household grocery PWA for Jay & Monika. Free to run end-to-end: GitHub Pages hosts it, Firebase Spark (no card) syncs it, Tesseract.js reads receipts on-device.

## Files

| File | Purpose |
|---|---|
| `index.html` | The whole app (rename `aldi-run-2.html` to `index.html`) |
| `sw.js` | Service worker — offline shell + caches the OCR library |
| `README.md` | This file |

## 1. Deploy to GitHub Pages

1. Create a repo (e.g. `aldi-run`), add `index.html` and `sw.js` to the root.
2. Settings → Pages → deploy from `main` branch, `/ (root)`.
3. Open the Pages URL on each phone → browser menu → **Add to Home Screen**.

Whenever you change `index.html`, also bump `CACHE_VERSION` in `sw.js` so phones pick up the update.

## 2. Firebase (free live sync between your phones)

All within the **Spark plan** — no credit card, no Blaze, no Cloud Functions, no Cloud Storage.

1. [console.firebase.google.com](https://console.firebase.google.com) → Add project (disable Analytics).
2. **Build → Realtime Database → Create database** (pick the Sydney/Southeast region) → start in **locked mode**.
3. **Build → Authentication → Get started → Email/Password → Enable.**
4. Authentication → Users → **Add user** twice (one email+password for Jay, one for Monika).
5. Project settings → General → Your apps → **Web app** (`</>`) → register → copy the config object.
6. In `index.html`, find `PASTE YOUR FIREBASE CONFIG` and fill in `apiKey`, `authDomain`, `databaseURL`, `projectId`, `appId`.
7. Load the app, sign in on each phone once. Then in Authentication → Users, copy each **User UID** into `JAY_UID` and `MONIKA_UID` in `index.html`, and into the rules below.
8. Realtime Database → **Rules** → paste (replace the two UIDs):

```json
{
  "rules": {
    "households": {
      "jay-monika": {
        ".read":  "auth != null && (auth.uid === 'JAY_UID_HERE' || auth.uid === 'MONIKA_UID_HERE')",
        ".write": "auth != null && (auth.uid === 'JAY_UID_HERE' || auth.uid === 'MONIKA_UID_HERE')"
      }
    }
  }
}
```

The web config in `index.html` is safe to publish (it's an identifier, not a secret) — the rules above are what lock the data to your two accounts. **Never** put a service-account JSON or admin key in the repo.

### Spark-plan headroom
Two users syncing a grocery list uses a tiny fraction of the free limits (1 GB stored / 10 GB-month download / 100 simultaneous connections). Nothing in this app can trigger a charge: no Storage, no Functions, no paid APIs, receipt images never upload.

### First sign-in migration
If a phone already has local list data, the app offers to upload it into the shared household (merged by record ID, no duplicates, with a JSON-backup option first). It never silently erases local data.

## 3. What works where

| Feature | Works |
|---|---|
| List, quantities, regulars, meals, layouts, shopping mode, shelf-life memory, receipts | **Fully local** — even with no Firebase config at all |
| Live two-phone sync, shared session, added-late alerts, shared price/alias learning, catalogue covers | Needs Firebase sign-in |
| In-app "Monika added 4 items" banners | App must be open (batched, max one per hour) |
| Background push notifications | **Not included** — real push needs a trusted server/worker; Firebase sync alone can't do it. The app is fully usable without it. |
| Receipt OCR | On-device (Tesseract.js). First scan downloads ~few MB of OCR data — do it once on wi-fi; the service worker caches it after that. Images never leave the phone. |

## 4. Offline behaviour

- The service worker keeps the app shell openable offline.
- Edits made offline save to localStorage and queue as record-level operations; when the connection returns they replay individually, skipping any record the other phone has since updated — a stale phone can never overwrite newer data or resurrect deleted items (soft-delete timestamps).
- Sync status pill in the header: **Saved / Syncing / Offline / Sync error / Local only**.

## 4b. Quantities & regulars

**Quantities** — type them naturally and they're split off automatically: `2 milk`, `milk x3`, `500g mince`, `1.5kg chicken`, `750ml olive oil`, `2 L milk`, `dozen eggs`. The item still matches the dictionary and lands in the right aisle; the quantity shows as a blue pill beside the name. Edit any item to adjust it with the −/+ stepper or the quick chips (2×, 3×, 500g, 1kg, dozen).

**Regulars** — a "⭐ Your regulars" chip row under the add bar, ranked from your real purchase history (how often × how recently, top 12). One tap adds; tap again to remove. Items already on the list show green with a ✓. The row stays hidden until you've built up a little history, so a fresh install isn't cluttered. Because it's driven by the synced purchase history, both phones see the same regulars.

## 5. Plated integration (bridge, not coupling)

Four ways in, pick whichever suits:

1. **Same-origin handoff** — Plated writes `localStorage.setItem("plated-grocery-export", JSON.stringify({version:1, items:[...], meals:[...]}))`; Aldi Run detects it on next open and shows a review screen (nothing imports without review).
2. **JS bridge** — `window.AldiRunBridge.importItems(items)`, `.importMeal(meal)`, `.exportCurrentList()`.
3. **postMessage** — send `{type:"ALDI_RUN_IMPORT", version:1, source:"Plated", items:[{name, quantity, meal}]}`; origins are validated against `BRIDGE_ORIGINS` in `index.html` (add Plated's origin there if it's hosted separately).
4. **Manual** — Settings → Import from Plated (paste JSON or plain lines, or choose a JSON file). JSON backup export/import also lives in Settings.

An import adapter maps Plated ingredients → Aldi Run items (name → aisle via the dictionary, quantity → note, meal → meal tag), so the two apps never need to share a schema.
