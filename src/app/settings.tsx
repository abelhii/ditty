import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/auth/use-auth-store';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreferenceStore, type ThemePreference } from '@/hooks/use-theme-preference-store';

const APPEARANCE_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const logout = useAuthStore((state) => state.logout);
  const credentials = useAuthStore((state) => state.credentials);
  const preference = useThemePreferenceStore((state) => state.preference);
  const setPreference = useThemePreferenceStore((state) => state.setPreference);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Settings</ThemedText>

        {credentials && (
          <ThemedView type="backgroundElement" style={styles.serverInfo}>
            <ThemedText type="small" themeColor="textSecondary">
              Signed in to
            </ThemedText>
            <ThemedText type="small">{credentials.serverUrl}</ThemedText>
          </ThemedView>
        )}

        <ThemedView style={styles.appearance}>
          <ThemedText type="small" themeColor="textSecondary">
            Appearance
          </ThemedText>
          <ThemedView
            type="backgroundElement"
            accessibilityRole="radiogroup"
            style={styles.segments}>
            {APPEARANCE_OPTIONS.map((option) => {
              const selected = option.value === preference;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setPreference(option.value)}
                  style={[styles.segment, selected && { backgroundColor: theme.accent }]}>
                  <ThemedText type="small" style={selected ? { color: theme.tint } : undefined}>
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ThemedView>
        </ThemedView>

        <Pressable
          style={({ pressed }) => [styles.logOutRow, pressed && styles.pressed]}
          onPress={() => logout()}>
          <ThemedText style={{ color: theme.accentDeep }}>
            Log out
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.four,
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  serverInfo: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  appearance: {
    gap: Spacing.two,
  },
  segments: {
    flexDirection: 'row',
    borderRadius: Radius.pill,
    padding: Spacing.one,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Radius.pill,
    paddingVertical: Spacing.two,
  },
  logOutRow: {
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
