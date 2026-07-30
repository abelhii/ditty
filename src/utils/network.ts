import * as Network from 'expo-network';

/**
 * A thin, one-shot connectivity probe over `expo-network` (iOS/Android/Web). Used *reactively* to
 * flavour error messages at the point of failure — **not** as the re-login gate. Mid-session auth
 * rejection keys off the error *class* (`SubsonicApiError.isAuthError`), never this probe: a
 * code-40 response is definitionally a server reply, never "offline". See ADR 0007
 * (docs/adr/0007-error-states.md), which corrects ADR 0006's rationale.
 *
 * Its two real callers are (1) the opaque `<Audio onError>` callback, which carries no error class,
 * so connectivity is the only side-channel to word a stream failure as offline vs. a bad stream,
 * and (2) `QueryState`, which otherwise guesses "You're offline" for every `SubsonicNetworkError`
 * (which also fires when the server is down and the device is fine).
 */
export async function isOffline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    // `isInternetReachable` is the stronger signal but can be undefined before it resolves; fall
    // back to `isConnected`. Only claim "offline" when a field explicitly says so — an undefined
    // reading means "can't tell", which should not masquerade as offline.
    if (state.isInternetReachable === false) return true;
    if (state.isConnected === false) return true;
    return false;
  } catch {
    // A probe that itself fails tells us nothing — don't assert offline off a broken read.
    return false;
  }
}
