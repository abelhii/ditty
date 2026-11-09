import * as ReactNative from 'react-native';
import { renderHook } from '@testing-library/react-native';
// @ts-expect-error -- react-dom ships without types here and @types/react-dom is not a dependency.
import { renderToString } from 'react-dom/server';

import { useColorScheme } from '@/hooks/use-color-scheme.web';

function SchemeProbe() {
  return <>{useColorScheme()}</>;
}

describe('useColorScheme (web)', () => {
  beforeEach(() => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the device scheme on the first render of a client mount', async () => {
    const renders: (string | null | undefined)[] = [];
    await renderHook(() => {
      const scheme = useColorScheme();
      renders.push(scheme);
      return scheme;
    });

    expect(renders[0]).toBe('dark');
    expect(renders.every((scheme) => scheme === 'dark')).toBe(true);
  });

  it('returns light during static rendering so hydration matches', () => {
    expect(renderToString(<SchemeProbe />)).toBe('light');
  });
});
