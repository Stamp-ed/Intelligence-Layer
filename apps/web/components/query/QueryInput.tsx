"use client";

interface QueryInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

export function QueryInput({ value, onChange, onSubmit, loading }: QueryInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading && value.trim()) onSubmit();
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="relative rounded-2xl border bg-card shadow-card overflow-hidden transition-shadow focus-within:shadow-card-hover"
        style={{ borderColor: "rgba(43, 44, 48, 0.12)" }}
      >
        <textarea
          className="w-full min-h-[132px] max-h-[280px] resize-none bg-transparent px-5 pt-4 pb-14 text-ink placeholder:text-ink-dim focus:outline-none text-[15px] leading-relaxed"
          placeholder="How can I help you today?"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          rows={4}
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
