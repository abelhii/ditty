import { fireEvent, render, screen } from '@testing-library/react-native';

import { VolumeSlider } from '@/components/VolumeSlider';

// theme.ts imports a stylesheet that jest cannot parse.
jest.mock('@/global.css', () => ({}));

describe('VolumeSlider accessibility', () => {
  it('is an accessible adjustable that steps by 10% and clamps', async () => {
    const onChange = jest.fn();
    await render(<VolumeSlider volume={0.95} onChange={onChange} />);
    const slider = screen.getByLabelText('Volume');
    expect(slider.props.accessible).toBe(true);
    expect(slider.props.accessibilityRole).toBe('adjustable');

    await fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    await fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });

    expect(onChange).toHaveBeenNthCalledWith(1, 1);
    expect(onChange).toHaveBeenNthCalledWith(2, 0.9);
  });
});
