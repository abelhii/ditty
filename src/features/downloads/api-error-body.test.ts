import { parseApiErrorBody } from '@/features/downloads/api-error-body';

describe('parseApiErrorBody', () => {
  it('reads the code from an XML error', () => {
    const xml =
      '<?xml version="1.0"?><subsonic-response status="failed" version="1.16.1"><error code="40" message="Wrong"/></subsonic-response>';
    expect(parseApiErrorBody(xml)).toBe(40);
  });

  it('reads the code from a JSON error', () => {
    const json = '{"subsonic-response":{"status":"failed","error":{"code":70,"message":"nf"}}}';
    expect(parseApiErrorBody(json)).toBe(70);
  });

  it('returns 0 for a failed envelope with no readable code', () => {
    expect(parseApiErrorBody('<subsonic-response status="failed"></subsonic-response>')).toBe(0);
  });

  it('returns null for non-API bodies and ok envelopes', () => {
    expect(parseApiErrorBody('')).toBeNull();
    expect(parseApiErrorBody('fLaC\u0000\u0000binary-ish')).toBeNull();
    expect(parseApiErrorBody('<subsonic-response status="ok"></subsonic-response>')).toBeNull();
  });
});
