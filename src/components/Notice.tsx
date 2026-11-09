import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useNoticeStore } from '@/components/use-notice-store';
import { MaxContentWidth, Spacing } from '@/constants/theme';

/** How long a notice stays up before auto-dismissing. */
const VISIBLE_MS = 4000;

/**
 * The app-level `Notice` surface — a transient banner docked below the status bar, mounted once as
 * a sibling of the tabs/MiniPlayer in _layout.tsx (see ADR 0005's overlay layering, ADR 0007 for
 * the primitive). Non-blocking: it fades in, auto-dismisses after {@link VISIBLE_MS}, and can be
 * tapped away early. Renders nothing when there's no active notice.
 */
export function Notice() {
  const insets = useSafeAreaInsets();
  const current = useNoticeStore((state) => state.current);
  const dismiss = useNoticeStore((state) => state.dismiss);
  const [opacity] = useState(() => new Animated.Value(0));

  // Re-run on every notice id — a fresh message restarts the fade-in and the dismiss timer.
  useEffect(() => {
    if (!current) return;
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(dismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  if (!current) return null;

  return (
    <Animated.View style={[styles.container, { top: insets.top + Spacing.two, opacity }]}>
      <Pressable onPress={dismiss}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="small" numberOfLines={2} style={styles.message}>
            {current.message}
          </ThemedText>
          {current.action && (
            <Pressable hitSlop={8} onPress={current.action.onPress}>
              <ThemedText type="smallBold">{current.action.label}</ThemedText>
            </Pressable>
          )}
        </ThemedView>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.two,
    right: Spacing.two,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    // A soft shadow so the banner reads as floating above content on both platforms.
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  message: {
    flex: 1,
  },
});
