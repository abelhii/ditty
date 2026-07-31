import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { useStar, useUnstar } from '@/features/favourites/hooks/useStar';
import type { StarTarget } from '@/features/favourites/starredCache';
import { useTheme } from '@/hooks/useTheme';

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

  return (
    <Pressable
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={starred ? 'Remove from Favourites' : 'Add to Favourites'}
      onPress={() => (starred ? unstar : star).mutate(target)}
      style={({ pressed }) => pressed && styles.pressed}>
      <SymbolView
        name={
          starred
            ? { ios: 'heart.fill', android: 'favorite', web: 'favorite' }
            : { ios: 'heart', android: 'favorite_border', web: 'favorite_border' }
        }
        size={size}
        tintColor={starred ? '#e0245e' : theme.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.6,
  },
});
