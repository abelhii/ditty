import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, TextInput, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Radius, Spacing } from '@/constants/theme';
import type { SortDirection, SortOption } from '@/features/library/list-sort';
import { useTheme } from '@/hooks/use-theme';

type ListControlsProps<K extends string> = {
  query: string;
  onQueryChange: (query: string) => void;
  placeholder: string;
  sortOptions: SortOption<K>[];
  sort: K;
  onSortChange: (sort: K) => void;
  direction: SortDirection;
  onDirectionChange: (direction: SortDirection) => void;
  style?: StyleProp<ViewStyle>;
};

/** A filter box over a row of sort pills with an ascending/descending toggle. State is owned by
 *  the screen; this only renders it. */
export function ListControls<K extends string>({
  query,
  onQueryChange,
  placeholder,
  sortOptions,
  sort,
  onSortChange,
  direction,
  onDirectionChange,
  style,
}: ListControlsProps<K>) {
  const theme = useTheme();

  return (
    <ThemedView style={[styles.container, style]}>
      <ThemedView type="backgroundElement" style={styles.inputWrap}>
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel={placeholder}
          style={[styles.input, { color: theme.text }]}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </ThemedView>
      <ThemedView style={styles.sortRow}>
        {sortOptions.map((option) => {
          const active = option.value === sort;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${option.label}`}
              accessibilityState={{ selected: active }}
              onPress={() => onSortChange(option.value)}
              style={[
                styles.pill,
                active ? { backgroundColor: theme.accent } : { borderWidth: 1, borderColor: theme.border },
              ]}
            >
              <ThemedText type="smallBold" style={{ color: active ? theme.onAccent : theme.textSecondary }}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
        {sort !== 'default' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={direction === 'asc' ? 'Ascending' : 'Descending'}
            onPress={() => onDirectionChange(direction === 'asc' ? 'desc' : 'asc')}
            hitSlop={8}
            style={styles.direction}
          >
            <SymbolView
              name={{
                ios: direction === 'asc' ? 'arrow.up' : 'arrow.down',
                android: direction === 'asc' ? 'arrow_upward' : 'arrow_downward',
                web: direction === 'asc' ? 'arrow_upward' : 'arrow_downward',
              }}
              size={18}
              tintColor={theme.textSecondary}
            />
          </Pressable>
        ) : null}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  inputWrap: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
  },
  input: {
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pill: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  direction: {
    padding: Spacing.one,
  },
});
