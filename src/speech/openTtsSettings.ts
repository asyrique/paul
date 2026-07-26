import { Alert, Linking, Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

/**
 * Getting an older user to Android's text-to-speech settings by verbal instruction is
 * genuinely hard — the path is Settings › General management › Text-to-speech on
 * Samsung and Settings › Accessibility › Text-to-speech output on stock Android, and
 * it moves between One UI versions. Deep-linking straight there removes the whole
 * problem, so we try the dedicated intent first and degrade gracefully.
 */
export async function openTtsSettings(): Promise<void> {
  if (Platform.OS !== 'android') {
    // iOS has no public deep link to Settings › Accessibility › Spoken Content, so the
    // best we can do is drop the user at this app's settings page and tell them where
    // to go from there.
    Alert.alert(
      'Change the voice on iPhone',
      'Open the Settings app, then go to Accessibility → Spoken Content → Voices → English → Australian, and download the voice you want.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => void Linking.openSettings() },
      ],
    );
    return;
  }

  try {
    await IntentLauncher.startActivityAsync('com.android.settings.TTS_SETTINGS');
  } catch {
    try {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.ACCESSIBILITY_SETTINGS,
      );
    } catch {
      Alert.alert(
        'Find the voice settings',
        'Open your phone\'s Settings app, then: General management → Text-to-speech (on Samsung), or Accessibility → Text-to-speech output. Choose your engine, tap "Install voice data", and download English (Australia).',
      );
    }
  }
}
