import { useEffect, useState, type FormEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  selectEventName,
  selectExpenses,
  selectIsActiveEventEditable,
  selectIsGroupValid,
  selectParticipants,
  useAppStore,
} from '../store/useAppStore';
import {
  ARCHIVED_READ_ONLY_MESSAGE,
  ERROR_MESSAGES,
  INVALID_GROUP_HINT,
  PARTICIPANT_HAS_EXPENSES_MESSAGE,
} from '../ui/messages';
import { faBoxArchive, faCircleInfo, faTrash, faUserPlus } from '../ui/icons';
import {
  EVENT_NAME_MAX_LENGTH,
  PARTICIPANT_NAME_MAX_LENGTH,
  canRemoveParticipant,
} from '../domain/group';
import type { AppError } from '../domain/types';

export function GroupTab() {
  const eventName = useAppStore(selectEventName) ?? '';
  const participants = useAppStore(selectParticipants);
  const setEventName = useAppStore((state) => state.setEventName);
  const addParticipant = useAppStore((state) => state.addParticipant);
  const removeParticipant = useAppStore((state) => state.removeParticipant);
  const isGroupValid = useAppStore(selectIsGroupValid);
  const expenses = useAppStore(selectExpenses);
  const isEditable = useAppStore(selectIsActiveEventEditable);

  const [eventNameDraft, setEventNameDraft] = useState(eventName);
  const [eventNameError, setEventNameError] = useState<AppError | null>(null);
  const [participantDraft, setParticipantDraft] = useState('');
  const [participantError, setParticipantError] = useState<AppError | null>(null);

  useEffect(() => {
    setEventNameDraft(eventName);
  }, [eventName]);

  function commitEventName() {
    if (setEventName(eventNameDraft)) {
      setEventNameError(null);
      return;
    }

    setEventNameError(useAppStore.getState().lastError);
    setEventNameDraft(eventName);
  }

  function handleAddParticipant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (addParticipant(participantDraft)) {
      setParticipantDraft('');
      setParticipantError(null);
      return;
    }

    setParticipantError(useAppStore.getState().lastError);
  }

  return (
    <div className="flex flex-col gap-6">
      {!isEditable && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-sm text-text-muted"
        >
          <FontAwesomeIcon icon={faBoxArchive} />
          {ARCHIVED_READ_ONLY_MESSAGE}
        </p>
      )}

      <section className="flex flex-col gap-2">
        <label htmlFor="event-name" className="text-sm font-semibold text-text">
          Event name
        </label>
        <input
          id="event-name"
          type="text"
          value={eventNameDraft}
          disabled={!isEditable}
          maxLength={EVENT_NAME_MAX_LENGTH + 1}
          aria-invalid={eventNameError !== null}
          aria-describedby={eventNameError ? 'event-name-error' : undefined}
          onChange={(event) => setEventNameDraft(event.target.value)}
          onBlur={commitEventName}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur();
            }
          }}
          className="min-h-11 rounded-lg border border-border bg-surface px-3 text-base focus:border-primary focus:outline-none"
        />
        {eventNameError && (
          <p id="event-name-error" role="alert" className="text-sm text-danger-fg">
            {ERROR_MESSAGES[eventNameError]}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">
          Participants ({participants.length})
        </h2>

        {isEditable && (
        <form onSubmit={handleAddParticipant} className="flex gap-2" noValidate>
          <label htmlFor="participant-name" className="sr-only">
            Participant name
          </label>
          <input
            id="participant-name"
            type="text"
            value={participantDraft}
            placeholder="Name"
            maxLength={PARTICIPANT_NAME_MAX_LENGTH + 1}
            aria-invalid={participantError !== null}
            aria-describedby={participantError ? 'participant-error' : undefined}
            onChange={(event) => setParticipantDraft(event.target.value)}
            className="min-h-11 flex-1 rounded-lg border border-border bg-surface px-3 text-base focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Add participant"
            className="min-h-11 min-w-11 rounded-lg bg-primary px-3 text-primary-contrast"
          >
            <FontAwesomeIcon icon={faUserPlus} />
          </button>
        </form>
        )}

        {participantError && (
          <p id="participant-error" role="alert" className="text-sm text-danger-fg">
            {ERROR_MESSAGES[participantError]}
          </p>
        )}

        {participants.length === 0 ? (
          <p className="text-sm text-text-muted">No participants yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {participants.map((participant) => {
              const removable = isEditable && canRemoveParticipant(participant.id, expenses);

              return (
                <li
                  key={participant.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-base">{participant.name}</p>
                    {isEditable && !removable && (
                      <p className="text-xs text-text-muted">
                        {PARTICIPANT_HAS_EXPENSES_MESSAGE}
                      </p>
                    )}
                  </div>
                  {isEditable && (
                  <button
                    type="button"
                    disabled={!removable}
                    aria-disabled={!removable}
                    aria-label={`Remove ${participant.name}`}
                    title={removable ? undefined : PARTICIPANT_HAS_EXPENSES_MESSAGE}
                    onClick={() => removeParticipant(participant.id)}
                    className={[
                      'min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-text-muted',
                      removable
                        ? 'hover:bg-surface-muted hover:text-danger-fg'
                        : 'cursor-not-allowed opacity-40',
                    ].join(' ')}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {!isGroupValid && (
          <p className="flex items-center gap-2 rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning-fg">
            <FontAwesomeIcon icon={faCircleInfo} />
            {INVALID_GROUP_HINT}
          </p>
        )}
      </section>
    </div>
  );
}
