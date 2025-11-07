import type { ChartFilter, SuggestionPill } from '../types';

type Props = {
  items: SuggestionPill[];
  active: ChartFilter;
  onPick: (filter: ChartFilter) => void;
};

export default function SuggestionPills({ items, active, onPick }: Props) {
  if (!items?.length) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {items.map((s) => (
        <button
          key={s.label}
          onClick={() => onPick(s.filter)}
          className={`px-3 py-1.5 rounded-full text-sm border ${
            active === s.filter ? 'bg-white/10 text-white border-white/20' : 'bg-black/20 text-gray-300 border-white/10'
          }`}
        >
          {s.label}
          {typeof s.count === 'number' ? (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-[11px]">
              {s.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
