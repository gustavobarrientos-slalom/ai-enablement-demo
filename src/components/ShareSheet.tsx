import { useCallback, useEffect, useState } from 'react';
import { BottomSheet } from './shell/BottomSheet';
import { QrCode } from './QrCode';
import {
  COPY_LINK,
  QR_CODE_TITLE,
  QR_TOO_LARGE,
  SHARE_EVENT_TITLE,
  SHOW_QR_CODE,
} from '../ui/messages';

export function ShareSheet({ open, name, url, onClose, onCopy }: {
  open: boolean;
  name: string;
  url: string;
  onClose: () => void;
  onCopy: () => Promise<boolean>;
}) {
  const [showQr, setShowQr] = useState(false);
  const [tooLarge, setTooLarge] = useState(false);
  const handleTooLarge = useCallback(() => setTooLarge(true), []);

  useEffect(() => {
    if (!open) {
      setShowQr(false);
      setTooLarge(false);
    }
  }, [open]);

  if (!open) return null;

  const copy = async () => {
    if (await onCopy()) onClose();
  };

  return (
    <BottomSheet
      open
      title={showQr ? QR_CODE_TITLE : SHARE_EVENT_TITLE}
      onClose={onClose}
    >
      {showQr ? (
        <div className="flex flex-col items-center gap-3">
          {tooLarge ? (
            <>
              <p role="alert" className="text-center">{QR_TOO_LARGE}</p>
              <button type="button" onClick={() => void copy()} className="mobile-target w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-contrast">
                {COPY_LINK}
              </button>
            </>
          ) : (
            <>
              <QrCode text={url} name={name} onTooLarge={handleTooLarge} />
              <p className="text-center font-medium">{name}</p>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => void copy()} className="mobile-target w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-contrast">
            {COPY_LINK}
          </button>
          <button type="button" onClick={() => setShowQr(true)} className="mobile-target w-full rounded-xl border border-border px-4 py-3 font-semibold text-text">
            {SHOW_QR_CODE}
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
