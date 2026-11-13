import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Spacing } from '@/constants/theme';
import { ClearQueueButton, QueueList, type QueueListPalette } from '@/features/player/components/QueueScreen';
import { useTheme } from '@/hooks/use-theme';

type QueuePanelProps = {
  /** Colours for a panel on a surface other than the app background. Defaults to the app theme. */
  palette?: QueueListPalette;
  /** Extra header controls after "Clear queue" (the sidebar's collapse button). */
  trailing?: ReactNode;
  /** False when tabs above already name the panel "Queue". */
  showTitle?: boolean;
};

/** The wide layout's Queue panel: a "Queue" header with Clear queue above the Queue list. Shared by
 *  the full player's right-hand panel and the Queue sidebar. */
export function QueuePanel({ palette, trailing, showTitle = true }: QueuePanelProps) {
  const theme = useTheme();
  const colors = palette ?? theme;

  return (
    <View style={styles.fill}>
      <View style={styles.header}>
        {showTitle ? (
          <ThemedText type="smallBold" style={[styles.title, { color: colors.text }]}>
            Queue
          </ThemedText>
        ) : (
          <View />
        )}
        <View style={styles.actions}>
          <ClearQueueButton color={colors.textSecondary} />
          {trailing}
        </View>
      </View>
      <View style={styles.fill}>
        <QueueList palette={palette} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: Spacing.three,
  },
  title: {
    padding: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
