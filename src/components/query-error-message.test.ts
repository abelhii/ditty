import { SubsonicApiError, SubsonicHttpError, SubsonicNetworkError } from '@/api/subsonic/errors';
import { queryErrorMessage } from '@/components/query-error-message';

describe('queryErrorMessage', () => {
  const network = new SubsonicNetworkError(new Error('x'));

  it('says offline only when the device probe says so', () => {
    expect(queryErrorMessage(network, true)).toMatch(/offline/i);
  });

  it('blames the server when the device is online', () => {
    const message = queryErrorMessage(network, false);
    expect(message).toMatch(/can't reach your server/i);
    expect(message).not.toMatch(/offline/i);
  });

  it('words a timeout separately', () => {
    expect(queryErrorMessage(new SubsonicNetworkError(new Error('x'), 'timeout'), false)).toMatch(/in time/);
  });

  it('prefers the offline wording over timeout when the device is offline', () => {
    expect(queryErrorMessage(new SubsonicNetworkError(new Error('x'), 'timeout'), true)).toMatch(/offline/i);
  });

  it('passes server-answered errors through regardless of connectivity', () => {
    expect(queryErrorMessage(new SubsonicHttpError(502), true)).toContain('HTTP 502');
    expect(queryErrorMessage(new SubsonicApiError(70), true)).toBe('The requested data was not found.');
  });

  it('falls back for non-Error values', () => {
    expect(queryErrorMessage('x', false)).toBe('Something went wrong.');
  });
});
