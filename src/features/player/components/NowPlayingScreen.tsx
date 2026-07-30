import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Dimensions, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import type { Track } from '@/api/types';
import { useAuthStore } from '@/auth/useAuthStore';
import { CoverArtImage } from '@/components/CoverArtImage';
import { FavouriteButton } from '@/components/FavouriteButton';
import { PlayPauseButton } from '@/components/MiniPlayer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AddToPlaylistSheet } from '@/features/playlists/components/AddToPlaylistSheet';
import { Scrubber } from '@/features/player/components/Scrubber';
import * as PlaybackController from '@/player/PlaybackController';
import { getCurrentTrack, type RepeatMode } from '@/player/QueueManager';
import { useProgress } from '@/player/hooks/useProgress';
import { playbackErrorMessage, usePlaybackStatusStore } from '@/player/usePlaybackStatusStore';
import { usePlayerStore } from '@/player/usePlayerStore';
import { usePlayerUiStore } from '@/player/usePlayerUiStore';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DISMISS_THRESHOLD = 120;
const NEXT_REPEAT: Record<RepeatMode, RepeatMode> = { off: 'all', all: 'one', one: 'off' };

/**
 * Full-screen player, shown as a JS overlay above the tab bar (ADR 0005 extends the MiniPlayer's
 * overlay approach to now-playing/queue rather than a native modal route). Slides up on open,
 * swipe-down on the grabber to dismiss. Big artwork, metadata, scrubber + transport, shuffle/repeat
 * toggles, and an open-queue button. The favourite/add-to-playlist actions arrive in step 7b.
 */
export function NowPlayingScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const nowPlayingOpen = usePlayerUiStore((state) => state.nowPlayingOpen);
  const closeNowPlaying = usePlayerUiStore((state) => state.closeNowPlaying);
  const openQueue = usePlayerUiStore((state) => state.openQueue);
  const credentials = useAuthStore((state) => state.credentials);

  const currentTrack = usePlayerStore((state) => getCurrentTrack(state.queue));
  const shuffle = usePlayerStore((state) => state.queue.shuffle);
  const repeat = usePlayerStore((state) => state.queue.repeat);
  const status = usePlaybackStatusStore((state) => state.status);
  const errorOffline = usePlaybackStatusStore((state) => state.errorOffline);
  const progress = useProgress();

  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<Track | null>(null);
  const [translateY] = useState(() => new Animated.Value(SCREEN_HEIGHT));

  // The overlay stays mounted (rendering null when closed), so the slide-up has to fire on each
  // open rather than on mount: reset to off-screen, then animate up.
  useEffect(() => {
    if (nowPlayingOpen) {
      translateY.setValue(SCREEN_HEIGHT);
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    }
  }, [nowPlayingOpen, translateY]);

  const dismiss = useCallback(() => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => closeNowPlaying());
  }, [translateY, closeNowPlaying]);

  const grabber = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 4,
        onPanResponderMove: (_, gesture) => translateY.setValue(Math.max(0, gesture.dy)),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > DISMISS_THRESHOLD) {
            dismiss();
          } else {
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
          }
        },
      }),
    [translateY, dismiss],
  );

  if (!nowPlayingOpen || !currentTrack) return null;

  const coverArtUri =
    credentials &&
    getCoverArtUrl(credentials.serverUrl, currentTrack.coverArtId, credentials, CoverArtSize.detail);

  return (
    <Animated.View style={[styles.overlay, { transform: [{ translateY }] }]}>
      <ThemedView style={styles.fill}>
        <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.grabberArea} {...grabber.panHandlers}>
            <View style={[styles.grabber, { backgroundColor: theme.textSecondary }]} />
            <Pressable hitSlop={12} onPress={dismiss} style={styles.chevron}>
              <Icon name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }} size={26} />
            </Pressable>
          </View>

          <View style={styles.body}>
            <CoverArtImage uri={coverArtUri || undefined} style={styles.art} iconSize={64} />

            <View style={styles.meta}>
              <ThemedText type="subtitle" numberOfLines={2} style={styles.center}>
                {currentTrack.title}
              </ThemedText>
              <ThemedText type="default" themeColor="textSecondary" numberOfLines={1}>
                {currentTrack.artist}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {currentTrack.album}
              </ThemedText>
            </View>

            <View style={styles.secondaryActions}>
              <FavouriteButton target={{ kind: 'song', item: currentTrack }} size={26} />
              <Pressable
                hitSlop={10}
                accessibilityLabel="Add to playlist"
                onPress={() => setAddToPlaylistTrack(currentTrack)}
                style={({ pressed }) => pressed && styles.pressed}>
                <SymbolView
                  name={{ ios: 'text.badge.plus', android: 'playlist_add', web: 'playlist_add' }}
                  size={26}
                  tintColor={theme.textSecondary}
                />
              </Pressable>
            </View>

            <Scrubber {...progress} onSeek={PlaybackController.seekTo} />

            {status === 'error' && (
              <ThemedText type="small" style={styles.error}>
                {playbackErrorMessage(errorOffline)}
              </ThemedText>
            )}

            <View style={styles.transport}>
              <IconButton
                name={{ ios: 'shuffle', android: 'shuffle', web: 'shuffle' }}
                active={shuffle}
                onPress={() => PlaybackController.setShuffle(!shuffle)}
              />
              <IconButton
                name={{ ios: 'backward.end.fill', android: 'skip_previous', web: 'skip_previous' }}
                size={34}
                onPress={PlaybackController.skipPrevious}
              />
              <PlayPauseButton size={56} />
              <IconButton
                name={{ ios: 'forward.end.fill', android: 'skip_next', web: 'skip_next' }}
                size={34}
                onPress={PlaybackController.skipNext}
              />
              <IconButton
                name={
                  repeat === 'one'
                    ? { ios: 'repeat.1', android: 'repeat_one', web: 'repeat_one' }
                    : { ios: 'repeat', android: 'repeat', web: 'repeat' }
                }
                active={repeat !== 'off'}
                onPress={() => PlaybackController.setRepeat(NEXT_REPEAT[repeat])}
              />
            </View>

            <Pressable style={styles.queueButton} onPress={openQueue}>
              <Icon name={{ ios: 'list.bullet', android: 'queue_music', web: 'queue_music' }} size={20} />
              <ThemedText type="smallBold">Queue</ThemedText>
            </Pressable>
          </View>
        </View>
      </ThemedView>

      <AddToPlaylistSheet track={addToPlaylistTrack} onClose={() => setAddToPlaylistTrack(null)} />
    </Animated.View>
  );
}

function Icon({ name, size = 24 }: { name: SymbolViewProps['name']; size?: number }) {
  const theme = useTheme();
  return <SymbolView name={name} size={size} tintColor={theme.text} />;
}

function IconButton({
  name,
  size = 24,
  active = false,
  onPress,
}: {
  name: SymbolViewProps['name'];
  size?: number;
  active?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable hitSlop={10} onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <SymbolView name={name} size={size} tintColor={active ? theme.text : theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  fill: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  grabberArea: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    opacity: 0.5,
  },
  chevron: {
    position: 'absolute',
    left: Spacing.four,
    top: Spacing.one,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  art: {
    width: '80%',
    aspectRatio: 1,
    maxWidth: 360,
    borderRadius: Spacing.three,
  },
  meta: {
    alignItems: 'center',
    gap: Spacing.one,
    width: '100%',
  },
  secondaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.five,
  },
  center: {
    textAlign: 'center',
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 340,
  },
  queueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  pressed: {
    opacity: 0.6,
  },
  error: {
    color: '#e5484d',
    textAlign: 'center',
  },
});
