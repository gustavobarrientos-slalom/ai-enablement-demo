/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      maxWidth: { shell: '480px' },
      spacing: {
        'safe-top': 'var(--safe-top)',
        'safe-right': 'var(--safe-right)',
        'safe-bottom': 'var(--safe-bottom)',
        'safe-left': 'var(--safe-left)',
      },
      keyframes: {
        'push-in': {
          from: { opacity: '0', transform: 'translateX(24px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'pop-out': {
          from: { opacity: '1', transform: 'translateX(0)' },
          to: { opacity: '0', transform: 'translateX(24px)' },
        },
      },
      animation: {
        'push-in': 'push-in 220ms ease-out both',
        'pop-out': 'pop-out 180ms ease-in both',
      },
      colors: {
        canvas: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        'surface-muted': 'var(--color-surface-muted)',
        text: 'var(--color-text)',
        'text-muted': 'var(--color-text-muted)',
        border: 'var(--color-border)',
        divider: 'var(--color-divider)',
        primary: 'var(--color-primary)',
        'primary-contrast': 'var(--color-primary-contrast)',
        'primary-container': 'var(--color-primary-container)',
        'on-primary-container': 'var(--color-on-primary-container)',
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
