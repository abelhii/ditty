import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import { useAuthStore } from '@/auth/use-auth-store';
import { CoverArtImage } from '@/components/CoverArtImage';
import { ThemedText } from '@/components/ThemedText';
import { QueueRailWidth, Radius, Spacing } from '@/constants/theme';
import { QueuePanel } from '@/features/player/components/QueuePanel';
import { useQueueSidebarWidth } from '@/features/player/hooks/use-queue-sidebar-width';
import { useTheme } from '@/hooks/use-theme';
import { usePlayerStore } from '@/player/use-player-store';
import { useQueueSidebarStore } from '@/player/use-queue-sidebar-store';

const RAIL_THUMBNAILS = 3;
const THUMBNAIL_SIZE = 44;
const BADGE_SIZE = 18;

/**
 * The wide layout's right-hand Queue sidebar, beside the content pane on every route: the Queue
 * list with Clear queue and a collapse button, or collapsed, a thin rail with a queue icon, the
 * Track count and thumbnails of the next few Tracks. Absent on narrow layouts, with an empty Queue
 * and while the full player is open (its right-hand panel shows the Queue instead).
 */
export function QueueSidebar() {
  const theme = useTheme();
  const width = useQueueSidebarWidth();
  const collapsed = useQueueSidebarStore((state) => state.collapsed);
  const toggle = useQueueSidebarStore((state) => state.toggle);

  if (width === 0) return null;

  return (
    <View
      accessibilityLabel="Queue sidebar"
      style={[
        styles.container,
        { width, backgroundColor: theme.background, borderLeftColor: theme.border },
      ]}>
      {collapsed ? (
        <QueueRail onExpand={toggle} />
      ) : (
        <QueuePanel
          trailing={
            <Pressable
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Collapse Queue"
              onPress={toggle}>
              <SymbolView
                name={{ ios: 'chevron.right', android: 'last_page', web: 'last_page' }}
                size={20}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          }
        />
      )}
    </View>
  );
}

type QueueRailProps = {
  onExpand: () => void;
};

function QueueRail({ onExpand }: QueueRailProps) {
  const theme = useTheme();
  const credentials = useAuthStore((state) => state.credentials);
  const queue = usePlayerStore((state) => state.queue);
  const count = queue.tracks.length;
  const upcoming = queue.tracks.slice(queue.currentIndex + 1);
  const thumbnails = upcoming.slice(0, RAIL_THUMBNAILS);
  const more = upcoming.length - thumbnails.length;

  return (
    <View style={styles.rail}>
      <Pressable
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Expand Queue, ${count} ${count === 1 ? 'Track' : 'Tracks'}`}
        style={styles.railButton}
        onPress={onExpand}>
        <SymbolView
          name={{ ios: 'list.bullet', android: 'queue_music', web: 'queue_music' }}
          size={22}
          tintColor={theme.text}
        />
        <View style={[styles.badge, { backgroundColor: theme.accent }]}>
          <ThemedText themeColor="onAccent" numberOfLines={1} maxFontSizeMultiplier={1} style={styles.badgeText}>
            {count}
          </ThemedText>
        </View>
      </Pressable>
      {thumbnails.map((track, offset) => (
        <CoverArtImage
          key={`${track.id}-${queue.currentIndex + 1 + offset}`}
          uri={
            (credentials &&
              getCoverArtUrl(credentials.serverUrl, track.coverArtId, credentials, CoverArtSize.list)) ||
            undefined
          }
          style={styles.thumbnail}
        />
      ))}
      {more > 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          +{more}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    // Fixed width, expanded or collapsed; the content pane takes the rest.
    flexShrink: 0,
  },
  rail: {
    width: QueueRailWidth,
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.three,
  },
  railButton: {
    padding: Spacing.two,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    paddingHorizontal: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: 700,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: Radius.sm,
  },
});
