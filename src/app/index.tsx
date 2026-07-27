import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { queryKeys } from "@/api/queryKeys";
import {
  getAlbum,
  getArtist,
  getArtists,
} from "@/api/subsonic/endpoints/browsing";
import { useAuthStore } from "@/auth/useAuthStore";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import * as PlaybackController from "@/player/PlaybackController";
import { getCurrentTrack } from "@/player/QueueManager";
import { usePlayerStore } from "@/player/usePlayerStore";

// End-to-end smoke test (build order step 4): confirms auth -> browsing endpoints ->
// normalization -> PlaybackController -> AudioEngine -> a real Navidrome stream all work
// together end to end. Deliberately doesn't touch <Audio> directly — AudioEngine (mounted in
// _layout.tsx) is the only thing allowed to do that, see docs/adr/0001-player-state-flows-through-store.md.
// Supersedes the build-order step 0 spike, which predates AudioEngine and drove <Audio> itself.
export default function HomeScreen() {
  const credentials = useAuthStore((state) => state.credentials);
  const queue = usePlayerStore((state) => state.queue);
  const status = usePlayerStore((state) => state.status);
  const position = usePlayerStore((state) => state.position);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const artistsQuery = useQuery({
    queryKey: queryKeys.artists(),
    queryFn: () => {
      if (!credentials) throw new Error("Not authenticated.");
      return getArtists(credentials.serverUrl, credentials);
    },
    enabled: credentials !== null,
  });

  const currentTrack = getCurrentTrack(queue);

  async function loadFirstTrack() {
    if (!credentials || !artistsQuery.data) return;
    console.log(artistsQuery.data);
    setError(null);
    setLoading(true);
    try {
      const firstArtist = artistsQuery.data[20];
      if (!firstArtist) throw new Error("No artists found on this server.");

      const { albums } = await getArtist(
        credentials.serverUrl,
        credentials,
        firstArtist.id,
      );
      const firstAlbum = albums[0];
      if (!firstAlbum) throw new Error(`${firstArtist.name} has no albums.`);

      const { tracks } = await getAlbum(
        credentials.serverUrl,
        credentials,
        firstAlbum.id,
      );
      const firstTrack = tracks[0];
      if (!firstTrack) throw new Error(`${firstAlbum.name} has no tracks.`);

      PlaybackController.play([firstTrack]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load a track.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Playback smoke test
        </ThemedText>
        <ThemedText type="small">
          {artistsQuery.isLoading
            ? "Loading artists…"
            : `${artistsQuery.data?.length ?? 0} artists available`}
        </ThemedText>

        <Button
          title={loading ? "Loading…" : "Play first track"}
          onPress={loadFirstTrack}
          disabled={loading || !artistsQuery.data}
        />

        {error && <ThemedText type="small">{error}</ThemedText>}

        <ThemedView type="backgroundElement" style={styles.status}>
          <ThemedText type="default">status: {status}</ThemedText>
          <ThemedText type="default">
            position: {position.toFixed(1)}s
          </ThemedText>
          <ThemedText type="default">
            track:{" "}
            {currentTrack
              ? `${currentTrack.title} — ${currentTrack.artist}`
              : "none"}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.controls}>
          <Button
            title={status === "playing" ? "Pause" : "Play"}
            onPress={() => PlaybackController.togglePlayPause()}
          />
          <Button title="Skip" onPress={() => PlaybackController.skipNext()} />
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    alignSelf: "center",
    maxWidth: MaxContentWidth,
    width: "100%",
  },
  title: {
    marginTop: Spacing.four,
  },
  controls: {
    flexDirection: "row",
    gap: Spacing.three,
  },
  status: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
});
