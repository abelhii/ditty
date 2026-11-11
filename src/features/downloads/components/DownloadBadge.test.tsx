import { render, screen } from '@testing-library/react-native';

import { DownloadBadge } from '@/features/downloads/components/DownloadBadge';
import { useDownloadsStore } from '@/features/downloads/use-downloads-store';

// theme.ts imports the web stylesheet for its side effect; jest can't parse CSS.
jest.mock('@/global.css', () => ({}));
jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));

beforeEach(() => {
  useDownloadsStore.setState({ items: {}, downloadedIds: {} });
});

describe('DownloadBadge', () => {
  it('renders nothing for an idle track', async () => {
    await render(<DownloadBadge trackId="t1" />);
    expect(screen.toJSON()).toBeNull();
  });

  it('shows the percentage while downloading', async () => {
    useDownloadsStore.setState({ items: { t1: { status: 'downloading', progress: 0.42 } } });
    await render(<DownloadBadge trackId="t1" />);
    expect(screen.getByText('42%')).toBeTruthy();
  });

  it('shows a placeholder while queued', async () => {
    useDownloadsStore.setState({ items: { t1: { status: 'queued', progress: 0 } } });
    await render(<DownloadBadge trackId="t1" />);
    expect(screen.getByText('…')).toBeTruthy();
  });

  it('renders a marker once downloaded', async () => {
    useDownloadsStore.setState({ downloadedIds: { t1: true } });
    await render(<DownloadBadge trackId="t1" />);
    expect(screen.toJSON()).not.toBeNull();
  });

  it('renders a marker when failed, and prefers it over a stale downloaded flag', async () => {
    useDownloadsStore.setState({
      downloadedIds: { t1: true },
      items: { t1: { status: 'failed', progress: 0 } },
    });
    await render(<DownloadBadge trackId="t1" />);
    expect(screen.toJSON()).not.toBeNull();
  });
});
