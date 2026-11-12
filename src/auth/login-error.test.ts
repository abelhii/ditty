import { SubsonicApiError, SubsonicHttpError, SubsonicNetworkError } from '@/api/subsonic/errors';
import { loginErrorMessage } from '@/auth/login-error';

describe('loginErrorMessage', () => {
  it('hints at http:// when a scheme-less URL could not be reached', () => {
    const message = loginErrorMessage(new SubsonicNetworkError(new Error('x')), '192.168.1.5:4533');
    expect(message).toContain('Could not reach the server.');
    expect(message).toContain('try http://');
  });

  it('hints at http:// when a scheme-less URL answered with a non-Subsonic reply', () => {
    expect(loginErrorMessage(new SubsonicHttpError(502), 'music.lan')).toContain('try http://');
  });

  it('adds no hint when the user typed a scheme', () => {
    const error = new SubsonicNetworkError(new Error('x'));
    expect(loginErrorMessage(error, 'https://music.example.com')).toBe(error.message);
  });

  it('adds no hint to a server-side rejection', () => {
    const error = new SubsonicApiError(40);
    expect(loginErrorMessage(error, 'music.example.com')).toBe(error.message);
  });

  it('falls back for a non-Error throw', () => {
    expect(loginErrorMessage('boom', 'x')).toBe('Login failed.');
  });
});
