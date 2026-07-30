import { Redirect } from 'expo-router';

// The Home tab lives under `library/`; this index route forwards `/` into it. `/library`'s own
// index is the step-9 discover shelves (HomeScreen); the full Artists/Genres catalog list sits at
// `/library/artists`. See PLAN.md Build Order steps 7b and 9.
export default function IndexRoute() {
  return <Redirect href="/library" />;
}
