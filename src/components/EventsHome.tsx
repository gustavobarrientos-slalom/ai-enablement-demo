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
  faPlus,
  faTrash,
  faUsers,
} from '../ui/icons';

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
  const [renamingId, setRenamingId] = useState<string | null>(null);

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
  }

  function handleDelete(event: SplitEvent) {
    if (window.confirm(DELETE_EVENT_CONFIRMATION)) {
      deleteEvent(event.id);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-text">{EVENTS_HEADING}</h2>

        <form onSubmit={handleCreate} className="flex gap-2" noValidate>
          <label htmlFor="new-event-name" className="sr-only">
            Event name
          </label>
          <input
            id="new-event-name"
            type="text"
            value={nameDraft}
            placeholder="Event name"
            maxLength={EVENT_NAME_MAX_LENGTH + 1}
            aria-invalid={createError !== null}
            aria-describedby={createError ? 'create-event-error' : undefined}
            onChange={(event) => setNameDraft(event.target.value)}
            className="min-h-11 flex-1 rounded-lg border border-border bg-surface px-3 text-base focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            className="flex min-h-11 items-center gap-2 rounded-lg bg-primary px-3 text-primary-contrast"
          >
            <FontAwesomeIcon icon={faPlus} />
            <span className="text-sm font-semibold">{CREATE_EVENT_LABEL}</span>
          </button>
        </form>

        {createError && (
          <p id="create-event-error" role="alert" className="text-sm text-danger-fg">
            {ERROR_MESSAGES[createError]}
          </p>
        )}
      </section>

      {hasAnyEvent && (
        <div role="group" aria-label="Filter events" className="flex gap-2">
          {FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={filter === option}
              onClick={() => setEventFilter(option)}
              className={[
                'min-h-11 flex-1 rounded-lg border px-3 text-sm font-semibold',
                filter === option
                  ? 'border-primary bg-primary text-primary-contrast'
                  : 'border-border bg-surface text-text-muted',
              ].join(' ')}
            >
              {EVENT_FILTER_LABELS[option]}
            </button>
          ))}
        </div>
      )}

      {events.length === 0 ? (
        <p className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-3 py-6 text-sm text-text-muted">
          <FontAwesomeIcon icon={faCalendarDay} className="text-2xl text-text-muted" />
          {NO_EVENTS_MESSAGE}
        </p>
      ) : (
        <ul aria-label="Events" className="flex flex-col gap-2">
          {events.map((event) => (
            <li
              key={event.id}
              data-testid={`event-${event.id}`}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface px-3 py-2"
            >
              {renamingId === event.id ? (
                <RenameEventForm
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
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openEvent(event.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate text-base font-semibold">
                        {event.name}
                      </span>
                    </button>
                    <span
                      data-testid={`status-${event.id}`}
                      className={[
                        'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold',
                        event.status === 'open'
                          ? 'bg-success-bg text-success-fg'
                          : 'bg-surface-muted text-text-muted',
                      ].join(' ')}
                    >
                      {EVENT_STATUS_LABELS[event.status]}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <FontAwesomeIcon icon={faCalendarDay} />
                      {formatEventDate(event.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <FontAwesomeIcon icon={faUsers} />
                      {participantCountLabel(event.participants.length)}
                    </span>
                    <span
                      data-testid={`total-${event.id}`}
                      className="font-semibold text-text"
                    >
                      {formatCents(eventTotalCents(event))}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => openEvent(event.id)}
                      className="min-h-11 rounded-lg bg-surface-muted px-3 text-sm font-semibold text-text"
                    >
                      Open
                    </button>
                    {event.status === 'open' && (
                      <button
                        type="button"
                        aria-label={`Rename ${event.name}`}
                        onClick={() => setRenamingId(event.id)}
                        className="min-h-11 min-w-11 rounded-lg px-3 text-text-muted hover:bg-surface-muted"
                      >
                        <FontAwesomeIcon icon={faPen} />
                      </button>
                    )}
                    {event.status === 'open' ? (
                      <button
                        type="button"
                        aria-label={`Archive ${event.name}`}
                        onClick={() => archiveEvent(event.id)}
                        className="min-h-11 min-w-11 rounded-lg px-3 text-text-muted hover:bg-surface-muted"
                      >
                        <FontAwesomeIcon icon={faBoxArchive} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Unarchive ${event.name}`}
                        onClick={() => unarchiveEvent(event.id)}
                        className="min-h-11 min-w-11 rounded-lg px-3 text-text-muted hover:bg-surface-muted"
                      >
                        <FontAwesomeIcon icon={faBoxOpen} />
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={`Delete ${event.name}`}
                      onClick={() => handleDelete(event)}
                      className="min-h-11 min-w-11 rounded-lg px-3 text-text-muted hover:bg-surface-muted hover:text-danger-fg"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
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
      <label htmlFor={`rename-${event.id}`} className="sr-only">
        Event name
      </label>
      <input
        id={`rename-${event.id}`}
        type="text"
        value={draft}
        maxLength={EVENT_NAME_MAX_LENGTH + 1}
        aria-invalid={error !== null}
        onChange={(changed) => setDraft(changed.target.value)}
        className="min-h-11 rounded-lg border border-border bg-surface px-3 text-base focus:border-primary focus:outline-none"
      />
      {error && (
        <p role="alert" className="text-sm text-danger-fg">
          {ERROR_MESSAGES[error]}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          className="min-h-11 flex-1 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-contrast"
        >
          Save name
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 flex-1 rounded-lg border border-border px-3 text-sm font-semibold text-text-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
