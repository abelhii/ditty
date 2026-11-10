import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { getCoverArtUrl, CoverArtSize } from '@/api/subsonic/endpoints/media';
import { useAuthStore } from '@/auth/use-auth-store';
import { CoverArtImage } from '@/components/CoverArtImage';
import { TextPromptModal } from '@/components/TextPromptModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Radius, Spacing } from '@/constants/theme';
import { useCreatePlaylist } from '@/features/playlists/hooks/use-create-playlist';
import { usePlaylists } from '@/features/playlists/hooks/use-playlists';
import { useTheme } from '@/hooks/use-theme';

const THUMB_SIZE = 32;

/** The wide-screen sidebar's Playlists section: a header with a "+" (new playlist), then the
 *  user's playlists, scrolling on their own so the account row below stays pinned. */
export function SidebarPlaylists() {
  const router = useRouter();
  const theme = useTheme();
  const credentials = useAuthStore((state) => state.credentials);
  const playlists = usePlaylists().data ?? [];
  const createPlaylist = useCreatePlaylist();
  const [creating, setCreating] = useState(false);

  return (
    <ThemedView style={styles.section}>
      <ThemedView style={[styles.header, { borderTopColor: theme.border }]}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.title}>
          Playlists
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New playlist"
          hitSlop={8}
          onPress={() => setCreating(true)}
          style={({ pressed }) => pressed && styles.pressed}>
          <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={22} tintColor={theme.text} />
        </Pressable>
      </ThemedView>

      {playlists.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          No playlists yet
        </ThemedText>
      ) : (
        <ScrollView>
          {playlists.map((playlist) => (
            <Pressable
              key={playlist.id}
              accessibilityRole="link"
              onPress={() => router.push(`/home/playlist/${playlist.id}`)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <CoverArtImage
                uri={
                  credentials
                    ? getCoverArtUrl(credentials.serverUrl, playlist.coverArtId, credentials, CoverArtSize.list)
                    : undefined
                }
                style={styles.thumb}
                iconSize={16}
              />
              <ThemedText type="small" numberOfLines={1} style={styles.name}>
                {playlist.name}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <TextPromptModal
        visible={creating}
        title="New playlist"
        placeholder="Playlist name"
        submitLabel="Create"
        onSubmit={(name) => {
          createPlaylist.mutate(name);
          setCreating(false);
        }}
        onClose={() => setCreating(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    flex: 1,
    marginTop: Spacing.three,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  title: {
    textTransform: 'uppercase',
  },
  empty: {
    paddingHorizontal: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.sm,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: Radius.sm / 2,
  },
  name: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
