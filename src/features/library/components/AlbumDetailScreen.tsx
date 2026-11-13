import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import type { Track } from '@/api/types';
import { useAuthStore } from '@/auth/use-auth-store';
import { CoverArtImage } from '@/components/CoverArtImage';
import { FavouriteButton } from '@/components/FavouriteButton';
import { QueryState } from '@/components/QueryState';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TrackActionsMenu } from '@/components/TrackActionsMenu';
import { TrackRow } from '@/components/TrackRow';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { DownloadCollectionButton } from '@/features/downloads/components/DownloadCollectionButton';
import { useHasPlayableTracks } from '@/features/downloads/hooks/use-has-playable-tracks';
import { useAlbum } from '@/features/library/hooks/use-album';
import { useTheme } from '@/hooks/use-theme';
import * as PlaybackController from '@/player/PlaybackController';
import { useListBottomInset } from '@/hooks/use-list-bottom-inset';

type AlbumDetailScreenProps = {
  albumId: string;
};

/** An album's tracks, with "Play" (album, index 0), tap-to-play (album, tapped index), and a
 *  per-track overflow menu for "Play next"/"Add to queue" — the already-built PlaybackController
 *  entry points. */
export function AlbumDetailScreen({ albumId }: AlbumDetailScreenProps) {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const listBottomInset = useListBottomInset();
  const credentials = useAuthStore((state) => state.credentials);
  const albumQuery = useAlbum(albumId);
  const canPlay = useHasPlayableTracks(albumQuery.data?.tracks);
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
                    paddingBottom: insets.bottom + listBottomInset,
                  }}                  ListHeaderComponent={
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
                        <Pressable accessibilityRole="link" onPress={() => router.push(`/library/genre/${encodeURIComponent(genre)}`)}>
                          <ThemedText type="linkPrimary">{genre}</ThemedText>
                        </Pressable>
                      )}
                      <ThemedView style={styles.actions}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Play album"
                          accessibilityHint={canPlay ? undefined : "Nothing in this album is downloaded"}
                          style={({ pressed }) => [pressed && styles.pressed, !canPlay && styles.unavailable]}
                          onPress={() => tracks.length > 0 && PlaybackController.play(tracks, 0)}>
                          <ThemedView style={[styles.playButtonInner, { backgroundColor: theme.accent }]}>
                            <ThemedText type="smallBold" style={{ color: theme.onAccent }}>Play</ThemedText>
                          </ThemedView>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Shuffle album"
                          accessibilityHint={canPlay ? undefined : "Nothing in this album is downloaded"}
                          style={({ pressed }) => [pressed && styles.pressed, !canPlay && styles.unavailable]}
                          onPress={() => tracks.length > 0 && PlaybackController.playShuffled(tracks)}>
                          <ThemedView type="backgroundSelected" style={styles.playButtonInner}>
                            <ThemedText type="smallBold">Shuffle</ThemedText>
                          </ThemedView>
                        </Pressable>
                        <FavouriteButton target={{ kind: 'album', item: album }} size={26} />
                        <DownloadCollectionButton kind="album" collectionId={album.id} tracks={tracks} />
                      </ThemedView>
                    </ThemedView>
                  }
                  renderItem={({ item, index }) => (
                    <TrackRow
                      track={item}
                      position={index + 1}
                      onPress={() => PlaybackController.play(tracks, index)}
                      onOverflowPress={() => setMenuTrack(item)}
                    />
                  )}
                />

                <TrackActionsMenu track={menuTrack} onClose={() => setMenuTrack(null)} />
              </>
            );
          }}
        </QueryState>
      </SafeAreaView>
    </ThemedView>
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    marginTop: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  // Greyed, but still tappable so PlaybackController's Notice can say why nothing plays.
  unavailable: {
    opacity: 0.4,
  },
  playButtonInner: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.five,
  },
});
