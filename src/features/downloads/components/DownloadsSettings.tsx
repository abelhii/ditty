import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch } from 'react-native';

import { ConfirmModal } from '@/components/ConfirmModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Radius, Spacing } from '@/constants/theme';
import {
  getDownloadSummary,
  removeAllDownloads,
  removeTrackDownloads,
  syncDownloads,
} from '@/features/downloads/downloads-runtime';
import { availableBytes } from '@/features/downloads/downloads-files';
import { formatBytes } from '@/features/downloads/storage-usage';
import { useDownloadSettingsStore } from '@/features/downloads/use-download-settings-store';
import { useDownloadsStore } from '@/features/downloads/use-downloads-store';

type DownloadsSettingsProps = {
  /** Wide layout draws the rows on the page background inside a card. */
  wide: boolean;
};

type PendingRemoval = { kind: 'album'; name: string; trackIds: string[] } | { kind: 'all' };

/** Storage use, free space, per-album delete, "Remove all downloads" and the Wi-Fi-only switch. */
export function DownloadsSettings({ wide }: DownloadsSettingsProps) {
  const wifiOnly = useDownloadSettingsStore((state) => state.wifiOnly);
  const setWifiOnly = useDownloadSettingsStore((state) => state.setWifiOnly);
  const autoFavourites = useDownloadSettingsStore((state) => state.autoDownloadFavourites);
  const setAutoFavourites = useDownloadSettingsStore((state) => state.setAutoDownloadFavourites);
  const downloadedIds = useDownloadsStore((state) => state.downloadedIds);

  // The DB is the source of truth; the downloaded-id index changing is the cue to re-read it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const summary = useMemo(() => getDownloadSummary(), [downloadedIds]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const free = useMemo(() => availableBytes(), [downloadedIds]);

  const [pending, setPending] = useState<PendingRemoval | null>(null);

  const rowType = wide ? 'background' : 'backgroundElement';

  return (
    <ThemedView style={styles.section}>
      <ConfirmModal
        visible={pending !== null}
        title={pending?.kind === 'album' ? 'Remove downloaded album?' : 'Remove all downloads?'}
        message={
          pending?.kind === 'album'
            ? `${pending.name} will be deleted from this device. You can download it again.`
            : 'Downloaded music will be deleted from this device.'
        }
        confirmLabel="Remove"
        onConfirm={() => {
          if (pending?.kind === 'album') removeTrackDownloads(pending.trackIds);
          else removeAllDownloads();
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
      {!wide && (
        <ThemedText type="small" themeColor="textSecondary">
          Downloads
        </ThemedText>
      )}
      <ThemedView type={rowType} style={styles.row}>
        <ThemedText type="small">Wi-Fi only</ThemedText>
        <Switch accessibilityLabel="Download on Wi-Fi only" value={wifiOnly} onValueChange={setWifiOnly} />
      </ThemedView>
      <ThemedView type={rowType} style={styles.row}>
        <ThemedText type="small">Auto-download Favourites</ThemedText>
        <Switch
          accessibilityLabel="Auto-download Favourites"
          value={autoFavourites}
          onValueChange={(value) => {
            setAutoFavourites(value);
            if (value) void syncDownloads(true);
          }}
        />
      </ThemedView>
      <ThemedText type="small" themeColor="textSecondary">
        Downloaded playlists stay in step with the server when you&apos;re online.
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {formatBytes(summary.totalBytes)} used · {formatBytes(free)} free
      </ThemedText>

      {summary.groups.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Nothing downloaded yet.
        </ThemedText>
      ) : (
        <>
          {summary.groups.map((group) => (
            <ThemedView key={group.key} type={rowType} style={styles.row}>
              <ThemedView style={styles.groupText}>
                <ThemedText type="small" numberOfLines={1}>
                  {group.albumName}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {group.artist} · {group.trackIds.length} {group.trackIds.length === 1 ? 'track' : 'tracks'} ·{' '}
                  {formatBytes(group.sizeBytes)}
                </ThemedText>
              </ThemedView>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove downloads for ${group.albumName}`}
                hitSlop={8}
                onPress={() => setPending({ kind: 'album', name: group.albumName, trackIds: group.trackIds })}>
                <ThemedText type="small" themeColor="danger">
                  Remove
                </ThemedText>
              </Pressable>
            </ThemedView>
          ))}
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => pressed && styles.pressed}
            onPress={() => setPending({ kind: 'all' })}>
            <ThemedText type="small" themeColor="danger">
              Remove all downloads
            </ThemedText>
          </Pressable>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  groupText: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.7,
  },
});
