import { shouldRetryQuery } from '@/api/query-retry';
import { SubsonicNetworkError } from '@/api/subsonic/errors';

describe('shouldRetryQuery', () => {
  it('does not retry a timeout', () => {
    expect(shouldRetryQuery(0, new SubsonicNetworkError(new Error('x'), 'timeout'))).toBe(false);
  });

  it('retries other errors up to 3 times', () => {
    const error = new SubsonicNetworkError(new Error('x'));
    expect(shouldRetryQuery(0, error)).toBe(true);
    expect(shouldRetryQuery(2, error)).toBe(true);
    expect(shouldRetryQuery(3, error)).toBe(false);
    expect(shouldRetryQuery(0, new Error('y'))).toBe(true);
  });
});
