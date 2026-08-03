import { useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import type { Album } from '@/api/types';
import { useAuthStore } from '@/auth/use-auth-store';
import { AlbumTile } from '@/components/AlbumTile';
import { ThemedText } from '@/components/ThemedText';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAlbumShelf } from '@/features/home/hooks/use-album-shelf';
import type { Shelf } from '@/features/home/shelves';

/** Fixed tile width for the horizontal carousel — narrower than the genre grid's two-up tiles. */
const TILE_WIDTH = 140;

/** Web only: touch/trackpad users swipe, but pointer-only users need explicit controls — a page is
 *  most of the viewport so consecutive clicks walk the shelf without losing their place. */
const IS_WEB = Platform.OS === 'web';
const PAGE_FRACTION = 0.8;

/**
 * One horizontal discover carousel on the Home screen (Build Order step 9): a section title over a
 * side-scrolling row of {@link AlbumTile}s. On **web** the header also carries left/right scroll
 * buttons (floated right), since there's no touch swipe there — they page the row via
 * `scrollToOffset` and disable at each end. A shelf that's still loading shows a slim spinner; one
 * that errored or came back empty renders **nothing** — Home degrades to just the shelves that have
 * content (e.g. only cached shelves when offline) rather than showing per-shelf error blocks.
 */
export function AlbumShelf({ shelf }: { shelf: Shelf }) {
  const router = useRouter();
  const credentials = useAuthStore((state) => state.credentials);
  const { data, isLoading } = useAlbumShelf(shelf);

  const listRef = useRef<FlatList<Album>>(null);
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
    const page = viewport.current * PAGE_FRACTION || TILE_WIDTH * 2;
    const max = Math.max(0, contentWidth.current - viewport.current);
    const next = Math.min(max, Math.max(0, offset.current + direction * page));
    listRef.current?.scrollToOffset({ offset: next, animated: true });
  }, []);

  // Scroll geometry is only wired up on web, where the buttons need it; native leaves the FlatList
  // untouched (no per-scroll state updates).
  const webScrollProps = IS_WEB
    ? {
        onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
          offset.current = event.nativeEvent.contentOffset.x;
          recomputeArrows();
        },
        scrollEventThrottle: 16,
        onLayout: (event: LayoutChangeEvent) => {
          viewport.current = event.nativeEvent.layout.width;
          recomputeArrows();
        },
        onContentSizeChange: (width: number) => {
          contentWidth.current = width;
          recomputeArrows();
        },
      }
    : null;

  if (isLoading) {
    return (
      <View style={styles.section}>
        <ShelfHeader title={shelf.title} />
        <ActivityIndicator style={styles.loader} />
      </View>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <View style={styles.section}>
      <ShelfHeader title={shelf.title}>
        {IS_WEB && (
          <View style={styles.controls}>
            <ScrollButton
              direction="left"
              disabled={!canScrollLeft}
              onPress={() => scrollBy(-1)}
            />
            <ScrollButton
              direction="right"
              disabled={!canScrollRight}
              onPress={() => scrollBy(1)}
            />
          </View>
        )}
      </ShelfHeader>
      <FlatList<Album>
        ref={listRef}
        data={data}
        keyExtractor={(album) => album.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        {...webScrollProps}
        renderItem={({ item }) =>
          credentials ? (
            <AlbumTile
              album={item}
              width={TILE_WIDTH}
              coverArtUri={getCoverArtUrl(credentials.serverUrl, item.coverArtId, credentials, CoverArtSize.list)}
              onPress={() => router.push(`/library/album/${item.id}`)}
            />
          ) : null
        }
      />
    </View>
  );
}

/** The shelf's title row — title on the left, optional controls (web scroll buttons) floated right. */
function ShelfHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <View style={styles.header}>
      <ThemedText type="subtitle">{title}</ThemedText>
      {children}
    </View>
  );
}

const CHEVRON: Record<'left' | 'right', SymbolViewProps['name']> = {
  left: { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  right: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
};

function ScrollButton({
  direction,
  disabled,
  onPress,
}: {
  direction: 'left' | 'right';
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      hitSlop={8}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={direction === 'left' ? 'Scroll left' : 'Scroll right'}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.button, disabled && styles.buttonDisabled, pressed && styles.pressed]}>
      <SymbolView name={CHEVRON[direction]} size={20} tintColor={theme.text} />
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
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
    gap: Spacing.three,
  },
  loader: {
    height: TILE_WIDTH,
  },
});
