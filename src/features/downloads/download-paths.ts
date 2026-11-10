import { md5 } from 'js-md5';

/** The slice of the stored credentials that identifies a server+user. */
export type StoredCredentialsLike = { serverUrl: string; username: string };

/** Stable, filesystem-safe key for one server+user pair — downloads are server-specific. */
export function serverKey(serverUrl: string, username: string): string {
  return md5(`${serverUrl.toLowerCase()}|${username}`).slice(0, 12);
}

/** Keeps only characters safe in a file name; ids from the server are untrusted. */
function sanitize(part: string): string {
  return part.replace(/[^A-Za-z0-9_-]/g, '_');
}

/** File name for a downloaded track: `<trackId>.<suffix>`, `.bin` when the server reports no suffix. */
export function audioFileName(trackId: string, suffix?: string): string {
  const ext = suffix ? sanitize(suffix.toLowerCase()) : 'bin';
  return `${sanitize(trackId)}.${ext}`;
}

/** File name for a downloaded track's cover art. */
export function coverFileName(coverArtId: string): string {
  return `cover-${sanitize(coverArtId)}.jpg`;
}
