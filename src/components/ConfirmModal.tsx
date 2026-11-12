import { Modal, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ConfirmCardProps = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/** The body of a confirmation, without its own Modal — for surfaces that are already a Modal
 *  (the Re-authentication prompt) and so can't nest another one. */
export function ConfirmCard({ title, message, confirmLabel, onConfirm, onCancel }: ConfirmCardProps) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {message}
      </ThemedText>
      <ThemedView type="backgroundElement" style={styles.buttons}>
        <Pressable accessibilityRole="button" style={styles.button} hitSlop={8} onPress={onCancel}>
          <ThemedText type="small" themeColor="textSecondary">
            Cancel
          </ThemedText>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.button} hitSlop={8} onPress={onConfirm}>
          <ThemedText type="smallBold" style={{ color: theme.accentDeep }}>
            {confirmLabel}
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

type ConfirmModalProps = ConfirmCardProps & { visible: boolean };

/** The app's one confirmation for destructive actions. A JS modal rather than `Alert.alert`, which
 *  does nothing useful on web. Mirrors TextPromptModal's layout. */
export function ConfirmModal({ visible, onCancel, ...card }: ConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable onPress={() => {}} style={styles.cardWrap}>
          <ConfirmCard {...card} onCancel={onCancel} />
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
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.five,
  },
  button: {
    minHeight: 44,
    justifyContent: 'center',
  },
});
