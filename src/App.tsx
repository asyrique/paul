import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SpeechProvider, useSpeech } from './speech/SpeechProvider';
import { PhrasesScreen } from './screens/PhrasesScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SpeakScreen } from './screens/SpeakScreen';
import { TABS, TabBar, TabKey } from './ui/TabBar';
import { Text } from './ui/Text';
import { useKeyboardVisible } from './ui/useKeyboardVisible';
import { colors, isIOS, spacing } from './ui/theme';

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
      KeyboardAvoidingView, at the root, with `padding` on both platforms. Two things
      about it are easy to get wrong and were both got wrong here first:

      It has to be the root. It pads by `frame.y + frame.height - keyboardTop`, measuring
      its own bottom edge against the keyboard in screen coordinates, and that assumes it
      reaches the bottom of the screen. Nesting it above the tab bar made it under-shoot
      by the tab bar's height.

      Android needs `padding` too, and nothing else should reserve keyboard space. That
      same subtraction is self-correcting: when the window resizes for the IME the frame
      shrinks and the result collapses toward zero; when it does not resize, the result is
      the real overlap. Whether Android resizes is not ours to predict — Expo Go resizes
      because the host app is not edge-to-edge, a prebuilt edge-to-edge app does not, and
      a partial resize leaves just the navigation-bar strip. All three land correctly here,
      which is why every hand-rolled inset that used to sit on this view is gone.
    */
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior="padding"
    >
      {/*
        An iOS large title sits low and heavy in its own space; a Material 3 small top
        app bar is a shorter, lighter bar. Same component, different proportions.
      */}
      <View style={styles.header}>
        <Text variant={isIOS ? 'display' : 'title'} accessibilityRole="header">
          {title}
        </Text>
      </View>

      <View style={styles.body}>
        {!ready ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.accent} />
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
    paddingTop: isIOS ? spacing.sm : spacing.md,
    paddingBottom: isIOS ? spacing.xs : spacing.md,
    justifyContent: 'center',
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
