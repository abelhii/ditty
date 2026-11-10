import { useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Colors, PlayerSurface, ProgressBarHeight, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTime } from '@/player/hooks/use-progress';

type ScrubberProps = {
  position: number;
  duration: number;
  /** `position / duration`, clamped 0–1 (from useProgress). */
  fraction: number;
  /** Called once, on release, with the seek target in seconds. */
  onSeek: (seconds: number) => void;
  /** `'surface'` draws on the themed light/dark surface with elapsed and total time either side of
   *  the bar (the wide floating player); the default is the full player's fixed dark surface with
   *  the times underneath. */
  variant?: 'player' | 'surface';
};

/** A draggable playback-position bar. While the user is dragging, it shows the drag target
 *  locally and only commits the seek on release — so the live `position` ticking underneath
 *  doesn't fight the finger. Built on PanResponder (no reanimated dependency), so it behaves
 *  the same on iOS/Android/web. */
export function Scrubber({ position, duration, fraction, onSeek, variant = 'player' }: ScrubberProps) {
  const theme = useTheme();
  const surface = variant === 'surface';
  const widthRef = useRef(0);
  const [dragFraction, setDragFraction] = useState<number | null>(null);

  const responder = useMemo(() => {
    const fractionAt = (locationX: number) =>
      widthRef.current > 0 ? Math.min(1, Math.max(0, locationX / widthRef.current)) : 0;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => setDragFraction(fractionAt(event.nativeEvent.locationX)),
      onPanResponderMove: (event) => setDragFraction(fractionAt(event.nativeEvent.locationX)),
      onPanResponderRelease: (event) => {
        if (duration > 0) onSeek(fractionAt(event.nativeEvent.locationX) * duration);
        setDragFraction(null);
      },
      onPanResponderTerminate: () => setDragFraction(null),
    });
  }, [duration, onSeek]);

  const shownFraction = dragFraction ?? fraction;
  const shownPosition = dragFraction !== null ? dragFraction * duration : position;

  function onLayout(event: LayoutChangeEvent) {
    widthRef.current = event.nativeEvent.layout.width;
  }

  const textColor = surface ? { color: theme.textSecondary } : undefined;

  const track = (
    <View style={surface ? styles.trackInline : styles.track} onLayout={onLayout} {...responder.panHandlers}>
      <View
        style={[
          styles.trackBackground,
          surface && { backgroundColor: theme.backgroundSelected },
        ]}
      />
      <View
        style={[
          styles.fill,
          { backgroundColor: Colors.light.accent, width: `${shownFraction * 100}%` },
        ]}
      />
      <View
        style={[
          styles.thumb,
          surface && { backgroundColor: theme.text },
          { left: `${shownFraction * 100}%` },
        ]}
      />
    </View>
  );

  if (surface) {
    return (
      <View style={styles.inlineRow}>
        <ThemedText type="small" style={[styles.timeInline, textColor]}>
          {formatTime(shownPosition)}
        </ThemedText>
        {track}
        <ThemedText type="small" style={[styles.timeInline, textColor]}>
          {formatTime(duration)}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {track}
      <View style={styles.times}>
        <ThemedText type="small" style={styles.time}>
          {formatTime(shownPosition)}
        </ThemedText>
        <ThemedText type="small" style={styles.time}>
          {formatTime(duration)}
        </ThemedText>
      </View>
    </View>
  );
}

const THUMB = 16;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: Spacing.one,
  },
  track: {
    height: 28,
    justifyContent: 'center',
  },
  trackInline: {
    flex: 1,
    height: 28,
    justifyContent: 'center',
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    width: '100%',
  },
  timeInline: {
    width: 40,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  trackBackground: {
    height: ProgressBarHeight,
    borderRadius: Radius.pill,
    backgroundColor: PlayerSurface.trackBackground,
  },
  fill: {
    position: 'absolute',
    height: ProgressBarHeight,
    borderRadius: Radius.pill,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    marginLeft: -THUMB / 2,
    backgroundColor: PlayerSurface.text,
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    color: PlayerSurface.textMuted,
  },
});
