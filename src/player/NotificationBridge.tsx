/**
 * No-op on native. expo-audio owns the OS lock-screen / notification controls directly through the
 * player instance in {@link AudioEngine} (`setActiveForLockScreen`), handling play/pause/seek
 * natively — so there's nothing for a separate reactive bridge to forward. See
 * docs/adr/0009-expo-audio-lossless.md (including the next/previous-track lock-screen trade-off this
 * backend forces).
 *
 * The component is kept (rather than deleted) so `app/_layout.tsx` can mount it unconditionally: the
 * web build resolves NotificationBridge.web.tsx, which still drives the browser Media Session
 * (including next/previous), while native resolves this no-op.
 */
export function NotificationBridge() {
  return null;
}
