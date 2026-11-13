import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { MaxContentWidth, PlayerSurface, Spacing } from '@/constants/theme';
import { LyricsView } from '@/features/player/components/LyricsView';
import { PlayerOverlay } from '@/features/player/components/PlayerOverlay';
import { useIsWideLayout } from '@/hooks/use-is-wide-layout';
import { getCurrentTrack } from '@/player/QueueManager';
import { usePlayerStore } from '@/player/use-player-store';
import { usePlayerUiStore } from '@/player/use-player-ui-store';

/** The narrow layout's Lyrics view: a full-screen overlay stacked above now-playing, opened by the
 *  Lyrics pill. On the wide layout Lyrics is a tab in the full player instead. */
export function LyricsScreen() {
  const insets = useSafeAreaInsets();
  const wide = useIsWideLayout();
  const lyricsOpen = usePlayerUiStore((state) => state.lyricsOpen);
  const closeLyrics = usePlayerUiStore((state) => state.closeLyrics);
  const track = usePlayerStore((state) => getCurrentTrack(state.queue));

  if (!lyricsOpen || wide || !track) return null;

  return (
    <PlayerOverlay onRequestClose={closeLyrics}>
      <View style={styles.overlay}>
        <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.header}>
            <Pressable
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close lyrics"
              onPress={closeLyrics}
              style={styles.headerButton}>
              <SymbolView
                name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
                size={26}
                tintColor={PlayerSurface.text}
              />
            </Pressable>
            <View style={styles.headerTitle}>
              <ThemedText type="smallBold" numberOfLines={1} style={styles.text}>
                {track.title}
              </ThemedText>
              <ThemedText type="small" numberOfLines={1} style={styles.textSecondary}>
                {track.artist}
              </ThemedText>
            </View>
            <View style={styles.headerButton} />
          </View>
          <LyricsView trackId={track.id} />
        </View>
      </View>
    </PlayerOverlay>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: PlayerSurface.background,
  },
  content: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  headerButton: {
    width: 32,
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  text: {
    color: PlayerSurface.text,
  },
  textSecondary: {
    color: PlayerSurface.textSecondary,
  },
});
