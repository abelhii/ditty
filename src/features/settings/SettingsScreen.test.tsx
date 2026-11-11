import { fireEvent, render, screen } from '@testing-library/react-native';

import SettingsScreen from '@/app/settings';
import { useAutoDjSettingsStore } from '@/player/use-auto-dj-settings-store';

jest.mock('@/global.css', () => ({}));
jest.mock('@/api/kv-storage', () => ({ getItem: () => null, setItem: () => {}, removeItem: () => {} }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

let mockWide = false;
jest.mock('@/hooks/use-is-wide-layout', () => ({ useIsWideLayout: () => mockWide }));

beforeEach(() => {
  mockWide = false;
  useAutoDjSettingsStore.getState().reset();
});

describe('SettingsScreen Auto-DJ section', () => {
  it('shows the saved source and randomness as selected', async () => {
    useAutoDjSettingsStore.setState({ source: 'genre', randomness: 60 });
    await render(<SettingsScreen />);
    const selected = (name: string) => screen.getByRole('radio', { name }).props.accessibilityState.selected;
    expect(selected('Genre')).toBe(true);
    expect(selected('Genre + similar')).toBe(false);
    expect(selected('Lots')).toBe(true);
  });

  it('writes choices to the settings store', async () => {
    await render(<SettingsScreen />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Random' }));
    expect(useAutoDjSettingsStore.getState().source).toBe('random');
    await fireEvent(screen.getByLabelText('Start with Auto-DJ on'), 'valueChange', true);
    expect(useAutoDjSettingsStore.getState().enabledByDefault).toBe(true);
  });

  it('disables the randomness choice when the source is random', async () => {
    useAutoDjSettingsStore.setState({ source: 'random' });
    await render(<SettingsScreen />);
    expect(screen.getByRole('radio', { name: 'Some' }).props.accessibilityState.disabled).toBe(true);
  });
});

describe('SettingsScreen wide layout', () => {
  it('groups the settings into Appearance, Playback and Account cards', async () => {
    mockWide = true;
    await render(<SettingsScreen />);
    expect(screen.getByText('Playback')).toBeTruthy();
    expect(screen.getByText('Account')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Random' })).toBeTruthy();
    expect(screen.getByText('Log out')).toBeTruthy();
  });
});
