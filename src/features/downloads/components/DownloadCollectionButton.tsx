import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';

import type { Track } from '@/api/types';
import { ConfirmModal } from '@/components/ConfirmModal';
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
  kind: 'album' | 'playlist' | 'favourites';
  collectionId: string;
  tracks: Track[];
};

/** Download / cancel / remove for a whole album, playlist or the Liked Songs list, driven by its tracks' combined state.
 *  Hidden on web, which has no file download. */
export function DownloadCollectionButton({ kind, collectionId, tracks }: DownloadCollectionButtonProps) {
  const theme = useTheme();
  const trackIds = useMemo(() => tracks.map((t) => t.id), [tracks]);
  const state = useCollectionDownloadState(trackIds);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  // The Favourites collection is shown to the user as the Liked Songs screen.
  const noun = kind === 'favourites' ? 'liked songs' : kind;

  if (Platform.OS === 'web' || tracks.length === 0) return null;

  const { label, icon, onPress } = (() => {
    switch (state.kind) {
      case 'downloaded':
        return {
          label: 'Downloaded',
          icon: { ios: 'arrow.down.circle.fill', android: 'download_done', web: 'download_done' } as const,
          onPress: () => setConfirmingRemove(true),
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
    <>
      <ConfirmModal
        visible={confirmingRemove}
        title={`Remove downloaded ${noun}?`}
        message="It will be deleted from this device. You can download it again."
        confirmLabel="Remove"
        onConfirm={() => {
          setConfirmingRemove(false);
          removeCollectionDownload(kind, collectionId, trackIds);
        }}
        onCancel={() => setConfirmingRemove(false)}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          state.kind === 'downloaded' ? `Remove ${noun} download` : state.kind === 'downloading' ? `Cancel ${noun} download` : `${label} ${noun}`
        }
        hitSlop={8}
        onPress={onPress}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <SymbolView name={icon} size={22} tintColor={theme.accent} />
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
      </Pressable>
    </>
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
