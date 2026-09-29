/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        'surface-muted': 'var(--color-surface-muted)',
        text: 'var(--color-text)',
        'text-muted': 'var(--color-text-muted)',
        border: 'var(--color-border)',
        primary: 'var(--color-primary)',
        'primary-contrast': 'var(--color-primary-contrast)',
        'success-bg': 'var(--color-success-bg)',
        'success-fg': 'var(--color-success-fg)',
        'warning-bg': 'var(--color-warning-bg)',
        'warning-fg': 'var(--color-warning-fg)',
        'danger-bg': 'var(--color-danger-bg)',
        'danger-fg': 'var(--color-danger-fg)',
      },
    },
  },
  plugins: [],
};
