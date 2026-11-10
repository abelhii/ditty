/**
 * Subsonic reports auth/API failures on `stream`/`download` as an HTTP 200 whose body is an XML
 * (or JSON) `subsonic-response` with `status="failed"` — not as an audio file and not as an HTTP
 * error. A download that saves that body would store a few hundred bytes of XML as "audio".
 * Returns the Subsonic error code if `body` is such a response, else null.
 */
export function parseApiErrorBody(body: string): number | null {
  if (!body.includes('subsonic-response')) return null;
  const xml = /<error[^>]*\bcode="(\d+)"/.exec(body);
  if (xml) return Number(xml[1]);
  const json = /"error"\s*:\s*\{[^}]*"code"\s*:\s*(\d+)/.exec(body);
  if (json) return Number(json[1]);
  // A failed envelope with no readable code is still not audio.
  return /status="failed"|"status"\s*:\s*"failed"/.test(body) ? 0 : null;
}
