import { Alert } from 'react-native';

/**
 * Alert.alert from inside another alert's button handler. The custom alert
 * closes itself right after a button's onPress runs, which would hide a
 * second alert opened synchronously — so the follow-up is deferred.
 */
export const alertAfterClose = (...args: Parameters<typeof Alert.alert>) => {
  setTimeout(() => Alert.alert(...args), 320);
};
