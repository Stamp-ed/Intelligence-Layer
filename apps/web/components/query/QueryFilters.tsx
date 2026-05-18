"use client";

export interface QueryFilterState {
  primaryChannel: string;
  sourceTypes: string[];
  channels: string[];
  dateFrom: string;
  dateTo: string;
}

interface QueryFiltersProps {
  filters: QueryFilterState;
  onChange: (filters: QueryFilterState) => void;
  availableSourceTypes: string[];
  availableChannels: string[];
}

const SOURCE_OPTIONS = ["discord", "markdown", "pdf", "note"];

export function QueryFilters({
  filters,
  onChange,
  availableSourceTypes,
  availableChannels,
}: QueryFiltersProps) {
  const sourceTypes = Array.from(
    new Set([...SOURCE_OPTIONS, ...availableSourceTypes]),
  ).sort();

  function toggleSource(type: string) {
    const next = filters.sourceTypes.includes(type)
      ? filters.sourceTypes.filter((t) => t !== type)
      : [...filters.sourceTypes, type];
    onChange({ ...filters, sourceTypes: next });
  }

  function toggleChannel(channel: string) {
    const next = filters.channels.includes(channel)
      ? filters.channels.filter((c) => c !== channel)
      : [...filters.channels, channel];
    onChange({ ...filters, channels: next });
  }

  return (
    <aside className="card p-4 space-y-5 w-full lg:w-64 shrink-0">
      <p className="section-label">Filters</p>

      {availableChannels.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-ink-secondary mb-2">
            Priority channel (Graph RAG)
          </p>
          <p className="text-[11px] text-ink-dim mb-2 leading-snug">
            Search this channel first, then the rest of your knowledge base.
          </p>
          <select
            className="input-field text-sm w-full"
            value={filters.primaryChannel}
            onChange={(e) =>
              onChange({ ...filters, primaryChannel: e.target.value })
            }
          >
            <option value="">All channels (no priority)</option>
            {availableChannels.map((ch) => (
              <option key={ch} value={ch}>
                {ch}
              </option>
            ))}
          </select>
        </div>
      )}

      {availableChannels.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-ink-secondary mb-2">
            Limit to channels (optional)
          </p>
          <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
            {availableChannels.map((ch) => (
              <label key={ch} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.channels.includes(ch)}
                  onChange={() => toggleChannel(ch)}
                  className="accent-stamp-orange"
                />
                <span className="truncate">{ch}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-ink-secondary mb-2">Source type</p>
        <div className="flex flex-col gap-1.5">
          {sourceTypes.map((type) => (
            <label key={type} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={filters.sourceTypes.includes(type)}
                onChange={() => toggleSource(type)}
                className="accent-stamp-orange"
              />
              {type}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-ink-secondary mb-2">Date range</p>
        <div className="space-y-2">
          <input
            type="date"
            className="input-field text-sm"
            value={filters.dateFrom}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
          />
          <input
            type="date"
            className="input-field text-sm"
            value={filters.dateTo}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
          />
        </div>
      </div>

      <button
        type="button"
        className="text-xs text-stamp-orange font-semibold"
        onClick={() =>
          onChange({
            primaryChannel: "",
            sourceTypes: [],
            channels: [],
            dateFrom: "",
            dateTo: "",
          })
        }
      >
        Clear filters
      </button>
    </aside>
  );
}
