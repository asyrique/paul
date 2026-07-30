# Releasing

## What the workflows do

| Workflow | Trigger | Output |
| --- | --- | --- |
| `ci.yml` | every push and PR | lint, typecheck, unit tests, and a prebuild smoke test |
| `release.yml` | tag `v*`, or run by hand | `.apk` + `.aab` (Android), unsigned `.ipa` (iOS), and a GitHub Release on tags |
| `eas-build.yml` | by hand only | builds on Expo's servers — the route to a *signed* iOS build. Needs `EXPO_TOKEN` |

`release.yml` and `eas-build.yml` are two independent paths to a binary. The local Gradle
one is free and needs no accounts; the EAS one can sign for iOS and manages your Android
keystore and version codes. Read *Two build paths, two version counters* before using both
for anything you publish.

To cut a release:

```bash
# bump "version" in app.json first, then:
git tag v1.0.1
git push origin v1.0.1
```

To get a test build without tagging: **Actions → Release → Run workflow**. Tick the
platforms you want; the binaries land under the run's *Artifacts*.

## Android signing

Out of the box the workflow builds with Expo's throwaway debug keystore. That APK
installs fine for sideloading, which is probably all you need — but it can never be
uploaded to Google Play, and an APK signed with a *different* key later cannot be
installed over the top of it. If this app might ever go to the Play Store, generate
the real keystore now.

Generate one (keep the `.jks` file somewhere safe and backed up — losing it means you
can never update the app on Play again):

```bash
keytool -genkeypair -v \
  -keystore sayit-release.jks \
  -alias sayit \
  -keyalg RSA -keysize 2048 -validity 10000
```

Then add four repository secrets under **Settings → Secrets and variables → Actions**:

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 sayit-release.jks` (macOS: `base64 -i sayit-release.jks`) |
| `ANDROID_KEYSTORE_PASSWORD` | the store password you chose |
| `ANDROID_KEY_ALIAS` | `sayit` |
| `ANDROID_KEY_PASSWORD` | the key password you chose |

With those set the workflow signs automatically. Without them it logs a warning and
carries on, so nothing breaks if you never add them.

## iOS

The workflow builds a genuine arm64 device app with code signing disabled and zips it
into `SayIt-<version>-unsigned.ipa`. **This will not install by tapping it.** It has to
be re-signed first, with AltStore, Sideloadly, or your own certificate.

A signed, installable iOS build needs a paid Apple Developer account (AUD $149/yr).
There is no way around that — it is Apple's rule, not a limitation of this setup. Once
you have an account, EAS is the shortest path, since it handles the certificates and
provisioning profiles for you. See *Building with EAS* below.

Without an Apple account you can still get an iOS build that runs in the Simulator, on a
Mac, using the `simulator` profile — simulator builds need no signing at all.

## Building with EAS

`eas.json` is committed and ready. The one thing that cannot be committed is the project
id: it is minted by Expo's servers when the project is first linked to an account, so it
has to be created once by someone signed in.

### One-time setup

```bash
npm install -g eas-cli
eas login
eas init          # creates the project and writes extra.eas.projectId into app.json
git add app.json && git commit -m "Link the project to EAS"
```

`eas init` is the whole answer to "how do I add the project id" — do not hand-write one.
It adds a block like this to `app.json`:

```json
"extra": { "eas": { "projectId": "<uuid Expo generates>" } }
```

If the project belongs to an Expo **organisation** rather than your personal account, also
add `"owner": "<org-slug>"` alongside `"slug"` in `app.json`. Personal accounts do not need
it.

### Building

```bash
eas build --platform android --profile preview      # sideloadable APK
eas build --platform android --profile production   # AAB for Google Play
eas build --platform ios --profile simulator        # no Apple account needed
eas build --platform ios --profile production       # needs a paid Apple account
```

Or from GitHub: **Actions → EAS Build → Run workflow**, picking a platform and profile.
That needs one repository secret:

| Secret | Where to get it |
| --- | --- |
| `EXPO_TOKEN` | [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens) → *Create token* |

The workflow checks for both the token and the project id up front and fails with a plain
message if either is missing, rather than letting eas-cli produce an authentication error
several minutes in.

### The profiles

| Profile | Output | Signing |
| --- | --- | --- |
| `development` | dev client — Android APK, iOS Simulator | EAS-managed / none |
| `preview` | installable Android APK, iOS device build | EAS-managed / Apple account |
| `simulator` | iOS Simulator build only | none needed |
| `production` | Android AAB for Play, iOS store build | EAS-managed / Apple account |

No `channel` is set on any profile. Channels are for EAS Update over-the-air updates, and
this app deliberately has no `expo-updates` dependency — an offline-first app that phones
home for JS bundles would undercut the point.

### Two build paths, two version counters — pick one for Play

This is the one thing that will bite. `eas.json` sets `appVersionSource: "remote"`, which
is Expo's recommendation from eas-cli 12 onwards: EAS keeps its own `versionCode` counter
on the server and increments it per production build, ignoring the value in `app.json`.
The local Gradle build in `release.yml` does the opposite — it reads `app.json` and never
increments anything.

Both are fine side by side while you are only sideloading. But Google Play rejects any
upload whose `versionCode` is not higher than the last one, so **choose a single path for
anything you publish** — realistically EAS, since it does the counting for you. Keep the
local Gradle workflow for the sideload APKs you hand to someone directly.

The alternative is `appVersionSource: "local"`, which reads `app.json` like the Gradle
build does. It is not recommended for CI: with `local`, `autoIncrement` edits `app.json`
during the build, and you have to commit that change every time for it to persist.

### Signing keys are not interchangeable

EAS generates and stores its own Android keystore the first time you build. That is a
*different* key from the one `release.yml` uses. An APK signed with one key cannot be
installed over an APK signed with the other — Android refuses the upgrade — and Play
permanently associates your app with whichever key it first saw.

If you already generated a keystore for `release.yml`, upload the same one to EAS with
`eas credentials` rather than letting it mint a second. If you have not, let EAS create it
and treat EAS as the source of truth.

### Optional hardening

Add `"requireCommit": true` under `cli` in `eas.json` to make EAS refuse to build from a
dirty working tree. Worth it once you are handing builds to someone, so you always know
which commit is on their phone. Left off by default because it gets in the way while
iterating.

## Version numbers

`app.json` holds `expo.version`, the user-visible version — bump that by hand for any
release worth naming.

It also holds `expo.android.versionCode` and `expo.ios.buildNumber`, which are the build
counters Google Play and App Store Connect check. Which of them matters depends on how you
built:

- **Local Gradle** (`release.yml`) reads both from `app.json` and never increments them.
  Bump `versionCode` yourself before any Play upload.
- **EAS** ignores both, because `eas.json` sets `appVersionSource: "remote"` and keeps its
  own counter server-side, incrementing on each `production` build.

They are kept in `app.json` because the Gradle path still needs them, not because EAS
reads them. See *Two build paths, two version counters* above for why mixing the two is a
problem for anything you publish.
