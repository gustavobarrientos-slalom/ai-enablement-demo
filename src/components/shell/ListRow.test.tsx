import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { faUsers } from '../../ui/icons';
import { ListRow } from './ListRow';

it('renders amount and chevron only for actionable rows with a 44px target', () => {
  const { rerender } = render(<ul><ListRow icon={faUsers} primary="Ana" amount="$20.00" onSelect={vi.fn()} /></ul>);
  expect(screen.getByText('$20.00')).toBeInTheDocument();
  expect(screen.getByRole('button')).toHaveClass('mobile-target');
  expect(screen.getByLabelText('Open')).toBeInTheDocument();
  rerender(<ul><ListRow icon={faUsers} primary="Ana" /></ul>);
  expect(screen.queryByLabelText('Open')).not.toBeInTheDocument();
  expect(screen.getByRole('listitem')).toHaveClass('min-h-11');
});

it('renders a trailing action within a non-tappable row beside the text', () => {
  render(<ul><ListRow icon={faUsers} primary="Ana" trailing={<button type="button">Remove Ana</button>} /></ul>);
  const row = screen.getByRole('listitem').firstElementChild;

  expect(row).toHaveClass('flex', 'items-center');
  expect(row?.lastElementChild).toBe(screen.getByRole('button', { name: 'Remove Ana' }));
});
