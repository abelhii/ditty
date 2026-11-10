import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useThemePreferenceStore } from '@/hooks/use-theme-preference-store';

/** The scheme to render: the user's explicit Light/Dark choice, else the device scheme. */
export function useColorScheme() {
  const preference = useThemePreferenceStore((state) => state.preference);
  const systemScheme = useSystemColorScheme();

  return preference === 'system' ? systemScheme : preference;
}
