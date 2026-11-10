import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import { useAuthStore } from '@/auth/use-auth-store';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const AVATAR_SIZE = 44;

type WideTopBarProps = {
  value: string;
  onChangeText?: (text: string) => void;
  /** Home's field is an entry point to Search: it opens the Search screen as soon as it is focused. */
  onFocus?: () => void;
  /** Escape pressed in the field. */
  onEscape?: () => void;
  /** The clear button was pressed (shown only while the field has text). */
  onClear?: () => void;
  autoFocus?: boolean;
};

/** The wide layout's content-pane top bar: a pill search field on the left, the account avatar
 *  (opens Settings) on the right. */
export function WideTopBar({ value, onChangeText, onFocus, onEscape, onClear, autoFocus }: WideTopBarProps) {
  const router = useRouter();
  const theme = useTheme();
  const username = useAuthStore((state) => state.credentials?.username);

  return (
    <ThemedView style={styles.bar}>
      <ThemedView type="backgroundElement" style={styles.field}>
        <SymbolView
          name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
          size={18}
          tintColor={theme.textSecondary}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onKeyPress={(event) => {
            if (event.nativeEvent.key === 'Escape') onEscape?.();
          }}
          autoFocus={autoFocus}
          placeholder="Artists, albums, songs"
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel="Search"
          style={[styles.input, { color: theme.text }]}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {value.length > 0 && (
          <Pressable hitSlop={12} accessibilityRole="button" accessibilityLabel="Clear search" onPress={onClear}>
            <SymbolView
              name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
              size={18}
              tintColor={theme.textSecondary}
            />
          </Pressable>
        )}
      </ThemedView>
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
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  field: {
    flex: 1,
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  avatar: {
    marginLeft: 'auto',
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
