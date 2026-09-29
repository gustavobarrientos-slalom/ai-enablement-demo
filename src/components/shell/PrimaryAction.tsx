import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { createPortal } from 'react-dom';
import { faPlus } from '../../ui/icons';

export function PrimaryAction({ children, onClick, aboveTabBar = true }: {
  children: string;
  onClick: () => void;
  aboveTabBar?: boolean;
}) {
  return createPortal(
    <div className={`pointer-events-none fixed inset-x-0 z-20 mx-auto flex max-w-[480px] justify-end pr-[calc(var(--safe-right)+1rem)] ${aboveTabBar
      ? 'bottom-[calc(4rem+var(--safe-bottom)+0.75rem)]'
      : 'bottom-[calc(var(--safe-bottom)+1rem)]'}`}>
      <button
        type="button"
        aria-label={children}
        title={children}
        onClick={onClick}
        className="mobile-target pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl text-primary-contrast shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
      </button>
    </div>,
    document.body,
  );
}
