import { render, screen } from '@testing-library/react-native';

import { CustomTabList, TabButton } from '@/components/AppTabs.web';
import { Spacing } from '@/constants/theme';

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
      <TabButton>Search</TabButton>
      <TabButton>Settings</TabButton>
    </CustomTabList>,
  );
}

describe('web tab bar', () => {
  // Phone and tablet widths get a bottom tab bar (icon over label, no brand); the top pill bar with
  // the brand is kept for wide screens, where a sidebar is expected to replace it later.
  it.each([320, 375, 899])('renders the bottom bar without the brand at %i wide', async (width) => {
    await renderTabBar(width);

    expect(screen.queryByText('Sicmu')).toBeNull();
    expect(screen.getByText('Settings')).toBeOnTheScreen();
  });

  it('keeps the brand and top pill tabs on wide screens', async () => {
    await renderTabBar(900);

    expect(screen.getByText('Sicmu')).toBeOnTheScreen();
    expect(screen.getByText('Settings').parent).toHaveStyle({ paddingHorizontal: Spacing.three });
  });
});
