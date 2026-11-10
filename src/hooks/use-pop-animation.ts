import { useCallback } from 'react';
import {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/** Shared scale feedback for one-tap actions (favourite, add to playlist). `pop` overshoots then
 *  settles; `shrink` dips then settles. Both no-op when the OS asks for reduced motion. */
export function usePopAnimation() {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const pop = useCallback(() => {
    if (reducedMotion) return;
    scale.set(
      withSequence(withTiming(1.3, { duration: 90 }), withSpring(1, { damping: 8, stiffness: 260 })),
    );
  }, [reducedMotion, scale]);

  const shrink = useCallback(() => {
    if (reducedMotion) return;
    scale.set(withSequence(withTiming(0.8, { duration: 90 }), withSpring(1, { damping: 12 })));
  }, [reducedMotion, scale]);

  return { style, pop, shrink };
}
