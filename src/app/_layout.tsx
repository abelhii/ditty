import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { persistOptions, queryClient } from '@/api/queryClient';
import { prefetchLibrary } from '@/api/prefetchLibrary';
import { ServerConfigScreen } from '@/auth/ServerConfigScreen';
import { useAuthStore } from '@/auth/useAuthStore';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { MiniPlayer } from '@/components/MiniPlayer';
import { ThemedView } from '@/components/themed-view';
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
          </>
        )}
        {status === 'unauthenticated' && <ServerConfigScreen />}
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
