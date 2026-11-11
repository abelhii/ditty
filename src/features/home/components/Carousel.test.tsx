import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Carousel } from '@/features/home/components/Carousel';

// theme.ts imports the web stylesheet for its side effect; jest can't parse CSS.
jest.mock('@/global.css', () => ({}));
jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));

type Item = { id: string };

function renderCarousel(props: Partial<React.ComponentProps<typeof Carousel<Item>>> = {}) {
  return render(
    <Carousel<Item>
      title="Most played"
      data={[{ id: 'a' }, { id: 'b' }]}
      loadingHeight={96}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <Text>{`item ${item.id}`}</Text>}
      {...props}
    />,
  );
}

describe('Carousel', () => {
  it('renders the title, items and the scroll controls', async () => {
    await renderCarousel();
    expect(screen.getByText('Most played')).toBeTruthy();
    expect(screen.getByText('item a')).toBeTruthy();
    expect(screen.getByLabelText('Scroll left')).toBeTruthy();
    expect(screen.getByLabelText('Scroll right')).toBeTruthy();
  });

  it('starts with the left button disabled', async () => {
    await renderCarousel();
    expect(screen.getByLabelText('Scroll left').props.accessibilityState.disabled).toBe(true);
  });

  it('calls onRefresh when the refresh button is pressed', async () => {
    const onRefresh = jest.fn();
    await renderCarousel({ onRefresh });
    await fireEvent.press(screen.getByLabelText('Refresh Most played'));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('disables refresh while refreshing', async () => {
    await renderCarousel({ onRefresh: jest.fn(), refreshing: true });
    expect(screen.getByLabelText('Refresh Most played').props.accessibilityState.disabled).toBe(true);
  });

  it('omits the refresh button without onRefresh', async () => {
    await renderCarousel();
    expect(screen.queryByLabelText('Refresh Most played')).toBeNull();
  });

  it('renders nothing for empty or missing data', async () => {
    await renderCarousel({ data: [] });
    expect(screen.queryByText('Most played')).toBeNull();
    await renderCarousel({ data: undefined });
    expect(screen.queryByText('Most played')).toBeNull();
  });

  it('shows only the title and a spinner while loading', async () => {
    await renderCarousel({ loading: true });
    expect(screen.getByText('Most played')).toBeTruthy();
    expect(screen.queryByText('item a')).toBeNull();
    expect(screen.queryByLabelText('Scroll left')).toBeNull();
  });
});
