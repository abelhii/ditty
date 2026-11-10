import { ListBottomInset, WideListBottomInset } from '@/constants/theme';
import { useIsWideLayout } from '@/hooks/use-is-wide-layout';

/** Bottom padding (before the safe-area inset) that lets a scrollable screen clear the floating
 *  player: the bottom tab bar plus mini player on narrow, the taller pill on wide. */
export function useListBottomInset(): number {
  return useIsWideLayout() ? WideListBottomInset : ListBottomInset;
}
