import React, { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useSpeech } from '../speech/SpeechProvider';
import { Phrase, newPhraseId } from '../storage/store';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';
import {
  MAX_FONT_SCALE,
  colors,
  fontSize,
  isIOS,
  lineHeight,
  radius,
  ripple,
  spacing,
  touchTarget,
} from '../ui/theme';

export function PhrasesScreen() {
  const { phrases, setPhrases, speak, stop, speaking } = useSpeech();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const addPhrase = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setPhrases([...phrases, { id: newPhraseId(), text: trimmed }]);
    setDraft('');
  };

  const removePhrase = (phrase: Phrase) => {
    Alert.alert('Delete this phrase?', phrase.text, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => setPhrases(phrases.filter((item) => item.id !== phrase.id)),
      },
    ]);
  };

  return (
    <View style={styles.flex}>
      <FlatList
        data={phrases}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="caption">
              {editing
                ? 'Tap the red button to delete a phrase.'
                : 'Tap a phrase to say it out loud.'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text variant="body" muted style={styles.empty}>
            You have no saved phrases. Add one below, or type something on the Speak tab
            and tap “Save phrase”.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Say: ${item.text}`}
              accessibilityHint="Reads this phrase out loud"
              onPress={() => speak(item.text)}
              android_ripple={ripple}
              style={({ pressed }) => [styles.phrase, pressed && isIOS && styles.phrasePressed]}
            >
              <Text variant="body" maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {item.text}
              </Text>
            </Pressable>
            {editing ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete phrase: ${item.text}`}
                onPress={() => removePhrase(item)}
                hitSlop={8}
                android_ripple={ripple}
                style={({ pressed }) => [styles.delete, pressed && isIOS && styles.deletePressed]}
              >
                <Text variant="label" onAccent center>
                  Delete
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      />

      <View style={styles.footer}>
        {editing ? (
          <View style={styles.addRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="New phrase…"
              placeholderTextColor={colors.textMuted}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
              accessibilityLabel="New phrase text"
              onSubmitEditing={addPhrase}
              returnKeyType="done"
              style={styles.input}
            />
            <Button label="Add" onPress={addPhrase} disabled={!draft.trim()} />
          </View>
        ) : null}

        <View style={styles.footerRow}>
          <Button
            label={editing ? 'Done editing' : 'Edit phrases'}
            variant={editing ? 'primary' : 'secondary'}
            onPress={() => {
              setEditing((value) => !value);
              setDraft('');
            }}
            style={styles.footerButton}
          />
          {speaking ? (
            <Button
              label="Stop"
              variant="stop"
              onPress={stop}
              style={styles.footerButton}
              accessibilityHint="Stops the speech straight away"
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  header: {
    paddingBottom: spacing.xs,
  },
  empty: {
    paddingVertical: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  phrase: {
    flex: 1,
    minHeight: touchTarget.primary,
    justifyContent: 'center',
    padding: spacing.md,
    // A tappable phrase is a card on both platforms: hairline-outlined on iOS, a filled
    // Material 3 surface container with a ripple on Android.
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: isIOS ? StyleSheet.hairlineWidth : 0,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  phrasePressed: {
    backgroundColor: colors.raised,
    borderColor: colors.accent,
  },
  delete: {
    minWidth: touchTarget.comfortable + spacing.lg,
    minHeight: touchTarget.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.destructive,
    borderRadius: radius.control,
    overflow: 'hidden',
  },
  deletePressed: {
    backgroundColor: colors.destructivePressed,
  },
  footer: {
    padding: spacing.md,
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  addRow: {
    gap: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.field,
    padding: spacing.md,
    minHeight: touchTarget.comfortable,
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    color: colors.text,
    backgroundColor: isIOS ? colors.background : colors.card,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  footerButton: {
    flex: 1,
  },
});
