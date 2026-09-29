import { beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
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
  await user.click(screen.getByRole('button', { name: 'Add participant' }));
  await user.clear(screen.getByLabelText('Participant name'));
  await user.type(screen.getByLabelText('Participant name'), name);
  await user.click(screen.getByRole('button', { name: 'Add participant' }));
}

function listedNames(): string[] {
  const list = screen.queryByRole('list');
  if (!list) return [];
  return within(list).getAllByRole('listitem').map((item) =>
    item.querySelector('.text-base')?.textContent ?? '',
  );
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
    expect(screen.queryByRole('dialog', { name: 'New participant' })).not.toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Add participant' }));
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
    expect(screen.getByRole('dialog', { name: 'New participant' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Add participant' })).toHaveLength(1);
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

  it('adds several selected contacts and excludes participants already in the event', async () => {
    const user = userEvent.setup();
    useAppStore.getState().addContact('Ana');
    useAppStore.getState().addContact('Luis');
    useAppStore.getState().addContact('Sofia');
    useAppStore.getState().addParticipant('Ana');
    render(<GroupTab />);

    await user.click(screen.getByRole('button', { name: 'Add from contacts' }));
    const dialog = screen.getByRole('dialog', { name: 'Add from contacts' });
    const available = within(dialog).getByRole('list', { name: 'Available contacts' });
    expect(within(available).queryByRole('checkbox', { name: 'Ana' })).toBeNull();
    await user.click(within(available).getByRole('checkbox', { name: 'Luis' }));
    await user.click(within(available).getByRole('checkbox', { name: 'Sofia' }));
    await user.click(within(dialog).getByRole('button', { name: 'Add selected contacts' }));

    expect(listedNames()).toEqual(['Ana', 'Luis', 'Sofia']);
    expect(screen.queryByRole('dialog', { name: 'Add from contacts' })).not.toBeInTheDocument();
  });

  it('offers prefix suggestions and adds the selected contact using its stored name', async () => {
    const user = userEvent.setup();
    useAppStore.getState().addContact('Ana');
    useAppStore.getState().addContact('Andres');
    useAppStore.getState().addContact('Luis');
    render(<GroupTab />);

    await user.click(screen.getByRole('button', { name: 'Add participant' }));
    await user.type(screen.getByLabelText('Participant name'), 'an');
    const suggestions = screen.getByRole('listbox', { name: 'Contact suggestions' });
    expect(within(suggestions).getByRole('option', { name: 'Ana' })).toBeInTheDocument();
    expect(within(suggestions).getByRole('option', { name: 'Andres' })).toBeInTheDocument();
    expect(within(suggestions).queryByRole('option', { name: 'Luis' })).toBeNull();
    await user.click(within(suggestions).getByRole('option', { name: 'Ana' }));

    expect(listedNames()).toEqual(['Ana']);
  });

  it('creates a contact when a newly typed participant is added', async () => {
    render(<GroupTab />);

    await addViaUi('Marta');

    expect(listedNames()).toEqual(['Marta']);
    expect(useAppStore.getState().contacts.map((contact) => contact.name)).toEqual(['Marta']);
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

    const luisRow = within(screen.getByRole('list', { name: 'Participants' }))
      .getAllByRole('listitem')[1]!;
    fireEvent.touchStart(luisRow.firstElementChild!, { touches: [{ clientX: 180, clientY: 40 }] });
    fireEvent.touchEnd(luisRow.firstElementChild!, { changedTouches: [{ clientX: 100, clientY: 42 }] });
    await user.click(screen.getByRole('button', { name: 'Remove Luis' }));
    expect(screen.getByRole('dialog', { name: 'Remove participant' })).toBeInTheDocument();
    expect(listedNames()).toEqual(['Ana', 'Luis', 'Sofia']);
    await user.click(screen.getByRole('button', { name: 'Confirm removal' }));

    expect(listedNames()).toEqual(['Ana', 'Sofia']);
  });

  it('cancels removal without changing participants', async () => {
    const user = userEvent.setup();
    addParticipants('Ana');
    render(<GroupTab />);
    screen.getByRole('group', { name: 'Remove Ana row' }).focus();
    await user.keyboard('{ArrowLeft}');
    await user.click(screen.getByRole('button', { name: 'Remove Ana' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(listedNames()).toEqual(['Ana']);
  });

  it('closes the add sheet without adding anyone', async () => {
    const user = userEvent.setup();
    render(<GroupTab />);
    await user.click(screen.getByRole('button', { name: 'Add participant' }));
    await user.click(screen.getByRole('button', { name: 'Close New participant' }));
    expect(listedNames()).toEqual([]);
  });

  it('disables removal for someone who paid an expense', () => {
    addParticipants('Ana', 'Luis');
    const [ana, luis] = selectParticipants(useAppStore.getState());
    setActiveEventData({
      expenses: [makeExpense({ payerId: ana!.id })],
    });
    render(<GroupTab />);

    const anaRow = within(screen.getByRole('list', { name: 'Participants' }))
      .getAllByRole('listitem')[0]!;
    expect(within(anaRow).queryByRole('button', { name: 'Remove Ana' })).toBeNull();
    expect(screen.getAllByText('Has associated expenses').length).toBeGreaterThan(0);
    fireEvent.touchStart(anaRow.firstElementChild!, { touches: [{ clientX: 180, clientY: 40 }] });
    fireEvent.touchEnd(anaRow.firstElementChild!, { changedTouches: [{ clientX: 100, clientY: 42 }] });
    expect(anaRow.firstElementChild).not.toHaveStyle({ transform: 'translateX(-80px)' });
    expect(screen.getByRole('group', { name: 'Remove Luis row' })).toBeInTheDocument();
    expect(luis).toBeDefined();
  });

  it('reveals a red delete action beside a removable participant on swipe and hides it again', async () => {
    const user = userEvent.setup();
    addParticipants('Ana');
    render(<GroupTab />);

    const row = within(screen.getByRole('list', { name: 'Participants' })).getByRole('listitem');
    const surface = row.firstElementChild!;
    expect(within(row).queryByRole('button', { name: 'Remove Ana' })).toBeNull();
    fireEvent.touchStart(surface, { touches: [{ clientX: 180, clientY: 40 }] });
    fireEvent.touchMove(surface, { touches: [{ clientX: 145, clientY: 42 }] });
    expect(surface).toHaveStyle({ transform: 'translateX(-35px)' });
    fireEvent.touchEnd(surface, { changedTouches: [{ clientX: 100, clientY: 42 }] });
    expect(surface).toHaveStyle({ transform: 'translateX(-80px)' });
    const button = within(row).getByRole('button', { name: 'Remove Ana' });
    expect(button).toHaveClass('bg-red-700', 'text-white', 'mobile-target');
    expect(button).toHaveTextContent('Delete');
    expect(button.querySelector('svg')).toHaveAttribute('data-icon', 'trash');
    fireEvent.touchStart(surface, { touches: [{ clientX: 100, clientY: 40 }] });
    fireEvent.touchEnd(surface, { changedTouches: [{ clientX: 180, clientY: 42 }] });
    expect(within(row).queryByRole('button', { name: 'Remove Ana' })).toBeNull();
    screen.getByRole('group', { name: 'Remove Ana row' }).focus();
    await user.keyboard('{ArrowLeft}');
    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('group', { name: 'Remove Ana row' })).toHaveFocus();
    expect(within(row).queryByRole('button', { name: 'Remove Ana' })).toBeNull();
  });

  it('disables removal for a beneficiary', () => {
    addParticipants('Ana', 'Luis');
    const [ana, luis] = selectParticipants(useAppStore.getState());
    setActiveEventData({
      expenses: [makeExpense({ payerId: ana!.id, beneficiaryIds: [luis!.id] })],
    });
    render(<GroupTab />);

    const luisRow = within(screen.getByRole('list', { name: 'Participants' }))
      .getAllByRole('listitem')[1]!;
    fireEvent.touchStart(luisRow.firstElementChild!, { touches: [{ clientX: 180, clientY: 40 }] });
    fireEvent.touchEnd(luisRow.firstElementChild!, { changedTouches: [{ clientX: 100, clientY: 42 }] });
    expect(within(luisRow).queryByRole('button', { name: 'Remove Luis' })).toBeNull();
    expect(luisRow.firstElementChild).not.toHaveStyle({ transform: 'translateX(-80px)' });
    expect(screen.getAllByText('Has associated expenses')).toHaveLength(2);
  });

  it('leaves the list unchanged when attempting to swipe someone with expenses', () => {
    addParticipants('Ana', 'Luis');
    const [ana] = selectParticipants(useAppStore.getState());
    setActiveEventData({
      expenses: [makeExpense({ payerId: ana!.id })],
    });
    render(<GroupTab />);

    const anaRow = within(screen.getByRole('list', { name: 'Participants' }))
      .getAllByRole('listitem')[0]!;
    fireEvent.touchStart(anaRow.firstElementChild!, { touches: [{ clientX: 180, clientY: 40 }] });
    fireEvent.touchEnd(anaRow.firstElementChild!, { changedTouches: [{ clientX: 100, clientY: 42 }] });

    expect(listedNames()).toEqual(['Ana', 'Luis']);
    expect(screen.queryByRole('dialog', { name: 'Remove participant' })).toBeNull();
  });

  it('does not reveal deletion on archived participant rows', () => {
    addParticipants('Ana');
    render(<GroupTab />);
    act(() => {
      useAppStore.getState().archiveEvent(useAppStore.getState().activeEventId!);
    });

    const row = within(screen.getByRole('list', { name: 'Participants' })).getByRole('listitem');
    fireEvent.touchStart(row.firstElementChild!, { touches: [{ clientX: 180, clientY: 40 }] });
    fireEvent.touchEnd(row.firstElementChild!, { changedTouches: [{ clientX: 100, clientY: 42 }] });
    expect(row.firstElementChild).not.toHaveStyle({ transform: 'translateX(-80px)' });
    expect(within(row).queryByRole('button', { name: 'Remove Ana' })).toBeNull();
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
