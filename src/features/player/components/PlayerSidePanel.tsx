import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { PlayerSurface, Spacing } from '@/constants/theme';
import { LyricsView } from '@/features/player/components/LyricsView';
import { QueuePanel } from '@/features/player/components/QueuePanel';
import { useLyricsSupported } from '@/features/player/hooks/use-lyrics';
import type { QueueListPalette } from '@/features/player/components/QueueScreen';

type PlayerSidePanelProps = {
  trackId: string;
  palette: QueueListPalette;
};

type Tab = 'lyrics' | 'queue';

/** The wide full player's right-hand panel. Shows the Queue alone, or Lyrics / Queue tabs once the
 *  server is known to support lyrics. Queue is the default tab. */
export function PlayerSidePanel({ trackId, palette }: PlayerSidePanelProps) {
  const lyricsSupported = useLyricsSupported();
  const [tab, setTab] = useState<Tab>('queue');

  if (!lyricsSupported) return <QueuePanel palette={palette} />;

  return (
    <View style={styles.fill}>
      <View style={styles.tabs} accessibilityRole="tablist">
        {(['lyrics', 'queue'] as const).map((id) => (
          <Pressable
            key={id}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === id }}
            onPress={() => setTab(id)}
            style={styles.tab}>
            <ThemedText
              type="smallBold"
              style={{ color: tab === id ? PlayerSurface.text : PlayerSurface.textMuted }}>
              {id === 'lyrics' ? 'Lyrics' : 'Queue'}
            </ThemedText>
          </Pressable>
        ))}
      </View>
      {tab === 'lyrics' ? <LyricsView trackId={trackId} /> : <QueuePanel palette={palette} showTitle={false} />}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  tab: {
    paddingVertical: Spacing.three,
  },
});
