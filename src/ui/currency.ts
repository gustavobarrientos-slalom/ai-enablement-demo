const formatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Takes integer cents. The integer and fraction parts are formatted separately
 * so money never passes through floating-point arithmetic.
 */
export function formatCents(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new Error('The amount must be expressed in integer cents.');
  }

  const absolute = Math.abs(cents);
  const units = Math.trunc(absolute / 100);
  const remainder = absolute % 100;

  const formatted = formatter
    .formatToParts(units)
    .map((part) =>
      part.type === 'fraction' ? String(remainder).padStart(2, '0') : part.value,
    )
    .join('');

  return cents < 0 ? `-${formatted}` : formatted;
}

const percentFormatter = new Intl.NumberFormat('es-MX', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * Display-only percentage text, to one decimal place. Never used for money,
 * so its floating-point input is safe here.
 */
export function formatPercent(percent: number): string {
  return `${percentFormatter.format(percent)}%`;
}
