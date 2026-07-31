import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import type { Track } from '@/api/types';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Spacing } from '@/constants/theme';
import { useAddToPlaylist } from '@/features/playlists/hooks/useAddToPlaylist';
import { useCreatePlaylist } from '@/features/playlists/hooks/useCreatePlaylist';
import { usePlaylists } from '@/features/playlists/hooks/usePlaylists';
import { useTheme } from '@/hooks/useTheme';

type AddToPlaylistSheetProps = {
  /** The track to add; `null` hides the sheet. Single-track only (bulk add is deferred). */
  track: Track | null;
  onClose: () => void;
};

/** A bottom sheet listing the user's playlists plus an inline "New playlist" — adds a single track
 *  to the chosen (or freshly created) playlist. See Build Order step 7b (add-to-playlist). */
export function AddToPlaylistSheet({ track, onClose }: AddToPlaylistSheetProps) {
  const theme = useTheme();
  const playlistsQuery = usePlaylists();
  const addToPlaylist = useAddToPlaylist();
  const createPlaylist = useCreatePlaylist();

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const reset = () => {
    setCreating(false);
    setNewName('');
    onClose();
  };

  const addTo = (playlistId: string) => {
    if (track) addToPlaylist.mutate({ playlistId, track });
    reset();
  };

  const createAndAdd = async () => {
    const name = newName.trim();
    if (!name || !track) return;
    const playlist = await createPlaylist.mutateAsync(name);
    addToPlaylist.mutate({ playlistId: playlist.id, track });
    reset();
  };

  return (
    <Modal visible={track !== null} transparent animationType="slide" onRequestClose={reset}>
      <Pressable style={styles.backdrop} onPress={reset}>
        {/* Stop propagation so taps inside the sheet don't dismiss it. */}
        <Pressable style={styles.sheetWrap} onPress={() => {}}>
          <ThemedView type="backgroundElement" style={styles.sheet}>
            <ThemedText type="smallBold" style={styles.heading}>
              Add to playlist
            </ThemedText>

            {creating ? (
              <ThemedView type="backgroundSelected" style={styles.newRow}>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Playlist name"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text }]}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={createAndAdd}
                />
                <Pressable hitSlop={8} onPress={createAndAdd} disabled={newName.trim().length === 0}>
                  <ThemedText type="smallBold" themeColor={newName.trim() ? 'text' : 'textSecondary'}>
                    Create
                  </ThemedText>
                </Pressable>
              </ThemedView>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.option, pressed && styles.pressed]}
                onPress={() => setCreating(true)}>
                <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={20} tintColor={theme.text} />
                <ThemedText>New playlist</ThemedText>
              </Pressable>
            )}

            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {playlistsQuery.isLoading ? (
                <ActivityIndicator style={styles.loading} />
              ) : (
                (playlistsQuery.data ?? []).map((playlist) => (
                  <Pressable
                    key={playlist.id}
                    style={({ pressed }) => [styles.option, pressed && styles.pressed]}
                    onPress={() => addTo(playlist.id)}>
                    <SymbolView
                      name={{ ios: 'music.note.list', android: 'queue_music', web: 'queue_music' }}
                      size={20}
                      tintColor={theme.textSecondary}
                    />
                    <ThemedText numberOfLines={1} style={styles.optionLabel}>
                      {playlist.name}
                    </ThemedText>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetWrap: {
    width: '100%',
  },
  sheet: {
    borderTopLeftRadius: Spacing.three,
    borderTopRightRadius: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    maxHeight: '70%',
  },
  heading: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  list: {
    flexGrow: 0,
  },
  loading: {
    paddingVertical: Spacing.four,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  optionLabel: {
    flex: 1,
  },
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  pressed: {
    opacity: 0.7,
  },
});
