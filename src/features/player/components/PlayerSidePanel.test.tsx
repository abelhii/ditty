import { fireEvent, render, screen } from '@testing-library/react-native';

import { PlayerSidePanel } from '@/features/player/components/PlayerSidePanel';
import { useLyricsSupported } from '@/features/player/hooks/use-lyrics';

// theme.ts imports a stylesheet that jest cannot parse.
jest.mock('@/global.css', () => ({}));
jest.mock('@/features/player/hooks/use-lyrics', () => ({ useLyricsSupported: jest.fn() }));
jest.mock('@/features/player/components/QueuePanel', () => ({
  QueuePanel: () => {
    const { Text } = require('react-native');
    return <Text>queue panel</Text>;
  },
}));
jest.mock('@/features/player/components/LyricsView', () => ({
  LyricsView: ({ trackId }: { trackId: string }) => {
    const { Text } = require('react-native');
    return <Text>{`lyrics for ${trackId}`}</Text>;
  },
}));

const palette = { background: '#000', selected: '#111', text: '#fff', textSecondary: '#ccc' };

describe('PlayerSidePanel', () => {
  it('shows only the Queue, with no tabs, when the server does not support lyrics', async () => {
    jest.mocked(useLyricsSupported).mockReturnValue(false);
    await render(<PlayerSidePanel trackId="a" palette={palette} />);

    expect(screen.getByText('queue panel')).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Lyrics' })).toBeNull();
  });

  it('shows Lyrics / Queue tabs with Queue selected first when lyrics are supported', async () => {
    jest.mocked(useLyricsSupported).mockReturnValue(true);
    await render(<PlayerSidePanel trackId="a" palette={palette} />);

    expect(screen.getByRole('tab', { name: 'Queue', selected: true })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Lyrics', selected: false })).toBeTruthy();
    expect(screen.getByText('queue panel')).toBeTruthy();
  });

  it('switches to the Lyrics tab for the current Track and back', async () => {
    jest.mocked(useLyricsSupported).mockReturnValue(true);
    await render(<PlayerSidePanel trackId="a" palette={palette} />);

    await fireEvent.press(screen.getByRole('tab', { name: 'Lyrics' }));
    expect(screen.getByText('lyrics for a')).toBeTruthy();
    expect(screen.queryByText('queue panel')).toBeNull();

    await fireEvent.press(screen.getByRole('tab', { name: 'Queue' }));
    expect(screen.getByText('queue panel')).toBeTruthy();
  });
});
