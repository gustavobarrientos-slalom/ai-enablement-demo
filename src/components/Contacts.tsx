import { useState, type FormEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { sortContactsByName } from '../domain/contact';
import type { AppError, Contact } from '../domain/types';
import { useAppStore } from '../store/useAppStore';
import { ERROR_MESSAGES } from '../ui/messages';
import { faCheck, faPen, faTrash, faUsers } from '../ui/icons';
import { BottomSheet } from './shell/BottomSheet';
import { ListRow } from './shell/ListRow';
import { PrimaryAction } from './shell/PrimaryAction';

export function Contacts() {
  const contacts = useAppStore((state) => state.contacts);
  const addContact = useAppStore((state) => state.addContact);
  const renameContact = useAppStore((state) => state.renameContact);
  const removeContact = useAppStore((state) => state.removeContact);
  const setMeContact = useAppStore((state) => state.setMeContact);
  const sortedContacts = sortContactsByName(contacts);
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState<Contact | null>(null);

  function submitAdd(raw: string): AppError | null {
    if (addContact(raw)) return null;
    return useAppStore.getState().lastError;
  }

  function submitRename(contact: Contact, raw: string): AppError | null {
    if (renameContact(contact.id, raw)) return null;
    return useAppStore.getState().lastError;
  }

  return (
    <div className="flex flex-col gap-4">
      <BottomSheet open={adding} title="New contact" onClose={() => setAdding(false)}>
        <ContactForm
          label="Contact name"
          submitLabel="Add contact"
          onSubmit={(raw) => {
            const error = submitAdd(raw);
            if (!error) setAdding(false);
            return error;
          }}
          onCancel={() => setAdding(false)}
        />
      </BottomSheet>
      <BottomSheet
        open={renaming !== null}
        title="Rename contact"
        onClose={() => setRenaming(null)}
      >
        {renaming && (
          <ContactForm
            label="Contact name"
            submitLabel="Save name"
            initialValue={renaming.name}
            onSubmit={(raw) => {
              const error = submitRename(renaming, raw);
              if (!error) setRenaming(null);
              return error;
            }}
            onCancel={() => setRenaming(null)}
          />
        )}
      </BottomSheet>
      <BottomSheet
        open={deleting !== null}
        title="Delete contact"
        onClose={() => setDeleting(null)}
      >
        <p className="mb-4">
          Delete {deleting?.name}? Events will keep their participant names.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="mobile-target md-outline-button flex-1"
            onClick={() => setDeleting(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="mobile-target md-tonal-button flex-1 bg-danger-bg text-danger-fg"
            onClick={() => {
              if (deleting) removeContact(deleting.id);
              setDeleting(null);
            }}
          >
            Confirm deletion
          </button>
        </div>
      </BottomSheet>

      {sortedContacts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-text-muted">
          <p>No contacts yet.</p>
          <button
            type="button"
            className="mobile-target md-filled-button"
            onClick={() => setAdding(true)}
          >
            Add contact
          </button>
        </div>
      ) : (
        <>
          <ul aria-label="Contacts" className="md-card divide-y divide-divider">
            {sortedContacts.map((contact) => (
              <ListRow
                key={contact.id}
                icon={faUsers}
                primary={contact.name}
                onSelect={() => setMeContact(contact.isMe ? null : contact.id)}
                ariaPressed={contact.isMe}
                showChevron={false}
                trailing={
                  <span
                    aria-hidden="true"
                    title={contact.isMe ? 'Me' : undefined}
                    className="flex h-11 w-11 shrink-0 items-center justify-center text-primary"
                  >
                    {contact.isMe && (
                      <FontAwesomeIcon icon={faCheck} aria-hidden="true" className="text-xl" />
                    )}
                  </span>
                }
                actions={[
                  {
                    label: `Rename ${contact.name}`,
                    text: 'Rename',
                    icon: faPen,
                    onClick: () => setRenaming(contact),
                  },
                  {
                    label: `Delete ${contact.name}`,
                    text: 'Delete',
                    icon: faTrash,
                    destructive: true,
                    onClick: () => setDeleting(contact),
                  },
                ]}
              />
            ))}
          </ul>
          <PrimaryAction aboveTabBar={false} onClick={() => setAdding(true)}>
            Add contact
          </PrimaryAction>
        </>
      )}
    </div>
  );
}

function ContactForm({
  label,
  submitLabel,
  initialValue = '',
  onSubmit,
  onCancel,
}: {
  label: string;
  submitLabel: string;
  initialValue?: string;
  onSubmit: (raw: string) => AppError | null;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initialValue);
  const [error, setError] = useState<AppError | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(onSubmit(draft));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
      <div className="md-field-wrap">
        <input
          id="contact-name"
          type="text"
          value={draft}
          placeholder=" "
          maxLength={31}
          aria-invalid={error !== null}
          aria-describedby={error ? 'contact-error' : undefined}
          onChange={(event) => setDraft(event.target.value)}
          className="mobile-input md-field"
        />
        <label htmlFor="contact-name" className="md-field-label">{label}</label>
      </div>
      {error && (
        <p id="contact-error" role="alert" className="text-sm text-danger-fg">
          {ERROR_MESSAGES[error]}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" className="mobile-target md-filled-button flex-1">
          {submitLabel}
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
