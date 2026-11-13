import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { logoutLossWarning } from '@/auth/logout-guard';
import { useAuthStore } from '@/auth/use-auth-store';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import {
  MaxContentWidth,
  Radius,
  Spacing,
  WideContentPadding,
  WideMaxContentWidth,
} from '@/constants/theme';
import { SegmentedChoice } from '@/features/settings/components/SegmentedChoice';
import { useIsWideLayout } from '@/hooks/use-is-wide-layout';
import { useListBottomInset } from '@/hooks/use-list-bottom-inset';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreferenceStore, type ThemePreference } from '@/hooks/use-theme-preference-store';
import { DownloadsSettings } from '@/features/downloads/components/DownloadsSettings';
import { useOfflineStore } from '@/features/downloads/use-offline-store';
import { useAutoDjSettingsStore, type AutoDjSource } from '@/player/use-auto-dj-settings-store';
import { useLevellingSettingsStore } from '@/player/use-levelling-settings-store';
import { useStreamQualityStore } from '@/player/use-stream-quality-store';
import type { StreamQuality } from '@/api/subsonic/endpoints/media';
import type { LevellingMode } from '@/player/replay-gain';

const APPEARANCE_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const LEVELLING_OPTIONS: { value: LevellingMode; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'track', label: 'Track' },
  { value: 'album', label: 'Album' },
];

const STREAM_QUALITY_OPTIONS: { value: StreamQuality; label: string }[] = [
  { value: 'original', label: 'Original' },
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
];

const SOURCE_OPTIONS: { value: AutoDjSource; label: string }[] = [
  { value: 'mixed', label: 'Genre + similar' },
  { value: 'genre', label: 'Genre' },
  { value: 'random', label: 'Random' },
];

const RANDOMNESS_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'None' },
  { value: 30, label: 'Some' },
  { value: 60, label: 'Lots' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const wide = useIsWideLayout();
  const insets = useSafeAreaInsets();
  const listBottomInset = useListBottomInset();
  const logout = useAuthStore((state) => state.logout);
  const [logoutWarning, setLogoutWarning] = useState<string | null>(null);
  const credentials = useAuthStore((state) => state.credentials);
  const preference = useThemePreferenceStore((state) => state.preference);
  const setPreference = useThemePreferenceStore((state) => state.setPreference);
  const autoDj = useAutoDjSettingsStore();
  const levellingMode = useLevellingSettingsStore((state) => state.mode);
  const setLevellingMode = useLevellingSettingsStore((state) => state.setMode);
  const streamQuality = useStreamQualityStore((state) => state.quality);
  const setStreamQuality = useStreamQualityStore((state) => state.setQuality);
  const offlineManual = useOfflineStore((state) => state.manual);
  const setOfflineManual = useOfflineStore((state) => state.setManual);

  const serverInfo = credentials && (
    <ThemedView type="backgroundElement" style={wide ? undefined : styles.serverInfo}>
      <ThemedText type="small" themeColor="textSecondary">
        Signed in to
      </ThemedText>
      <ThemedText type="small">{credentials.serverUrl}</ThemedText>
    </ThemedView>
  );

  const appearance = (
    <ThemedView style={styles.appearance}>
      {!wide && (
        <ThemedText type="small" themeColor="textSecondary">
          Appearance
        </ThemedText>
      )}
      <ThemedView
        type={wide ? 'background' : 'backgroundElement'}
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
              <ThemedText type="small" style={selected ? { color: theme.onAccent } : undefined}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ThemedView>
    </ThemedView>
  );

  const autoDjSection = (
    <ThemedView style={styles.appearance}>
      {!wide && (
        <ThemedText type="small" themeColor="textSecondary">
          Auto-DJ
        </ThemedText>
      )}
      <ThemedView type={wide ? 'background' : 'backgroundElement'} style={styles.autoDjRow}>
        <ThemedText type="small">Start with Auto-DJ on</ThemedText>
        <Switch
          accessibilityLabel="Start with Auto-DJ on"
          value={autoDj.enabledByDefault}
          onValueChange={autoDj.setEnabledByDefault}
        />
      </ThemedView>
      <ThemedText type="small" themeColor="textSecondary">
        Source
      </ThemedText>
      <SegmentedChoice
        label="Auto-DJ source"
        options={SOURCE_OPTIONS}
        value={autoDj.source}
        onChange={autoDj.setSource}
      />
      <ThemedText type="small" themeColor="textSecondary">
        Randomness
      </ThemedText>
      <SegmentedChoice
        label="Auto-DJ randomness"
        options={RANDOMNESS_OPTIONS}
        value={autoDj.randomness}
        onChange={autoDj.setRandomness}
        disabled={autoDj.source === 'random'}
      />
    </ThemedView>
  );

  const levellingSection = (
    <ThemedView style={styles.appearance}>
      {!wide && (
        <ThemedText type="small" themeColor="textSecondary">
          Volume levelling
        </ThemedText>
      )}
      <SegmentedChoice
        label="Volume levelling"
        options={LEVELLING_OPTIONS}
        value={levellingMode}
        onChange={setLevellingMode}
      />
      <ThemedText type="small" themeColor="textSecondary">
        Turns down louder tracks using ReplayGain tags from your server. Tracks without tags play
        unchanged.
      </ThemedText>
    </ThemedView>
  );

  const streamQualitySection = (
    <ThemedView style={styles.appearance}>
      {!wide && (
        <ThemedText type="small" themeColor="textSecondary">
          Streaming quality
        </ThemedText>
      )}
      <SegmentedChoice
        label="Streaming quality"
        options={STREAM_QUALITY_OPTIONS}
        value={streamQuality}
        onChange={setStreamQuality}
      />
      <ThemedText type="small" themeColor="textSecondary">
        Original streams the file untouched. Other settings have the server convert to MP3 (High
        320 kbps, Normal 192, Low 96) to save data. Downloaded tracks always play as downloaded.
      </ThemedText>
    </ThemedView>
  );

  const offlineSection = Platform.OS !== 'web' && (
    <ThemedView style={styles.appearance}>
      {!wide && (
        <ThemedText type="small" themeColor="textSecondary">
          Offline
        </ThemedText>
      )}
      <ThemedView type={wide ? 'background' : 'backgroundElement'} style={styles.autoDjRow}>
        <ThemedText type="small">Offline mode</ThemedText>
        <Switch accessibilityLabel="Offline mode" value={offlineManual} onValueChange={setOfflineManual} />
      </ThemedView>
      <ThemedText type="small" themeColor="textSecondary">
        Plays only downloaded music. Turns on automatically when there is no connection.
      </ThemedText>
    </ThemedView>
  );

  const downloadsSection = Platform.OS !== 'web' && <DownloadsSettings wide={wide} />;

  // Logging out deletes this server's downloads (they're server-specific, like the queue), so ask
  // first when there is anything to lose.
  function confirmLogout() {
    const warning = logoutLossWarning();
    if (warning) setLogoutWarning(warning);
    else logout();
  }

  const logOut = (
    <>
      <ConfirmModal
        visible={logoutWarning !== null}
        title="Log out?"
        message={logoutWarning ?? ''}
        confirmLabel="Log out"
        onConfirm={() => {
          setLogoutWarning(null);
          logout();
        }}
        onCancel={() => setLogoutWarning(null)}
      />
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.logOutRow, pressed && styles.pressed]}
        onPress={confirmLogout}>
        <ThemedText themeColor="danger">Log out</ThemedText>
      </Pressable>
    </>
  );

  const scrollContent = [styles.scrollContent, { paddingBottom: insets.bottom + listBottomInset }];

  if (wide) {
    const username = credentials?.username;
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.safeAreaWide]} edges={['top', 'left', 'right']}>
          <ScrollView contentContainerStyle={scrollContent}>
            <ThemedText type="title">Settings</ThemedText>
            <ThemedView type="backgroundElement" style={styles.profile}>
              <ThemedView style={[styles.avatar, { backgroundColor: theme.accent }]}>
                <ThemedText type="subtitle" style={{ color: theme.onAccent }}>
                  {username?.charAt(0).toUpperCase() ?? ''}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.profileText}>
                <ThemedText type="smallBold">{username ?? ''}</ThemedText>
                {serverInfo}
              </ThemedView>
            </ThemedView>
            <ThemedView style={styles.cards}>
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">Appearance</ThemedText>
                {appearance}
              </ThemedView>
              <ThemedView type="backgroundElement" style={[styles.card, styles.cardPlayback]}>
                <ThemedText type="smallBold">Playback</ThemedText>
                {streamQualitySection}
                {levellingSection}
                {autoDjSection}
                {offlineSection}
                {downloadsSection}
              </ThemedView>
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">Account</ThemedText>
                {logOut}
              </ThemedView>
            </ThemedView>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={scrollContent}>
          <ThemedText type="title">Settings</ThemedText>
          {serverInfo}
          {appearance}
          {streamQualitySection}
          {levellingSection}
          {autoDjSection}
          {offlineSection}
          {downloadsSection}
          {logOut}
        </ScrollView>
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
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  scrollContent: {
    gap: Spacing.four,
  },
  serverInfo: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  appearance: {
    gap: Spacing.two,
    backgroundColor: 'transparent',
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
  autoDjRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  safeAreaWide: {
    maxWidth: WideMaxContentWidth,
    paddingHorizontal: WideContentPadding,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  profileText: {
    flex: 1,
    backgroundColor: 'transparent',
    gap: Spacing.half,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cards: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  card: {
    flex: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  cardPlayback: {
    flex: 1.5,
  },
  logOutRow: {
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
