import { render, screen } from '@testing-library/react-native';

import { CustomTabList, TabButton } from '@/components/AppTabs.web';
import { Colors } from '@/constants/theme';

// theme.ts imports the web stylesheet, which jest can't parse.
jest.mock('@/global.css', () => ({}));

const mockWindowWidth = { current: 1024 };
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: mockWindowWidth.current, height: 812, scale: 1, fontScale: 1 }),
}));

async function renderTabBar(width: number) {
  mockWindowWidth.current = width;
  await render(
    <CustomTabList>
      <TabButton isFocused>Home</TabButton>
      <TabButton>Library</TabButton>
      <TabButton>Likes</TabButton>
      <TabButton>Search</TabButton>
      <TabButton>Settings</TabButton>
    </CustomTabList>,
  );
}

describe('web tab bar', () => {
  // Phone and tablet widths get a bottom tab bar (icon over label, no brand); at 900 and up a
  // sidebar replaces it.
  it.each([320, 375, 899])('renders the bottom bar without the brand at %i wide', async (width) => {
    await renderTabBar(width);

    expect(screen.queryByText('Sicmu')).toBeNull();
    expect(screen.getByText('Likes')).toBeOnTheScreen();
    expect(screen.getByText('Search')).toBeOnTheScreen();
    expect(screen.getByText('Settings')).toBeOnTheScreen();
  });

  it.each([900, 1200])('renders the sidebar at %i wide', async (width) => {
    await renderTabBar(width);

    expect(screen.getByText('Sicmu')).toBeOnTheScreen();
    expect(screen.getByText('Home')).toBeOnTheScreen();
    expect(screen.getByText('Library')).toBeOnTheScreen();
    expect(screen.getByText('Likes')).toBeOnTheScreen();
    // Search is the top bar's job on wide; Settings becomes the account row.
    expect(screen.queryByText('Search')).toBeNull();
    expect(screen.getByLabelText('Settings')).toBeOnTheScreen();
  });

  it('highlights the active sidebar item with the accent colour', async () => {
    await renderTabBar(1200);

    expect(screen.getByText('Home')).toHaveStyle({ color: Colors.light.accent });
    expect(screen.getByText('Library')).toHaveStyle({ color: Colors.light.text });
  });
});
