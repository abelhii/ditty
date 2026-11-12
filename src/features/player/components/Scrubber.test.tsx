import { fireEvent, render, screen } from '@testing-library/react-native';

import { Scrubber } from '@/features/player/components/Scrubber';

// theme.ts imports a stylesheet that jest cannot parse.
jest.mock('@/global.css', () => ({}));

describe('Scrubber accessibility', () => {
  it('exposes an adjustable "Seek" control with a spoken value', async () => {
    await render(<Scrubber position={83} duration={225} fraction={83 / 225} onSeek={() => {}} />);

    const seek = screen.getByLabelText('Seek');
    expect(seek.props.accessibilityRole).toBe('adjustable');
    expect(seek.props.accessibilityValue).toEqual({ text: '1:23 of 3:45' });
  });

  it('seeks +/-10s on increment/decrement, clamped to the track', async () => {
    const onSeek = jest.fn();
    await render(<Scrubber position={5} duration={20} fraction={0.25} onSeek={onSeek} />);
    const seek = screen.getByLabelText('Seek');

    await fireEvent(seek, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    await fireEvent(seek, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });

    expect(onSeek).toHaveBeenNthCalledWith(1, 15);
    expect(onSeek).toHaveBeenNthCalledWith(2, 0);
  });

  it('does nothing when the duration is unknown', async () => {
    const onSeek = jest.fn();
    await render(<Scrubber position={0} duration={0} fraction={0} onSeek={onSeek} />);

    await fireEvent(screen.getByLabelText('Seek'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });

    expect(onSeek).not.toHaveBeenCalled();
  });
});
