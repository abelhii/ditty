import type { ComponentProps } from 'react';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import { useAuthStore } from '@/auth/use-auth-store';
import { CoverArtImage } from '@/components/CoverArtImage';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import {
  BottomTabInset,
  MaxContentWidth,
  MiniPlayerHeight,
  MiniPlayerOffset,
  ProgressBarHeight,
  Radius,
  Shadow,
  Spacing,
} from '@/constants/theme';
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
 * NativeTabs in _layout.tsx. Artwork + title/artist + previous / play-pause / next + a hairline progress line;
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
  const { width } = useWindowDimensions();

  if (!currentTrack || nowPlayingOpen) return null;

  const coverArtUri =
    credentials &&
    getCoverArtUrl(credentials.serverUrl, currentTrack.coverArtId, credentials, CoverArtSize.list);

  return (
    <View style={[styles.container, { bottom: insets.bottom + BottomTabInset + MiniPlayerOffset }]}>
      <Pressable style={styles.pressable} onPress={openNowPlaying}>
        <ThemedView type="tint" style={[styles.bar, { shadowColor: theme.shadow }]}>
          <CoverArtImage uri={coverArtUri || undefined} style={styles.art} iconSize={20} />
          <View style={styles.text}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {currentTrack.title}
            </ThemedText>
            {status === 'error' ? (
              <ThemedText type="small" numberOfLines={1} style={styles.error}>
                {playbackErrorMessage(errorOffline)}
              </ThemedText>
            ) : (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {currentTrack.artist}
              </ThemedText>
            )}
            <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
              <View
                style={[styles.progressFill, { backgroundColor: theme.accent, width: `${fraction * 100}%` }]}
              />
            </View>
          </View>
          {width >= HIDE_PREVIOUS_BELOW_WIDTH && (
            <SkipButton
              name={{ ios: 'backward.end.fill', android: 'skip_previous', web: 'skip_previous' }}
              label="Previous track"
              onPress={PlaybackController.skipPrevious}
            />
          )}
          <PlayPauseButton />
          <SkipButton
            name={{ ios: 'forward.end.fill', android: 'skip_next', web: 'skip_next' }}
            label="Next track"
            onPress={PlaybackController.skipNext}
          />
        </ThemedView>
      </Pressable>
    </View>
  );
}

type SkipButtonProps = {
  name: ComponentProps<typeof SymbolView>['name'];
  label: string;
  onPress: () => void;
};

function SkipButton({ name, label, onPress }: SkipButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.control}
      onPress={onPress}>
      <SymbolView name={name} size={22} tintColor={theme.text} />
    </Pressable>
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
        accessibilityRole="button"
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
      accessibilityRole="button"
      accessibilityLabel={status === 'playing' ? 'Pause' : 'Play'}
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

const ART_SIZE = 40;
/** Below this window width the bar drops Previous so the title keeps room (Next stays). */
const HIDE_PREVIOUS_BELOW_WIDTH = 360;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    // Spans the window so the bar can centre; only the bar itself takes touches.
    pointerEvents: 'box-none',
  },
  pressable: {
    width: '100%',
    // Line up with the content column's rows, which sit Spacing.four inside MaxContentWidth.
    maxWidth: MaxContentWidth - Spacing.four * 2,
  },
  bar: {
    height: MiniPlayerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.pill,
    paddingLeft: Spacing.two,
    paddingRight: Spacing.three,
    paddingVertical: Spacing.two,
    ...Shadow.floating,
  },
  art: {
    width: ART_SIZE,
    height: ART_SIZE,
    borderRadius: ART_SIZE / 2,
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
    height: ProgressBarHeight,
    borderRadius: Radius.pill,
    marginTop: Spacing.half,
    overflow: 'hidden',
  },
  progressFill: {
    height: ProgressBarHeight,
  },
});
