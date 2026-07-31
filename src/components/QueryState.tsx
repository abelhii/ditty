import type { ReactNode } from 'react';
import { ActivityIndicator, Button, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Spacing } from '@/constants/theme';
import { SubsonicNetworkError } from '@/api/subsonic/errors';

/** The subset of TanStack Query's `UseQueryResult`/`UseInfiniteQueryResult` this component
 *  needs — structurally compatible with both, so either can be passed as `query`. */
type QueryLike<T> = {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  data: T | undefined;
  refetch: () => unknown;
};

type QueryStateProps<T> = {
  query: QueryLike<T>;
  /** Shown when the query succeeded but came back empty. */
  emptyMessage?: string;
  isEmpty?: (data: T) => boolean;
  children: (data: T) => ReactNode;
};

/**
 * Wraps a query result with the four states every library screen needs: loading, error+retry,
 * empty, and success. Pull-to-refresh is left to the caller's own scrollable list (FlatList's
 * `refreshing`/`onRefresh` props, wired from the same `query` object) since QueryState doesn't
 * own a scrollable surface itself.
 */
export function QueryState<T>({ query, emptyMessage, isEmpty, children }: QueryStateProps<T>) {
  if (query.isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (query.isError && query.data === undefined) {
    const offline = query.error instanceof SubsonicNetworkError;
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
          {offline
            ? "You're offline and haven't viewed this yet."
            : query.error instanceof Error
              ? query.error.message
              : 'Something went wrong.'}
        </ThemedText>
        <Button title="Retry" onPress={() => query.refetch()} />
      </ThemedView>
    );
  }

  if (query.data === undefined || (isEmpty?.(query.data) ?? false)) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="small" themeColor="textSecondary">
          {emptyMessage ?? 'Nothing here yet.'}
        </ThemedText>
      </ThemedView>
    );
  }

  return <>{children(query.data)}</>;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  message: {
    textAlign: 'center',
  },
});
