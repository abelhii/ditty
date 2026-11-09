import { Redirect } from 'expo-router';

// The Home tab lives at `/home`; this index route forwards `/` into it.
export default function IndexRoute() {
  return <Redirect href="/home" />;
}
