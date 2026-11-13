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
import { useNextTrack } from '@/player/hooks/use-next-track';
import { useProgress } from '@/player/hooks/use-progress';
import { playbackErrorMessage, usePlaybackStatusStore } from '@/player/use-playback-status-store';
import { usePlayerStore } from '@/player/use-player-store';
import { usePlayerUiStore } from '@/player/use-player-ui-store';

/**
 * Persistent player bar docked above the tab bar — a hand-rolled JS overlay on every platform
 * (the native BottomAccessory is iOS-only), mounted as a sibling of NativeTabs in _layout.tsx
 * (the wide layout swaps in WidePlayer instead). Artwork + title/artist + previous / play-pause /
 * next + queue button (count badge) + a hairline progress line; tapping the bar expands the
 * now-playing overlay. Hidden when there's nothing playing or when now-playing is already open.
 */
export function MiniPlayer() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const credentials = useAuthStore((state) => state.credentials);
  const currentTrack = usePlayerStore((state) => getCurrentTrack(state.queue));
  const nowPlayingOpen = usePlayerUiStore((state) => state.nowPlayingOpen);
  const openNowPlaying = usePlayerUiStore((state) => state.openNowPlaying);
  const openQueue = usePlayerUiStore((state) => state.openQueue);
  const nextTrack = useNextTrack();
  const queueLength = usePlayerStore((state) => state.queue.tracks.length);
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Now playing: ${currentTrack.title} by ${currentTrack.artist}`}
        accessibilityHint="Opens the full player"
        style={styles.pressable}
        onPress={openNowPlaying}>
        <ThemedView type="tint" style={[styles.bar, { shadowColor: theme.shadow }]}>
          <CoverArtImage uri={coverArtUri || undefined} style={styles.art} iconSize={20} />
          <View style={styles.text}>
            <ThemedText type="smallBold" numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {currentTrack.title}
            </ThemedText>
            {status === 'error' ? (
              <ThemedText
                type="small"
                themeColor="danger"
                numberOfLines={1}
                maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {playbackErrorMessage(errorOffline)}
              </ThemedText>
            ) : (
              <ThemedText
                type="small"
                themeColor="textSecondary"
                numberOfLines={1}
                maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {nextTrack ? `Next: ${nextTrack.title}` : currentTrack.artist}
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open Queue, ${queueLength} ${queueLength === 1 ? 'Track' : 'Tracks'}`}
            style={styles.queueButton}
            onPress={openQueue}>
            <SymbolView
              name={{ ios: 'list.bullet', android: 'queue_music', web: 'queue_music' }}
              size={22}
              tintColor={theme.text}
            />
            <View style={[styles.badge, { backgroundColor: theme.accent }]}>
              <ThemedText
                themeColor="onAccent"
                numberOfLines={1}
                maxFontSizeMultiplier={1}
                style={styles.badgeText}>
                {queueLength}
              </ThemedText>
            </View>
          </Pressable>
        </ThemedView>
      </Pressable>
    </View>
  );
}

type SkipButtonProps = {
  name: ComponentProps<typeof SymbolView>['name'];
  label: string;
  onPress: () => void;
  /** For toggles (the wide player's shuffle and repeat): accent-tinted and announced as selected. */
  selected?: boolean;
};

export function SkipButton({ name, label, onPress, selected }: SkipButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? undefined : { selected }}
      style={styles.control}
      onPress={onPress}>
      <SymbolView name={name} size={22} tintColor={selected ? theme.accent : theme.text} />
    </Pressable>
  );
}

/** Shared play/pause control — a spinner while the track is loading, a Retry glyph when the track
 *  has halted on an error, otherwise a play/pause glyph reflecting the observed status.
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
/** The bar is a fixed height, so cap text scaling to keep title + secondary line + progress inside it. */
const MAX_FONT_SCALE = 1.1;
/** Minimum touch target (issue #105). */
const QUEUE_BUTTON_SIZE = 44;
const BADGE_SIZE = 18;

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
    paddingRight: Spacing.one,
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
  control: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueButton: {
    width: QUEUE_BUTTON_SIZE,
    height: QUEUE_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    paddingHorizontal: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: 700,
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
