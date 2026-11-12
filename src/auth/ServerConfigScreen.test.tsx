import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { ServerConfigScreen } from '@/auth/ServerConfigScreen';
import { useAuthStore } from '@/auth/use-auth-store';

jest.mock('@/global.css', () => ({}));
jest.mock('@/api/kv-storage', () => ({
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

const login = jest.fn();

beforeEach(() => {
  login.mockReset().mockResolvedValue(undefined);
  useAuthStore.setState({ login, error: null } as never);
});

describe('ServerConfigScreen', () => {
  it('labels each field and sets autofill hints', async () => {
    await render(<ServerConfigScreen />);
    expect(screen.getByLabelText('Server URL').props.autoComplete).toBe('url');
    expect(screen.getByLabelText('Username').props.autoComplete).toBe('username');
    const password = screen.getByLabelText('Password');
    expect(password.props.autoComplete).toBe('current-password');
    expect(password.props.textContentType).toBe('password');
  });

  it('submits from the password field via the keyboard', async () => {
    await render(<ServerConfigScreen />);
    await fireEvent.changeText(screen.getByLabelText('Server URL'), 'https://m.example.com');
    await fireEvent.changeText(screen.getByLabelText('Username'), 'me');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'pw');
    await act(async () => {
      fireEvent(screen.getByLabelText('Password'), 'submitEditing');
    });
    expect(login).toHaveBeenCalledWith('https://m.example.com', 'me', 'pw');
  });

  it('does not submit from the keyboard while fields are incomplete', async () => {
    await render(<ServerConfigScreen />);
    await fireEvent.changeText(screen.getByLabelText('Password'), 'pw');
    await act(async () => {
      fireEvent(screen.getByLabelText('Password'), 'submitEditing');
    });
    expect(login).not.toHaveBeenCalled();
  });

  it('exposes the error as an alert live region', async () => {
    useAuthStore.setState({ error: 'Wrong username or password.' } as never);
    await render(<ServerConfigScreen />);
    const alert = screen.getByRole('alert');
    expect(alert.props.accessibilityLiveRegion).toBe('polite');
  });
});
