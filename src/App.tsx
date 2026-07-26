import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SpeechProvider, useSpeech } from './speech/SpeechProvider';
import { PhrasesScreen } from './screens/PhrasesScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SpeakScreen } from './screens/SpeakScreen';
import { TABS, TabBar, TabKey } from './ui/TabBar';
import { Text } from './ui/Text';
import { useKeyboardVisible } from './ui/useKeyboardVisible';
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
  const keyboardVisible = useKeyboardVisible();

  const title = TABS.find((entry) => entry.key === tab)?.label ?? 'Say It';

  return (
    /*
      KeyboardAvoidingView belongs at the root, not inside a screen. It measures its own
      frame against the screen and assumes it reaches the bottom, so nesting it above the
      tab bar made it under-shoot by the tab bar's height. As the root it is correct.

      Android needs no behavior: the window already resizes for the IME, and adding our
      own padding on top of that double-counts the keyboard.
    */
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
      {keyboardVisible ? null : (
        <TabBar active={tab} onChange={setTab} bottomInset={insets.bottom} />
      )}
    </KeyboardAvoidingView>
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
