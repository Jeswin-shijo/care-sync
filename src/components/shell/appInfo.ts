import Constants from 'expo-constants';

/** App version from app.json (expo.version). */
export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export const APP_VERSION_LABEL = `CareSync v${APP_VERSION} • MediOS AI`;
