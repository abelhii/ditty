import { useQueryClient } from '@tanstack/react-query';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { queryKeys } from '@/api/query-keys';
import { getAlbum } from '@/api/subsonic/endpoints/browsing';
import { getPlaylist } from '@/api/subsonic/endpoints/playlists';
import type { Track } from '@/api/types';
import { useAuthStore } from '@/auth/use-auth-store';
import { ConfirmModal } from '@/components/ConfirmModal';
import { showNotice } from '@/components/use-notice-store';
import {
  cancelDownloads,
  downloadTracks,
  removeCollectionDownload,
} from '@/features/downloads/downloads-runtime';
import { useCollectionRowDownloadState } from '@/features/downloads/hooks/use-collection-row-download-state';
import { useTheme } from '@/hooks/use-theme';

type CollectionRowDownloadProps = {
  kind: 'album' | 'playlist';
  collectionId: string;
  name: string;
  songCount: number;
  style?: StyleProp<ViewStyle>;
};

const TARGET_SIZE = 44;

/** Trailing download control for a My Music Playlist or Album row. The row only knows `songCount`,
 *  so the Tracks are fetched on demand when a download starts; the states mirror
 *  `DownloadCollectionButton`. Not rendered on web, which has no file download. */
export function CollectionRowDownload({ kind, collectionId, name, songCount, style }: CollectionRowDownloadProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { state, memberIds } = useCollectionRowDownloadState(kind, collectionId, songCount);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [fetching, setFetching] = useState(false);

  if (Platform.OS === 'web' || songCount === 0) return null;

  async function startDownload() {
    const credentials = useAuthStore.getState().credentials;
    if (!credentials || fetching) return;
    setFetching(true);
    try {
      const tracks: Track[] =
        kind === 'album'
          ? (
              await queryClient.fetchQuery({
                queryKey: queryKeys.album(collectionId),
                queryFn: () => getAlbum(credentials.serverUrl, credentials, collectionId),
              })
            ).tracks
          : (
              await queryClient.fetchQuery({
                queryKey: queryKeys.playlist(collectionId),
                queryFn: () => getPlaylist(credentials.serverUrl, credentials, collectionId),
              })
            ).tracks;
      downloadTracks(kind, collectionId, tracks);
    } catch {
      showNotice(`Couldn't download ${name}.`);
    } finally {
      setFetching(false);
    }
  }

  const { label, icon, onPress } = (() => {
    switch (state.kind) {
      case 'downloaded':
        return {
          label: `Remove ${name} download`,
          icon: { ios: 'arrow.down.circle.fill', android: 'download_done', web: 'download_done' } as const,
          onPress: () => setConfirmingRemove(true),
        };
      case 'downloading':
      case 'queued':
        return {
          label: `Cancel ${name} download, ${Math.round(state.progress * 100)}%`,
          icon: { ios: 'xmark.circle', android: 'cancel', web: 'cancel' } as const,
          onPress: () => cancelDownloads(memberIds),
        };
      case 'failed':
        return {
          label: `Retry ${name} download`,
          icon: { ios: 'arrow.clockwise.circle', android: 'refresh', web: 'refresh' } as const,
          onPress: startDownload,
        };
      case 'partial':
        return {
          label: `Finish downloading ${name}`,
          icon: { ios: 'arrow.down.circle.dotted', android: 'downloading', web: 'downloading' } as const,
          onPress: startDownload,
        };
      default:
        return {
          label: `Download ${name}`,
          icon: { ios: 'arrow.down.circle', android: 'download', web: 'download' } as const,
          onPress: startDownload,
        };
    }
  })();

  return (
    <>
      <ConfirmModal
        visible={confirmingRemove}
        title={`Remove downloaded ${kind}?`}
        message="It will be deleted from this device. You can download it again."
        confirmLabel="Remove"
        onConfirm={() => {
          setConfirmingRemove(false);
          removeCollectionDownload(kind, collectionId, memberIds);
        }}
        onCancel={() => setConfirmingRemove(false)}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={fetching}
        onPress={onPress}
        style={({ pressed }) => [styles.target, style, pressed && styles.pressed]}>
        <SymbolView name={icon} size={24} tintColor={theme.accent} />
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  target: {
    width: TARGET_SIZE,
    height: TARGET_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
