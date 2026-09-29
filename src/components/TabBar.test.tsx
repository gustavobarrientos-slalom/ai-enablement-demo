import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { resetAppStore, useAppStore } from '../store/useAppStore';

function addParticipants(...names: string[]) {
  for (const name of names) {
    useAppStore.getState().addParticipant(name);
  }
}

beforeEach(() => {
  localStorage.clear();
  resetAppStore();
});

describe('TabBar', () => {
  it('disables Expenses and Settlement with no participants', () => {
    render(<App />);

    expect(screen.getByRole('tab', { name: 'Expenses' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Settlement' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Group' })).toBeEnabled();
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

    await user.type(screen.getByLabelText('Participant name'), 'Luis');
    await user.click(screen.getByRole('button', { name: 'Add participant' }));

    expect(screen.getByRole('tab', { name: 'Expenses' })).toBeEnabled();
    expect(screen.getByRole('tab', { name: 'Settlement' })).toBeEnabled();
  });

  it('disables them again after removing a participant', async () => {
    const user = userEvent.setup();
    addParticipants('Ana', 'Luis');
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Remove Luis' }));

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

    await user.click(screen.getByRole('tab', { name: 'Group' }));
    await user.click(screen.getByRole('button', { name: 'Remove Luis' }));

    expect(screen.getByRole('tab', { name: 'Group' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
