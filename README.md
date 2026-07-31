# Music Player

A cross-platform music player built with [Expo](https://expo.dev) (SDK 57), React Native,
and expo-router. See [`AGENTS.md`](./AGENTS.md) for project conventions and [`CONTEXT.md`](./CONTEXT.md)
for domain vocabulary.

> **This app cannot run in Expo Go.** It depends on custom native modules
> (`react-native-audio-api`, `expo-glass-effect`, `expo-sqlite`, `expo-secure-store`, …),
> so you need a **development build** or a **standalone build** — see [Installation](#installation).

## Everyday commands

Run these once the [one-time setup](#installation) is done.

| Command | What it does |
| --- | --- |
| `pnpm start` | Start the Metro dev server; press `a` / `i` / `w` to open on Android / iOS / web |
| `pnpm android` | Build & run on an Android emulator or USB device (starts its own Metro) |
| `pnpm ios` | Build & run on the iOS Simulator |
| `pnpm web` | Run in the browser |
| `pnpm lint` | eslint via expo lint |
| `pnpm test` | jest + @testing-library/react-native |

**Emulator while a server is already running:** yes. If `pnpm start` is up, just press `a`
(Android) or `i` (iOS) in that terminal — it opens the app on the emulator and reuses the
running server, so don't also run `pnpm android` (it would start a second Metro on port 8081
and clash). To boot an Android emulator by hand in a separate terminal (independent of Metro):

```bash
emulator -list-avds      # list your virtual devices
emulator -avd <name>     # boot one
```

## Installation

- **Node** 20+ and **[pnpm](https://pnpm.io)** (this repo is pnpm-only — do not use npm/yarn).
- Install dependencies:

  ```bash
  pnpm install
  ```

Then pick a build path below.

There are two ways to get the app onto a device or emulator.

| | Build A — Local emulator/device | Build B — EAS cloud (APK) |
| --- | --- | --- |
| Best for | Active development, fast iteration | Getting an installable APK onto a phone with no local Android toolchain |
| Needs | JDK 17 + Android Studio locally | An [Expo account](https://expo.dev/signup); no local SDK |
| Output | App running on emulator/device + Metro | Downloadable `.apk` |

---

### Build A — Run locally on an Android emulator (or USB device)

**One-time toolchain setup** (macOS / Apple Silicon shown):

1. Install **JDK 17** (React Native 0.86 requires it):

   ```bash
   brew install --cask temurin@17
   ```

2. Install **Android Studio** (brings the SDK, `adb`, and emulator):

   ```bash
   brew install --cask android-studio
   ```

   Launch it and complete the **Standard** setup wizard to download the SDK and a system image.

3. Add the toolchain to your shell (`~/.zshrc`), then reload:

   ```bash
   export JAVA_HOME="$(/usr/libexec/java_home -v 17)"
   export ANDROID_HOME="$HOME/Library/Android/sdk"
   export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin"
   ```

   Verify with `java -version` (should report 17) and `adb version`.

4. Create an emulator: Android Studio → **Virtual Device Manager → Create Device**
   (e.g. Pixel 7, API 34+). See the [Expo emulator guide](https://docs.expo.dev/workflow/android-studio-emulator/).

**Build & run** (with an emulator booted, or a USB device with debugging enabled):

```bash
pnpm android
```

This runs `expo run:android`, which generates the native `android/` project the first time,
compiles with Gradle, installs the app, and starts the Metro bundler. The first build takes
several minutes; subsequent runs are fast.

> The generated `android/` folder is a build artifact — it's regenerated from `app.json`
> and config plugins, so don't edit it by hand.

**iOS** (macOS + Xcode) follows the same pattern with `pnpm ios`.

---

### Build B — EAS cloud build → installable APK

Produces a standalone `.apk` in the cloud with no local Android SDK required. Build profiles
are defined in [`eas.json`](./eas.json); the **`preview`** profile emits a directly-installable
APK (internal distribution).

```bash
npm install -g eas-cli   # once
eas login
eas build --platform android --profile preview
```

When the build finishes, EAS prints a URL/QR code. On the phone, open it in a browser,
download the APK, and tap to install (allow "install from unknown sources" once).

Other profiles in `eas.json`:

- **`development`** — dev-client APK; install it, then run `pnpm start` to load JS over Metro.
- **`production`** — an AAB for Play Store submission (not directly installable).

## Troubleshooting

### Stop a running Metro bundler (port 8081)

Metro serves the JS bundle on **port 8081**. If a build reports the port is already in use,
or you just want a clean restart:

- **The clean way** — switch to the terminal running Metro and press **Ctrl+C**.
- **Force-free the port** (macOS/Linux) when it's been orphaned:

  ```bash
  lsof -ti:8081 | xargs kill -9
  ```

- **By process name**, if you can't find the port:

  ```bash
  pkill -f "expo start"    # or: pkill -f metro
  ```

Then relaunch with `pnpm start` (or `pnpm android`, which starts its own Metro).

### Red screen at launch: `[runtime not ready]: TypeError: property is not writable`

This crash happens **before any app code runs** — the stack trace bottoms out in
`setUpDefaultReactNativeEnvironment` (React Native's own startup). It almost always means an
installed package has **drifted out of sync with the Expo SDK** — typically `react-native`,
`react-native-reanimated`, or `react-native-worklets`, which hook into RN's core init. It often
surfaces only in a local dev build; a production EAS build can mask it.

Realign to the SDK's expected versions **and** regenerate the native project:

```bash
npx expo install --check     # list any mismatched packages
npx expo install --fix       # bump them to the SDK-expected versions
npx expo prebuild --clean    # regenerate android/ (& ios/) against the new versions
pnpm android                 # recompile native and reinstall on the emulator/device
```

> Bumping the JS packages alone isn't enough — the generated `android/` project stays pinned to
> the old native versions until you re-run `prebuild --clean`.

### Stale bundle or odd cached behaviour

Restart Metro with its cache cleared:

```bash
npx expo start -c
```
