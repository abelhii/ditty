import { SymbolView } from 'expo-symbols';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTrackDownloadState } from '@/features/downloads/hooks/use-download-state';
import { useTheme } from '@/hooks/use-theme';

type DownloadBadgeProps = {
  trackId: string;
};

/** Small trailing marker on a track row: a filled arrow once downloaded, a percentage while
 *  downloading, a warning if it failed. Renders nothing when there's nothing to say (always the case
 *  on web, which can't download). */
export function DownloadBadge({ trackId }: DownloadBadgeProps) {
  const theme = useTheme();
  const state = useTrackDownloadState(trackId);

  if (state.kind === 'downloaded') {
    return (
      <SymbolView
        accessibilityLabel="Downloaded"
        name={{ ios: 'arrow.down.circle.fill', android: 'download_done', web: 'download_done' }}
        size={14}
        tintColor={theme.accent}
      />
    );
  }
  if (state.kind === 'downloading' || state.kind === 'queued') {
    return (
      <ThemedText type="small" themeColor="textSecondary" style={styles.percent}>
        {state.kind === 'queued' ? '…' : `${Math.round(state.progress * 100)}%`}
      </ThemedText>
    );
  }
  if (state.kind === 'failed') {
    return (
      <SymbolView
        accessibilityLabel="Download failed"
        name={{ ios: 'exclamationmark.circle', android: 'error_outline', web: 'error_outline' }}
        size={14}
        tintColor={theme.textSecondary}
      />
    );
  }
  return null;
}

const styles = StyleSheet.create({
  percent: {
    minWidth: 32,
    textAlign: 'right',
  },
});
