export const TAB_IDS = ['group', 'expenses', 'settlement'] as const;

export type TabId = (typeof TAB_IDS)[number];

export interface TabDefinition {
  id: TabId;
  label: string;
}

export const TABS: TabDefinition[] = [
  { id: 'group', label: 'Group' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'settlement', label: 'Settlement' },
];

interface TabBarProps {
  activeTab: TabId;
  disabledTabs: readonly TabId[];
  onSelect: (tab: TabId) => void;
}

export function TabBar({ activeTab, disabledTabs, onSelect }: TabBarProps) {
  return (
    <nav
      role="tablist"
      aria-label="Sections"
      className="fixed bottom-0 left-1/2 z-10 grid w-full max-w-[480px] -translate-x-1/2 grid-cols-3 border-t border-divider bg-surface pb-safe-bottom pl-[calc(var(--safe-left)+0.5rem)] pr-[calc(var(--safe-right)+0.5rem)]"
    >
      {TABS.map((tab) => {
        const isDisabled = disabledTabs.includes(tab.id);
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-controls={`panel-${tab.id}`}
            aria-selected={isActive}
            aria-disabled={isDisabled}
            disabled={isDisabled}
            tabIndex={isActive ? 0 : -1}
            onClick={() => {
              if (!isDisabled) {
                onSelect(tab.id);
              }
            }}
            className={[
              'mobile-target m-1 flex flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-1 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary',
              isActive ? 'bg-surface-muted text-primary' : 'text-text-muted',
              isDisabled ? 'cursor-not-allowed opacity-40' : 'hover:text-text',
            ].join(' ')}
          >
            <span className={`flex h-7 w-14 items-center justify-center rounded-full ${isActive ? 'bg-primary-container text-on-primary-container' : ''}`}>
              <FontAwesomeIcon icon={{ group: faUsers, expenses: faReceipt, settlement: faCoins }[tab.id]} />
            </span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCoins, faReceipt, faUsers } from '../ui/icons';
