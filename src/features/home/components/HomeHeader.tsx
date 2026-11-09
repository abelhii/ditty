import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { useAuthStore } from '@/auth/use-auth-store';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Spacing } from '@/constants/theme';
import { greetingForHour } from '@/features/home/greeting';
import { useTheme } from '@/hooks/use-theme';

const AVATAR_SIZE = 44;

/** Home's top row: time-of-day greeting, a search shortcut, and an account avatar (the signed-in
 *  username's initial) that opens Settings. */
export function HomeHeader() {
  const router = useRouter();
  const theme = useTheme();
  const username = useAuthStore((state) => state.credentials?.username);

  return (
    <ThemedView style={styles.row}>
      <ThemedText type="title" style={styles.greeting} numberOfLines={1}>
        {greetingForHour(new Date().getHours())}
      </ThemedText>
      <Pressable
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Search"
        onPress={() => router.push('/search')}
        style={({ pressed }) => pressed && styles.pressed}>
        <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={26} tintColor={theme.text} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Settings"
        onPress={() => router.push('/settings')}
        style={({ pressed }) => [styles.avatar, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
        <ThemedText type="smallBold">{username?.charAt(0).toUpperCase() ?? ''}</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  greeting: {
    flex: 1,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
