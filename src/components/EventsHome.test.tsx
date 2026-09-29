import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { EventsHome } from './EventsHome';
import {
  resetAppStore,
  resetStoreClock,
  setStoreClock,
  useAppStore,
} from '../store/useAppStore';
import { fixedClock } from '../lib/clock';
import { DELETE_EVENT_CONFIRMATION } from '../ui/messages';
import { makeExpense, setActiveEventData } from '../test/factories';

function createEvent(name?: string): string {
  const id = useAppStore.getState().createEvent(name);

  if (id === null) {
    throw new Error(`failed to create event ${name ?? '(default)'}`);
  }

  return id;
}

function goHome(): void {
  useAppStore.getState().closeEvent();
}

beforeEach(() => {
  localStorage.clear();
  resetAppStore();
});

afterEach(() => {
  resetStoreClock();
  vi.restoreAllMocks();
});

describe('EventsHome empty state', () => {
  it('shows the empty message and a create action', () => {
    render(<EventsHome />);

    expect(screen.getByText('No events yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create event' })).toBeEnabled();
    expect(screen.queryByRole('group', { name: 'Filter events' })).toBeNull();
  });
});

describe('EventsHome creation', () => {
  it('creates an event with the default name when the field is untouched', async () => {
    const user = userEvent.setup();
    render(<EventsHome />);

    await user.click(screen.getByRole('button', { name: 'Create event' }));

    expect(within(screen.getByRole('list', { name: 'Events' })).getByText('New event'))
      .toBeInTheDocument();
  });

  it('creates an event with the typed name and clears the field', async () => {
    const user = userEvent.setup();
    render(<EventsHome />);

    await user.type(screen.getByLabelText('Event name'), 'Beach trip');
    await user.click(screen.getByRole('button', { name: 'Create event' }));

    expect(screen.getByText('Beach trip')).toBeInTheDocument();
    expect(screen.getByLabelText('Event name')).toHaveValue('');
  });

  it('rejects a blank name and keeps the list empty', async () => {
    const user = userEvent.setup();
    render(<EventsHome />);

    await user.type(screen.getByLabelText('Event name'), '   ');
    await user.click(screen.getByRole('button', { name: 'Create event' }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('No events yet')).toBeInTheDocument();
  });
});

describe('EventsHome list contents', () => {
  it('shows participant count and MXN total per event', () => {
    const id = createEvent('Dinner');
    useAppStore.getState().addParticipant('Ana');
    useAppStore.getState().addParticipant('Luis');

    const participants = useAppStore.getState().events[0]!.participants;
    setActiveEventData({
      expenses: [
        makeExpense({
          concept: 'Tacos',
          amountCents: 25000,
          payerId: participants[0]!.id,
          beneficiaryIds: participants.map((participant) => participant.id),
        }),
      ],
    });

    render(<EventsHome />);

    const row = screen.getByTestId(`event-${id}`);
    expect(within(row).getByText('2 participants')).toBeInTheDocument();
    expect(screen.getByTestId(`total-${id}`)).toHaveTextContent('$250.00');
    expect(screen.getByTestId(`status-${id}`)).toHaveTextContent('Open');
  });

  it('orders events by most recently updated first', async () => {
    setStoreClock(
      fixedClock(
        '2024-01-01T00:00:00.000Z',
        '2024-01-02T00:00:00.000Z',
        '2024-01-03T00:00:00.000Z',
        '2024-01-04T00:00:00.000Z',
      ),
    );

    const first = createEvent('First');
    const second = createEvent('Second');
    createEvent('Third');

    // Touching the oldest event must float it to the top.
    useAppStore.getState().openEvent(first);
    useAppStore.getState().addParticipant('Ana');

    render(<EventsHome />);

    const names = within(screen.getByRole('list', { name: 'Events' }))
      .getAllByRole('listitem')
      .map((item) => within(item).getAllByRole('button')[0]?.textContent);

    expect(names).toEqual(['First', 'Third', 'Second']);
    expect(second).not.toEqual(first);
  });
});

describe('EventsHome filters', () => {
  beforeEach(() => {
    createEvent('Open one');
    const archived = createEvent('Archived one');
    useAppStore.getState().archiveEvent(archived);
  });

  it('shows every event under All', () => {
    render(<EventsHome />);

    expect(screen.getByText('Open one')).toBeInTheDocument();
    expect(screen.getByText('Archived one')).toBeInTheDocument();
  });

  it('filters to open events', async () => {
    const user = userEvent.setup();
    render(<EventsHome />);

    const filters = screen.getByRole('group', { name: 'Filter events' });
    await user.click(within(filters).getByRole('button', { name: 'Open' }));

    expect(screen.getByText('Open one')).toBeInTheDocument();
    expect(screen.queryByText('Archived one')).toBeNull();
  });

  it('filters to archived events', async () => {
    const user = userEvent.setup();
    render(<EventsHome />);

    const filters = screen.getByRole('group', { name: 'Filter events' });
    await user.click(within(filters).getByRole('button', { name: 'Archived' }));

    expect(screen.getByText('Archived one')).toBeInTheDocument();
    expect(screen.queryByText('Open one')).toBeNull();
  });

  it('shows the empty message when a filter matches nothing', async () => {
    const user = userEvent.setup();
    useAppStore.getState().unarchiveEvent(useAppStore.getState().events[1]!.id);
    render(<EventsHome />);

    const filters = screen.getByRole('group', { name: 'Filter events' });
    await user.click(within(filters).getByRole('button', { name: 'Archived' }));

    expect(screen.getByText('No events yet')).toBeInTheDocument();
  });
});

describe('EventsHome rename, archive and delete', () => {
  it('renames an event', async () => {
    const user = userEvent.setup();
    const id = createEvent('Old name');
    render(<EventsHome />);

    await user.click(screen.getByRole('button', { name: 'Rename Old name' }));
    const field = within(screen.getByTestId(`event-${id}`)).getByLabelText('Event name');
    await user.clear(field);
    await user.type(field, 'New name');
    await user.click(screen.getByRole('button', { name: 'Save name' }));

    expect(screen.getByText('New name')).toBeInTheDocument();
    expect(screen.queryByText('Old name')).toBeNull();
  });

  it('keeps the rename form open and reports an invalid name', async () => {
    const user = userEvent.setup();
    const id = createEvent('Keep me');
    render(<EventsHome />);

    await user.click(screen.getByRole('button', { name: 'Rename Keep me' }));
    await user.clear(within(screen.getByTestId(`event-${id}`)).getByLabelText('Event name'));
    await user.click(screen.getByRole('button', { name: 'Save name' }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save name' })).toBeInTheDocument();
    expect(useAppStore.getState().events[0]!.name).toBe('Keep me');
  });

  it('archives and unarchives an event', async () => {
    const user = userEvent.setup();
    const id = createEvent('Party');
    render(<EventsHome />);

    await user.click(screen.getByRole('button', { name: 'Archive Party' }));
    expect(screen.getByTestId(`status-${id}`)).toHaveTextContent('Archived');
    expect(screen.queryByRole('button', { name: 'Rename Party' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Unarchive Party' }));
    expect(screen.getByTestId(`status-${id}`)).toHaveTextContent('Open');
  });

  it('deletes only after the exact confirmation is accepted', async () => {
    const user = userEvent.setup();
    createEvent('Doomed');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<EventsHome />);

    await user.click(screen.getByRole('button', { name: 'Delete Doomed' }));

    expect(confirm).toHaveBeenCalledWith(DELETE_EVENT_CONFIRMATION);
    expect(DELETE_EVENT_CONFIRMATION).toBe('Delete this event? This cannot be undone.');
    expect(screen.getByText('No events yet')).toBeInTheDocument();
  });

  it('preserves the event when the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    createEvent('Safe');
    useAppStore.getState().addParticipant('Ana');
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<EventsHome />);

    await user.click(screen.getByRole('button', { name: 'Delete Safe' }));

    expect(screen.getByText('Safe')).toBeInTheDocument();
    expect(useAppStore.getState().events[0]!.participants).toHaveLength(1);
  });
});

describe('Events navigation', () => {
  it('opens an event on Group and returns home', async () => {
    const user = userEvent.setup();
    const id = createEvent('Trip');
    goHome();
    render(<App />);

    await user.click(
      within(screen.getByTestId(`event-${id}`)).getByRole('button', { name: 'Open' }),
    );

    expect(screen.getByRole('tab', { name: 'Group' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Back to events' }));

    expect(screen.getByRole('list', { name: 'Events' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Group' })).toBeNull();
  });

  it('keeps each event isolated when switching between them', async () => {
    const user = userEvent.setup();
    createEvent('First');
    useAppStore.getState().addParticipant('Ana');
    goHome();
    createEvent('Second');
    useAppStore.getState().addParticipant('Beto');
    goHome();
    render(<App />);

    const firstRow = screen.getByText('First').closest('li');
    await user.click(within(firstRow!).getByRole('button', { name: 'Open' }));

    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.queryByText('Beto')).toBeNull();
  });
});

describe('Archived event is read-only', () => {
  it('hides Group and Expenses mutations but keeps data readable', async () => {
    const user = userEvent.setup();
    const id = createEvent('Closed event');
    useAppStore.getState().addParticipant('Ana');
    useAppStore.getState().addParticipant('Luis');
    useAppStore.getState().archiveEvent(id);
    render(<App />);

    expect(screen.getByText('This event is archived and is read-only')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add participant' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Remove Ana' })).toBeNull();

    await user.click(screen.getByRole('tab', { name: 'Expenses' }));

    expect(screen.getByText('This event is archived and is read-only')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add expense' })).toBeNull();
  });
});
