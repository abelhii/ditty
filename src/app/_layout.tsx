import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Figtree_400Regular, Figtree_700Bold, useFonts } from '@expo-google-fonts/figtree';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Appearance, Platform, StyleSheet, View } from 'react-native';

import { persistOptions, queryClient } from '@/api/query-client';
import { prefetchLibrary } from '@/api/prefetch-library';
import { ReauthModal } from '@/auth/ReauthModal';
import { ServerConfigScreen } from '@/auth/ServerConfigScreen';
import { useAuthStore } from '@/auth/use-auth-store';
import { AnimatedSplashOverlay } from '@/components/AnimatedIcon';
import AppTabs from '@/components/AppTabs';
import { MiniPlayer } from '@/components/MiniPlayer';
import { Notice } from '@/components/Notice';
import { ThemedView } from '@/components/ThemedView';
import { WidePlayer } from '@/components/WidePlayer';
import { hydrateDownloads, startDownloadSync } from '@/features/downloads/downloads-runtime';
import { startOfflineWatcher } from '@/features/downloads/offline-watcher';
import { NowPlayingScreen } from '@/features/player/components/NowPlayingScreen';
import { QueueSidebar } from '@/features/player/components/QueueSidebar';
import { QueueScreen } from '@/features/player/components/QueueScreen';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useIsWideLayout } from '@/hooks/use-is-wide-layout';
import { useThemePreferenceStore } from '@/hooks/use-theme-preference-store';
import { AudioEngine } from '@/player/AudioEngine';
import { NotificationBridge } from '@/player/NotificationBridge';
import { ScrobbleReporter } from '@/player/ScrobbleReporter';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const wide = useIsWideLayout();
  const themePreference = useThemePreferenceStore((state) => state.preference);
  const status = useAuthStore((state) => state.status);
  const hydrate = useAuthStore((state) => state.hydrate);
  const credentials = useAuthStore((state) => state.credentials);
  const [fontsLoaded] = useFonts({ Figtree_400Regular, Figtree_700Bold });

  // Native chrome (status bar, system dialogs, SymbolView) follows the app's choice, not the OS's.
  useEffect(() => {
    if (Platform.OS !== 'web') Appearance.setColorScheme(themePreference === 'system' ? 'unspecified' : themePreference);
  }, [themePreference]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => startOfflineWatcher(), []);

  useEffect(() => {
    hydrateDownloads();
    if (credentials) return startDownloadSync();
  }, [credentials]);

  useEffect(() => {
    if (credentials) {
      prefetchLibrary(credentials.serverUrl, credentials);
    }
  }, [credentials]);

  // Keep the native splash screen up (see `SplashScreen.preventAutoHideAsync()` above) until
  // Figtree is loaded — `AnimatedSplashOverlay` hides it as soon as it mounts.
  if (!fontsLoaded) return null;

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        {status === 'hydrating' && <ThemedView style={{ flex: 1 }} />}
        {status === 'authenticated' && (
          <>
            {Platform.OS === 'web' ? (
              <View style={styles.shell}>
                <View style={styles.pane}>
                  <AppTabs />
                </View>
                <QueueSidebar />
              </View>
            ) : (
              <AppTabs />
            )}
            {wide ? <WidePlayer /> : <MiniPlayer />}
            <NowPlayingScreen />
            <QueueScreen />
            <AudioEngine />
            <ScrobbleReporter />
            <NotificationBridge />
            <Notice />
            <ReauthModal />
          </>
        )}
        {status === 'unauthenticated' && <ServerConfigScreen />}
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}

// Content pane and the wide layout's right-hand Queue sidebar side by side. The sidebar renders
// nothing on narrow layouts, leaving the pane as the whole screen. Web only (the wide layout is web
// only), so the native tree stays exactly AppTabs.
const styles = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row' },
  pane: { flex: 1, minWidth: 0 },
});
