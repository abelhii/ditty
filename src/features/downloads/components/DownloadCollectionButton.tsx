import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';

import type { Track } from '@/api/types';
import { ThemedText } from '@/components/ThemedText';
import { Spacing } from '@/constants/theme';
import {
  cancelDownloads,
  downloadTracks,
  removeCollectionDownload,
} from '@/features/downloads/downloads-runtime';
import { useCollectionDownloadState } from '@/features/downloads/hooks/use-download-state';
import { useTheme } from '@/hooks/use-theme';

type DownloadCollectionButtonProps = {
  kind: 'album' | 'playlist';
  collectionId: string;
  tracks: Track[];
};

/** Download / cancel / remove for a whole album or playlist, driven by its tracks' combined state.
 *  Hidden on web, which has no file download. */
export function DownloadCollectionButton({ kind, collectionId, tracks }: DownloadCollectionButtonProps) {
  const theme = useTheme();
  const trackIds = useMemo(() => tracks.map((t) => t.id), [tracks]);
  const state = useCollectionDownloadState(trackIds);

  if (Platform.OS === 'web' || tracks.length === 0) return null;

  const { label, icon, onPress } = (() => {
    switch (state.kind) {
      case 'downloaded':
        return {
          label: 'Downloaded',
          icon: { ios: 'arrow.down.circle.fill', android: 'download_done', web: 'download_done' } as const,
          onPress: () => removeCollectionDownload(kind, collectionId, trackIds),
        };
      case 'downloading':
      case 'queued':
        return {
          label: `Downloading ${Math.round(state.progress * 100)}%`,
          icon: { ios: 'xmark.circle', android: 'cancel', web: 'cancel' } as const,
          onPress: () => cancelDownloads(trackIds),
        };
      case 'failed':
        return {
          label: 'Retry download',
          icon: { ios: 'arrow.clockwise.circle', android: 'refresh', web: 'refresh' } as const,
          onPress: () => downloadTracks(kind, collectionId, tracks),
        };
      default:
        return {
          label: 'Download',
          icon: { ios: 'arrow.down.circle', android: 'download', web: 'download' } as const,
          onPress: () => downloadTracks(kind, collectionId, tracks),
        };
    }
  })();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        state.kind === 'downloaded' ? `Remove ${kind} download` : state.kind === 'downloading' ? `Cancel ${kind} download` : `${label} ${kind}`
      }
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <SymbolView name={icon} size={22} tintColor={theme.accent} />
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
