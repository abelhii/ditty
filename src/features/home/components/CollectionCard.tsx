import { type ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CollectionCardProps = {
  title: string;
  /** Secondary line under the title, e.g. a song count. Omitted for the Your Likes card. */
  subtitle?: string;
  /** Leading artwork. When set the card lays out as a row (the wide Your Likes card); otherwise the
   *  title and subtitle stack (the half-width playlist cards). */
  leading?: ReactNode;
  onPress: () => void;
};

/** A tappable surface card on Home's quick-access grid — Your Likes and the user's playlists. */
export function CollectionCard({ title, subtitle, leading, onPress }: CollectionCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        Shadow.floating,
        { backgroundColor: theme.backgroundElement, shadowColor: theme.shadow },
        leading ? styles.row : styles.stacked,
        pressed && styles.pressed,
      ]}>
      {leading}
      <ThemedView style={styles.text}>
        <ThemedText type="defaultBold" numberOfLines={1}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : null}
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  stacked: {
    flex: 1,
    justifyContent: 'center',
  },
  text: {
    flexShrink: 1,
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.7,
  },
});
