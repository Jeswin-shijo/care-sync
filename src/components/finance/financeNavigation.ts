import { router, type Href } from 'expo-router';

/**
 * Navigation helpers for the finance screens.
 *
 * React Navigation 7 `navigate` pushes a new entry unless the target is the
 * current screen, so hopping between two stack screens (Reports ↔ Financial,
 * Report ↔ Receipt) would keep growing the stack, and `navigate('/(tabs)/…')`
 * from a stack screen would mount a second tab navigator. These helpers pop
 * back to an existing entry instead.
 */
type StackStateLike = { index: number; routes: ReadonlyArray<{ name: string }> } | undefined;

/** Pops back to `routeName` when it is already below us in this stack, otherwise pushes `href`. */
export const pushOrPopTo = (state: StackStateLike, routeName: string, href: Href) => {
  const below = state ? state.routes.slice(0, state.index) : [];
  if (below.some((r) => r.name === routeName)) {
    router.dismissTo(href);
  } else {
    router.push(href);
  }
};

/** Opens the Billing tab (optionally pre-filtered) from any stack screen without stacking tabs. */
export const openBillingTab = (filter?: string) => {
  router.dismissTo(filter ? { pathname: '/(tabs)/billing', params: { filter } } : '/(tabs)/billing');
};
