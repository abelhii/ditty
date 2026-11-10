import * as ReactNative from 'react-native';
import { renderHook } from '@testing-library/react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemePreferenceStore } from '@/hooks/use-theme-preference-store';

jest.mock('@/api/kv-storage', () => ({ getItem: () => null, setItem: () => {}, removeItem: () => {} }));

describe('useColorScheme', () => {
  beforeEach(() => {
    useThemePreferenceStore.setState({ preference: 'system' });
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('follows the device scheme on System', async () => {
    const { result } = await renderHook(() => useColorScheme());
    expect(result.current).toBe('dark');
  });

  it('lets an explicit Light choice override a dark device', async () => {
    useThemePreferenceStore.setState({ preference: 'light' });
    const { result } = await renderHook(() => useColorScheme());
    expect(result.current).toBe('light');
  });

  it('lets an explicit Dark choice override a light device', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');
    useThemePreferenceStore.setState({ preference: 'dark' });
    const { result } = await renderHook(() => useColorScheme());
    expect(result.current).toBe('dark');
  });
});
