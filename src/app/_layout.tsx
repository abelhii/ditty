import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { ServerConfigScreen } from '@/auth/ServerConfigScreen';
import { useAuthStore } from '@/auth/useAuthStore';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { ThemedView } from '@/components/themed-view';
import { AudioEngine } from '@/player/AudioEngine';
import { NotificationBridge } from '@/player/NotificationBridge';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const status = useAuthStore((state) => state.status);
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {status === 'hydrating' && <ThemedView style={{ flex: 1 }} />}
      {status === 'authenticated' && (
        <>
          <AppTabs />
          <AudioEngine />
          <NotificationBridge />
        </>
      )}
      {status === 'unauthenticated' && <ServerConfigScreen />}
    </ThemeProvider>
  );
}
