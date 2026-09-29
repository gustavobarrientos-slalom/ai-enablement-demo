export function webShareBaseUrl(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

// Release builds are guaranteed the variable; in `desktop:dev` fall back to the dev server.
export function desktopShareBaseUrl(): string {
  return import.meta.env.VITE_SHARE_BASE_URL || (import.meta.env.DEV ? webShareBaseUrl() : '');
}
