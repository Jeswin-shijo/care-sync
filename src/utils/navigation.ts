import { router } from 'expo-router';

/**
 * Navigation helpers.
 *
 * Tab screens must be reached with router.navigate — pushing a tab path
 * stacks a second tab navigator on top of the first.
 */
export type TabName = 'index' | 'patients' | 'billing' | 'ai' | 'more';

const TAB_PATHS: Record<string, TabName> = {
  '/': 'index',
  '/(tabs)': 'index',
  '/(tabs)/index': 'index',
  '/patients': 'patients',
  '/(tabs)/patients': 'patients',
  '/billing': 'billing',
  '/(tabs)/billing': 'billing',
  '/ai': 'ai',
  '/(tabs)/ai': 'ai',
  '/more': 'more',
  '/(tabs)/more': 'more',
};

/**
 * Switches to a tab. From a stack screen, dismissTo pops back to the existing
 * tab navigator (router.navigate would push a second one in this Expo Router
 * version); inside the tabs it just switches.
 */
export const goToTab = (tab: TabName, params?: Record<string, string>) => {
  const pathname = (tab === 'index' ? '/(tabs)' : `/(tabs)/${tab}`) as any;
  const href = params && Object.keys(params).length ? { pathname, params } : pathname;
  if (router.canDismiss()) router.dismissTo(href);
  else router.navigate(href);
};

/** Opens any app route (AI action cards, notifications, shortcuts). */
export const openRoute = (route: string, params?: Record<string, any>) => {
  const tab = TAB_PATHS[route];
  if (tab) {
    goToTab(tab, params as Record<string, string> | undefined);
    return;
  }
  const clean = params
    ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
    : undefined;
  if (clean && Object.keys(clean).length) {
    router.push({ pathname: route as any, params: clean });
  } else {
    router.push(route as any);
  }
};

/** Leaves a finished flow (form submitted) and lands on a tab without stacking duplicates. */
export const finishFlowToTab = (tab: TabName, params?: Record<string, string>) => goToTab(tab, params);
