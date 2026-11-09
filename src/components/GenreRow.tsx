import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import type { Genre } from '@/api/types';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type GenreRowProps = {
  genre: Genre;
  onPress: () => void;
};

export function GenreRow({ genre, onPress }: GenreRowProps) {
  const theme = useTheme();

  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress}>
      <ThemedView style={styles.text}>
        <ThemedText numberOfLines={1}>{genre.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {genre.albumCount} {genre.albumCount === 1 ? 'album' : 'albums'}
        </ThemedText>
      </ThemedView>
      <SymbolView
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        size={14}
        weight="bold"
        tintColor={theme.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});
