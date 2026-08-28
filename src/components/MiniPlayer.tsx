import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import { useAuthStore } from '@/auth/use-auth-store';
import { CoverArtImage } from '@/components/CoverArtImage';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as PlaybackController from '@/player/PlaybackController';
import { getCurrentTrack } from '@/player/QueueManager';
import { useProgress } from '@/player/hooks/use-progress';
import { playbackErrorMessage, usePlaybackStatusStore } from '@/player/use-playback-status-store';
import { usePlayerStore } from '@/player/use-player-store';
import { usePlayerUiStore } from '@/player/use-player-ui-store';

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
    <View style={[styles.container, { bottom: insets.bottom + BottomTabInset + Spacing.one }]}>
      <Pressable onPress={openNowPlaying}>
        <ThemedView type="tint" style={styles.bar}>
          <View style={styles.row}>
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
          </View>
          <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
            <View
              style={[styles.progressFill, { backgroundColor: theme.accent, width: `${fraction * 100}%` }]}
            />
          </View>
        </ThemedView>
      </Pressable>
    </View>
  );
}

/** Shared play/pause control — a spinner while the track is loading, a Retry glyph when the track
 *  has halted on an error (ADR 0007), otherwise a play/pause glyph reflecting the observed status.
 *  `tintColor` overrides the default theme-driven tint (used on the full player's accent-filled
 *  button, which sits on a fixed dark surface — see NowPlayingScreen). */
export function PlayPauseButton({ size = 26, tintColor }: { size?: number; tintColor?: string }) {
  const theme = useTheme();
  const status = usePlaybackStatusStore((state) => state.status);
  const color = tintColor ?? theme.text;

  if (status === 'loading') {
    return <ActivityIndicator style={styles.control} color={color} />;
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
          tintColor={color}
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
        tintColor={color}
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
    borderRadius: Radius.pill,
    paddingLeft: Spacing.two,
    paddingRight: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.one,
    shadowColor: '#2e2b25',
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  art: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    height: 4,
    borderRadius: 2,
    marginHorizontal: Spacing.one,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
  },
});
