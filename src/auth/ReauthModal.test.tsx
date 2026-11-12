import { fireEvent, render, screen } from '@testing-library/react-native';

import { ReauthModal } from '@/auth/ReauthModal';
import { useAuthStore } from '@/auth/use-auth-store';
import { createQueueState } from '@/player/QueueManager';
import { usePlayerStore } from '@/player/use-player-store';

jest.mock('@/global.css', () => ({}));
jest.mock('@/api/kv-storage', () => ({
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}));
let mockDownloadGroups: unknown[] = [];
jest.mock('@/features/downloads/downloads-runtime', () => ({
  getDownloadSummary: () => ({ groups: mockDownloadGroups }),
}));

const track = { id: 't1', title: 'T' } as never;

function setup() {
  const logout = jest.fn();
  useAuthStore.setState({ reauthRequired: true, reauthError: null, logout } as never);
  return logout;
}

describe('ReauthModal Sign out', () => {
  beforeEach(() => {
    mockDownloadGroups = [];
    usePlayerStore.setState({ queue: createQueueState([]) });
  });

  it('signs out straight away when there is nothing to lose', async () => {
    const logout = setup();
    await render(<ReauthModal />);

    await fireEvent.press(screen.getByText('Sign out'));

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('asks first when the queue is non-empty, and only logs out on confirm', async () => {
    const logout = setup();
    usePlayerStore.setState({ queue: createQueueState([track]) });
    await render(<ReauthModal />);

    await fireEvent.press(screen.getByText('Sign out'));
    expect(logout).not.toHaveBeenCalled();
    expect(screen.getByText('Your queue will be cleared.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('asks first when downloads exist, and Cancel returns to the prompt without logging out', async () => {
    const logout = setup();
    mockDownloadGroups = [{}];
    await render(<ReauthModal />);

    await fireEvent.press(screen.getByText('Sign out'));
    expect(screen.getByText('Downloaded music will be deleted from this device.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(logout).not.toHaveBeenCalled();
    expect(screen.getByText('Session expired')).toBeTruthy();
  });
});
