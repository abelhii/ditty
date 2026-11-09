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
      <TabButton>Search</TabButton>
      <TabButton>My Music</TabButton>
      <TabButton>Settings</TabButton>
    </CustomTabList>,
  );
}

describe('web tab bar', () => {
  // At 375 wide the full bar (brand + four tabs with wide padding) measured 491 px and pushed the
  // page sideways. Phone widths get a compact bar: no brand, tighter padding.
  it.each([320, 375])('drops the brand and tightens tab padding at %i wide', async (width) => {
    await renderTabBar(width);

    expect(screen.queryByText('Sicmu')).toBeNull();
    expect(screen.getByText('Settings').parent).toHaveStyle({ paddingHorizontal: Spacing.two });
  });

  it('keeps the brand and roomy tabs on wide screens', async () => {
    await renderTabBar(1024);

    expect(screen.getByText('Sicmu')).toBeOnTheScreen();
    expect(screen.getByText('Settings').parent).toHaveStyle({ paddingHorizontal: Spacing.three });
  });
});
