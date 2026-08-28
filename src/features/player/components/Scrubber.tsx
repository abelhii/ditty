import { useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Spacing } from '@/constants/theme';
import { formatTime } from '@/player/hooks/use-progress';

/** Colors fixed to the full player's dark surface (NowPlayingScreen), independent of light/dark
 *  scheme — see that component's doc comment. Scrubber has no other consumer. */
const TRACK_BG = 'rgba(243,242,238,.25)';
const TIME_COLOR = 'rgba(243,242,238,.55)';
const THUMB_COLOR = '#f3f2ee';

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
          style={[
            styles.fill,
            { backgroundColor: Colors.light.accent, width: `${shownFraction * 100}%` },
          ]}
        />
        <View style={[styles.thumb, { left: `${shownFraction * 100}%` }]} />
      </View>
      <View style={styles.times}>
        <Text style={styles.time}>{formatTime(shownPosition)}</Text>
        <Text style={styles.time}>{formatTime(duration)}</Text>
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
    backgroundColor: TRACK_BG,
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
    backgroundColor: THUMB_COLOR,
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: TIME_COLOR,
  },
});
