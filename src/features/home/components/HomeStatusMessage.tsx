import { StyleSheet } from 'react-native';

import { QueryErrorView } from '@/components/QueryState';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Spacing } from '@/constants/theme';
import type { HomeStatus } from '@/features/home/home-status';

type HomeStatusMessageProps = {
  status: HomeStatus;
  onRetry: () => void;
};

/** Shown on Home only when no Shelf has anything to show: the error with Retry, or an empty
 *  Library message. Individual empty/failed Shelves stay silent (see AlbumShelf). */
export function HomeStatusMessage({ status, onRetry }: HomeStatusMessageProps) {
  if (status.kind === 'failed') {
    return (
      <ThemedView style={styles.container}>
        <QueryErrorView error={status.error} onRetry={onRetry} />
      </ThemedView>
    );
  }
  if (status.kind === 'empty') {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
          Nothing here yet — add music to your server, then pull down to refresh.
        </ThemedText>
      </ThemedView>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
  },
  message: {
    textAlign: 'center',
  },
});
