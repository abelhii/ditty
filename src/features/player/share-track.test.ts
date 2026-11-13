import { Share } from 'react-native';

import { useNoticeStore } from '@/components/use-notice-store';
import { shareTrack } from '@/features/player/share-track';

// theme.ts imports a stylesheet that jest cannot parse.
jest.mock('@/global.css', () => ({}));

const track = { title: 'Song', artist: 'Artist' };

describe('shareTrack', () => {
  beforeEach(() => {
    useNoticeStore.setState({ current: null });
  });

  it('shows no Notice when the user dismisses the share sheet (AbortError)', async () => {
    const abort = Object.assign(new Error('cancelled'), { name: 'AbortError' });
    jest.spyOn(Share, 'share').mockRejectedValue(abort);
    shareTrack(track);
    await Promise.resolve();
    await Promise.resolve();
    expect(useNoticeStore.getState().current).toBeNull();
  });

  it('shows a Notice when sharing is unavailable', async () => {
    jest.spyOn(Share, 'share').mockRejectedValue(new Error('Share is not supported in this browser'));
    shareTrack(track);
    await Promise.resolve();
    await Promise.resolve();
    expect(useNoticeStore.getState().current?.message).toBe("Sharing isn't available here.");
  });
});
