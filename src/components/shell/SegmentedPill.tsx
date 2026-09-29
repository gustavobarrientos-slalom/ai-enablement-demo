interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedPillProps<T extends string> {
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onSelect: (value: T) => void;
  selectionRole: 'radio' | 'button';
}

export function SegmentedPill<T extends string>({
  label,
  options,
  value,
  onSelect,
  selectionRole,
}: SegmentedPillProps<T>) {
  const selectedIndex = options.findIndex((option) => option.value === value);

  return (
    <div
      className="md-segmented"
      role={selectionRole === 'radio' ? 'radiogroup' : 'group'}
      aria-label={label}
      data-segments={options.length}
      data-selected-index={selectedIndex}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          {...(selectionRole === 'radio'
            ? { role: 'radio' as const, 'aria-checked': option.value === value }
            : { 'aria-pressed': option.value === value })}
          onClick={() => onSelect(option.value)}
          className="mobile-target md-segment"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
