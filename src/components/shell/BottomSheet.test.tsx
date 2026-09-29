import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BottomSheet } from './BottomSheet';

it('opens as a named dialog and dismisses by close, backdrop and Escape', async () => {
  const onClose = vi.fn();
  const user = userEvent.setup();
  const { rerender } = render(<BottomSheet open title="New expense" onClose={onClose}><p>Form</p></BottomSheet>);
  const dialog = screen.getByRole('dialog', { name: 'New expense' });
  expect(dialog).toHaveAttribute('open');
  await user.click(screen.getByRole('button', { name: 'Close New expense' }));
  expect(onClose).toHaveBeenCalledOnce();
  fireEvent.click(dialog);
  expect(onClose).toHaveBeenCalledTimes(2);
  fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));
  expect(onClose).toHaveBeenCalledTimes(3);
  rerender(<BottomSheet open={false} title="New expense" onClose={onClose}><p>Form</p></BottomSheet>);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('uses an accessible fixed overlay if native showModal is unavailable', () => {
  const showModal = HTMLDialogElement.prototype.showModal;
  const onClose = vi.fn();
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  try {
    render(<BottomSheet open title="Confirm removal" onClose={onClose}>Confirm?</BottomSheet>);
    const dialog = screen.getByRole('dialog', { name: 'Confirm removal' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog.parentElement?.parentElement).toBe(document.body);
    expect(dialog.parentElement).toHaveClass('fixed', 'inset-0', 'sm:items-center');
    expect(dialog.parentElement).toHaveClass('sheet-overlay');
    expect(dialog).toHaveClass('sm:mx-auto', 'sm:max-w-[480px]');
    expect(screen.getByText('Confirm?').closest('.overflow-y-auto'))
      .toHaveClass('sheet-panel', 'max-h-[90dvh]', 'pb-[calc(var(--safe-bottom)+1rem)]', 'sm:rounded-2xl');
    fireEvent.click(dialog.parentElement!);
    expect(onClose).toHaveBeenCalledOnce();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  } finally {
    HTMLDialogElement.prototype.showModal = showModal;
  }
});

it('portals sheets outside transformed and clipped screens and keeps actions above the safe area', () => {
  const { container } = render(
    <div className="animate-push-in overflow-hidden">
      <BottomSheet open title="New participant" onClose={() => {}}>
        <button type="button">Add participant</button>
      </BottomSheet>
    </div>,
  );
  const dialog = screen.getByRole('dialog', { name: 'New participant' });
  expect(container.contains(dialog)).toBe(false);
  expect(dialog.parentElement).toBe(document.body);
  expect(dialog).toHaveClass('sheet-dialog', 'bottom-0', 'top-auto', 'max-h-dvh', 'max-w-[480px]');
  expect(dialog).toHaveClass('sm:bottom-auto', 'sm:top-1/2', 'sm:-translate-y-1/2', 'sm:max-h-[calc(100dvh-3rem)]');
  expect(screen.getByRole('button', { name: 'Add participant' }).closest('.overflow-y-auto'))
    .toHaveClass('sheet-panel', 'max-h-[90dvh]', 'pb-[calc(var(--safe-bottom)+1rem)]', 'sm:rounded-2xl', 'sm:pb-4');
});

it('uses responsive entrance keyframes and disables them for reduced motion', () => {
  const css = readFileSync('src/index.css', 'utf8');
  expect(css).toMatch(/\.sheet-panel\s*\{\s*animation: sheet-enter 280ms/);
  expect(css).toMatch(/@media \(min-width: 640px\)\s*\{\s*\.sheet-panel\s*\{\s*animation-name: dialog-enter/);
  expect(css).toMatch(/\.sheet-dialog::backdrop,\s*\.sheet-overlay\s*\{\s*animation: sheet-backdrop-enter/);
  expect(css).toMatch(/@keyframes sheet-enter\s*\{[\s\S]*?translateY\(24px\)/);
  expect(css).toMatch(/@keyframes dialog-enter\s*\{[\s\S]*?translateY\(12px\) scale\(0\.98\)/);
  expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation-duration: 0\.01ms !important/);
});
