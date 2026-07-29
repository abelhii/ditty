import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TextPromptModalProps = {
  visible: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  submitLabel: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
};

/** A small centered single-field prompt — used for "New playlist" and "Rename playlist" (React
 *  Native's Alert.prompt is iOS-only, so this keeps name entry working on Android and web too). */
export function TextPromptModal({
  visible,
  title,
  placeholder,
  initialValue = '',
  submitLabel,
  onSubmit,
  onClose,
}: TextPromptModalProps) {
  const theme = useTheme();
  const [value, setValue] = useState(initialValue);

  // Reset the field to the initial value each time the prompt (re)opens. Done during render via a
  // "was it visible last render?" flag rather than an effect — see react.dev "You Might Not Need an
  // Effect" (adjusting state when a prop changes).
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setValue(initialValue);
  }

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={() => {}} style={styles.cardWrap}>
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">{title}</ThemedText>
            <TextInput
              value={value}
              onChangeText={setValue}
              placeholder={placeholder}
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={submit}
            />
            <ThemedView style={styles.buttons}>
              <Pressable hitSlop={8} onPress={onClose}>
                <ThemedText type="small" themeColor="textSecondary">
                  Cancel
                </ThemedText>
              </Pressable>
              <Pressable hitSlop={8} onPress={submit} disabled={value.trim().length === 0}>
                <ThemedText type="smallBold" themeColor={value.trim() ? 'text' : 'textSecondary'}>
                  {submitLabel}
                </ThemedText>
              </Pressable>
            </ThemedView>
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cardWrap: {
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.five,
  },
});
