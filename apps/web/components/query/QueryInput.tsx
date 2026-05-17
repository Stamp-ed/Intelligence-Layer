"use client";

interface QueryInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

export function QueryInput({ value, onChange, onSubmit, loading }: QueryInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="space-y-3">
      <textarea
        className="input-field min-h-[120px] resize-y"
        placeholder="Ask about Stamped's knowledge base…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
      />
      <button
        type="button"
        className="btn-primary disabled:opacity-50"
        onClick={onSubmit}
        disabled={loading || !value.trim()}
      >
        {loading ? "Searching…" : "Ask"}
      </button>
    </div>
  );
}
