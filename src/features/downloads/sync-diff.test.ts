import { staleMembers } from '@/features/downloads/sync-diff';

describe('staleMembers', () => {
  it('returns members the server dropped', () => {
    expect(staleMembers(['a', 'b', 'c'], ['b'])).toEqual(['a', 'c']);
  });

  it('ignores tracks the server added', () => {
    expect(staleMembers(['a'], ['a', 'z'])).toEqual([]);
  });

  it('releases everything when the server list is empty, and nothing when there are no members', () => {
    expect(staleMembers(['a', 'b'], [])).toEqual(['a', 'b']);
    expect(staleMembers([], ['a'])).toEqual([]);
    expect(staleMembers([], [])).toEqual([]);
  });
});
