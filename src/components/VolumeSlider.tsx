import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { type GestureResponderEvent, type LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { ProgressBarHeight, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type VolumeSliderProps = {
  /** 0-1. */
  volume: number;
  /** Called continuously while dragging, and on a tap, with the new 0-1 volume. */
  onChange: (volume: number) => void;
};

const THUMB = 14;

/** A speaker glyph plus a draggable 0-1 bar. Unlike the Scrubber it commits live, since changing
 *  volume mid-drag is the point. Uses the View responder props directly, so it behaves the same on
 *  web and native. */
export function VolumeSlider({ volume, onChange }: VolumeSliderProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const update = (event: GestureResponderEvent) =>
    onChange(width > 0 ? Math.min(1, Math.max(0, event.nativeEvent.locationX / width)) : 0);

  return (
    <View style={styles.row}>
      <SymbolView
        name={
          volume === 0
            ? { ios: 'speaker.slash.fill', android: 'volume_off', web: 'volume_off' }
            : { ios: 'speaker.wave.2.fill', android: 'volume_up', web: 'volume_up' }
        }
        size={20}
        tintColor={theme.textSecondary}
      />
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Volume"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(volume * 100) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          const delta = event.nativeEvent.actionName === 'increment' ? 0.1 : event.nativeEvent.actionName === 'decrement' ? -0.1 : 0;
          if (delta !== 0) onChange(Math.min(1, Math.max(0, Math.round((volume + delta) * 10) / 10)));
        }}
        style={styles.track}
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onResponderGrant={update}
        onResponderMove={update}>
        <View style={[styles.bar, { backgroundColor: theme.backgroundSelected }]} />
        <View style={[styles.bar, styles.fill, { backgroundColor: theme.accent, width: `${volume * 100}%` }]} />
        <View style={[styles.thumb, { backgroundColor: theme.text, left: `${volume * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  track: {
    width: 80,
    height: 28,
    justifyContent: 'center',
  },
  bar: {
    height: ProgressBarHeight,
    borderRadius: Radius.pill,
  },
  fill: {
    position: 'absolute',
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    marginLeft: -THUMB / 2,
  },
});
