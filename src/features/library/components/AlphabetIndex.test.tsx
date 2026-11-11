import { fireEvent, render, screen } from '@testing-library/react-native';

import { AlphabetIndex } from '@/features/library/components/AlphabetIndex';

// theme.ts imports the web stylesheet for its side effect; jest can't parse CSS.
jest.mock('@/global.css', () => ({}));
jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));

// The rail is 27 letters across its height; at 16 per letter '#' is first: y 17 is 'A', y 33 is 'B'.
const layout = { nativeEvent: { layout: { height: 27 * 16 } } };
const touch = (y: number) => ({ nativeEvent: { locationY: y } });

describe('AlphabetIndex', () => {
  it('selects the letter under a tap and under a drag', async () => {
    const onSelect = jest.fn();
    await render(<AlphabetIndex available={new Set(['A', 'B'])} onSelect={onSelect} />);
    const rail = screen.getByLabelText('Jump to letter');
    await fireEvent(rail, 'layout', layout);

    await fireEvent(rail, 'responderGrant', touch(17));
    await fireEvent(rail, 'responderMove', touch(33));

    expect(onSelect.mock.calls).toEqual([['A'], ['B']]);
  });

  it('ignores letters with no rows', async () => {
    const onSelect = jest.fn();
    await render(<AlphabetIndex available={new Set(['B'])} onSelect={onSelect} />);

    const rail = screen.getByLabelText('Jump to letter');
    await fireEvent(rail, 'layout', layout);
    await fireEvent(rail, 'responderGrant', touch(17));

    expect(onSelect).not.toHaveBeenCalled();
  });
});
