import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { Lyrics } from '@/api/types';
import { ThemedText } from '@/components/ThemedText';
import { PlayerSurface, Spacing } from '@/constants/theme';
import { useLyrics } from '@/features/player/hooks/use-lyrics';
import { currentLineIndex } from '@/features/player/lyrics';
import { usePlaybackStatusStore } from '@/player/use-playback-status-store';

type LyricsViewProps = {
  trackId: string;
};

/** The current Track's lyrics on the player's dark surface: loading, error with retry, an empty
 *  state, plain text, or synced lines that follow playback. Only mounted once the server is known to
 *  support lyrics (see `useLyricsSupported`). */
export function LyricsView({ trackId }: LyricsViewProps) {
  const { data, isLoading, isError, refetch } = useLyrics(trackId);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={PlayerSurface.text} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <ThemedText type="small" style={styles.message}>
          Couldn&apos;t load lyrics.
        </ThemedText>
        <Pressable accessibilityRole="button" accessibilityLabel="Retry" onPress={() => refetch()}>
          <ThemedText type="smallBold" style={styles.retry}>
            Retry
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centered}>
        <ThemedText type="small" style={styles.message}>
          No lyrics for this track.
        </ThemedText>
      </View>
    );
  }

  return data.synced ? <SyncedLyrics lyrics={data} /> : <PlainLyrics lyrics={data} />;
}

function PlainLyrics({ lyrics }: { lyrics: Lyrics }) {
  return (
    <ScrollView contentContainerStyle={styles.lines}>
      {lyrics.lines.map((line, index) => (
        <ThemedText key={index} type="default" style={styles.plain}>
          {line.text || ' '}
        </ThemedText>
      ))}
    </ScrollView>
  );
}

/** Highlights the line at the current playback position and keeps it in view. Subscribing to the
 *  position here keeps the per-tick re-render inside the synced view only. */
function SyncedLyrics({ lyrics }: { lyrics: Lyrics }) {
  const position = usePlaybackStatusStore((state) => state.position);
  const active = currentLineIndex(lyrics, position);
  const scrollRef = useRef<ScrollView>(null);
  const lineY = useRef<number[]>([]);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Centre the active line; with reduced motion, jump instead of animating.
  useEffect(() => {
    const y = lineY.current[active];
    if (active < 0 || y === undefined) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - viewportHeight / 3), animated: !reduceMotion });
  }, [active, viewportHeight, reduceMotion]);

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={styles.lines}
      onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}>
      {lyrics.lines.map((line, index) => (
        <ThemedText
          key={index}
          type="defaultBold"
          accessibilityState={{ selected: index === active }}
          onLayout={(event) => {
            lineY.current[index] = event.nativeEvent.layout.y;
          }}
          style={index === active ? styles.active : styles.inactive}>
          {line.text || ' '}
        </ThemedText>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  message: {
    color: PlayerSurface.textSecondary,
    textAlign: 'center',
  },
  retry: {
    color: PlayerSurface.text,
  },
  lines: {
    gap: Spacing.three,
    padding: Spacing.four,
  },
  plain: {
    color: PlayerSurface.text,
  },
  active: {
    color: PlayerSurface.text,
  },
  inactive: {
    color: PlayerSurface.textMuted,
  },
});
