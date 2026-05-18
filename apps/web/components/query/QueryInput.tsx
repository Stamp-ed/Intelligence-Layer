"use client";

interface QueryInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  /** Shorter input after the first message in a thread */
  compact?: boolean;
}

export function QueryInput({
  value,
  onChange,
  onSubmit,
  loading,
  compact = false,
}: QueryInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading && value.trim()) onSubmit();
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="query-input-shell">
        <textarea
          className={
            compact
              ? "w-full min-h-[52px] max-h-[140px] resize-none bg-transparent px-4 pt-3 pb-11 text-ink placeholder:text-ink-dim focus:outline-none text-[15px] leading-relaxed"
              : "w-full min-h-[132px] max-h-[280px] resize-none bg-transparent px-5 pt-4 pb-14 text-ink placeholder:text-ink-dim focus:outline-none text-[15px] leading-relaxed"
          }
          placeholder={
            compact ? "Ask a follow-up…" : "How can I help you today?"
          }
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          rows={compact ? 1 : 4}
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <span className="hidden sm:inline text-[10px] text-ink-dim">
            Enter to send
          </span>
          <button
            type="button"
            className="btn-primary !px-5 !py-2 text-sm rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={onSubmit}
            disabled={loading || !value.trim()}
            aria-label="Send question"
          >
            {loading ? "…" : "Ask"}
          </button>
        </div>
      </div>
    </div>
  );
}
