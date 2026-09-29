const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

/** Formats an ISO timestamp as a short English date, e.g. `Sep 20, 2026`. */
export function formatEventDate(iso: string): string {
  const parsed = Date.parse(iso);

  if (Number.isNaN(parsed)) {
    return '';
  }

  return dateFormatter.format(new Date(parsed));
}
