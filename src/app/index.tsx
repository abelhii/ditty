import { useRef, useState } from 'react';
import { Button, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Audio,
  AudioContext,
  type AudioTagHandle,
  isFfmpegEnabled,
} from 'react-native-audio-api';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

// Streaming spike (build order step 0, see PLAN.md): confirm react-native-audio-api's
// <Audio> tag + MediaElementAudioSourceNode plays a plain progressive-HTTP MP3 URL
// (the shape of a Subsonic/Navidrome `stream` endpoint response), routed through the
// audio graph rather than played directly — this is the same routing the future EQ
// nodes will need to sit on. SoundHelix hosts a well-known public-domain progressive
// MP3 used for this kind of test; swap for a real Navidrome stream URL once a server
// is available.
const SPIKE_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

export default function HomeScreen() {
  const [audioContext] = useState(() => new AudioContext());
  const audioRef = useRef<AudioTagHandle>(null);
  const [log, setLog] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);

  function appendLog(line: string) {
    setLog((prev) => [...prev.slice(-6), line]);
  }

  function routeThroughGraph() {
    if (!audioRef.current) return;

    const source = audioContext.createMediaElementSource(audioRef.current);
    const gain = audioContext.createGain();
    source.connect(gain);
    gain.connect(audioContext.destination);
    appendLog('graph routed: source -> gain -> destination');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Streaming spike
        </ThemedText>
        <ThemedText type="small">ffmpeg enabled: {String(isFfmpegEnabled())}</ThemedText>
        <ThemedText type="small">platform: {Platform.OS}</ThemedText>

        <Audio
          ref={audioRef}
          source={SPIKE_URL}
          context={audioContext}
          onLoad={() => {
            appendLog('onLoad');
            routeThroughGraph();
          }}
          onError={(e) => appendLog(`onError: ${String(e)}`)}
          onPlay={() => {
            setIsPlaying(true);
            appendLog('onPlay');
          }}
          onPause={() => {
            setIsPlaying(false);
            appendLog('onPause');
          }}
          onEnded={() => appendLog('onEnded')}
          onPositionChange={(seconds) => setPosition(seconds)}
        />

        <ThemedText type="default">position: {position.toFixed(1)}s</ThemedText>

        <ThemedView style={styles.controls}>
          <Button
            title={isPlaying ? 'Pause' : 'Play'}
            onPress={() => (isPlaying ? audioRef.current?.pause() : audioRef.current?.play())}
          />
          <Button title="Seek +10s" onPress={() => audioRef.current?.seekToTime(position + 10)} />
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.logBox}>
          {log.length === 0 && <ThemedText type="small">waiting for events…</ThemedText>}
          {log.map((line, i) => (
            <ThemedText key={i} type="code" style={styles.logLine}>
              {line}
            </ThemedText>
          ))}
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
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  title: {
    marginTop: Spacing.four,
  },
  controls: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  logBox: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  logLine: {
    fontSize: 11,
  },
});
