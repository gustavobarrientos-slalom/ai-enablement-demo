import { expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppShell } from './AppShell';

it('clamps the dvh shell and scrolls only content between safe-area bars', () => {
  const { container } = render(<AppShell appBar={<header>Top</header>} content={<p>Content</p>} bottomBar={<nav>Bottom</nav>} />);
  const shell = container.firstElementChild!;
  expect(shell).toHaveClass('min-h-dvh', 'max-w-[480px]', 'mx-auto', 'overscroll-none', 'pl-safe-left', 'pr-safe-right');
  expect(screen.getByText('Top').parentElement).toHaveClass('pt-safe-top');
  expect(screen.getByTestId('shell-content')).toHaveClass('overflow-y-auto');
  expect(screen.getByText('Bottom').parentElement).not.toHaveClass('overflow-y-auto');
});

it('reserves an opaque action dock outside the content scroller', () => {
  const { rerender } = render(
    <AppShell appBar={<header>Top</header>} content={<p>Last participant</p>} bottomBar={<nav>Tabs</nav>} hasPrimaryAction />,
  );
  const content = screen.getByTestId('shell-content');
  const dock = screen.getByTestId('shell-bottom-dock');
  expect(dock).toHaveClass('min-h-[calc(9rem+var(--safe-bottom))]', 'bg-canvas');
  expect(content).toHaveClass('overflow-y-auto');
  expect(content.contains(dock)).toBe(false);
  expect(content.contains(screen.getByText('Last participant'))).toBe(true);

  rerender(<AppShell appBar={<header>Top</header>} content={<p>Settlement</p>} bottomBar={<nav>Tabs</nav>} />);
  expect(dock).toHaveClass('min-h-[calc(4rem+var(--safe-bottom))]');

  rerender(<AppShell appBar={<header>Top</header>} content={<p>Events</p>} hasPrimaryAction />);
  expect(dock).toHaveClass('min-h-[calc(5rem+var(--safe-bottom))]');
  expect(screen.getByTestId('shell-content').contains(dock)).toBe(false);
});
