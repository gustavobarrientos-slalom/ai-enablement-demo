import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GroupTab } from './GroupTab';
import {
  resetAppStore,
  selectEventName,
  selectParticipants,
  useAppStore,
} from '../store/useAppStore';
import { makeExpense, seedActiveEvent, setActiveEventData } from '../test/factories';

function addParticipants(...names: string[]) {
  for (const name of names) {
    useAppStore.getState().addParticipant(name);
  }
}

async function addViaUi(name: string) {
  const user = userEvent.setup();
  await user.clear(screen.getByLabelText('Participant name'));
  await user.type(screen.getByLabelText('Participant name'), name);
  await user.click(screen.getByRole('button', { name: 'Add participant' }));
}

function listedNames(): string[] {
  const list = screen.queryByRole('list');
  if (!list) return [];
  return within(list)
    .getAllByRole('listitem')
    .map((item) => item.querySelector('p')?.textContent ?? '');
}

beforeEach(() => {
  localStorage.clear();
  resetAppStore();
  seedActiveEvent();
});

describe('event name', () => {
  it('shows the default name', () => {
    render(<GroupTab />);

    expect(screen.getByLabelText('Event name')).toHaveValue('New event');
  });

  it('stores a valid trimmed name', async () => {
    const user = userEvent.setup();
    render(<GroupTab />);

    const input = screen.getByLabelText('Event name');
    await user.clear(input);
    await user.type(input, '  Trip to Oaxaca  ');
    await user.tab();

    expect(selectEventName(useAppStore.getState())).toBe('Trip to Oaxaca');
  });

  it('shows an error and keeps the previous name when left empty', async () => {
    const user = userEvent.setup();
    render(<GroupTab />);

    const input = screen.getByLabelText('Event name');
    await user.clear(input);
    await user.tab();

    expect(screen.getByRole('alert')).toHaveTextContent('The event name is required');
    expect(selectEventName(useAppStore.getState())).toBe('New event');
    expect(input).toHaveValue('New event');
  });

  it('shows an error when it exceeds 60 characters', async () => {
    const user = userEvent.setup();
    render(<GroupTab />);

    const input = screen.getByLabelText('Event name');
    await user.clear(input);
    await user.type(input, 'a'.repeat(61));
    await user.tab();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The event name must be at most 60 characters',
    );
  });
});

describe('adding participants', () => {
  it('adds a valid participant and clears the field', async () => {
    render(<GroupTab />);

    await addViaUi('Ana');

    expect(listedNames()).toEqual(['Ana']);
    expect(screen.getByLabelText('Participant name')).toHaveValue('');
  });

  it('trims the name', async () => {
    render(<GroupTab />);

    await addViaUi('   Luis   ');

    expect(listedNames()).toEqual(['Luis']);
  });

  it('shows an error for an empty name', async () => {
    const user = userEvent.setup();
    render(<GroupTab />);

    await user.click(screen.getByRole('button', { name: 'Add participant' }));

    expect(screen.getByRole('alert')).toHaveTextContent('The name is required');
  });

  it('shows an error for more than 30 characters', async () => {
    render(<GroupTab />);

    await addViaUi('a'.repeat(31));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The name must be at most 30 characters',
    );
    expect(listedNames()).toEqual([]);
  });

  it('shows an error for a case-insensitive duplicate', async () => {
    addParticipants('Ana');
    render(<GroupTab />);

    await addViaUi('   ANA   ');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'A participant with that name already exists',
    );
    expect(listedNames()).toEqual(['Ana']);
  });
});

describe('ordering and removal', () => {
  it('lists participants in insertion order', () => {
    addParticipants('Ana', 'Luis', 'Sofia');
    render(<GroupTab />);

    expect(listedNames()).toEqual(['Ana', 'Luis', 'Sofia']);
  });

  it('removes a participant without expenses and keeps the order', async () => {
    const user = userEvent.setup();
    addParticipants('Ana', 'Luis', 'Sofia');
    render(<GroupTab />);

    await user.click(screen.getByRole('button', { name: 'Remove Luis' }));

    expect(listedNames()).toEqual(['Ana', 'Sofia']);
  });

  it('disables removal for someone who paid an expense', () => {
    addParticipants('Ana', 'Luis');
    const [ana, luis] = selectParticipants(useAppStore.getState());
    setActiveEventData({
      expenses: [makeExpense({ payerId: ana!.id })],
    });
    render(<GroupTab />);

    const button = screen.getByRole('button', { name: 'Remove Ana' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Has associated expenses');
    expect(screen.getByText('Has associated expenses')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Luis' })).toBeEnabled();
    expect(luis).toBeDefined();
  });

  it('disables removal for a beneficiary', () => {
    addParticipants('Ana', 'Luis');
    const [ana, luis] = selectParticipants(useAppStore.getState());
    setActiveEventData({
      expenses: [makeExpense({ payerId: ana!.id, beneficiaryIds: [luis!.id] })],
    });
    render(<GroupTab />);

    expect(screen.getByRole('button', { name: 'Remove Luis' })).toBeDisabled();
  });

  it('leaves the list unchanged when removing someone with expenses', async () => {
    const user = userEvent.setup();
    addParticipants('Ana', 'Luis');
    const [ana] = selectParticipants(useAppStore.getState());
    setActiveEventData({
      expenses: [makeExpense({ payerId: ana!.id })],
    });
    render(<GroupTab />);

    await user.click(screen.getByRole('button', { name: 'Remove Ana' }));

    expect(listedNames()).toEqual(['Ana', 'Luis']);
  });
});

describe('invalid group hint', () => {
  it('is shown while there are fewer than two participants', () => {
    addParticipants('Ana');
    render(<GroupTab />);

    expect(
      screen.getByText('Add at least 2 participants to continue'),
    ).toBeInTheDocument();
  });

  it('disappears once there are two participants', () => {
    addParticipants('Ana', 'Luis');
    render(<GroupTab />);

    expect(
      screen.queryByText('Add at least 2 participants to continue'),
    ).not.toBeInTheDocument();
  });
});
