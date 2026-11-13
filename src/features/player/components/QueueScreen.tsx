import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import type { Track } from '@/api/types';
import { useAuthStore } from '@/auth/use-auth-store';
import { CoverArtImage } from '@/components/CoverArtImage';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { PlayerOverlay } from '@/features/player/components/PlayerOverlay';
import { buildQueueListItems, type QueueRowSection } from '@/features/player/queue-sections';
import { useIsWideLayout } from '@/hooks/use-is-wide-layout';
import { useTheme } from '@/hooks/use-theme';
import * as PlaybackController from '@/player/PlaybackController';
import type { QueueState } from '@/player/QueueManager';
import { usePlayerStore } from '@/player/use-player-store';
import { usePlayerUiStore } from '@/player/use-player-ui-store';

const ROW_HEIGHT = 64;
const HEADING_HEIGHT = 40;
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
  const wide = useIsWideLayout();

  // On the wide layout the Queue is a permanent panel in the full player, not an overlay.
  if (!queueOpen || wide) return null;

  return (
    <PlayerOverlay onRequestClose={closeQueue}>
      <ThemedView style={styles.overlay}>
        <View style={[styles.content, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <Pressable
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close Queue"
              onPress={closeQueue}
              style={styles.headerButton}>
              <SymbolView
                name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
                size={26}
                tintColor={theme.text}
              />
            </Pressable>
            <ThemedText type="smallBold">Queue</ThemedText>
            <View style={[styles.headerButton, styles.headerEnd]}>
              <ClearQueueButton color={theme.textSecondary} />
            </View>
          </View>

          <QueueList />
        </View>
      </ThemedView>
    </PlayerOverlay>
  );
}

type QueueListPalette = {
  background: string;
  selected: string;
  text: string;
  textSecondary: string;
};

type QueueListProps = {
  /** Colours for a list that sits on a surface other than the app background (the wide player's
   *  dark panel). Defaults to the app theme. */
  palette?: QueueListPalette;
};

type ClearQueueButtonProps = {
  color: string;
};

/** "Clear queue": confirms, then stops playback and empties the Queue. Absent when the Queue is
 *  already empty. Shared by the Queue overlay's header and the wide player's panel. */
export function ClearQueueButton({ color }: ClearQueueButtonProps) {
  const hasTracks = usePlayerStore((state) => state.queue.tracks.length > 0);
  const [confirming, setConfirming] = useState(false);

  if (!hasTracks) return null;

  return (
    <>
      <Pressable
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Clear queue"
        onPress={() => setConfirming(true)}>
        <ThemedText type="small" style={{ color }}>
          Clear queue
        </ThemedText>
      </Pressable>
      <ConfirmModal
        visible={confirming}
        title="Clear queue?"
        message="Playback will stop and every Track will be removed from the Queue."
        confirmLabel="Clear"
        onConfirm={() => {
          setConfirming(false);
          PlaybackController.clearQueue();
        }}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

/** The reorderable list of Queue tracks, shared by the Queue overlay and the wide player's panel. */
export function QueueList({ palette }: QueueListProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colors = palette ?? {
    background: theme.background,
    selected: theme.backgroundSelected,
    text: theme.text,
    textSecondary: theme.textSecondary,
  };
  const credentials = useAuthStore((state) => state.credentials);

  const queue = usePlayerStore((state) => state.queue);
  const { tracks } = queue;

  const { placed, tops, contentHeight } = useMemo(() => layoutQueueItems(queue), [queue]);

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
      // The row whose slot is nearest to where the dragged row now sits.
      let target = index;
      for (let i = 0; i < tops.length; i++) {
        if (Math.abs(tops[i] - (tops[index] + dy)) < Math.abs(tops[target] - (tops[index] + dy))) target = i;
      }
      if (target !== hoverRef.current) {
        hoverRef.current = target;
        setHoverIndex(target);
      }
    },
    [dragY, tops],
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
  const onMove = useCallback(
    (from: number, to: number) => PlaybackController.reorderQueue(from, to),
    [],
  );

  return (
    <ScrollView
      scrollEnabled={draggingIndex === null}
      contentContainerStyle={{
        height: contentHeight + insets.bottom + Spacing.four,
      }}>
      {placed.map(({ item, top }) => {
        if (item.type === 'heading') {
          return (
            <View key={item.key} style={[styles.heading, { top }]}>
              <ThemedText type="smallBold" accessibilityRole="header" style={{ color: colors.textSecondary }}>
                {item.title}
              </ThemedText>
            </View>
          );
        }
        const { index } = item;
        const track = tracks[index];
        return (
          <QueueRow
            key={`${track.id}-${index}`}
            track={track}
            index={index}
            top={top}
            colors={colors}
            coverArtUri={
              (credentials &&
                getCoverArtUrl(credentials.serverUrl, track.coverArtId, credentials, CoverArtSize.list)) ||
              undefined
            }
            section={item.section}
            isDragging={index === draggingIndex}
            shift={shiftFor(index, draggingIndex, hoverIndex)}
            dragY={dragY}
            onJump={onJump}
            onRemove={onRemove}
            onMove={onMove}
            lastIndex={tracks.length - 1}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
          />
        );
      })}
    </ScrollView>
  );
}

/** Rows sit on a fixed grid, with a heading's height added between sections. `placed` carries each
 *  item's top; `tops[i]` is where `tracks[i]` is drawn (what the drag math measures against). */
function layoutQueueItems(queue: QueueState) {
  const tops: number[] = [];
  let y = 0;
  const placed = buildQueueListItems(queue).map((item) => {
    const top = y;
    if (item.type === 'row') tops[item.index] = top;
    y += item.type === 'heading' ? HEADING_HEIGHT : ROW_HEIGHT;
    return { item, top };
  });
  return { placed, tops, contentHeight: y };
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
  /** Distance from the top of the list, which includes the section headings above this row. */
  top: number;
  colors: QueueListPalette;
  coverArtUri?: string;
  section: QueueRowSection;
  isDragging: boolean;
  shift: number;
  dragY: Animated.Value;
  onJump: (index: number) => void;
  onRemove: (index: number) => void;
  onMove: (from: number, to: number) => void;
  lastIndex: number;
  onDragStart: (index: number) => void;
  onDragMove: (index: number, dy: number) => void;
  onDragEnd: (index: number) => void;
};

function QueueRow({
  track,
  index,
  top,
  colors,
  coverArtUri,
  section,
  isDragging,
  shift,
  dragY,
  onJump,
  onRemove,
  onMove,
  lastIndex,
  onDragStart,
  onDragMove,
  onDragEnd,
}: QueueRowProps) {
  const isCurrent = section === 'nowPlaying';
  const isPlayed = section === 'played';
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

  // Non-gesture paths for the swipe and the drag handle (screen readers, switch/keyboard users).
  const accessibilityActions = [
    ...(index > 0 ? [{ name: 'moveUp', label: 'Move up' }] : []),
    ...(index < lastIndex ? [{ name: 'moveDown', label: 'Move down' }] : []),
    { name: 'remove', label: 'Remove from Queue' },
  ];

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
          top,
          zIndex: isDragging ? 10 : 0,
          transform: [{ translateY: isDragging ? dragY : shift }],
        },
      ]}>
      <View style={[styles.removeBackground, { backgroundColor: colors.selected }]}>
        <SymbolView
          name={{ ios: 'trash', android: 'delete', web: 'delete' }}
          size={20}
          tintColor={colors.textSecondary}
        />
      </View>

      {/* Opaque, so the remove layer underneath only shows where a swipe has slid this aside. */}
      <Animated.View
        style={[
          styles.swipeLayer,
          {
            backgroundColor: isCurrent ? colors.selected : colors.background,
            transform: [{ translateX }],
          },
        ]}
        {...swipe.panHandlers}>
        <Pressable
          onPress={() => onJump(index)}
          accessibilityActions={accessibilityActions}
          onAccessibilityAction={(event) => {
            switch (event.nativeEvent.actionName) {
              case 'moveUp':
                onMove(index, index - 1);
                break;
              case 'moveDown':
                onMove(index, index + 1);
                break;
              case 'remove':
                onRemove(index);
                break;
            }
          }}
          style={({ pressed }) => [styles.rowInner, pressed && styles.pressed]}>
          <CoverArtImage uri={coverArtUri} style={[styles.thumbnail, isPlayed && styles.dimmed]} />
          <View style={[styles.text, isPlayed && styles.dimmed]}>
            <ThemedText numberOfLines={1} style={{ color: colors.text }}>
              {track.title}
            </ThemedText>
            <ThemedText type="small" numberOfLines={1} style={{ color: colors.textSecondary }}>
              {track.artist}
            </ThemedText>
          </View>
          {section === 'userAdded' && (
            <ThemedText type="small" numberOfLines={1} style={{ color: colors.textSecondary }}>
              Added by you
            </ThemedText>
          )}
        </Pressable>
      </Animated.View>

      <View style={styles.handle} accessible accessibilityLabel={`Reorder ${track.title}`} {...drag.panHandlers}>
        <SymbolView
          name={{ ios: 'line.3.horizontal', android: 'drag_handle', web: 'drag_handle' }}
          size={22}
          tintColor={colors.textSecondary}
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
    width: 96,
    alignItems: 'flex-start',
  },
  headerEnd: {
    alignItems: 'flex-end',
  },
  heading: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: HEADING_HEIGHT,
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.one,
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
