import type { ConfigContext, ExpoConfig } from 'expo/config';

type BuildEnvironment = Record<string, string | undefined>;

/** Local Expo Go stays unchanged. Staging never guesses ownership or an API. */
export function makeAppConfig(
  config: ExpoConfig,
  env: BuildEnvironment,
): ExpoConfig {
  const variant = env.APP_VARIANT;
  if (!variant || variant === 'local') {
    if (env.EAS_BUILD_PROFILE?.startsWith('staging'))
      throw new Error('APP_VARIANT=staging is required for staging builds.');
    return config;
  }
  if (variant !== 'staging') throw new Error('Unsupported APP_VARIANT.');
  function required(key: string) {
    const value = env[key]?.trim();
    if (!value) throw new Error(`${key} is required for staging builds.`);
    return value;
  }
  const bundleIdentifier = required('APP_IOS_BUNDLE_IDENTIFIER');
  if (!/^[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+){2,}$/.test(bundleIdentifier))
    throw new Error(
      'APP_IOS_BUNDLE_IDENTIFIER must be an approved reverse-DNS ID.',
    );
  const owner = required('EXPO_ACCOUNT_OWNER');
  const projectId = required('EXPO_PUBLIC_EXPO_PROJECT_ID');
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(projectId))
    throw new Error(
      'EXPO_PUBLIC_EXPO_PROJECT_ID must be the approved project UUID.',
    );
  const api = new URL(required('EXPO_PUBLIC_API_URL'));
  if (
    api.protocol !== 'https:' ||
    api.username ||
    api.password ||
    api.search ||
    api.hash ||
    api.pathname !== '/api/v1' ||
    !api.hostname.includes('.') ||
    /^(?:\d{1,3}\.){3}\d{1,3}$/.test(api.hostname) ||
    api.hostname.includes(':') ||
    /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(api.hostname)
  )
    throw new Error('EXPO_PUBLIC_API_URL must be a public HTTPS /api/v1 URL.');
  const team = env.APPLE_TEAM_ID?.trim();
  if (team && !/^[A-Z0-9]{10}$/.test(team))
    throw new Error('APPLE_TEAM_ID must be the approved 10-character team ID.');
  return {
    ...config,
    name: 'CampusHR Staging',
    owner,
    scheme: 'campushr-staging',
    ios: {
      ...config.ios,
      bundleIdentifier,
      ...(team ? { appleTeamId: team } : {}),
    },
    // No OTA update channel is enabled for the first pilot.
    updates: { ...config.updates, enabled: false },
    extra: {
      ...config.extra,
      appVariant: 'staging',
      eas: { ...config.extra?.eas, projectId },
    },
  };
}

export default ({ config }: ConfigContext): ExpoConfig => {
  if (!config.name || !config.slug)
    throw new Error('app.json must define the CampusHR name and slug.');
  return makeAppConfig(
    { ...config, name: config.name, slug: config.slug },
    process.env,
  );
};
