import * as SecureStore from 'expo-secure-store';

// The refresh token is the only credential kept on the device: Keychain on iOS,
// Keystore-encrypted storage on Android. THIS_DEVICE_ONLY keeps it out of iCloud
// backups, and the config plugin excludes it from Android backups. The short-lived
// access token stays in memory.

const KEY = 'medios.refreshToken';
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export const tokenStore = {
  get: () => SecureStore.getItemAsync(KEY, OPTIONS),
  set: (token: string) => SecureStore.setItemAsync(KEY, token, OPTIONS),
  clear: () => SecureStore.deleteItemAsync(KEY, OPTIONS),
};
