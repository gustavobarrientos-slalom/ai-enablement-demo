export function buildShareUrl(baseUrl: string, payload: string): string {
  const url = new URL(baseUrl);
  url.search = '';
  url.hash = `share=${payload}`;
  return url.toString();
}

export function readSharePayload(hash: string): string | null {
  const prefix = '#share=';
  return hash.startsWith(prefix) ? hash.slice(prefix.length) : null;
}
