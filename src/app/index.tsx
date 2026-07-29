import { Redirect } from 'expo-router';

// The Home tab is the catalog browse stack (Artists + Genres), which lives under `library/`. This
// index route just forwards `/` into it. Step 7b dropped the separate Library tab and folded
// Artists/Genres into Home (per the user's call); step 9 will replace this with real discover
// shelves. See PLAN.md Build Order steps 7b and 9.
export default function IndexRoute() {
  return <Redirect href="/library" />;
}
