import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import type { Track } from '@/api/types';
import { useAuthStore } from '@/auth/useAuthStore';
import { CoverArtImage } from '@/components/CoverArtImage';
import { QueryState } from '@/components/QueryState';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TrackRow } from '@/components/TrackRow';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAlbum } from '@/features/library/hooks/useAlbum';
import * as PlaybackController from '@/player/PlaybackController';
import { getCurrentTrack } from '@/player/QueueManager';
import { usePlayerStore } from '@/player/usePlayerStore';

type AlbumDetailScreenProps = {
  albumId: string;
};

/** An album's tracks, with "Play" (album, index 0), tap-to-play (album, tapped index), and a
 *  per-track overflow menu for "Play next"/"Add to queue" — the already-built PlaybackController
 *  entry points, see docs/adr/0001-player-state-flows-through-store.md. */
export function AlbumDetailScreen({ albumId }: AlbumDetailScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const credentials = useAuthStore((state) => state.credentials);
  const albumQuery = useAlbum(albumId);
  const queue = usePlayerStore((state) => state.queue);
  const currentTrack = getCurrentTrack(queue);
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <QueryState query={albumQuery} emptyMessage="Album not found.">
          {({ album, tracks }) => {
            const genre = album.genre;

            return (
              <>
                <FlatList<Track>
                  data={tracks}
                  keyExtractor={(track) => track.id}
                  contentContainerStyle={{
                    paddingBottom: insets.bottom + BottomTabInset + Spacing.three,
                  }}
                  ListHeaderComponent={
                    <ThemedView style={styles.header}>
                      <CoverArtImage
                        uri={
                          credentials
                            ? getCoverArtUrl(credentials.serverUrl, album.coverArtId, credentials, CoverArtSize.detail)
                            : undefined
                        }
                        style={styles.headerArt}
                        iconSize={48}
                      />
                      <ThemedText type="subtitle" style={styles.centerText}>
                        {album.name}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {album.artist}
                      </ThemedText>
                      {genre && (
                        <Pressable onPress={() => router.push(`/genre/${encodeURIComponent(genre)}`)}>
                          <ThemedText type="linkPrimary">{genre}</ThemedText>
                        </Pressable>
                      )}
                      <Pressable
                        style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}
                        onPress={() => tracks.length > 0 && PlaybackController.play(tracks, 0)}>
                        <ThemedView type="backgroundSelected" style={styles.playButtonInner}>
                          <ThemedText type="smallBold">Play</ThemedText>
                        </ThemedView>
                      </Pressable>
                    </ThemedView>
                  }
                  renderItem={({ item, index }) => (
                    <TrackRow
                      track={item}
                      position={index + 1}
                      isPlaying={currentTrack?.id === item.id}
                      onPress={() => PlaybackController.play(tracks, index)}
                      onOverflowPress={() => setMenuTrack(item)}
                    />
                  )}
                />

                <Modal
                  visible={menuTrack !== null}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setMenuTrack(null)}>
                  <Pressable style={styles.overlay} onPress={() => setMenuTrack(null)}>
                    <ThemedView type="backgroundElement" style={styles.menu}>
                      <MenuOption
                        label="Play next"
                        onPress={() => {
                          if (menuTrack) PlaybackController.playNext(menuTrack);
                          setMenuTrack(null);
                        }}
                      />
                      <MenuOption
                        label="Add to queue"
                        onPress={() => {
                          if (menuTrack) PlaybackController.addToQueue(menuTrack);
                          setMenuTrack(null);
                        }}
                      />
                    </ThemedView>
                  </Pressable>
                </Modal>
              </>
            );
          }}
        </QueryState>
      </SafeAreaView>
    </ThemedView>
  );
}

function MenuOption({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.menuOption, pressed && styles.pressed]} onPress={onPress}>
      <ThemedText>{label}</ThemedText>
    </Pressable>
  );
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
  playButton: {
    marginTop: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  playButtonInner: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.six,
    borderRadius: Spacing.five,
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
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
});
