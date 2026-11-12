import { type ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet } from 'react-native';

import { SubsonicNetworkError } from '@/api/subsonic/errors';
import { queryErrorMessage } from '@/components/query-error-message';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Spacing } from '@/constants/theme';
import { isOffline } from '@/utils/network';

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
    return <QueryErrorView error={query.error} onRetry={() => query.refetch()} />;
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

/** Full-surface error with Retry. A `SubsonicNetworkError` means "no response", so the device
 *  connectivity probe decides whether to blame the device or the server (ADR 0007). */
export function QueryErrorView({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const isNetworkError = error instanceof SubsonicNetworkError;
  const [deviceOffline, setDeviceOffline] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isNetworkError) return;
    let cancelled = false;
    void isOffline().then((offline) => {
      if (!cancelled) setDeviceOffline(offline);
    });
    return () => {
      cancelled = true;
    };
  }, [isNetworkError, error]);

  // Hold the message back until the probe resolves so it doesn't flip wording after first paint.
  const message = isNetworkError && deviceOffline === null ? null : queryErrorMessage(error, deviceOffline === true);

  return (
    <ThemedView style={styles.centered}>
      {message !== null && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
          {message}
        </ThemedText>
      )}
      <Button title="Retry" onPress={onRetry} />
    </ThemedView>
  );
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
