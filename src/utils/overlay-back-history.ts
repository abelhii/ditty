/** Web-only (see overlay-back-history.web.ts); native closes overlays via BackHandler instead. */
export function syncOverlayBackHistory(): () => void {
  return () => {};
}
