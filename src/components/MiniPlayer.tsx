import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import { useAuthStore } from '@/auth/useAuthStore';
import { CoverArtImage } from '@/components/CoverArtImage';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as PlaybackController from '@/player/PlaybackController';
import { getCurrentTrack } from '@/player/QueueManager';
import { useProgress } from '@/player/hooks/useProgress';
import { playbackErrorMessage, usePlaybackStatusStore } from '@/player/usePlaybackStatusStore';
import { usePlayerStore } from '@/player/usePlayerStore';
import { usePlayerUiStore } from '@/player/usePlayerUiStore';

/**
 * Persistent player bar docked above the tab bar — a hand-rolled JS overlay on every platform
 * (see docs/adr/0005-miniplayer-js-overlay-not-native-accessory.md), mounted as a sibling of
 * NativeTabs in _layout.tsx. Artwork + title/artist + play-pause + a hairline progress line;
 * tapping the bar expands the now-playing overlay. Hidden when there's nothing playing or when
 * now-playing is already open.
 */
export function MiniPlayer() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const credentials = useAuthStore((state) => state.credentials);
  const currentTrack = usePlayerStore((state) => getCurrentTrack(state.queue));
  const nowPlayingOpen = usePlayerUiStore((state) => state.nowPlayingOpen);
  const openNowPlaying = usePlayerUiStore((state) => state.openNowPlaying);
  const status = usePlaybackStatusStore((state) => state.status);
  const errorOffline = usePlaybackStatusStore((state) => state.errorOffline);
  const { fraction } = useProgress();

  if (!currentTrack || nowPlayingOpen) return null;

  const coverArtUri =
    credentials &&
    getCoverArtUrl(credentials.serverUrl, currentTrack.coverArtId, credentials, CoverArtSize.list);

  return (
    <View style={[styles.container, { bottom: insets.bottom + BottomTabInset }]}>
      <Pressable onPress={openNowPlaying}>
        <ThemedView type="backgroundElement" style={styles.bar}>
          <CoverArtImage uri={coverArtUri || undefined} style={styles.art} iconSize={18} />
          <View style={styles.text}>
            <ThemedText numberOfLines={1}>{currentTrack.title}</ThemedText>
            {status === 'error' ? (
              <ThemedText type="small" numberOfLines={1} style={styles.error}>
                {playbackErrorMessage(errorOffline)}
              </ThemedText>
            ) : (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {currentTrack.artist}
              </ThemedText>
            )}
          </View>
          <PlayPauseButton />
        </ThemedView>
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { backgroundColor: theme.text, width: `${fraction * 100}%` }]}
          />
        </View>
      </Pressable>
    </View>
  );
}

/** Shared play/pause control — a spinner while the track is loading, a Retry glyph when the track
 *  has halted on an error (ADR 0007), otherwise a play/pause glyph reflecting the observed status. */
export function PlayPauseButton({ size = 26 }: { size?: number }) {
  const theme = useTheme();
  const status = usePlaybackStatusStore((state) => state.status);

  if (status === 'loading') {
    return <ActivityIndicator style={styles.control} color={theme.text} />;
  }

  if (status === 'error') {
    return (
      <Pressable
        hitSlop={12}
        accessibilityLabel="Retry"
        style={styles.control}
        onPress={() => PlaybackController.retry()}>
        <SymbolView
          name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }}
          size={size}
          tintColor={theme.text}
        />
      </Pressable>
    );
  }

  return (
    <Pressable
      hitSlop={12}
      style={styles.control}
      onPress={() => PlaybackController.togglePlayPause()}>
      <SymbolView
        name={
          status === 'playing'
            ? { ios: 'pause.fill', android: 'pause', web: 'pause' }
            : { ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }
        }
        size={size}
        tintColor={theme.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.two,
    right: Spacing.two,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingLeft: Spacing.two,
    paddingRight: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopLeftRadius: Spacing.two,
    borderTopRightRadius: Spacing.two,
  },
  art: {
    width: 40,
    height: 40,
    borderRadius: Spacing.one,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  error: {
    color: '#e5484d',
  },
  control: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(128,128,128,0.3)',
    borderBottomLeftRadius: Spacing.two,
    borderBottomRightRadius: Spacing.two,
    overflow: 'hidden',
  },
  progressFill: {
    height: 2,
  },
});
