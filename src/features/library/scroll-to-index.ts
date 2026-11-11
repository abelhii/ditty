type ScrollToIndexFailure = { index: number; averageItemLength: number };

/** `scrollToIndex`/`scrollToLocation` fail for rows that haven't been laid out yet. Scroll to an
 *  estimate so the target renders, then try again. Use as the list's `onScrollToIndexFailed`. */
export function retryAfterEstimate(
  info: ScrollToIndexFailure,
  scrollToOffset: (offset: number) => void,
  retry: () => void,
): void {
  scrollToOffset(info.averageItemLength * info.index);
  setTimeout(retry, 100);
}
