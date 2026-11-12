import { Share, StyleSheet, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import { useAuthStore } from '@/auth/use-auth-store';
import { CoverArtImage } from '@/components/CoverArtImage';
import { FavouriteButton } from '@/components/FavouriteButton';
import { PlayPauseButton, SkipButton } from '@/components/MiniPlayer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { showNotice } from '@/components/use-notice-store';
import { VolumeSlider } from '@/components/VolumeSlider';
import {
  Radius,
  Shadow,
  SidebarWidth,
  Spacing,
  WidePlayerHeight,
  WidePlayerOffset,
  WidePlayerWidth,
} from '@/constants/theme';
import { Scrubber } from '@/features/player/components/Scrubber';
import { useTheme } from '@/hooks/use-theme';
import * as PlaybackController from '@/player/PlaybackController';
import { getCurrentTrack, type RepeatMode } from '@/player/QueueManager';
import { useProgress } from '@/player/hooks/use-progress';
import { playbackErrorMessage, usePlaybackStatusStore } from '@/player/use-playback-status-store';
import { usePlayerStore } from '@/player/use-player-store';
import { usePlayerUiStore } from '@/player/use-player-ui-store';

const ART_SIZE = 56;
const NEXT_REPEAT: Record<RepeatMode, RepeatMode> = { off: 'all', all: 'one', one: 'off' };
const REPEAT_LABEL: Record<RepeatMode, string> = {
  off: 'Repeat off',
  all: 'Repeat all',
  one: 'Repeat one',
};

/** What the Share button sends: the track's name and artist as plain text. No stream link, since
 *  that URL carries the user's credentials. */
export function shareMessage(track: { title: string; artist: string }): string {
  return `${track.title} by ${track.artist}`;
}

/**
 * The wide layout's floating player: an 820px pill docked at the bottom of the content pane (right
 * of the sidebar). Left: cover, title/artist, like. Centre: shuffle, previous, play/pause, next,
 * repeat over a scrubber with elapsed/total time. Right: share and volume. Clicking the track area
 * opens Now Playing. Hidden when nothing is playing or Now Playing is open.
 */
export function WidePlayer() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const credentials = useAuthStore((state) => state.credentials);
  const currentTrack = usePlayerStore((state) => getCurrentTrack(state.queue));
  const shuffle = usePlayerStore((state) => state.queue.shuffle);
  const repeat = usePlayerStore((state) => state.queue.repeat);
  const volume = usePlayerStore((state) => state.volume);
  const nowPlayingOpen = usePlayerUiStore((state) => state.nowPlayingOpen);
  const openNowPlaying = usePlayerUiStore((state) => state.openNowPlaying);
  const status = usePlaybackStatusStore((state) => state.status);
  const errorOffline = usePlaybackStatusStore((state) => state.errorOffline);
  const progress = useProgress();

  if (!currentTrack || nowPlayingOpen) return null;

  const coverArtUri =
    credentials &&
    getCoverArtUrl(credentials.serverUrl, currentTrack.coverArtId, credentials, CoverArtSize.list);

  const share = () => {
    Share.share({ message: shareMessage(currentTrack) }).catch(() => {
      showNotice("Sharing isn't available here.");
    });
  };

  return (
    <View style={[styles.container, { bottom: insets.bottom + WidePlayerOffset }]}>
      <ThemedView type="tint" style={[styles.pill, { shadowColor: theme.shadow }]}>
        <View style={styles.left}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open now playing"
            style={styles.track}
            onPress={openNowPlaying}>
            <CoverArtImage uri={coverArtUri || undefined} style={styles.art} iconSize={24} />
            <View style={styles.text}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {currentTrack.title}
              </ThemedText>
              <ThemedText
                type="small"
                themeColor={status === 'error' ? 'danger' : 'textSecondary'}
                numberOfLines={1}>
                {status === 'error' ? playbackErrorMessage(errorOffline) : currentTrack.artist}
              </ThemedText>
            </View>
          </Pressable>
          <FavouriteButton target={{ kind: 'song', item: currentTrack }} size={22} />
        </View>

        <View style={styles.centre}>
          <View style={styles.transport}>
            <SkipButton
              name={{ ios: 'shuffle', android: 'shuffle', web: 'shuffle' }}
              label="Shuffle"
              selected={shuffle}
              onPress={() => PlaybackController.setShuffle(!shuffle)}
            />
            <SkipButton
              name={{ ios: 'backward.end.fill', android: 'skip_previous', web: 'skip_previous' }}
              label="Previous track"
              onPress={PlaybackController.skipPrevious}
            />
            <PlayPauseButton />
            <SkipButton
              name={{ ios: 'forward.end.fill', android: 'skip_next', web: 'skip_next' }}
              label="Next track"
              onPress={PlaybackController.skipNext}
            />
            <SkipButton
              name={
                repeat === 'one'
                  ? { ios: 'repeat.1', android: 'repeat_one', web: 'repeat_one' }
                  : { ios: 'repeat', android: 'repeat', web: 'repeat' }
              }
              label={REPEAT_LABEL[repeat]}
              selected={repeat !== 'off'}
              onPress={() => PlaybackController.setRepeat(NEXT_REPEAT[repeat])}
            />
          </View>
          <Scrubber
            variant="surface"
            position={progress.position}
            duration={progress.duration}
            fraction={progress.fraction}
            onSeek={PlaybackController.seekTo}
          />
        </View>

        <View style={styles.right}>
          <SkipButton
            name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
            label="Share"
            onPress={share}
          />
          <VolumeSlider volume={volume} onChange={PlaybackController.setVolume} />
        </View>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    // Inside the content pane: clear of the sidebar, centred in what is left.
    left: SidebarWidth,
    right: 0,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    // Spans the pane so the pill can centre; only the pill itself takes touches.
    pointerEvents: 'box-none',
  },
  pill: {
    width: '100%',
    maxWidth: WidePlayerWidth,
    height: WidePlayerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    ...Shadow.floating,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minWidth: 0,
  },
  track: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minWidth: 0,
  },
  art: {
    width: ART_SIZE,
    height: ART_SIZE,
    borderRadius: ART_SIZE / 2,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  centre: {
    flex: 2.2,
    alignItems: 'center',
    minWidth: 0,
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  right: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
});
