import { render, screen } from '@testing-library/react-native';

import { PlayPauseButton } from '@/components/MiniPlayer';
import { usePlaybackStatusStore } from '@/player/use-playback-status-store';

// theme.ts imports a stylesheet that jest cannot parse.
jest.mock('@/global.css', () => ({}));
jest.mock('@/api/kv-storage', () => ({
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}));

describe('PlayPauseButton', () => {
  it('is a "Play" button while paused', async () => {
    usePlaybackStatusStore.setState({ status: 'paused' });
    await render(<PlayPauseButton />);

    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
  });

  it('is a "Pause" button while playing', async () => {
    usePlaybackStatusStore.setState({ status: 'playing' });
    await render(<PlayPauseButton />);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
  });

  it('is a "Retry" button when the track has halted on an error', async () => {
    usePlaybackStatusStore.setState({ status: 'error' });
    await render(<PlayPauseButton />);

    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });
});
