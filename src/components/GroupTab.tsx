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
import { BottomSheet } from './shell/BottomSheet';
import { ListRow } from './shell/ListRow';
import { PrimaryAction } from './shell/PrimaryAction';
import { faUsers } from '../ui/icons';

export function GroupTab({ showPrimaryAction = true }: { showPrimaryAction?: boolean }) {
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
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

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
      setAdding(false);
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
        <div className="md-field-wrap">
          <input
            id="event-name"
            type="text"
            value={eventNameDraft}
            placeholder=" "
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
            className="mobile-input md-field"
          />
          <label htmlFor="event-name" className="md-field-label">Event name</label>
        </div>
        {eventNameError && (
          <p id="event-name-error" role="alert" className="text-sm text-danger-fg">
            {ERROR_MESSAGES[eventNameError]}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="md-section-title">
          Participants ({participants.length})
        </h2>

        <BottomSheet open={adding} title="New participant" onClose={() => setAdding(false)}>
        <form onSubmit={handleAddParticipant} className="flex flex-col gap-3" noValidate>
          <div className="md-field-wrap">
            <input
              id="participant-name"
              type="text"
              value={participantDraft}
              placeholder=" "
              maxLength={PARTICIPANT_NAME_MAX_LENGTH + 1}
              aria-invalid={participantError !== null}
              aria-describedby={participantError ? 'participant-error' : undefined}
              onChange={(event) => setParticipantDraft(event.target.value)}
              className="mobile-input md-field"
            />
            <label htmlFor="participant-name" className="md-field-label">Participant name</label>
          </div>
          {participantError && (
            <p id="participant-error" role="alert" className="text-sm text-danger-fg">
              {ERROR_MESSAGES[participantError]}
            </p>
          )}
          <button
            type="submit"
            aria-label="Add participant"
            className="mobile-target md-filled-button"
          >
            <FontAwesomeIcon icon={faUserPlus} />
            <span className="ml-2">Add participant</span>
          </button>
        </form>
        </BottomSheet>

        {participants.length === 0 ? (
          <p className="text-sm text-text-muted">No participants yet.</p>
        ) : (
          <ul aria-label="Participants" className="md-card divide-y divide-divider">
            {participants.map((participant) => {
              const removable = isEditable && canRemoveParticipant(participant.id, expenses);

              return (
                <ListRow
                  key={participant.id}
                  icon={faUsers}
                  primary={participant.name}
                  {...(isEditable && !removable ? { secondary: PARTICIPANT_HAS_EXPENSES_MESSAGE } : {})}
                  {...(removable ? {
                    actions: [{
                      label: `Remove ${participant.name}`,
                      text: 'Delete',
                      icon: faTrash,
                      destructive: true,
                      onClick: () => setRemovingId(participant.id),
                    }],
                  } : {})}
                />
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
      {isEditable && showPrimaryAction && !adding && !removingId && (
        <PrimaryAction onClick={() => { setParticipantError(null); setAdding(true); }}>
          Add participant
        </PrimaryAction>
      )}
      <BottomSheet
        open={removingId !== null}
        title="Remove participant"
        onClose={() => setRemovingId(null)}
      >
        <p className="mb-4">Remove {participants.find((participant) => participant.id === removingId)?.name}?</p>
        <div className="flex gap-2">
          <button type="button" className="mobile-target md-outline-button flex-1" onClick={() => setRemovingId(null)}>Cancel</button>
          <button type="button" className="mobile-target md-tonal-button flex-1 bg-danger-bg text-danger-fg" onClick={() => {
            if (removingId) removeParticipant(removingId);
            setRemovingId(null);
          }}>Confirm removal</button>
        </div>
      </BottomSheet>
    </div>
  );
}
