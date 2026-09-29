import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppBar } from './AppBar';
import { BACK_TO_EVENTS_LABEL } from '../../ui/messages';

it('shows event name, back action and contextual actions', async () => {
  const back = vi.fn();
  render(<AppBar title="Dinner" onBack={back} actions={<button>Share</button>} />);
  expect(screen.getByRole('heading', { name: 'Dinner' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
  await userEvent.setup().click(screen.getByRole('button', { name: BACK_TO_EVENTS_LABEL }));
  expect(back).toHaveBeenCalledOnce();
});

it('omits back on Events', () => {
  render(<AppBar title="Split" />);
  expect(screen.queryByRole('button', { name: BACK_TO_EVENTS_LABEL })).toBeNull();
});
