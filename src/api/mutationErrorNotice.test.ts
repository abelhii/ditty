import { mutationErrorNotice } from '@/api/mutationErrorNotice';
import { SubsonicApiError, SubsonicNetworkError } from '@/api/subsonic/errors';

describe('mutationErrorNotice', () => {
  it('words an offline (network) failure as "not saved", ignoring the action', () => {
    const message = mutationErrorNotice(new SubsonicNetworkError(new Error('fetch failed')), 'favourite this');
    expect(message).toBe("You're offline — change not saved");
  });

  it('words a server-side failure as "couldn\'t {action}"', () => {
    expect(mutationErrorNotice(new SubsonicApiError(0), 'create the playlist')).toBe(
      "Couldn't create the playlist",
    );
  });

  it('falls back to a generic couldn\'t-{action} for an unknown error', () => {
    expect(mutationErrorNotice(new Error('boom'), 'delete the playlist')).toBe(
      "Couldn't delete the playlist",
    );
  });
});
