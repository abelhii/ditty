import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useCallback, useRef, useState, type ReactElement, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  type LayoutChangeEvent,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Fallback scroll distance before the list has been laid out. */
const FALLBACK_PAGE = 192;
const PAGE_FRACTION = 0.8;

type CarouselProps<T> = {
  title: string;
  /** `undefined` while there is nothing to show yet. An empty list renders nothing. */
  data: T[] | undefined;
  keyExtractor: (item: T) => string;
  renderItem: ListRenderItem<T>;
  /** Height reserved for the spinner while `loading`, so Home doesn't jump when the row arrives. */
  loadingHeight: number;
  loading?: boolean;
  /** Shows a refresh button in the header. */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Extra header content, e.g. a "See all" link. */
  headerExtra?: ReactNode;
  /** Space between items. */
  gap?: number;
};

/**
 * A titled horizontal list with left/right scroll buttons and an optional refresh button. The
 * buttons page the row by most of the viewport and disable at each end; touch users can still swipe.
 * Renders a slim spinner while `loading` and nothing when `data` is empty, so Home degrades to the
 * lists that have content.
 */
export function Carousel<T>({
  title,
  data,
  keyExtractor,
  renderItem,
  loadingHeight,
  loading,
  onRefresh,
  refreshing,
  headerExtra,
  gap = Spacing.three,
}: CarouselProps<T>): ReactElement | null {
  const listRef = useRef<FlatList<T>>(null);
  const offset = useRef(0);
  const viewport = useRef(0);
  const contentWidth = useRef(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // A 1px slop keeps the end buttons from staying enabled on sub-pixel scroll offsets.
  const recomputeArrows = useCallback(() => {
    setCanScrollLeft(offset.current > 1);
    setCanScrollRight(offset.current < contentWidth.current - viewport.current - 1);
  }, []);

  const scrollBy = useCallback((direction: 1 | -1) => {
    const page = viewport.current * PAGE_FRACTION || FALLBACK_PAGE;
    const max = Math.max(0, contentWidth.current - viewport.current);
    const next = Math.min(max, Math.max(0, offset.current + direction * page));
    listRef.current?.scrollToOffset({ offset: next, animated: true });
  }, []);

  if (loading) {
    return (
      <View style={styles.section}>
        <View style={styles.header}>
          <ThemedText type="defaultBold">{title}</ThemedText>
        </View>
        <ActivityIndicator style={{ height: loadingHeight }} />
      </View>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <ThemedText type="defaultBold" style={styles.title} numberOfLines={1}>
          {title}
        </ThemedText>
        {headerExtra}
        <View style={styles.controls}>
          <ControlButton
            icon={ICONS.left}
            label="Scroll left"
            disabled={!canScrollLeft}
            onPress={() => scrollBy(-1)}
          />
          <ControlButton
            icon={ICONS.right}
            label="Scroll right"
            disabled={!canScrollRight}
            onPress={() => scrollBy(1)}
          />
          {onRefresh && (
            <ControlButton
              icon={ICONS.refresh}
              label={`Refresh ${title}`}
              disabled={refreshing ?? false}
              onPress={onRefresh}
            />
          )}
        </View>
      </View>
      <FlatList<T>
        ref={listRef}
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, { gap }]}
        scrollEventThrottle={16}
        onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
          offset.current = event.nativeEvent.contentOffset.x;
          recomputeArrows();
        }}
        onLayout={(event: LayoutChangeEvent) => {
          viewport.current = event.nativeEvent.layout.width;
          recomputeArrows();
        }}
        onContentSizeChange={(width: number) => {
          contentWidth.current = width;
          recomputeArrows();
        }}
      />
    </View>
  );
}

const ICONS: Record<'left' | 'right' | 'refresh', SymbolViewProps['name']> = {
  left: { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  right: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  refresh: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
};

type ControlButtonProps = {
  icon: SymbolViewProps['name'];
  label: string;
  disabled: boolean;
  onPress: () => void;
};

function ControlButton({ icon, label, disabled, onPress }: ControlButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      hitSlop={8}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.button, disabled && styles.buttonDisabled, pressed && styles.pressed]}>
      <SymbolView name={icon} size={20} tintColor={theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  button: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  buttonDisabled: {
    opacity: 0.3,
  },
  pressed: {
    opacity: 0.6,
  },
  row: {
    paddingHorizontal: Spacing.four,
  },
});
