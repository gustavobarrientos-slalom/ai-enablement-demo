import { expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrimaryAction } from './PrimaryAction';

it('renders a labeled circular FAB above tabs and the safe-area inset', () => {
  render(<PrimaryAction onClick={() => {}}>Add expense</PrimaryAction>);
  const button = screen.getByRole('button', { name: 'Add expense' });
  expect(button).toHaveClass('mobile-target', 'rounded-full', 'h-14', 'w-14');
  expect(button.querySelector('svg')).toBeInTheDocument();
  expect(button.parentElement).toHaveClass('fixed', 'justify-end', 'pointer-events-none');
  expect(button.parentElement?.className).toContain('4rem+var(--safe-bottom)');
  expect(button.parentElement?.parentElement).toBe(document.body);
});

it('anchors the Events FAB above the home indicator without a tab bar', () => {
  render(<PrimaryAction aboveTabBar={false} onClick={() => {}}>Create event</PrimaryAction>);
  const button = screen.getByRole('button', { name: 'Create event' });
  expect(button.parentElement?.className).toContain('bottom-[calc(var(--safe-bottom)+1rem)]');
});
