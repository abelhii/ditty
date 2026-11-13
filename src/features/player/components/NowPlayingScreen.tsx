import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, BackHandler, Dimensions, PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import type { Track } from '@/api/types';
import { useAuthStore } from '@/auth/use-auth-store';
import { CoverArtImage } from '@/components/CoverArtImage';
import { FavouriteButton } from '@/components/FavouriteButton';
import { PlayPauseButton } from '@/components/MiniPlayer';
import { ThemedText } from '@/components/ThemedText';
import { VolumeSlider } from '@/components/VolumeSlider';
import { Colors, MaxContentWidth, PlayerSurface, Radius, Spacing } from '@/constants/theme';
import { AddToPlaylistSheet } from '@/features/playlists/components/AddToPlaylistSheet';
import { PlayerOverlay } from '@/features/player/components/PlayerOverlay';
import { QueuePanel } from '@/features/player/components/QueuePanel';
import { Scrubber } from '@/features/player/components/Scrubber';
import { formatTrackAudioLabel } from '@/features/player/trackAudioLabel';
import { useIsWideLayout } from '@/hooks/use-is-wide-layout';
import * as PlaybackController from '@/player/PlaybackController';
import { getCurrentTrack, type RepeatMode } from '@/player/QueueManager';
import { useProgress } from '@/player/hooks/use-progress';
import { playbackErrorMessage, usePlaybackStatusStore } from '@/player/use-playback-status-store';
import { useAutoDjStore } from '@/player/use-auto-dj-store';
import { usePlayerStore } from '@/player/use-player-store';
import { usePlayerUiStore } from '@/player/use-player-ui-store';

const QUEUE_PANEL_PALETTE = {
  background: PlayerSurface.panel,
  selected: PlayerSurface.panelSelected,
  text: PlayerSurface.text,
  textSecondary: PlayerSurface.textSecondary,
};
const SCREEN_HEIGHT = Dimensions.get('window').height;
const DISMISS_THRESHOLD = 120;
const NEXT_REPEAT: Record<RepeatMode, RepeatMode> = { off: 'all', all: 'one', one: 'off' };
const REPEAT_LABEL: Record<RepeatMode, string> = { off: 'Repeat off', all: 'Repeat all', one: 'Repeat one' };

/**
 * Full-screen player, shown as a JS overlay above the tab bar (extending the MiniPlayer's
 * overlay approach to now-playing/queue rather than a native modal route). Slides up on open,
 * swipe down anywhere (or Android back) to dismiss. Big artwork, metadata, scrubber + transport, shuffle/repeat
 * toggles, and an open-queue button. The favourite/add-to-playlist actions arrive in step 7b.
 */
export function NowPlayingScreen() {
  const insets = useSafeAreaInsets();
  const wide = useIsWideLayout();
  const volume = usePlayerStore((state) => state.volume);
  const nowPlayingOpen = usePlayerUiStore((state) => state.nowPlayingOpen);
  const closeNowPlaying = usePlayerUiStore((state) => state.closeNowPlaying);
  const openQueue = usePlayerUiStore((state) => state.openQueue);
  const credentials = useAuthStore((state) => state.credentials);

  const currentTrack = usePlayerStore((state) => getCurrentTrack(state.queue));
  const shuffle = usePlayerStore((state) => state.queue.shuffle);
  const repeat = usePlayerStore((state) => state.queue.repeat);
  const autoDj = useAutoDjStore((state) => state.enabled);
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

  // A downward drag anywhere on the screen dismisses it. Captured ahead of the ScrollView only for
  // a mostly-vertical drag while the content is scrolled to the top, so scrolling a short viewport
  // and the horizontal scrubber/volume sliders keep working.
  const [atTop, setAtTop] = useState(true);
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          atTop && gesture.dy > 8 && gesture.dy > Math.abs(gesture.dx) * 1.5,
        onPanResponderMove: (_, gesture) => translateY.setValue(Math.max(0, gesture.dy)),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > DISMISS_THRESHOLD) {
            dismiss();
          } else {
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
          }
        },
      }),
    [translateY, dismiss, atTop],
  );

  // Android back closes the Queue if it is open on top, otherwise the player.
  useEffect(() => {
    if (!nowPlayingOpen) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      const ui = usePlayerUiStore.getState();
      if (ui.queueOpen) ui.closeQueue();
      else dismiss();
      return true;
    });
    return () => subscription.remove();
  }, [nowPlayingOpen, dismiss]);

  if (!nowPlayingOpen || !currentTrack) return null;

  const coverArtUri =
    credentials &&
    getCoverArtUrl(credentials.serverUrl, currentTrack.coverArtId, credentials, CoverArtSize.detail);
  const audioLabel = formatTrackAudioLabel(currentTrack);

  return (
    <PlayerOverlay onRequestClose={dismiss}>
      <Animated.View
        style={[styles.overlay, { transform: [{ translateY }] }]}
        {...(wide ? {} : swipe.panHandlers)}>
        <View style={styles.fill}>
          <View
            style={[
              styles.content,
              wide && styles.contentWide,
              { paddingTop: insets.top, paddingBottom: insets.bottom },
            ]}>
            <View style={styles.grabberArea}>
              {!wide && <View style={styles.grabber} />}
              <Pressable
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close player"
                onPress={dismiss}
                style={styles.chevron}>
                <Icon name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }} size={26} />
              </Pressable>
            </View>

            {/* Scrolls when the content is taller than the viewport (e.g. a landscape phone), so
                the transport and Queue button stay reachable; centred when it fits. */}
            <View style={wide ? styles.wideRow : styles.fill}>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.body}
              scrollEventThrottle={16}
              onScroll={(event) => {
                setAtTop(event.nativeEvent.contentOffset.y <= 0);
              }}>
              <CoverArtImage
                uri={coverArtUri || undefined}
                style={wide ? styles.artWide : styles.art}
                iconSize={64}
              />

              <View style={styles.titleRow}>
                <View style={styles.meta}>
                  <ThemedText type="subtitle" numberOfLines={2} style={styles.title}>
                    {currentTrack.title}
                  </ThemedText>
                  <ThemedText type="default" numberOfLines={1} style={styles.textSecondary}>
                    {currentTrack.artist}
                  </ThemedText>
                  <ThemedText type="small" numberOfLines={1} style={styles.textSecondary}>
                    {currentTrack.album}
                  </ThemedText>
                  {audioLabel !== '' && (
                    <ThemedText type="small" numberOfLines={1} style={styles.textSecondary}>
                      {audioLabel}
                    </ThemedText>
                  )}
                </View>

                <View style={styles.secondaryActions}>
                  <FavouriteButton target={{ kind: 'song', item: currentTrack }} size={32} />
                  <Pressable
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Add to playlist"
                    onPress={() => setAddToPlaylistTrack(currentTrack)}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <SymbolView
                      name={{ ios: 'text.badge.plus', android: 'playlist_add', web: 'playlist_add' }}
                      size={32}
                      tintColor={PlayerSurface.text}
                    />
                  </Pressable>
                </View>
              </View>

              <Scrubber {...progress} onSeek={PlaybackController.seekTo} />

              {status === 'error' && (
                <ThemedText type="small" style={[styles.center, styles.error]}>
                  {playbackErrorMessage(errorOffline)}
                </ThemedText>
              )}

              <View style={styles.transport}>
                <IconButton
                  name={{ ios: 'shuffle', android: 'shuffle', web: 'shuffle' }}
                  label="Shuffle"
                  selected={shuffle}
                  active={shuffle}
                  onPress={() => PlaybackController.setShuffle(!shuffle)}
                />
                <IconButton
                  name={{ ios: 'backward.end.fill', android: 'skip_previous', web: 'skip_previous' }}
                  label="Previous track"
                  size={34}
                  active
                  onPress={PlaybackController.skipPrevious}
                />
                <View style={styles.playButton}>
                  <PlayPauseButton size={26} tintColor={PlayerSurface.text} />
                </View>
                <IconButton
                  name={{ ios: 'forward.end.fill', android: 'skip_next', web: 'skip_next' }}
                  label="Next track"
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
                  label={REPEAT_LABEL[repeat]}
                  selected={repeat !== 'off'}
                  active={repeat !== 'off'}
                  onPress={() => PlaybackController.setRepeat(NEXT_REPEAT[repeat])}
                />
              </View>

              <IconButton
                name={{ ios: 'infinity', android: 'all_inclusive', web: 'all_inclusive' }}
                label="Auto-DJ"
                selected={autoDj}
                active={autoDj}
                onPress={() => PlaybackController.setAutoDj(!autoDj)}
              />

              {!wide && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open Queue"
                  style={({ pressed }) => [styles.queueButton, pressed && styles.pressed]}
                  onPress={openQueue}>
                  <ThemedText type="small" style={styles.textSecondary}>
                    Queue
                  </ThemedText>
                </Pressable>
              )}
            </ScrollView>

            {wide && (
              <View style={styles.queuePanel}>
                <QueuePanel palette={QUEUE_PANEL_PALETTE} />
                <View style={styles.panelVolume}>
                  <VolumeSlider volume={volume} onChange={PlaybackController.setVolume} />
                </View>
              </View>
            )}
            </View>
          </View>
        </View>

        <AddToPlaylistSheet track={addToPlaylistTrack} onClose={() => setAddToPlaylistTrack(null)} />
      </Animated.View>
    </PlayerOverlay>
  );
}

function Icon({ name, size = 24 }: { name: SymbolViewProps['name']; size?: number }) {
  return <SymbolView name={name} size={size} tintColor={PlayerSurface.text} />;
}

type IconButtonProps = {
  name: SymbolViewProps['name'];
  /** Accessible name — the glyph alone has none. */
  label: string;
  size?: number;
  active?: boolean;
  /** Set for toggles (shuffle, repeat) so assistive tech can announce on/off. */
  selected?: boolean;
  onPress: () => void;
};

function IconButton({ name, label, size = 24, active = false, selected, onPress }: IconButtonProps) {
  return (
    <Pressable
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? undefined : { selected }}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <SymbolView name={name} size={size} tintColor={active ? PlayerSurface.text : PlayerSurface.textMuted} />
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
    backgroundColor: PlayerSurface.background,
  },
  content: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  contentWide: {
    maxWidth: '100%',
  },
  artWide: {
    width: 300,
    height: 300,
    borderRadius: Radius.pill,
  },
  wideRow: {
    flex: 1,
    flexDirection: 'row',
  },
  queuePanel: {
    width: 300,
    backgroundColor: PlayerSurface.panel,
  },
  panelVolume: {
    padding: Spacing.three,
  },
  grabberArea: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: PlayerSurface.textMuted,
  },
  chevron: {
    position: 'absolute',
    left: Spacing.four,
    top: Spacing.one,
  },
  scroll: {
    flex: 1,
  },
  body: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.four,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.four,
  },
  art: {
    width: '70%',
    aspectRatio: 1,
    maxWidth: 360,
    borderRadius: Radius.pill,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    width: '100%',
  },
  meta: {
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    color: PlayerSurface.text,
  },
  textSecondary: {
    color: PlayerSurface.textSecondary,
  },
  secondaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.one,
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
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.accent,
  },
  queueButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderColor: PlayerSurface.trackBackground,
    borderRadius: Radius.pill,
  },
  pressed: {
    opacity: 0.6,
  },
  error: {
    color: Colors.dark.danger,
  },
});
