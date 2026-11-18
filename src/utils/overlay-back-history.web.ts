import { usePlayerUiStore } from '@/player/use-player-ui-store';

/**
 * Makes the browser/Android back button close the player overlays (now-playing, then Queue /
 * Lyrics stacked above it) instead of navigating the page. react-native-web's BackHandler is a
 * no-op, so without this a back press in the installed PWA skips the overlay and leaves the app.
 * Each open overlay level pushes one same-URL history entry; back pops one and closes the top
 * overlay. When an overlay closes by other means (button, swipe, Escape) the extra entries are
 * popped off again so the history stays what the router expects.
 */
export function syncOverlayBackHistory(): () => void {
  let pushed = 0;
  let pendingProgrammaticPops = 0;

  const depth = () => {
    const ui = usePlayerUiStore.getState();
    // Queue can be open without the full player (MiniPlayer's queue button), so count each alone.
    return (ui.nowPlayingOpen ? 1 : 0) + (ui.queueOpen ? 1 : 0) + (ui.lyricsOpen ? 1 : 0);
  };

  const sync = () => {
    const target = depth();
    while (pushed < target) {
      window.history.pushState(window.history.state, '');
      pushed++;
    }
    if (pushed > target) {
      const excess = pushed - target;
      pushed = target;
      pendingProgrammaticPops++;
      window.history.go(-excess);
    }
  };

  const onPopState = () => {
    if (pendingProgrammaticPops > 0) {
      pendingProgrammaticPops--;
      return;
    }
    if (pushed === 0) return;
    pushed--;
    const ui = usePlayerUiStore.getState();
    if (ui.lyricsOpen) ui.closeLyrics();
    else if (ui.queueOpen) ui.closeQueue();
    else ui.closeNowPlaying();
  };

  window.addEventListener('popstate', onPopState);
  const unsubscribe = usePlayerUiStore.subscribe(sync);
  return () => {
    unsubscribe();
    window.removeEventListener('popstate', onPopState);
  };
}
