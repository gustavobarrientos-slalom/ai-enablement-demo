import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '../../ui/icons';

interface BottomSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const supportsModal = typeof HTMLDialogElement !== 'undefined'
    && typeof HTMLDialogElement.prototype.showModal === 'function';

  useEffect(() => {
    if (!supportsModal) return;
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
    return () => { if (element.open) element.close(); };
  }, [open, supportsModal]);

  if (!open) return null;

  const body = (
    <div className="sheet-panel mx-auto max-h-[90dvh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-surface px-5 pb-[calc(var(--safe-bottom)+1rem)] pt-4 text-text shadow-xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl sm:pb-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button type="button" aria-label={`Close ${title}`} onClick={onClose} className="mobile-target md-icon-button">
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>
      {children}
    </div>
  );

  if (!supportsModal) {
    return createPortal(
      <div className="sheet-overlay fixed inset-0 z-50 flex items-end bg-black/50 sm:items-center" onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}>
        <div role="dialog" aria-modal="true" aria-label={title} className="w-full sm:mx-auto sm:max-w-[480px]" onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}>{body}</div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <dialog
      ref={dialog}
      aria-label={title}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event: MouseEvent<HTMLDialogElement>) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="sheet-dialog fixed inset-x-0 bottom-0 top-auto mx-auto my-0 max-h-dvh w-full max-w-[480px] overflow-visible bg-transparent p-0 backdrop:bg-black/50 sm:bottom-auto sm:top-1/2 sm:max-h-[calc(100dvh-3rem)] sm:-translate-y-1/2"
    >
      {body}
    </dialog>,
    document.body,
  );
}
