import { Platform } from 'react-native';

/**
 * MediOS backend base URL, including `/api`. Set EXPO_PUBLIC_API_URL for a
 * phone on the LAN or a deployed server; the defaults reach a backend running
 * on this computer (the Android emulator sees the host as 10.0.2.2).
 * Release builds need HTTPS: Android blocks plain HTTP outside debug builds.
 */
const DEFAULT_API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:4000/api' : 'http://localhost:4000/api';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/$/, '');
