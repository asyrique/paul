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

  const title = TABS.find((entry) => entry.key === tab)?.label ?? 'Say It';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
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

      <TabBar active={tab} onChange={setTab} bottomInset={insets.bottom} />
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
