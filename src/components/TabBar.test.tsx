import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { resetAppStore, useAppStore } from '../store/useAppStore';
import { seedActiveEvent } from '../test/factories';
import { TabBar } from './TabBar';

function addParticipants(...names: string[]) {
  for (const name of names) {
    useAppStore.getState().addParticipant(name);
  }
}

async function revealParticipantActions(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  const row = screen.getByRole('group', { name: `Remove ${name} row` });
  row.focus();
  await user.keyboard('{ArrowLeft}');
}

beforeEach(() => {
  localStorage.clear();
  resetAppStore();
  seedActiveEvent();
});

describe('TabBar', () => {
  it('renders a fixed bottom icon-and-label navigation', () => {
    render(<TabBar activeTab="group" disabledTabs={[]} onSelect={() => {}} />);
    const nav = screen.getByRole('tablist');
    expect(nav).toHaveClass('fixed', 'bottom-0');
    expect(nav).toHaveClass('bg-surface');
    for (const name of ['Group', 'Expenses', 'Settlement']) {
      const tab = screen.getByRole('tab', { name });
      expect(tab.querySelector('svg')).toBeInTheDocument();
      expect(tab).toHaveClass('mobile-target');
    }
  });
  it('disables Expenses and Settlement with no participants', () => {
    render(<App />);

    expect(screen.getByRole('tab', { name: 'Expenses' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Settlement' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Group' })).toBeEnabled();
    expect(screen.getByRole('tab', { name: 'Group' })).toHaveClass('bg-surface-muted');
    expect(screen.getByTestId('shell-bottom-dock')).toHaveClass('min-h-[calc(9rem+var(--safe-bottom))]');
    expect(screen.getByTestId('shell-content').contains(screen.getByRole('button', { name: 'Add participant' }))).toBe(false);
  });

  it('disables Expenses and Settlement with a single participant', () => {
    addParticipants('Ana');
    render(<App />);

    expect(screen.getByRole('tab', { name: 'Expenses' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Settlement' })).toBeDisabled();
  });

  it('enables the tabs once there are two participants', async () => {
    const user = userEvent.setup();
    addParticipants('Ana');
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Add participant' }));
    await user.type(screen.getByLabelText('Participant name'), 'Luis');
    await user.click(screen.getByRole('button', { name: 'Add participant' }));

    expect(screen.getByRole('tab', { name: 'Expenses' })).toBeEnabled();
    expect(screen.getByRole('tab', { name: 'Settlement' })).toBeEnabled();
  });

  it('disables them again after removing a participant', async () => {
    const user = userEvent.setup();
    addParticipants('Ana', 'Luis');
    render(<App />);

    await revealParticipantActions(user, 'Luis');
    await user.click(screen.getByRole('button', { name: 'Remove Luis' }));
    await user.click(screen.getByRole('button', { name: 'Confirm removal' }));

    expect(screen.getByRole('tab', { name: 'Expenses' })).toBeDisabled();
  });

  it('does not activate a disabled tab', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('tab', { name: 'Expenses' }));

    expect(screen.getByRole('tab', { name: 'Group' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Expenses' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('returns to Group if the active tab becomes disabled', async () => {
    const user = userEvent.setup();
    addParticipants('Ana', 'Luis');
    render(<App />);

    await user.click(screen.getByRole('tab', { name: 'Expenses' }));
    expect(screen.getByRole('tab', { name: 'Expenses' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByTestId('shell-bottom-dock')).toHaveClass('min-h-[calc(9rem+var(--safe-bottom))]');

    await user.click(screen.getByRole('tab', { name: 'Settlement' }));
    expect(screen.getByTestId('shell-bottom-dock')).toHaveClass('min-h-[calc(4rem+var(--safe-bottom))]');

    await user.click(screen.getByRole('tab', { name: 'Group' }));
    await revealParticipantActions(user, 'Luis');
    await user.click(screen.getByRole('button', { name: 'Remove Luis' }));
    await user.click(screen.getByRole('button', { name: 'Confirm removal' }));

    expect(screen.getByRole('tab', { name: 'Group' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
