import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';
import { usePlaybackStatusStore } from '@/player/use-playback-status-store';

const SIZE = 18;
const BAR_WIDTH = 3;
const BAR_DURATIONS = [420, 560, 480];

/** The "now playing" glyph for a track row's leading slot: a three-bar equaliser while audio is
 *  playing, a pause glyph otherwise. Bars hold still when the OS asks for reduced motion. */
export function PlayingIndicator() {
  const theme = useTheme();
  const playing = usePlaybackStatusStore((state) => state.status === 'playing');

  if (!playing) {
    return (
      <View style={styles.box}>
        <SymbolView
          name={{ ios: 'pause.fill', android: 'pause', web: 'pause' }}
          size={SIZE - 2}
          tintColor={theme.accent}
        />
      </View>
    );
  }

  return (
    <View style={[styles.box, styles.bars]}>
      {BAR_DURATIONS.map((duration, index) => (
        <Bar key={duration} duration={duration} delay={index * 90} color={theme.accent} />
      ))}
    </View>
  );
}

function Bar({ duration, delay, color }: { duration: number; delay: number; color: string }) {
  const reducedMotion = useReducedMotion();
  const level = useSharedValue(0.6);

  useEffect(() => {
    if (reducedMotion) {
      cancelAnimation(level);
      level.value = 0.6;
      return;
    }
    level.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.25, { duration, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(level);
  }, [reducedMotion, delay, duration, level]);

  const animatedStyle = useAnimatedStyle(() => ({ height: SIZE * level.value }));

  return <Animated.View style={[styles.bar, { backgroundColor: color }, animatedStyle]} />;
}

const styles = StyleSheet.create({
  box: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: 1,
  },
});
