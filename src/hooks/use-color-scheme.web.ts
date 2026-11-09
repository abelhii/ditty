import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

function subscribe() {
  return () => {};
}

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web.
 * React uses the server snapshot only while rendering on the server and hydrating, then re-renders
 * with the client one. Views mounted after hydration get the real scheme on their first render.
 */
export function useColorScheme() {
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const colorScheme = useRNColorScheme();

  if (isClient) {
    return colorScheme;
  }

  return 'light';
}
