# TODO: remote testing + screenshot harness

Set this up so (a) Claude can see the UI it builds, and (b) you can test builds remotely
(e.g. from a phone / a remote-control session) without a local simulator. Not built yet — this
is the shopping list. The app already targets `react-native-web` and `app.json` has
`web.output: "static"`, so the web path is the cheapest enabler for both.

## Why it's needed

Claude can run the code, typecheck, and unit-test the pure logic, but **cannot see rendered UI**:
there's no channel to display an image back into the chat, and no browser/simulator harness wired up
to capture one. So the gesture-heavy player shell (step 7a: MiniPlayer / now-playing / queue) was
shipped typecheck- and test-clean but **visually unverified**. A web preview closes that gap.

---

## Option A — Give Claude eyes (browser-automation MCP over Expo web)

Lets Claude drive the running web app, screenshot it, and read the PNG back to inspect/fix layout.

- [ ] Add the **Playwright MCP server** (`npx @playwright/mcp@latest`) via `claude mcp add` /
      `.mcp.json` (needs an interactive `claude mcp` session to authorize).
- [ ] Run the app on web locally: `pnpm web` (or `npx expo start --web`).
- [ ] Confirm Claude can `browser_navigate` to the localhost URL, `browser_screenshot`, and Read the
      result. Then Claude can navigate to a playing state → expand MiniPlayer → open Queue and verify.
- Note: the overlays only render once something is playing. The Home tab still has the step-4
  smoke-test "Play first track" button, which is enough to bring up the MiniPlayer.

## Option B — Staging deploy you can hit from anywhere (GitHub Pages)

Static export of the web build, published on every push — open it on a phone, share a link, etc.

- [x] Set `expo.experiments.baseUrl` in `app.json` to the repo subpath — set to **`/ditty`** (the
      remote is `abelhii/ditty`, so project Pages serve under `https://abelhii.github.io/ditty/`, and
      expo-router needs the base path baked in or asset/route URLs 404). A custom domain or an
      `abelhii.github.io` repo would let this be dropped.
- [x] Build: `pnpm exec expo export --platform web` → outputs to `dist/` (gitignored). Verified
      building locally: 11 static routes exported.
- [x] Add a GitHub Actions workflow (`.github/workflows/deploy-web.yml`, `actions/deploy-pages`) that
      runs the export and publishes `dist/` to Pages on push to `main` (+ manual `workflow_dispatch`).
      `touch dist/.nojekyll` in the workflow stops Pages eating `_expo/`.
- [ ] **YOU: enable Pages** — repo Settings → Pages → Source: **GitHub Actions**. (One-time, can't be
      done from code.)
- [ ] **YOU: trigger it** — the workflow only deploys on push to `main`, so merge `step7a-player-shell`
      to `main`, or run it manually from the Actions tab (`workflow_dispatch`).
- **Alternatives** if Pages' subpath friction bites: EAS Hosting (`eas deploy`, first-party,
  handles SPA routing), Netlify, Vercel, or Cloudflare Pages — all take the same `dist/` export.

## Option C — Native simulator screenshots (macOS, optional)

Closer to the real target, but heavier. Only worth it if web behaviour diverges from native.

- [ ] `xcrun simctl io booted screenshot out.png` grabs the iOS simulator screen (Claude can Read it).
- [ ] For driving to a specific state, add **Maestro** (`maestro test flow.yaml`) — YAML UI flows that
      tap through to the screen you want before the screenshot.

---

## Caveats to verify once a web preview exists

- **Audio on web is unverified** (PLAN.md, Tech Stack): `react-native-audio-api`'s web support isn't
  confirmed. Playback may not work on the web build even though the **UI/layout is fully testable**.
  Treat web as a layout/interaction preview, not a playback check.
- **Talking to Navidrome from the deployed page**: an `https://…github.io` page hitting an `http://`
  Navidrome server is **mixed-content-blocked**; and cross-origin requests need CORS headers on the
  server. For staging you'll likely need an https Navidrome instance with permissive CORS.
- **Secrets on web are plaintext `localStorage`** (already an accepted trade-off, PLAN.md Secrets) —
  fine for a personal staging server, don't point staging at anything sensitive.
- **Gestures**: the step-7a swipe/drag/scrubber interactions are the first thing to eyeball once a
  preview is up — they're hand-rolled on `Animated` + `PanResponder` and were never run.
