import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import type { Track } from '@/api/types';
import { useAuthStore } from '@/auth/useAuthStore';
import { CoverArtImage } from '@/components/CoverArtImage';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as PlaybackController from '@/player/PlaybackController';
import { usePlayerStore } from '@/player/usePlayerStore';
import { usePlayerUiStore } from '@/player/usePlayerUiStore';

const ROW_HEIGHT = 64;
const REMOVE_THRESHOLD = 80;

/**
 * The full queue as a JS overlay stacked above the now-playing screen. Already-played tracks are
 * dimmed above the highlighted current track; upcoming tracks below. Tap a row to jump to it
 * (QueueManager.jumpTo), drag the handle to reorder (reorder), swipe a row left to remove
 * (removeAt). Rows are absolutely positioned on a fixed ROW_HEIGHT grid so the drag math stays
 * simple; PanResponder throughout keeps it reanimated-free and identical across platforms.
 */
export function QueueScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const queueOpen = usePlayerUiStore((state) => state.queueOpen);
  const closeQueue = usePlayerUiStore((state) => state.closeQueue);
  const credentials = useAuthStore((state) => state.credentials);

  const queue = usePlayerStore((state) => state.queue);
  const { tracks, currentIndex } = queue;

  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState(0);
  const hoverRef = useRef(0);
  const [dragY] = useState(() => new Animated.Value(0));

  const onDragStart = useCallback(
    (index: number) => {
      dragY.setValue(0);
      hoverRef.current = index;
      setHoverIndex(index);
      setDraggingIndex(index);
    },
    [dragY],
  );

  const onDragMove = useCallback(
    (index: number, dy: number) => {
      dragY.setValue(dy);
      const target = Math.min(
        tracks.length - 1,
        Math.max(0, index + Math.round(dy / ROW_HEIGHT)),
      );
      if (target !== hoverRef.current) {
        hoverRef.current = target;
        setHoverIndex(target);
      }
    },
    [dragY, tracks.length],
  );

  const onDragEnd = useCallback(
    (index: number) => {
      if (hoverRef.current !== index) {
        PlaybackController.reorderQueue(index, hoverRef.current);
      }
      setDraggingIndex(null);
    },
    [],
  );

  const onJump = useCallback((index: number) => PlaybackController.jumpTo(index), []);
  const onRemove = useCallback((index: number) => PlaybackController.removeFromQueue(index), []);

  if (!queueOpen) return null;

  return (
    <ThemedView style={styles.overlay}>
      <View style={[styles.content, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable hitSlop={12} onPress={closeQueue} style={styles.headerButton}>
            <SymbolView
              name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
              size={26}
              tintColor={theme.text}
            />
          </Pressable>
          <ThemedText type="smallBold">Queue</ThemedText>
          <View style={styles.headerButton} />
        </View>

        <ScrollView
          scrollEnabled={draggingIndex === null}
          contentContainerStyle={{
            height: tracks.length * ROW_HEIGHT + insets.bottom + Spacing.four,
          }}>
          {tracks.map((track, index) => (
            <QueueRow
              key={`${track.id}-${index}`}
              track={track}
              index={index}
              coverArtUri={
                (credentials &&
                  getCoverArtUrl(credentials.serverUrl, track.coverArtId, credentials, CoverArtSize.list)) ||
                undefined
              }
              isCurrent={index === currentIndex}
              isPlayed={index < currentIndex}
              isDragging={index === draggingIndex}
              shift={shiftFor(index, draggingIndex, hoverIndex)}
              dragY={dragY}
              onJump={onJump}
              onRemove={onRemove}
              onDragStart={onDragStart}
              onDragMove={onDragMove}
              onDragEnd={onDragEnd}
            />
          ))}
        </ScrollView>
      </View>
    </ThemedView>
  );
}

/** How far a non-dragged row shifts to open a gap at the drag target. */
function shiftFor(index: number, from: number | null, to: number): number {
  if (from === null || index === from) return 0;
  if (from < to && index > from && index <= to) return -ROW_HEIGHT;
  if (from > to && index < from && index >= to) return ROW_HEIGHT;
  return 0;
}

type QueueRowProps = {
  track: Track;
  index: number;
  coverArtUri?: string;
  isCurrent: boolean;
  isPlayed: boolean;
  isDragging: boolean;
  shift: number;
  dragY: Animated.Value;
  onJump: (index: number) => void;
  onRemove: (index: number) => void;
  onDragStart: (index: number) => void;
  onDragMove: (index: number, dy: number) => void;
  onDragEnd: (index: number) => void;
};

function QueueRow({
  track,
  index,
  coverArtUri,
  isCurrent,
  isPlayed,
  isDragging,
  shift,
  dragY,
  onJump,
  onRemove,
  onDragStart,
  onDragMove,
  onDragEnd,
}: QueueRowProps) {
  const theme = useTheme();
  const [translateX] = useState(() => new Animated.Value(0));

  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
        onPanResponderMove: (_, gesture) => translateX.setValue(Math.min(0, gesture.dx)),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -REMOVE_THRESHOLD) {
            Animated.timing(translateX, {
              toValue: -400,
              duration: 150,
              useNativeDriver: true,
            }).start(() => onRemove(index));
          } else {
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          }
        },
      }),
    [index, onRemove, translateX],
  );

  const drag = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => onDragStart(index),
        onPanResponderMove: (_, gesture) => onDragMove(index, gesture.dy),
        onPanResponderRelease: () => onDragEnd(index),
        onPanResponderTerminate: () => onDragEnd(index),
      }),
    [index, onDragStart, onDragMove, onDragEnd],
  );

  return (
    <Animated.View
      style={[
        styles.row,
        {
          top: index * ROW_HEIGHT,
          zIndex: isDragging ? 10 : 0,
          transform: [{ translateY: isDragging ? dragY : shift }],
        },
      ]}>
      <View style={[styles.removeBackground, { backgroundColor: theme.backgroundSelected }]}>
        <SymbolView
          name={{ ios: 'trash', android: 'delete', web: 'delete' }}
          size={20}
          tintColor={theme.textSecondary}
        />
      </View>

      <Animated.View
        style={[styles.swipeLayer, { transform: [{ translateX }] }]}
        {...swipe.panHandlers}>
        <Pressable
          onPress={() => onJump(index)}
          style={({ pressed }) => [
            styles.rowInner,
            isCurrent && { backgroundColor: theme.backgroundSelected },
            pressed && styles.pressed,
          ]}>
          <CoverArtImage uri={coverArtUri} style={[styles.thumbnail, isPlayed && styles.dimmed]} />
          <View style={[styles.text, isPlayed && styles.dimmed]}>
            <ThemedText numberOfLines={1} themeColor={isCurrent ? 'text' : undefined}>
              {track.title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {track.artist}
            </ThemedText>
          </View>
        </Pressable>
      </Animated.View>

      <View style={styles.handle} {...drag.panHandlers}>
        <SymbolView
          name={{ ios: 'line.3.horizontal', android: 'drag_handle', web: 'drag_handle' }}
          size={22}
          tintColor={theme.textSecondary}
        />
      </View>
    </Animated.View>
  );
}

const HANDLE_WIDTH = 52;

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  headerButton: {
    width: 40,
  },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ROW_HEIGHT,
  },
  removeBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: Spacing.four,
  },
  swipeLayer: {
    flex: 1,
  },
  rowInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingLeft: Spacing.four,
    paddingRight: HANDLE_WIDTH,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: Spacing.one,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  dimmed: {
    opacity: 0.45,
  },
  handle: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: HANDLE_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
