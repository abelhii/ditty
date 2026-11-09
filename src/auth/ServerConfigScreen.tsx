import { useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/auth/use-auth-store';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ServerConfigScreen() {
  const theme = useTheme();
  const login = useAuthStore((state) => state.login);
  const error = useAuthStore((state) => state.error);

  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = serverUrl.trim() !== '' && username.trim() !== '' && password !== '';

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      await login(serverUrl, username, password);
    } catch {
      // Error is surfaced via the store's `error` field.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Connect to your server
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Enter your Subsonic or Navidrome server details.
        </ThemedText>

        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          placeholder="https://music.example.com"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          value={serverUrl}
          onChangeText={setServerUrl}
          editable={!isSubmitting}
        />
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          placeholder="Username"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={setUsername}
          editable={!isSubmitting}
        />
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          placeholder="Password"
          placeholderTextColor={theme.textSecondary}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!isSubmitting}
        />

        {error && (
          <ThemedText type="small" themeColor="text" style={styles.error}>
            {error}
          </ThemedText>
        )}

        {isSubmitting ? (
          <ActivityIndicator />
        ) : (
          <Button title="Connect" onPress={handleSubmit} disabled={!canSubmit} />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    justifyContent: 'center',
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  title: { marginBottom: Spacing.one },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  error: { color: '#e5484d' },
});
