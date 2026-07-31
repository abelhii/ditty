import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useAuthStore } from '@/auth/useAuthStore';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

/**
 * The in-place Re-authentication prompt (ADR 0007): a blocking, password-only modal shown when the
 * server rejects the session mid-use (`reauthRequired`). Server + username are already known, so it
 * only re-collects the password, recomputes the token, and lets the Queue, query cache, and nav
 * position carry on. Mounted once in _layout.tsx alongside the tabs. A repeated rejection surfaces
 * inline; "Sign out" is the escape to a full logout (the only mid-session path that clears the Queue).
 */
export function ReauthModal() {
  const theme = useTheme();
  const reauthRequired = useAuthStore((state) => state.reauthRequired);
  const reauthError = useAuthStore((state) => state.reauthError);
  const username = useAuthStore((state) => state.credentials?.username);
  const reauthenticate = useAuthStore((state) => state.reauthenticate);
  const logout = useAuthStore((state) => state.logout);

  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!password) return;
    setIsSubmitting(true);
    try {
      await reauthenticate(password);
      setPassword('');
    } catch {
      // Surfaced via the store's `reauthError` field; keep the modal up for another attempt.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal visible={reauthRequired} transparent animationType="fade">
      <View style={styles.backdrop}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="subtitle">Session expired</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Re-enter the password for {username ?? 'your account'} to keep going. Your queue and
            library stay put.
          </ThemedText>

          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
            placeholder="Password"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            autoFocus
            value={password}
            onChangeText={setPassword}
            editable={!isSubmitting}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          {reauthError && (
            <ThemedText type="small" style={styles.error}>
              {reauthError}
            </ThemedText>
          )}

          <ThemedView type="backgroundElement" style={styles.actions}>
            <Pressable hitSlop={8} onPress={() => logout()} disabled={isSubmitting}>
              <ThemedText type="small" themeColor="textSecondary">
                Sign out
              </ThemedText>
            </Pressable>
            {isSubmitting ? (
              <ActivityIndicator />
            ) : (
              <Pressable hitSlop={8} onPress={handleSubmit} disabled={!password}>
                <ThemedText type="smallBold" themeColor={password ? 'text' : 'textSecondary'}>
                  Continue
                </ThemedText>
              </Pressable>
            )}
          </ThemedView>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  card: {
    width: '100%',
    maxWidth: MaxContentWidth,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  error: {
    color: '#e5484d',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
});
