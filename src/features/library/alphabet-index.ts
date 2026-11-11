/** The letters of the jump rail, in order. `#` collects digits, symbols and anything non-Latin. */
export const ALPHABET = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];

/** The rail letter a name falls under: its first character, accents stripped, `#` unless A-Z. */
export function indexLetter(text: string): string {
  const first = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .charAt(0)
    .toUpperCase();
  return first >= 'A' && first <= 'Z' ? first : '#';
}

/** Where each letter first appears in `items`, in their current order (so it follows an
 *  ascending or descending name sort alike). Letters with no items are absent. */
export function firstIndexByLetter<T>(items: T[], text: (item: T) => string): Map<string, number> {
  const first = new Map<string, number>();
  items.forEach((item, index) => {
    const letter = indexLetter(text(item));
    if (!first.has(letter)) first.set(letter, index);
  });
  return first;
}

/** Maps a vertical touch position within the rail to a letter, clamped to the rail's ends. */
export function letterAt(y: number, letterHeight: number): string {
  const index = Math.floor(y / letterHeight);
  return ALPHABET[Math.min(Math.max(index, 0), ALPHABET.length - 1)];
}
