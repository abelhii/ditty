import { Platform, useWindowDimensions } from 'react-native';

import { isWideWidth } from '@/constants/theme';

/** True when the window is wide enough for the sidebar shell. Web only: native tabs have no
 *  sidebar variant, so a wide iPad window keeps the native layout. */
export function useIsWideLayout(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && isWideWidth(width);
}
