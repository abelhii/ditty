import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/auth/use-auth-store';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  const theme = useTheme();
  const logout = useAuthStore((state) => state.logout);
  const credentials = useAuthStore((state) => state.credentials);

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
  logOutRow: {
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
