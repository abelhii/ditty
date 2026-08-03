import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

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
import { NowPlayingScreen } from '@/features/player/components/NowPlayingScreen';
import { QueueScreen } from '@/features/player/components/QueueScreen';
import { AudioEngine } from '@/player/AudioEngine';
import { NotificationBridge } from '@/player/NotificationBridge';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const status = useAuthStore((state) => state.status);
  const hydrate = useAuthStore((state) => state.hydrate);
  const credentials = useAuthStore((state) => state.credentials);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (credentials) {
      prefetchLibrary(credentials.serverUrl, credentials);
    }
  }, [credentials]);

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        {status === 'hydrating' && <ThemedView style={{ flex: 1 }} />}
        {status === 'authenticated' && (
          <>
            <AppTabs />
            <MiniPlayer />
            <NowPlayingScreen />
            <QueueScreen />
            <AudioEngine />
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
