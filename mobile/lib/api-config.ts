import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Resolves the API base URL for development and production environments.
 *
 * 1. Default fallback is `process.env.EXPO_PUBLIC_API_URL` or `http://localhost:4000/api/v1`.
 * 2. On web browsers, uses the configured URL directly (localhost works because the browser runs on the same PC).
 * 3. On physical Android/iOS devices running Expo Go:
 *    - `localhost` / `127.0.0.1` refers to the mobile device itself, which leads to `java.net.ConnectException`.
 *    - If the configured URL contains `localhost` or `127.0.0.1`, we dynamically extract the Metro development
 *      server host IP from `Constants.expoConfig?.hostUri` (e.g. `10.169.71.20:8081` -> `10.169.71.20`)
 *      and rewrite the target to point to the host PC's backend port (4000).
 * 4. Explicit configuration: If `EXPO_PUBLIC_API_URL` is set in `mobile/.env` with an explicit LAN IP
 *    (e.g., `http://10.169.71.20:4000/api/v1`), it will be used as configured.
 */
export function resolveApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  if (Platform.OS === 'web') {
    return configured;
  }

  const isLocalhost =
    configured.includes('localhost') || configured.includes('127.0.0.1');

  if (isLocalhost) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const devHost = hostUri.split(':')[0];
      if (devHost && devHost !== 'localhost' && devHost !== '127.0.0.1') {
        return configured
          .replace('localhost', devHost)
          .replace('127.0.0.1', devHost);
      }
    }
  }

  return configured;
}

export const API_BASE_URL = resolveApiBaseUrl();
