import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Spacing } from '@/constants/theme';

type EmptyMessageProps = {
  text: string;
};

/** A centered secondary-text line for a list's empty state (e.g. "No starred albums.") — used as
 *  a `ListEmptyComponent` across My Music's filter chips and Liked Songs. */
export function EmptyMessage({ text }: EmptyMessageProps) {
  return (
    <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
      {text}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
});
