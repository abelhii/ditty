import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';

import type { Track } from '@/api/types';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Spacing } from '@/constants/theme';
import { useStar, useUnstar } from '@/features/favourites/hooks/useStar';
import { AddToPlaylistSheet } from '@/features/playlists/components/AddToPlaylistSheet';
import { useTheme } from '@/hooks/useTheme';
import * as PlaybackController from '@/player/PlaybackController';

type TrackActionsMenuProps = {
  /** The track the menu acts on; `null` hides the menu. */
  track: Track | null;
  onClose: () => void;
  /** Supplied only on playlist detail — adds a "Remove from this playlist" action. The parent owns
   *  the positional index (updatePlaylist removes by position), so it passes a ready-made callback. */
  onRemoveFromPlaylist?: () => void;
};

/**
 * The shared row-level overflow menu — star/unstar, add-to-playlist, play-next, add-to-queue, and
 * (on playlist detail) remove-from-playlist. Reused across album / playlist / search track rows so
 * the action set stays consistent (Build Order step 7b). Star/queue actions read the track's own
 * `starred` flag and call the same PlaybackController entry points the UI uses elsewhere.
 */
export function TrackActionsMenu({ track, onClose, onRemoveFromPlaylist }: TrackActionsMenuProps) {
  const star = useStar();
  const unstar = useUnstar();
  const [addTrack, setAddTrack] = useState<Track | null>(null);

  return (
    <>
      <Modal visible={track !== null} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <ThemedView type="backgroundElement" style={styles.menu}>
            {track?.starred ? (
              <MenuOption
                label="Remove from Favourites"
                icon={{ ios: 'heart.slash', android: 'heart_broken', web: 'heart_broken' }}
                onPress={() => {
                  if (track) unstar.mutate({ kind: 'song', item: track });
                  onClose();
                }}
              />
            ) : (
              <MenuOption
                label="Add to Favourites"
                icon={{ ios: 'heart', android: 'favorite_border', web: 'favorite_border' }}
                onPress={() => {
                  if (track) star.mutate({ kind: 'song', item: track });
                  onClose();
                }}
              />
            )}
            <MenuOption
              label="Add to playlist"
              icon={{ ios: 'text.badge.plus', android: 'playlist_add', web: 'playlist_add' }}
              onPress={() => {
                setAddTrack(track);
                onClose();
              }}
            />
            <MenuOption
              label="Play next"
              icon={{ ios: 'text.line.first.and.arrowtriangle.forward', android: 'queue_play_next', web: 'queue_play_next' }}
              onPress={() => {
                if (track) PlaybackController.playNext(track);
                onClose();
              }}
            />
            <MenuOption
              label="Add to queue"
              icon={{ ios: 'text.append', android: 'add_to_queue', web: 'add_to_queue' }}
              onPress={() => {
                if (track) PlaybackController.addToQueue(track);
                onClose();
              }}
            />
            {onRemoveFromPlaylist && (
              <MenuOption
                label="Remove from this playlist"
                icon={{ ios: 'minus.circle', android: 'remove_circle_outline', web: 'remove_circle_outline' }}
                onPress={() => {
                  onRemoveFromPlaylist();
                  onClose();
                }}
              />
            )}
          </ThemedView>
        </Pressable>
      </Modal>

      <AddToPlaylistSheet track={addTrack} onClose={() => setAddTrack(null)} />
    </>
  );
}

function MenuOption({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: SymbolViewProps['name'];
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

const styles = StyleSheet.create({
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
