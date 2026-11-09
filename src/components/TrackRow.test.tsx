import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import type { Track } from '@/api/types';
import { TrackRow } from '@/components/TrackRow';
import { Colors } from '@/constants/theme';

// theme.ts imports the web stylesheet for its side effect; jest can't parse CSS.
jest.mock('@/global.css', () => ({}));
jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));

const track: Track = { id: 't1', title: 'Song', artist: 'Artist', album: 'Album', duration: 125, starred: false };

function colorOf(text: string) {
  return StyleSheet.flatten(screen.getByText(text).props.style).color;
}

async function renderRow(props: { isPlaying?: boolean; position?: number }) {
  await render(<TrackRow track={track} onPress={() => {}} onOverflowPress={() => {}} {...props} />);
}

describe('TrackRow', () => {
  it('marks the playing track title in the accent colour', async () => {
    await renderRow({ isPlaying: true });
    expect(colorOf('Song')).toBe(Colors.light.accent);
  });

  it('marks the playing track position in the accent colour', async () => {
    await renderRow({ isPlaying: true, position: 3 });
    expect(colorOf('3')).toBe(Colors.light.accent);
  });

  it('leaves a track that is not playing in the normal colours', async () => {
    await renderRow({ isPlaying: false, position: 3 });
    expect(colorOf('Song')).toBe(Colors.light.text);
    expect(colorOf('3')).toBe(Colors.light.textSecondary);
  });
});
