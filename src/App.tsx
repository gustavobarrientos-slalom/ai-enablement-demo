import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { GroupTab } from './components/GroupTab';
import { ExpensesTab } from './components/ExpensesTab';
import { SettlementTab } from './components/SettlementTab';
import { TabBar, type TabId } from './components/TabBar';
import { selectIsGroupValid, useAppStore } from './store/useAppStore';
import { faUsers } from './ui/icons';

export function App() {
  const eventName = useAppStore((state) => state.eventName);
  const isGroupValid = useAppStore(selectIsGroupValid);
  const [activeTab, setActiveTab] = useState<TabId>('group');

  const disabledTabs: TabId[] = isGroupValid ? [] : ['expenses', 'settlement'];

  // Never leave a tab active once it becomes disabled.
  useEffect(() => {
    if (disabledTabs.includes(activeTab)) {
      setActiveTab('group');
    }
  }, [activeTab, isGroupValid]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 px-3 py-4 sm:px-4">
      <header className="flex items-center gap-2">
        <FontAwesomeIcon icon={faUsers} className="text-lg text-slate-500" />
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight">Split</h1>
          <p className="truncate text-sm text-slate-500">{eventName}</p>
        </div>
      </header>

      <TabBar activeTab={activeTab} disabledTabs={disabledTabs} onSelect={setActiveTab} />

      <main className="flex-1">
        {activeTab === 'group' && (
          <section role="tabpanel" id="panel-group" aria-labelledby="tab-group">
            <GroupTab />
          </section>
        )}
        {activeTab === 'expenses' && (
          <section role="tabpanel" id="panel-expenses" aria-labelledby="tab-expenses">
            <ExpensesTab />
          </section>
        )}
        {activeTab === 'settlement' && (
          <section role="tabpanel" id="panel-settlement" aria-labelledby="tab-settlement">
            <SettlementTab />
          </section>
        )}
      </main>
    </div>
  );
}
