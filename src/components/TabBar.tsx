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
      className="grid grid-cols-3 gap-1 rounded-xl bg-surface-muted p-1"
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
              'min-h-11 rounded-lg px-2 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-surface text-text shadow-sm' : 'text-text-muted',
              isDisabled ? 'cursor-not-allowed opacity-40' : 'hover:text-text',
            ].join(' ')}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
