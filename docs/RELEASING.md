# Releasing

## What the workflows do

| Workflow | Trigger | Output |
| --- | --- | --- |
| `ci.yml` | every push and PR | lint, typecheck, unit tests, and a prebuild smoke test |
| `release.yml` | tag `v*`, or run by hand | `.apk` + `.aab` (Android), unsigned `.ipa` (iOS), and a GitHub Release on tags |

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
you have an account, the shortest path is EAS, which handles the certificates and
provisioning profiles for you:

```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile preview
```

`eas.json` is already in the repo with `development`, `preview` and `production`
profiles. To move the iOS job in `release.yml` over to EAS, replace the `xcodebuild`
steps with `eas build --platform ios --profile production --non-interactive` and add an
`EXPO_TOKEN` secret.

## Version numbers

`app.json` holds `expo.version` (the user-visible version), `expo.android.versionCode`
and `expo.ios.buildNumber`. Google Play rejects an upload whose `versionCode` is not
higher than the last one, so bump it on every Play release. The local Gradle build does
not bump it for you; EAS with `"autoIncrement": true` does.
