import { Button, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/auth/useAuthStore';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function SettingsScreen() {
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

        <Button title="Log out" onPress={() => logout()} />
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
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
});
