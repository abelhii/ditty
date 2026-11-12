import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Notice, noticeVisibleMs } from '@/components/Notice';
import { showNotice, useNoticeStore } from '@/components/use-notice-store';

// theme.ts imports a stylesheet that jest cannot parse.
jest.mock('@/global.css', () => ({}));

const metrics = { frame: { x: 0, y: 0, width: 400, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

describe('noticeVisibleMs', () => {
  it('is short by default and longer with an action or a screen reader', () => {
    expect(noticeVisibleMs(false, false)).toBe(4000);
    expect(noticeVisibleMs(true, false)).toBeGreaterThan(4000);
    expect(noticeVisibleMs(false, true)).toBeGreaterThan(4000);
  });
});

describe('Notice', () => {
  it('renders the action and dismiss as sibling buttons', async () => {
    const onPress = jest.fn();
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <Notice />
      </SafeAreaProvider>,
    );
    await act(async () => showNotice('Removed track', { label: 'Undo', onPress }));

    const undo = screen.getByRole('button', { name: 'Undo' });
    const dismiss = screen.getByRole('button', { name: 'Removed track' });
    expect(dismiss.props.accessibilityHint).toBe('Dismiss');
    expect(dismiss.parent).toBe(undo.parent);
    await fireEvent.press(undo);
    expect(onPress).toHaveBeenCalled();
  });

  afterEach(() => act(() => useNoticeStore.getState().dismiss()));

  it('renders as an alert live region', async () => {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <Notice />
      </SafeAreaProvider>,
    );
    await act(async () => showNotice("Couldn't update favourite"));

    const alert = screen.getByTestId('notice');
    expect(alert.props.accessibilityRole).toBe('alert');
    expect(alert.props.accessibilityLiveRegion).toBe('polite');
    expect(screen.getByText("Couldn't update favourite")).toBeTruthy();
  });
});
