import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
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

async function revealEventActions(user: ReturnType<typeof userEvent.setup>, name: string) {
  const row = screen.getByText(name).closest('li')!;
  within(row).getByRole('button', { name: new RegExp(name) }).focus();
  await user.keyboard('{ArrowLeft}');
  return row;
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
  it('shows the empty message and a bottom-right FAB instead of an inline form', () => {
    render(<EventsHome />);

    expect(screen.getByText('No events yet')).toBeInTheDocument();
    const fab = screen.getByRole('button', { name: 'Create event' });
    expect(fab).toHaveClass('rounded-full', 'h-14', 'w-14');
    expect(fab.querySelector('svg')).toBeInTheDocument();
    expect(fab.parentElement).toHaveClass('fixed', 'justify-end');
    expect(fab.parentElement?.className).toContain('var(--safe-bottom)');
    expect(screen.queryByLabelText('Event name')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Filter events' })).toBeNull();
  });
});

describe('EventsHome creation', () => {
  it('creates an event with the default name when the field is untouched', async () => {
    const user = userEvent.setup();
    render(<EventsHome />);

    await user.click(screen.getByRole('button', { name: 'Create event' }));
    const dialog = screen.getByRole('dialog', { name: 'New event' });
    await user.click(within(dialog).getByRole('button', { name: 'Create event' }));

    expect(within(screen.getByRole('list', { name: 'Events' })).getByText('New event'))
      .toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'New event' })).not.toBeInTheDocument();
  });

  it('creates an event with the typed name and clears the field', async () => {
    const user = userEvent.setup();
    render(<EventsHome />);

    await user.click(screen.getByRole('button', { name: 'Create event' }));
    await user.type(screen.getByLabelText('Event name'), 'Beach trip');
    await user.click(within(screen.getByRole('dialog', { name: 'New event' })).getByRole('button', { name: 'Create event' }));

    expect(screen.getByText('Beach trip')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create event' }));
    expect(screen.getByLabelText('Event name')).toHaveValue('');
  });

  it('rejects a blank name and keeps the list empty', async () => {
    const user = userEvent.setup();
    render(<EventsHome />);

    await user.click(screen.getByRole('button', { name: 'Create event' }));
    await user.type(screen.getByLabelText('Event name'), '   ');
    await user.click(within(screen.getByRole('dialog', { name: 'New event' })).getByRole('button', { name: 'Create event' }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'New event' })).toBeInTheDocument();
    expect(screen.getByText('No events yet')).toBeInTheDocument();
  });

  it('dismisses the creation sheet without saving a draft', async () => {
    const user = userEvent.setup();
    render(<EventsHome />);
    await user.click(screen.getByRole('button', { name: 'Create event' }));
    await user.type(screen.getByLabelText('Event name'), 'Cancelled');
    await user.click(screen.getByRole('button', { name: 'Close New event' }));
    expect(screen.queryByRole('dialog', { name: 'New event' })).not.toBeInTheDocument();
    expect(screen.getByText('No events yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create event' }));
    expect(screen.getByLabelText('Event name')).toHaveValue('');
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
    expect(within(row).getAllByRole('button')[0]).toHaveTextContent('Dinner');
    expect(within(row).getAllByRole('button')[0]?.querySelector('[aria-label="Open"]')).toBeInTheDocument();
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
      .map((item) => within(item).getAllByRole('button')[0]?.querySelector('.text-base')?.textContent);

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
  it('reveals contextual actions on swipe without an extra Open button', async () => {
    const user = userEvent.setup();
    const id = createEvent('Trip');
    goHome();
    render(<EventsHome />);
    const row = screen.getByTestId(`event-${id}`);
    const surface = row.firstElementChild!;

    expect(within(row).getAllByRole('button')).toHaveLength(1);
    expect(within(row).queryByRole('button', { name: 'Open' })).toBeNull();
    fireEvent.touchStart(surface, { touches: [{ clientX: 300, clientY: 40 }] });
    fireEvent.touchMove(surface, { touches: [{ clientX: 240, clientY: 42 }] });
    expect(surface).toHaveStyle({ transform: 'translateX(-60px)' });
    fireEvent.touchEnd(surface, { changedTouches: [{ clientX: 80, clientY: 42 }] });
    expect(surface).toHaveStyle({ transform: 'translateX(-240px)' });
    for (const name of ['Rename Trip', 'Archive Trip', 'Delete Trip']) {
      expect(within(row).getByRole('button', { name })).toHaveClass('mobile-target', 'w-20');
    }
    expect(within(row).getByRole('button', { name: 'Delete Trip' }))
      .toHaveClass('bg-red-700', 'text-white');
    await user.click(within(row).getByRole('button', { name: /Trip Open/ }));
    expect(surface).toHaveStyle({ transform: 'translateX(0px)' });
    expect(within(row).queryByRole('button', { name: 'Delete Trip' })).toBeNull();
    fireEvent.touchStart(surface, { touches: [{ clientX: 250, clientY: 40 }] });
    fireEvent.touchEnd(surface, { changedTouches: [{ clientX: 190, clientY: 42 }] });
    expect(surface).toHaveStyle({ transform: 'translateX(-240px)' });
    fireEvent.touchStart(surface, { touches: [{ clientX: 190, clientY: 40 }] });
    fireEvent.touchEnd(surface, { changedTouches: [{ clientX: 250, clientY: 42 }] });
    expect(surface).toHaveStyle({ transform: 'translateX(0px)' });
    expect(useAppStore.getState().activeEventId).toBeNull();
    await user.click(within(row).getByRole('button', { name: /Trip Open/ }));
    expect(useAppStore.getState().activeEventId).toBe(id);
  });

  it('opens the event on a pointer tap without capturing the click on the swipe surface', async () => {
    const user = userEvent.setup();
    const id = createEvent('Tap target');
    goHome();
    render(<EventsHome />);

    const row = screen.getByTestId(`event-${id}`);
    const surface = row.firstElementChild as HTMLDivElement;
    const capture = vi.fn();
    surface.setPointerCapture = capture;

    fireEvent.pointerDown(surface, { pointerType: 'mouse', pointerId: 1, clientX: 100, clientY: 40 });
    fireEvent.pointerMove(surface, { pointerType: 'mouse', pointerId: 1, clientX: 85, clientY: 41 });
    fireEvent.pointerUp(surface, { pointerType: 'mouse', pointerId: 1, clientX: 85, clientY: 41 });
    await user.click(within(row).getByRole('button', { name: /Tap target/ }));

    expect(capture).not.toHaveBeenCalled();
    expect(useAppStore.getState().activeEventId).toBe(id);
  });

  it('shows only restore and delete for archived events', async () => {
    const user = userEvent.setup();
    const id = createEvent('Past trip');
    useAppStore.getState().archiveEvent(id);
    render(<EventsHome />);
    const row = await revealEventActions(user, 'Past trip');

    expect(row.firstElementChild).toHaveStyle({ transform: 'translateX(-160px)' });
    expect(within(row).queryByRole('button', { name: 'Rename Past trip' })).toBeNull();
    expect(within(row).getByRole('button', { name: 'Unarchive Past trip' })).toHaveTextContent('Restore');
    expect(within(row).getByRole('button', { name: 'Delete Past trip' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(within(row).queryByRole('button', { name: 'Delete Past trip' })).toBeNull();
  });

  it('renames an event', async () => {
    const user = userEvent.setup();
    createEvent('Old name');
    render(<EventsHome />);

    await revealEventActions(user, 'Old name');
    await user.click(screen.getByRole('button', { name: 'Rename Old name' }));
    const field = within(screen.getByRole('dialog', { name: 'Rename event' })).getByLabelText('Event name');
    await user.clear(field);
    await user.type(field, 'New name');
    await user.click(screen.getByRole('button', { name: 'Save name' }));

    expect(screen.getByText('New name')).toBeInTheDocument();
    expect(screen.queryByText('Old name')).toBeNull();
  });

  it('keeps the rename form open and reports an invalid name', async () => {
    const user = userEvent.setup();
    createEvent('Keep me');
    render(<EventsHome />);

    await revealEventActions(user, 'Keep me');
    await user.click(screen.getByRole('button', { name: 'Rename Keep me' }));
    await user.clear(within(screen.getByRole('dialog', { name: 'Rename event' })).getByLabelText('Event name'));
    await user.click(screen.getByRole('button', { name: 'Save name' }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save name' })).toBeInTheDocument();
    expect(useAppStore.getState().events[0]!.name).toBe('Keep me');
  });

  it('archives and unarchives an event', async () => {
    const user = userEvent.setup();
    const id = createEvent('Party');
    render(<EventsHome />);

    await revealEventActions(user, 'Party');
    await user.click(screen.getByRole('button', { name: 'Archive Party' }));
    expect(screen.getByTestId(`status-${id}`)).toHaveTextContent('Archived');
    expect(screen.queryByRole('button', { name: 'Rename Party' })).toBeNull();

    await revealEventActions(user, 'Party');
    await user.click(screen.getByRole('button', { name: 'Unarchive Party' }));
    expect(screen.getByTestId(`status-${id}`)).toHaveTextContent('Open');
  });

  it('deletes only after the exact sheet confirmation is accepted', async () => {
    const user = userEvent.setup();
    createEvent('Doomed');
    render(<EventsHome />);

    await revealEventActions(user, 'Doomed');
    await user.click(screen.getByRole('button', { name: 'Delete Doomed' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete event' });
    expect(within(dialog).getByText(DELETE_EVENT_CONFIRMATION)).toBeInTheDocument();
    expect(DELETE_EVENT_CONFIRMATION).toBe('Delete this event? This cannot be undone.');
    await user.click(within(dialog).getByRole('button', { name: 'Confirm deletion' }));
    expect(screen.getByText('No events yet')).toBeInTheDocument();
  });

  it('preserves the event when the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    createEvent('Safe');
    useAppStore.getState().addParticipant('Ana');
    render(<EventsHome />);

    await revealEventActions(user, 'Safe');
    await user.click(screen.getByRole('button', { name: 'Delete Safe' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Delete event' })).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: 'Delete event' })).toBeNull();
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

    await user.click(within(screen.getByTestId(`event-${id}`)).getByRole('button', { name: /Trip/ }));

    expect(screen.getByRole('tab', { name: 'Group' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Back to events' }));
    fireEvent.animationEnd(screen.getByTestId('exiting-screen'));

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
    await user.click(within(firstRow!).getByRole('button', { name: /First/ }));

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
