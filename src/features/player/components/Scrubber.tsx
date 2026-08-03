import { useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTime } from '@/player/hooks/use-progress';

type ScrubberProps = {
  position: number;
  duration: number;
  /** `position / duration`, clamped 0–1 (from useProgress). */
  fraction: number;
  /** Called once, on release, with the seek target in seconds. */
  onSeek: (seconds: number) => void;
};

/** A draggable playback-position bar. While the user is dragging, it shows the drag target
 *  locally and only commits the seek on release — so the live `position` ticking underneath
 *  doesn't fight the finger. Built on PanResponder (no reanimated dependency), so it behaves
 *  the same on iOS/Android/web. */
export function Scrubber({ position, duration, fraction, onSeek }: ScrubberProps) {
  const theme = useTheme();
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

  return (
    <View style={styles.container}>
      <View style={styles.track} onLayout={onLayout} {...responder.panHandlers}>
        <View style={styles.trackBackground} />
        <View
          style={[styles.fill, { backgroundColor: theme.text, width: `${shownFraction * 100}%` }]}
        />
        <View
          style={[
            styles.thumb,
            { backgroundColor: theme.text, left: `${shownFraction * 100}%` },
          ]}
        />
      </View>
      <View style={styles.times}>
        <ThemedText type="small" themeColor="textSecondary">
          {formatTime(shownPosition)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatTime(duration)}
        </ThemedText>
      </View>
    </View>
  );
}

const THUMB = 14;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: Spacing.one,
  },
  track: {
    height: 28,
    justifyContent: 'center',
  },
  trackBackground: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.3)',
  },
  fill: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    marginLeft: -THUMB / 2,
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
