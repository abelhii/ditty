import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import type { Track } from '@/api/types';
import { useAuthStore } from '@/auth/useAuthStore';
import { CoverArtImage } from '@/components/CoverArtImage';
import { QueryState } from '@/components/QueryState';
import { TextPromptModal } from '@/components/TextPromptModal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TrackActionsMenu } from '@/components/TrackActionsMenu';
import { TrackRow } from '@/components/TrackRow';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useDeletePlaylist } from '@/features/playlists/hooks/useDeletePlaylist';
import { usePlaylist } from '@/features/playlists/hooks/usePlaylist';
import { useRemoveFromPlaylist } from '@/features/playlists/hooks/useRemoveFromPlaylist';
import { useUpdatePlaylist } from '@/features/playlists/hooks/useUpdatePlaylist';
import { useTheme } from '@/hooks/use-theme';
import * as PlaybackController from '@/player/PlaybackController';
import { getCurrentTrack } from '@/player/QueueManager';
import { usePlayerStore } from '@/player/usePlayerStore';

type PlaylistDetailScreenProps = {
  playlistId: string;
};

type MenuTarget = { track: Track; index: number };

/** A playlist's tracks, modeled on AlbumDetailScreen: cover + name + count/duration header, a Play
 *  button, a TrackRow list with a per-row overflow (incl. remove-from-playlist), and a header
 *  overflow for playlist-level ops (rename, public/private, delete). Track reorder is deferred —
 *  the Subsonic API has no reorder primitive (Build Order step 7b). No standalone heart: the API
 *  can't star a playlist (only songs/albums/artists). */
export function PlaylistDetailScreen({ playlistId }: PlaylistDetailScreenProps) {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const credentials = useAuthStore((state) => state.credentials);
  const playlistQuery = usePlaylist(playlistId);
  const currentTrack = getCurrentTrack(usePlayerStore((state) => state.queue));

  const removeFromPlaylist = useRemoveFromPlaylist();
  const updatePlaylist = useUpdatePlaylist();
  const deletePlaylist = useDeletePlaylist();

  const [menuTarget, setMenuTarget] = useState<MenuTarget | null>(null);
  const [playlistMenuOpen, setPlaylistMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <QueryState query={playlistQuery} emptyMessage="Playlist not found.">
          {({ playlist, tracks }) => (
            <>
              <FlatList<Track>
                data={tracks}
                keyExtractor={(track, index) => `${track.id}-${index}`}
                contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + Spacing.three }}
                ListHeaderComponent={
                  <ThemedView style={styles.header}>
                    <CoverArtImage
                      uri={
                        credentials
                          ? getCoverArtUrl(credentials.serverUrl, playlist.coverArtId, credentials, CoverArtSize.detail)
                          : undefined
                      }
                      style={styles.headerArt}
                      iconSize={48}
                    />
                    <ThemedText type="subtitle" style={styles.centerText}>
                      {playlist.name}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {playlist.songCount} {playlist.songCount === 1 ? 'song' : 'songs'} ·{' '}
                      {formatTotalDuration(playlist.duration)}
                      {playlist.isPublic ? ' · Public' : ''}
                    </ThemedText>
                    <ThemedView style={styles.actions}>
                      <Pressable
                        style={({ pressed }) => pressed && styles.pressed}
                        onPress={() => tracks.length > 0 && PlaybackController.play(tracks, 0)}>
                        <ThemedView type="backgroundSelected" style={styles.playButtonInner}>
                          <ThemedText type="smallBold">Play</ThemedText>
                        </ThemedView>
                      </Pressable>
                      <Pressable
                        hitSlop={12}
                        accessibilityLabel="Playlist options"
                        onPress={() => setPlaylistMenuOpen(true)}
                        style={({ pressed }) => pressed && styles.pressed}>
                        <SymbolView
                          name={{ ios: 'ellipsis.circle', android: 'more_horiz', web: 'more_horiz' }}
                          size={26}
                          tintColor={theme.textSecondary}
                        />
                      </Pressable>
                    </ThemedView>
                  </ThemedView>
                }
                ListEmptyComponent={
                  <ThemedText type="small" themeColor="textSecondary" style={styles.emptyList}>
                    This playlist is empty.
                  </ThemedText>
                }
                renderItem={({ item, index }) => (
                  <TrackRow
                    track={item}
                    position={index + 1}
                    isPlaying={currentTrack?.id === item.id}
                    onPress={() => PlaybackController.play(tracks, index)}
                    onOverflowPress={() => setMenuTarget({ track: item, index })}
                  />
                )}
              />

              <TrackActionsMenu
                track={menuTarget?.track ?? null}
                onClose={() => setMenuTarget(null)}
                onRemoveFromPlaylist={
                  menuTarget
                    ? () => removeFromPlaylist.mutate({ playlistId, index: menuTarget.index })
                    : undefined
                }
              />

              <Modal
                visible={playlistMenuOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setPlaylistMenuOpen(false)}>
                <Pressable style={styles.overlay} onPress={() => setPlaylistMenuOpen(false)}>
                  <ThemedView type="backgroundElement" style={styles.menu}>
                    <PlaylistMenuOption
                      label="Rename"
                      icon={{ ios: 'pencil', android: 'edit', web: 'edit' }}
                      onPress={() => {
                        setPlaylistMenuOpen(false);
                        setRenaming(true);
                      }}
                    />
                    <PlaylistMenuOption
                      label={playlist.isPublic ? 'Make private' : 'Make public'}
                      icon={
                        playlist.isPublic
                          ? { ios: 'lock', android: 'lock', web: 'lock' }
                          : { ios: 'globe', android: 'public', web: 'public' }
                      }
                      onPress={() => {
                        updatePlaylist.mutate({ id: playlistId, isPublic: !playlist.isPublic });
                        setPlaylistMenuOpen(false);
                      }}
                    />
                    <PlaylistMenuOption
                      label="Delete playlist"
                      icon={{ ios: 'trash', android: 'delete', web: 'delete' }}
                      onPress={() => {
                        setPlaylistMenuOpen(false);
                        deletePlaylist.mutate(playlistId);
                        router.back();
                      }}
                    />
                  </ThemedView>
                </Pressable>
              </Modal>

              <TextPromptModal
                visible={renaming}
                title="Rename playlist"
                initialValue={playlist.name}
                submitLabel="Save"
                onSubmit={(name) => {
                  updatePlaylist.mutate({ id: playlistId, name });
                  setRenaming(false);
                }}
                onClose={() => setRenaming(false)}
              />
            </>
          )}
        </QueryState>
      </SafeAreaView>
    </ThemedView>
  );
}

function PlaylistMenuOption({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: Parameters<typeof SymbolView>[0]['name'];
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable style={({ pressed }) => [styles.menuOption, pressed && styles.pressed]} onPress={onPress}>
      <SymbolView name={icon} size={20} tintColor={theme.text} />
      <ThemedText>{label}</ThemedText>
    </Pressable>
  );
}

function formatTotalDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours} hr ${minutes} min`;
  return `${minutes} min`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  headerArt: {
    width: 160,
    height: 160,
    borderRadius: Spacing.three,
    marginBottom: Spacing.two,
  },
  centerText: {
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    marginTop: Spacing.two,
  },
  playButtonInner: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.six,
    borderRadius: Spacing.five,
  },
  emptyList: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  menu: {
    borderTopLeftRadius: Spacing.three,
    borderTopRightRadius: Spacing.three,
    paddingVertical: Spacing.two,
    paddingBottom: Spacing.six,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
