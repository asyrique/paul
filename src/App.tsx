import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SpeechProvider, useSpeech } from './speech/SpeechProvider';
import { PhrasesScreen } from './screens/PhrasesScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SpeakScreen } from './screens/SpeakScreen';
import { TABS, TabBar, TabKey } from './ui/TabBar';
import { Text } from './ui/Text';
import { useKeyboardHeight } from './ui/useKeyboardHeight';
import { colors, spacing } from './ui/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <SpeechProvider>
        <StatusBar style="dark" />
        <Shell />
      </SpeechProvider>
    </SafeAreaProvider>
  );
}

function Shell() {
  const insets = useSafeAreaInsets();
  const { ready } = useSpeech();
  const [tab, setTab] = useState<TabKey>('speak');
  const keyboardHeight = useKeyboardHeight();
  const keyboardOpen = keyboardHeight > 0;

  const title = TABS.find((entry) => entry.key === tab)?.label ?? 'Say It';

  return (
    // Reserving the keyboard's height here rather than inside a screen means every
    // screen's footer clears the keyboard, and it stays correct on Android where the
    // window itself does not resize.
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: keyboardHeight }]}>
      <View style={styles.header}>
        <Text variant="display" accessibilityRole="header">
          {title}
        </Text>
      </View>

      <View style={styles.body}>
        {!ready ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text variant="body" muted>
              Getting ready…
            </Text>
          </View>
        ) : tab === 'speak' ? (
          <SpeakScreen onOpenSettings={() => setTab('settings')} />
        ) : tab === 'phrases' ? (
          <PhrasesScreen />
        ) : (
          <SettingsScreen />
        )}
      </View>

      {/*
        While the keyboard is up the tab bar would be buried under it anyway, and
        dropping it hands its ~70dp to the message box and the Speak button.
      */}
      {keyboardOpen ? null : (
        <TabBar active={tab} onChange={setTab} bottomInset={insets.bottom} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  body: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
});
