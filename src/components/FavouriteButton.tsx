import { SymbolView } from 'expo-symbols';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { useStar, useUnstar } from '@/features/favourites/hooks/use-star';
import type { StarTarget } from '@/features/favourites/starred-cache';
import { usePopAnimation } from '@/hooks/use-pop-animation';
import { useTheme } from '@/hooks/use-theme';

type FavouriteButtonProps = {
  /** The item to favourite, plus its kind — carries the current `starred` state used to render
   *  the filled vs. outline heart and to decide star vs. unstar on tap. */
  target: StarTarget;
  size?: number;
};

/** A standalone one-tap favourite heart — used on album/artist detail headers and now-playing,
 *  where favouriting intent is highest. Dense list rows favourite via TrackActionsMenu instead. */
export function FavouriteButton({ target, size = 24 }: FavouriteButtonProps) {
  const theme = useTheme();
  const star = useStar();
  const unstar = useUnstar();
  const starred = target.item.starred;
  const { style: popStyle, pop, shrink } = usePopAnimation();

  // Animate on the flip itself (not the tap) so an optimistic star and its rollback both show.
  // Switching to a different item (e.g. the next track in Now Playing) is not a flip, so skip it.
  const itemId = target.item.id;
  const previous = useRef({ itemId, starred });
  useEffect(() => {
    const before = previous.current;
    previous.current = { itemId, starred };
    if (before.itemId !== itemId || before.starred === starred) return;
    if (starred) pop();
    else shrink();
  }, [itemId, starred, pop, shrink]);

  return (
    <Pressable
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={starred ? 'Remove from Favourites' : 'Add to Favourites'}
      onPress={() => (starred ? unstar : star).mutate(target)}
      style={({ pressed }) => pressed && styles.pressed}>
      <Animated.View style={popStyle}>
        <SymbolView
          name={
            starred
              ? { ios: 'heart.fill', android: 'favorite', web: 'favorite' }
              : { ios: 'heart', android: 'favorite_border', web: 'favorite_border' }
          }
          size={size}
          tintColor={starred ? '#e0245e' : theme.textSecondary}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.6,
  },
});
