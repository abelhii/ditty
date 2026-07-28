import {
  RECENT_SEARCHES_CAP,
  addRecentSearch,
  removeRecentSearch,
} from '@/features/search/recentSearches';

describe('addRecentSearch', () => {
  it('adds a term to the front, most-recent-first', () => {
    expect(addRecentSearch(['b', 'a'], 'c')).toEqual(['c', 'b', 'a']);
  });

  it('moves an existing term to the front instead of duplicating it', () => {
    expect(addRecentSearch(['b', 'a', 'c'], 'a')).toEqual(['a', 'b', 'c']);
  });

  it('dedups case-insensitively, keeping the newly-typed casing', () => {
    expect(addRecentSearch(['Radiohead'], 'radiohead')).toEqual(['radiohead']);
  });

  it('trims surrounding whitespace', () => {
    expect(addRecentSearch([], '  jazz  ')).toEqual(['jazz']);
  });

  it('ignores a blank term', () => {
    expect(addRecentSearch(['a'], '   ')).toEqual(['a']);
  });

  it(`caps the list at ${RECENT_SEARCHES_CAP}`, () => {
    const full = Array.from({ length: RECENT_SEARCHES_CAP }, (_, i) => `term${i}`);
    const result = addRecentSearch(full, 'newest');
    expect(result).toHaveLength(RECENT_SEARCHES_CAP);
    expect(result[0]).toBe('newest');
    expect(result).not.toContain(`term${RECENT_SEARCHES_CAP - 1}`);
  });
});

describe('removeRecentSearch', () => {
  it('removes a term case-insensitively', () => {
    expect(removeRecentSearch(['Jazz', 'rock'], 'jazz')).toEqual(['rock']);
  });

  it('leaves the list unchanged when the term is absent', () => {
    expect(removeRecentSearch(['a', 'b'], 'c')).toEqual(['a', 'b']);
  });
});
