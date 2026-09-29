declare module '*.mjs' {
  type BuildEnv = Record<string, string | undefined>;

  export const VITE_BASE_PATH: string;
  export function isDesktopBuild(env?: BuildEnv): boolean;
  export function resolveBasePath(env?: BuildEnv): string;
  export function assertDesktopEnv(env?: BuildEnv, command?: 'build' | 'serve'): void;
  export function buildManifest(basePath: string): {
    name: string;
    short_name: string;
    display: string;
    scope: string;
    start_url: string;
    theme_color: string;
    background_color: string;
    icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
  };
  export const THEME_COLORS: {
    readonly light: '#ffffff';
    readonly dark: '#1e293b';
  };
}
