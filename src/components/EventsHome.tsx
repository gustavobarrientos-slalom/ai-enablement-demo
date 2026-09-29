import { useState, type FormEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  selectVisibleEvents,
  useAppStore,
} from '../store/useAppStore';
import { eventTotalCents } from '../domain/event';
import { EVENT_NAME_MAX_LENGTH } from '../domain/group';
import type { AppError, EventFilter, SplitEvent } from '../domain/types';
import { formatCents } from '../ui/currency';
import { formatEventDate } from '../ui/dates';
import {
  CREATE_EVENT_LABEL,
  DELETE_EVENT_CONFIRMATION,
  ERROR_MESSAGES,
  EVENTS_HEADING,
  EVENT_FILTER_LABELS,
  EVENT_STATUS_LABELS,
  NO_EVENTS_MESSAGE,
  participantCountLabel,
} from '../ui/messages';
import {
  faBoxArchive,
  faBoxOpen,
  faCalendarDay,
  faPen,
  faTrash,
} from '../ui/icons';
import { ListRow } from './shell/ListRow';
import { BottomSheet } from './shell/BottomSheet';
import { PrimaryAction } from './shell/PrimaryAction';
import { SegmentedPill } from './shell/SegmentedPill';

const FILTERS: EventFilter[] = ['all', 'open', 'archived'];

export function EventsHome() {
  const events = useAppStore(selectVisibleEvents);
  const filter = useAppStore((state) => state.eventFilter);
  const setEventFilter = useAppStore((state) => state.setEventFilter);
  const createEvent = useAppStore((state) => state.createEvent);
  const openEvent = useAppStore((state) => state.openEvent);
  const renameEvent = useAppStore((state) => state.renameEvent);
  const archiveEvent = useAppStore((state) => state.archiveEvent);
  const unarchiveEvent = useAppStore((state) => state.unarchiveEvent);
  const deleteEvent = useAppStore((state) => state.deleteEvent);

  const [nameDraft, setNameDraft] = useState('');
  const [createError, setCreateError] = useState<AppError | null>(null);
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const hasAnyEvent = useAppStore((state) => state.events.length > 0);

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // An untouched field means "no name provided", which takes the default.
    // Anything typed is validated, so stray whitespace is still an error.
    const created = createEvent(nameDraft === '' ? undefined : nameDraft);

    if (created === null) {
      setCreateError(useAppStore.getState().lastError);
      return;
    }

    setNameDraft('');
    setCreateError(null);
    setCreating(false);
  }

  function closeCreate(): void {
    setCreating(false);
    setNameDraft('');
    setCreateError(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <BottomSheet open={creating} title="New event" onClose={closeCreate}>
        <form onSubmit={handleCreate} className="flex flex-col gap-3" noValidate>
          <div className="md-field-wrap">
            <input
              id="new-event-name"
              type="text"
              value={nameDraft}
              placeholder=" "
              maxLength={EVENT_NAME_MAX_LENGTH + 1}
              aria-invalid={createError !== null}
              aria-describedby={createError ? 'create-event-error' : undefined}
              onChange={(event) => setNameDraft(event.target.value)}
              className="mobile-input md-field"
            />
            <label htmlFor="new-event-name" className="md-field-label">Event name</label>
          </div>
          {createError && (
            <p id="create-event-error" role="alert" className="text-sm text-danger-fg">
              {ERROR_MESSAGES[createError]}
            </p>
          )}
          <button type="submit" className="mobile-target md-filled-button">
            {CREATE_EVENT_LABEL}
          </button>
        </form>
      </BottomSheet>
      <BottomSheet open={deletingId !== null} title="Delete event" onClose={() => setDeletingId(null)}>
        <p className="mb-4">{DELETE_EVENT_CONFIRMATION}</p>
        <div className="flex gap-2">
          <button type="button" className="mobile-target md-outline-button flex-1" onClick={() => setDeletingId(null)}>Cancel</button>
          <button type="button" className="mobile-target md-tonal-button flex-1 bg-danger-bg text-danger-fg" onClick={() => {
            if (deletingId) deleteEvent(deletingId);
            setDeletingId(null);
          }}>Confirm deletion</button>
        </div>
      </BottomSheet>
      <BottomSheet open={renamingId !== null} title="Rename event" onClose={() => setRenamingId(null)}>
        {events.filter((event) => event.id === renamingId).map((event) => (
          <RenameEventForm
            key={event.id}
            event={event}
            onCancel={() => setRenamingId(null)}
            onRename={(raw) => {
              if (renameEvent(event.id, raw)) {
                setRenamingId(null);
                return null;
              }
              return useAppStore.getState().lastError;
            }}
          />
        ))}
      </BottomSheet>
      <section className="flex flex-col gap-2">
        <h2 className="md-section-title">{EVENTS_HEADING}</h2>
      </section>

      {hasAnyEvent && (
        <SegmentedPill
          label="Filter events"
          options={FILTERS.map((option) => ({
            value: option,
            label: EVENT_FILTER_LABELS[option],
          }))}
          value={filter}
          onSelect={setEventFilter}
          selectionRole="button"
        />
      )}

      {events.length === 0 ? (
        <p className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-3 py-6 text-sm text-text-muted">
          <FontAwesomeIcon icon={faCalendarDay} className="text-2xl text-text-muted" />
          {NO_EVENTS_MESSAGE}
        </p>
      ) : (
        <ul aria-label="Events" className="md-card divide-y divide-divider">
          {events.map((event) => (
            <ListRow
              key={event.id}
              testId={`event-${event.id}`}
              icon={faCalendarDay}
              primary={event.name}
              amount={<span data-testid={`total-${event.id}`}>{formatCents(eventTotalCents(event))}</span>}
              secondary={<>
                <span data-testid={`status-${event.id}`}>{EVENT_STATUS_LABELS[event.status]}</span>
                <span className="block">{formatEventDate(event.createdAt)}</span>
                <span className="block">{participantCountLabel(event.participants.length)}</span>
              </>}
              onSelect={() => openEvent(event.id)}
              actions={[
                ...(event.status === 'open' ? [{
                  label: `Rename ${event.name}`,
                  text: 'Rename',
                  icon: faPen,
                  onClick: () => setRenamingId(event.id),
                }] : []),
                event.status === 'open' ? {
                  label: `Archive ${event.name}`,
                  text: 'Archive',
                  icon: faBoxArchive,
                  onClick: () => archiveEvent(event.id),
                } : {
                  label: `Unarchive ${event.name}`,
                  text: 'Restore',
                  icon: faBoxOpen,
                  onClick: () => unarchiveEvent(event.id),
                },
                {
                  label: `Delete ${event.name}`,
                  text: 'Delete',
                  icon: faTrash,
                  destructive: true,
                  onClick: () => setDeletingId(event.id),
                },
              ]}
            />
          ))}
        </ul>
      )}
      {!creating && <PrimaryAction aboveTabBar={false} onClick={() => setCreating(true)}>
        {CREATE_EVENT_LABEL}
      </PrimaryAction>}
    </div>
  );
}

interface RenameEventFormProps {
  event: SplitEvent;
  onRename: (raw: string) => AppError | null;
  onCancel: () => void;
}

function RenameEventForm({ event, onRename, onCancel }: RenameEventFormProps) {
  const [draft, setDraft] = useState(event.name);
  const [error, setError] = useState<AppError | null>(null);

  return (
    <form
      noValidate
      className="flex flex-col gap-2"
      onSubmit={(submitted) => {
        submitted.preventDefault();
        setError(onRename(draft));
      }}
    >
      <div className="md-field-wrap">
        <input
          id={`rename-${event.id}`}
          type="text"
          value={draft}
          placeholder=" "
          maxLength={EVENT_NAME_MAX_LENGTH + 1}
          aria-invalid={error !== null}
          onChange={(changed) => setDraft(changed.target.value)}
          className="mobile-input md-field"
        />
        <label htmlFor={`rename-${event.id}`} className="md-field-label">Event name</label>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger-fg">
          {ERROR_MESSAGES[error]}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          className="mobile-target md-filled-button flex-1"
        >
          Save name
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="mobile-target md-outline-button flex-1"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
