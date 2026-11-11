import { ALPHABET, firstIndexByLetter, indexLetter, letterAt } from '@/features/library/alphabet-index';

describe('indexLetter', () => {
  it('uses the first letter, case- and accent-insensitively', () => {
    expect(indexLetter('abba')).toBe('A');
    expect(indexLetter('Éire')).toBe('E');
    expect(indexLetter('  zed')).toBe('Z');
  });
  it('files digits, symbols, non-Latin and empty text under #', () => {
    expect(indexLetter('3 Doors Down')).toBe('#');
    expect(indexLetter('(Sittin on) the Dock')).toBe('#');
    expect(indexLetter('日本')).toBe('#');
    expect(indexLetter('')).toBe('#');
  });
});

describe('firstIndexByLetter', () => {
  it('records the first row of each letter', () => {
    const map = firstIndexByLetter(['1999', 'Abba', 'Ace', 'Beck'], (s) => s);
    expect([...map]).toEqual([['#', 0], ['A', 1], ['B', 3]]);
  });
  it('follows a descending order', () => {
    const map = firstIndexByLetter(['Beck', 'Ace', 'Abba'], (s) => s);
    expect(map.get('A')).toBe(1);
  });
  it('is empty for an empty list', () => {
    expect(firstIndexByLetter([], (s: string) => s).size).toBe(0);
  });
});

describe('letterAt', () => {
  it('maps a position to a letter and clamps outside the rail', () => {
    expect(letterAt(0, 16)).toBe('#');
    expect(letterAt(17, 16)).toBe('A');
    expect(letterAt(-5, 16)).toBe('#');
    expect(letterAt(10_000, 16)).toBe('Z');
    expect(ALPHABET).toHaveLength(27);
  });
});
