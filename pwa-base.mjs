/** The GitHub Pages base; it must equal the repository name. */
export const VITE_BASE_PATH = '/ai-enablement-demo/';

/** The Tauri CLI sets `TAURI_ENV_PLATFORM` for its before-dev/build commands. */
export const isDesktopBuild = (env = process.env) => Boolean(env.TAURI_ENV_PLATFORM);

export const resolveBasePath = (env = process.env) =>
  isDesktopBuild(env) ? '/' : VITE_BASE_PATH;

/**
 * Desktop share links must point at the hosted web app. Only production builds
 * are checked, so `desktop:dev` works without the variable.
 */
export function assertDesktopEnv(env = process.env, command = 'build') {
  if (command !== 'build' || !isDesktopBuild(env)) {
    return;
  }

  const value = env.VITE_SHARE_BASE_URL;
  let url = null;

  try {
    url = value ? new URL(value) : null;
  } catch {
    url = null;
  }

  if (!url || url.protocol !== 'https:') {
    throw new Error(
      'VITE_SHARE_BASE_URL must be set to an absolute https URL for desktop builds ' +
        `(for example https://owner.github.io/ai-enablement-demo/). Received: ${value ?? '(unset)'}`,
    );
  }
}
