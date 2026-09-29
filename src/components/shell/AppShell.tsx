import type { ReactNode } from 'react';

interface AppShellProps {
  appBar: ReactNode;
  content: ReactNode;
  bottomBar?: ReactNode;
  hasPrimaryAction?: boolean;
}

export function AppShell({ appBar, content, bottomBar, hasPrimaryAction = false }: AppShellProps) {
  return (
    <div className="mx-auto flex h-dvh min-h-dvh w-full max-w-[480px] flex-col overflow-hidden overscroll-none bg-canvas pl-safe-left pr-safe-right">
      <div className="z-10 shrink-0 pt-safe-top">{appBar}</div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-none px-3 py-4" data-testid="shell-content">
        {content}
      </div>
      {(bottomBar || hasPrimaryAction) && (
        <div
          data-testid="shell-bottom-dock"
          className={`z-10 shrink-0 bg-canvas ${hasPrimaryAction
            ? bottomBar
              ? 'min-h-[calc(9rem+var(--safe-bottom))]'
              : 'min-h-[calc(5rem+var(--safe-bottom))]'
            : 'min-h-[calc(4rem+var(--safe-bottom))]'}`}
        >
          {bottomBar}
        </div>
      )}
    </div>
  );
}
