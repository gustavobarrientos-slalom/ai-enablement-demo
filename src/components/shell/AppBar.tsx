import type { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '../../ui/icons';
import { BACK_TO_EVENTS_LABEL } from '../../ui/messages';

export function AppBar({ title, subtitle, onBack, actions }: {
  title: string; subtitle?: string; onBack?: (() => void) | undefined; actions?: ReactNode;
}) {
  return (
    <header className="flex min-h-14 items-center gap-2 border-b border-divider bg-surface px-3 shadow-sm">
      {onBack && (
        <button type="button" aria-label={BACK_TO_EVENTS_LABEL} onClick={onBack} className="mobile-target md-icon-button shrink-0">
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold tracking-tight text-primary">{title}</h1>
        {subtitle && <p className="truncate text-xs text-text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center">{actions}</div>}
    </header>
  );
}
