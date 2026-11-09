// Lives outside src/app because every .tsx file under src/app becomes an expo-router route.
import { Text } from 'react-native';
import { router } from 'expo-router';
import { act, renderRouter } from 'expo-router/testing-library';

import * as LibraryLayout from '@/app/library/_layout';
import * as MyMusicLayout from '@/app/my-music/_layout';
import * as SearchLayout from '@/app/search/_layout';

function Stub() {
  return <Text>stub</Text>;
}

describe('tab stack layouts', () => {
  // A detail screen opened straight from its URL (a reload, a shared link, an installed web app)
  // must still have the tab's first screen under it, so the stack header shows a back button.
  it.each([
    ['library', LibraryLayout, ['album/[id]', 'artist/[id]', 'genre/[name]', 'artists'], '/library/album/1'],
    ['my-music', MyMusicLayout, ['playlist/[id]', 'liked-songs', 'album/[id]', 'artist/[id]'], '/my-music/playlist/1'],
    ['search', SearchLayout, ['album/[id]', 'artist/[id]'], '/search/artist/1'],
  ])('%s: a deep-linked detail screen can go back to the tab index', async (tab, layout, details, url) => {
    const routes: Record<string, typeof Stub | typeof layout> = {
      [`${tab}/_layout`]: layout,
      [`${tab}/index`]: Stub,
    };
    for (const detail of details) routes[`${tab}/${detail}`] = Stub;

    // RNTL 14's render is async: renderRouter returns its promise with the router getters attached.
    const result = renderRouter(routes, { initialUrl: url });
    await result;

    expect(result.getPathname()).toBe(url);
    expect(router.canGoBack()).toBe(true);

    // testRouter.back asserts through `screen`, which RNTL 14 doesn't set up for renderRouter.
    await act(async () => router.back());
    expect(result.getPathname()).toBe(`/${tab}`);
  });
});
