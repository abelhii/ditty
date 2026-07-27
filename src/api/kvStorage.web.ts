/** Web counterpart to kvStorage.ts — see that file for why this is a separate .web.ts rather
 *  than an inline Platform.OS branch. */
export function getItem(key: string): string | null {
  return localStorage.getItem(key);
}

export function setItem(key: string, value: string): void {
  localStorage.setItem(key, value);
}

export function removeItem(key: string): void {
  localStorage.removeItem(key);
}
