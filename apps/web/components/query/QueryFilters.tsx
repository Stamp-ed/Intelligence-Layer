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
    <aside className="filter-panel" aria-label="Query filters">
      <div className="filter-panel-inner">
        <header
          className="pb-4 mb-2 border-b"
          style={{ borderColor: "rgba(43, 44, 48, 0.1)" }}
        >
          <p className="filter-panel-title mb-0">Filters</p>
        </header>

        <div
          className="flex flex-col divide-y"
          style={{ borderColor: "rgba(43, 44, 48, 0.08)" }}
        >
          {availableChannels.length > 0 && (
            <section className="py-4 first:pt-0">
              <p className="filter-group-label mb-1.5">Priority channel</p>
              <p className="text-[11px] text-ink-dim mb-2.5 leading-snug font-sans">
                Search this channel first, then the rest of your knowledge base.
              </p>
              <select
                className="filter-control filter-control-channel"
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
            </section>
          )}

          {availableChannels.length > 0 && (
            <section className="py-4">
              <p className="filter-group-label mb-2.5">Limit to channels</p>
              <div className="flex flex-col gap-0.5 max-h-32 overflow-y-auto pr-1">
                {availableChannels.map((ch) => (
                  <label key={ch} className="filter-option items-start">
                    <input
                      type="checkbox"
                      checked={filters.channels.includes(ch)}
                      onChange={() => toggleChannel(ch)}
                      className="mt-0.5"
                    />
                    <span className="filter-channel-name truncate">{ch}</span>
                  </label>
                ))}
              </div>
            </section>
          )}

          <section className="py-4">
            <p className="filter-group-label mb-2.5">Source type</p>
            <div className="flex flex-col gap-0.5">
              {sourceTypes.map((type) => (
                <label key={type} className="filter-option">
                  <input
                    type="checkbox"
                    checked={filters.sourceTypes.includes(type)}
                    onChange={() => toggleSource(type)}
                  />
                  <span className="filter-option-value">{type}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="py-4">
            <p className="filter-group-label mb-2.5">Date range</p>
            <div className="space-y-2">
              <label className="block">
                <span className="sr-only">From date</span>
                <input
                  type="date"
                  className="filter-control"
                  value={filters.dateFrom}
                  onChange={(e) =>
                    onChange({ ...filters, dateFrom: e.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="sr-only">To date</span>
                <input
                  type="date"
                  className="filter-control"
                  value={filters.dateTo}
                  onChange={(e) =>
                    onChange({ ...filters, dateTo: e.target.value })
                  }
                />
              </label>
            </div>
          </section>
        </div>

        <footer
          className="pt-4 mt-1 border-t"
          style={{ borderColor: "rgba(43, 44, 48, 0.1)" }}
        >
          <button
            type="button"
            className="ui-chrome text-sm text-stamp-orange hover:underline"
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
        </footer>
      </div>
    </aside>
  );
}
