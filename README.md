# Say It

An offline text-to-speech app. Type what you want to say, tap one big button, and the
phone says it out loud in an Australian voice.

Built for older users on Samsung/Android: large type that follows the phone's own
accessibility font size, high-contrast colours, and touch targets you cannot miss. It
follows each platform's visual conventions — Material 3 on Android, Apple HIG on iOS —
so it looks like it belongs on the phone rather than like a cross-platform app.

## What it does

- **Speak** — a large text box and one huge Speak button. Nothing else competes for
  attention. The button is pinned to the bottom of the screen so it stays reachable
  even at the largest font size with the keyboard open.
- **Phrases** — tap-to-speak tiles for the things you say often. Editable, stored on
  the phone.
- **Settings** — speaking speed, which voice to use, and a one-tap shortcut to the
  phone's voice-download screen if the Australian voice is missing.

## Offline behaviour

Speech comes from the phone's own text-to-speech engine (Samsung TTS or Google Speech
Services on Android, `AVSpeechSynthesizer` on iOS). Nothing you type leaves the device
and no network call is made to speak.

The honest caveat: *whether* speech works offline depends on the voice the phone has
installed. Google's engine ships some voices that stream from the network. The app
handles this rather than hoping for the best:

- It reads the `-local` / `-network` suffix Google puts on Android voice identifiers,
  which is the only offline signal any platform exposes, and prefers a guaranteed-local
  voice over a nicer-sounding streaming one.
- It ranks `en-AU` above `en-NZ` above `en-GB` above other English, so the closest
  available accent wins.
- If the best voice it can find is not Australian, or needs the internet, it says so in
  plain words on the Speak screen and offers a button that deep-links straight into the
  phone's text-to-speech settings — no talking someone through Samsung's menu tree over
  the phone.

The voice-selection logic is the fiddly part, so it is isolated in
`src/speech/voiceRanking.ts` and unit tested.

## Platform look

`src/ui/theme.ts` holds two palettes and two sets of type and shape tokens, selected by
platform. The differences are structural, not cosmetic:

| | iOS | Android |
| --- | --- | --- |
| Settings | inset grouped cards, quiet uppercase headers | flat rows on the surface, accent-coloured headers |
| Single choice | trailing checkmark | leading radio button |
| Buttons | continuous 12pt corners, dim on press | Material 3 pills with a ripple |
| Tab bar | hairline rule, tinted icon and label | pill indicator behind the active icon |
| Touch feedback | opacity | `android_ripple` |
| Switches | green, as iOS does | primary-coloured, as Material does |

Where the two conflict with the audience, the accessibility floor wins — see below.

## Accessibility

- All text scales with the OS font setting, up to 2.0x. Samsung's slider tops out at
  1.8x, so nothing is clipped at the maximum a user can actually set. The only
  exception is the three tab-bar labels, capped at 1.3x — capping is safe there because
  the icon and the screen-reader label still identify each tab and no content is lost.
- Layouts reflow and scroll instead of clipping, and the Speak button sits outside the
  scroll view so it never scrolls out of reach.
- Touch targets are 64dp for ordinary controls and 88dp for the primary ones, against
  Android's 48dp minimum.
- Every control carries an `accessibilityRole`, label and hint for TalkBack/VoiceOver.
- Text/background pairs clear WCAG AA. The stock platform accents do not: iOS
  `systemBlue` gives white text only ~3.4:1 and `systemRed` ~3.1:1, so both are used at
  darkened shades that keep the platform's hue and clear 4.5:1.
- Two controls stay custom rather than native, on purpose. A five-segment
  `UISegmentedControl` clips its labels well before 1.8x, and a Material slider has no
  labels and needs fine motor control — so speaking speed uses large labelled chips that
  reflow onto more rows. A native `Picker`'s ~44pt rows are below the 56dp floor, so the
  voice list uses full-size rows. Both are still styled per platform.

## Running it

```bash
npm install
npx expo start
```

Press `a` for an Android device or emulator. The app also runs in Expo Go — it uses no
custom native code.

### Why the SDK is pinned to 54

Expo Go only ever supports one SDK version, and the build currently on the App Store is
SDK 54 — Expo's SDK 57 client exists but is sitting in Apple review. Testing in Expo Go
is the only route that needs neither a laptop nor a paid Apple Developer account, so the
project is pinned to 54 to keep that route open.

Nothing in the app depends on a newer SDK. The `expo-speech` API this app uses —
`speak`, `getAvailableVoicesAsync`, `stop`, `maxSpeechInputLength`, the `Voice` shape and
the `VoiceQuality` enum — is identical between SDK 54 and 57, and the UI uses only
long-stable React Native primitives.

To move to 57 once its Expo Go client clears review: bump `expo`, run
`npx expo install --fix`, align `jest-expo`/`react-test-renderer`/`typescript`, and
**remove `android.edgeToEdgeEnabled` from `app.json`** — SDK 57 rejects it, because
Android 16 makes edge-to-edge mandatory. SDK 54 still requires it, which is the one
config difference between the two.

```bash
npm run lint       # eslint, warnings fail the build
npm run typecheck  # tsc --noEmit
npm test           # jest
npm run native     # regenerate android/ and ios/ from app.json
```

`android/` and `ios/` are generated by `expo prebuild` and are not committed — CI
regenerates them on every build. Edit `app.json`, not the native projects.

### Web preview

`npx expo export --platform web` produces a ~490KB bundle that runs the real app in a
browser, which is handy for showing someone the UI when no phone or emulator is to
hand. `expo-speech` maps onto the Web Speech API there, and both Safari and Chrome
expose the same system voices a native app sees, so the Australian voice selection is
genuinely exercised.

Three things do not carry over, so do not judge them from the web build:

- `react-native-web`'s `Alert.alert()` is an empty function, so the save and delete
  confirmations never appear. Saving still works; deleting does not, because it waits
  on a confirmation that never arrives.
- "Fix the voice" has nothing to open outside Android.
- Text scales with browser zoom rather than the OS accessibility font setting, and
  there are no haptics.

## Installing a build

See [docs/RELEASING.md](docs/RELEASING.md). Short version: push a `v*` tag and the
Release workflow attaches an installable Android APK to a GitHub Release.

## Layout

```
src/
  speech/
    types.ts           the SpeechEngine interface the app codes against
    systemEngine.ts    implementation backed by the phone's TTS engine
    voiceRanking.ts    picking the best Australian offline voice (unit tested)
    openTtsSettings.ts deep link into the phone's voice-download screen
    SpeechProvider.tsx state, persistence and the speak/stop lifecycle
  screens/             Speak, Phrases, Settings
  storage/store.ts     on-device persistence
  ui/                  theme tokens and the shared large-format components
```

`SpeechProvider` takes the engine as a prop, so swapping in a bundled neural voice
later (see below) means adding one file, not rewriting the UI.

## Loudness

Making speech louder is not something this app can do, and the reason is worth recording
so it is not re-attempted:

- `expo-speech` accepts a `volume` option, but it is **web-only**. The string `volume`
  does not appear anywhere in the module's Kotlin or Swift source, so passing it on a
  phone silently does nothing.
- Setting the device's system volume needs `AudioManager` on Android — a custom native
  module, which would mean giving up Expo Go — and on iOS there is no public API for it
  at all.
- `expo-audio` cannot help either. It only controls its own players, not the TTS engine,
  and its library manifest pulls in `RECORD_AUDIO` plus a microphone foreground service,
  which this app has no business requesting.

What *is* available is iOS-only: `expo-speech` exposes `useApplicationAudioSession`, and
setting it `false` hands playback to the system-managed session that speaks through the
silent switch, the way VoiceOver does. That is the **Speak even on silent** setting, on by
default because an older user who has knocked that switch reads a silent app as a broken
one. The setting is hidden on Android, where there is nothing to change.

## Known tradeoffs

These were judgement calls made without you in the room. Each is reversible.

**System TTS rather than a bundled neural voice.** The app uses whatever voice the
phone has instead of shipping its own. That keeps the APK around 30MB, works in Expo
Go, and needs no licensing. The cost is that offline speech is not guaranteed on first
launch — if the phone has no `en-AU` voice data, the user has to install it once, which
the app detects and walks them through. Bundling an `en-AU` Piper voice via sherpa-onnx
would make offline Australian speech guaranteed and consistent, at roughly +60–120MB of
download, a custom native module, no more Expo Go, and noticeably more work on iOS.
`SpeechEngine` exists so that swap stays cheap.

**Light theme only.** Predictable, maximum contrast, and no chance of a dark-mode
regression going unnoticed. Users who have set their phone to dark mode will find this
app stays light. Both platform palettes are light-only; adding dark means a second pair.

**No volume control.** See *Loudness* above — it is not possible from managed code, and
on iOS not possible at all.

**No speech history.** Saved phrases cover the repeated-use case; a history list would
add a screen and clutter for a modest gain. Easy to add later.

**iOS releases are unsigned.** Producing an installable iOS build requires a paid Apple
Developer account. The workflow produces a re-signable `.ipa` rather than pretending
otherwise.
