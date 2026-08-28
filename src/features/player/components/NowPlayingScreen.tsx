import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Dimensions, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import type { Track } from '@/api/types';
import { useAuthStore } from '@/auth/use-auth-store';
import { CoverArtImage } from '@/components/CoverArtImage';
import { FavouriteButton } from '@/components/FavouriteButton';
import { PlayPauseButton } from '@/components/MiniPlayer';
import { Colors, Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { AddToPlaylistSheet } from '@/features/playlists/components/AddToPlaylistSheet';
import { Scrubber } from '@/features/player/components/Scrubber';
import * as PlaybackController from '@/player/PlaybackController';
import { getCurrentTrack, type RepeatMode } from '@/player/QueueManager';
import { useProgress } from '@/player/hooks/use-progress';
import { playbackErrorMessage, usePlaybackStatusStore } from '@/player/use-playback-status-store';
import { usePlayerStore } from '@/player/use-player-store';
import { usePlayerUiStore } from '@/player/use-player-ui-store';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DISMISS_THRESHOLD = 120;
const NEXT_REPEAT: Record<RepeatMode, RepeatMode> = { off: 'all', all: 'one', one: 'off' };

/** Fixed dark surface per the v4 mockup — this screen does not follow the light/dark scheme
 *  (the mockup has only one, dark, full-player design; the other five screens are light-only). */
const BG = '#22201c';
const TEXT = '#f3f2ee';
const TEXT_SECONDARY = 'rgba(243,242,238,.65)';
const TEXT_MUTED = 'rgba(243,242,238,.55)';

/**
 * Full-screen player, shown as a JS overlay above the tab bar (ADR 0005 extends the MiniPlayer's
 * overlay approach to now-playing/queue rather than a native modal route). Slides up on open,
 * swipe-down on the grabber to dismiss. Big artwork, metadata, scrubber + transport, shuffle/repeat
 * toggles, and an open-queue button. The favourite/add-to-playlist actions arrive in step 7b.
 */
export function NowPlayingScreen() {
  const insets = useSafeAreaInsets();
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
      <View style={styles.fill}>
        <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.grabberArea} {...grabber.panHandlers}>
            <View style={styles.grabber} />
            <Pressable hitSlop={12} onPress={dismiss} style={styles.chevron}>
              <Icon name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }} size={26} />
            </Pressable>
          </View>

          <View style={styles.body}>
            <CoverArtImage uri={coverArtUri || undefined} style={styles.art} iconSize={64} />

            <View style={styles.meta}>
              <Text style={[styles.title, styles.center]} numberOfLines={2}>
                {currentTrack.title}
              </Text>
              <Text style={styles.artist} numberOfLines={1}>
                {currentTrack.artist}
              </Text>
              <Text style={styles.album} numberOfLines={1}>
                {currentTrack.album}
              </Text>
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
                  tintColor={TEXT}
                />
              </Pressable>
            </View>

            <Scrubber {...progress} onSeek={PlaybackController.seekTo} />

            {status === 'error' && (
              <Text style={styles.error}>{playbackErrorMessage(errorOffline)}</Text>
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
                active
                onPress={PlaybackController.skipPrevious}
              />
              <View style={styles.playButton}>
                <PlayPauseButton size={26} tintColor={TEXT} />
              </View>
              <IconButton
                name={{ ios: 'forward.end.fill', android: 'skip_next', web: 'skip_next' }}
                size={34}
                active
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
              <Text style={styles.queueLabel}>Queue</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <AddToPlaylistSheet track={addToPlaylistTrack} onClose={() => setAddToPlaylistTrack(null)} />
    </Animated.View>
  );
}

function Icon({ name, size = 24 }: { name: SymbolViewProps['name']; size?: number }) {
  return <SymbolView name={name} size={size} tintColor={TEXT} />;
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
  return (
    <Pressable hitSlop={10} onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <SymbolView name={name} size={size} tintColor={active ? TEXT : TEXT_MUTED} />
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
    backgroundColor: BG,
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
    backgroundColor: TEXT_MUTED,
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
    borderRadius: Radius.lg,
  },
  meta: {
    alignItems: 'center',
    gap: Spacing.one,
    width: '100%',
  },
  title: {
    fontFamily: Fonts.sansBold,
    fontWeight: 700,
    fontSize: 32,
    lineHeight: 44,
    color: TEXT,
  },
  artist: {
    fontFamily: Fonts.sans,
    fontWeight: 500,
    fontSize: 16,
    lineHeight: 24,
    color: TEXT_SECONDARY,
  },
  album: {
    fontFamily: Fonts.sans,
    fontWeight: 500,
    fontSize: 14,
    lineHeight: 20,
    color: TEXT_SECONDARY,
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
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.accent,
  },
  queueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  queueLabel: {
    fontFamily: Fonts.sansBold,
    fontWeight: 700,
    fontSize: 14,
    lineHeight: 20,
    color: TEXT,
  },
  pressed: {
    opacity: 0.6,
  },
  error: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: '#e5484d',
    textAlign: 'center',
  },
});
