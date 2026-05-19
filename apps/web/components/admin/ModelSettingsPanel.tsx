"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getModelSettings,
  updateModelSettings,
  type ModelSettings,
  type OpenAiModelOption,
} from "@/lib/api";

function ModelSelect({
  id,
  label,
  hint,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  options: OpenAiModelOption[];
  onChange: (value: string) => void;
}) {
  const selected = options.find((o) => o.id === value);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="field-label mb-0">
        {label}
      </label>
      {hint && <p className="text-[11px] text-ink-dim leading-snug">{hint}</p>}
      <select
        id={id}
        className="form-select w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      {selected && (
        <p className="text-[11px] text-ink-secondary">{selected.description}</p>
      )}
    </div>
  );
}

export function ModelSettingsPanel() {
  const [chatModels, setChatModels] = useState<OpenAiModelOption[]>([]);
  const [embeddingModels, setEmbeddingModels] = useState<OpenAiModelOption[]>([]);
  const [standardModel, setStandardModel] = useState("gpt-4o-mini");
  const [strategicModel, setStrategicModel] = useState("gpt-4o");
  const [embeddingModel, setEmbeddingModel] = useState("text-embedding-3-small");
  const [saved, setSaved] = useState<ModelSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getModelSettings();
      setChatModels(data.chat_models);
      setEmbeddingModels(data.embedding_models);
      setStandardModel(data.settings.standard_model);
      setStrategicModel(data.settings.strategic_model);
      setEmbeddingModel(data.settings.embedding_model);
      setSaved(data.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load model settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const generalModels = chatModels.filter((m) => m.category === "general");
  const reasoningModels = chatModels.filter((m) => m.category === "reasoning");
  const standardOptions = [...generalModels, ...reasoningModels];

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const { settings } = await updateModelSettings({
        standard_model: standardModel,
        strategic_model: strategicModel,
        embedding_model: embeddingModel,
      });
      setSaved(settings);
      setMessage("Model settings saved. New queries will use these models.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const dirty =
    saved != null &&
    (standardModel !== saved.standard_model ||
      strategicModel !== saved.strategic_model ||
      embeddingModel !== saved.embedding_model);

  if (loading) {
    return (
      <section className="card p-6">
        <p className="text-sm text-ink-secondary">Loading model settings…</p>
      </section>
    );
  }

  return (
    <section className="card p-6 space-y-6">
      <div>
        <h2 className="mb-1">AI models</h2>
        <p className="text-sm text-ink-secondary leading-relaxed">
          Configure which OpenAI models power queries, strategic synthesis, ingestion
          summaries, entity extraction, and semantic search embeddings. Changes apply
          immediately to new requests.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ModelSelect
          id="standard-model"
          label="Standard query model"
          hint="Used for normal Q&A on the Query page (Strategic synthesis off)."
          value={standardModel}
          options={standardOptions}
          onChange={setStandardModel}
        />
        <ModelSelect
          id="strategic-model"
          label="Strategic synthesis model"
          hint='Used when "Strategic synthesis" is enabled on Query — better for multi-source reasoning.'
          value={strategicModel}
          options={[...generalModels, ...reasoningModels]}
          onChange={setStrategicModel}
        />
      </div>

      <ModelSelect
        id="embedding-model"
        label="Embedding model"
        hint={`Vectors are ${saved?.embedding_dimensions ?? 1536} dimensions today. Changing this requires a Qdrant reindex (Admin → reindex or POST /api/v1/admin/reindex-vectors).`}
        value={embeddingModel}
        options={embeddingModels}
        onChange={setEmbeddingModel}
      />

      <div className="text-[11px] text-ink-dim space-y-1 border-t border-[color:var(--surface-border)] pt-4">
        <p>
          <strong className="text-ink-secondary">Also uses standard model:</strong> document
          summaries on ingest, entity enrichment (graph rebuild).
        </p>
        <p>
          Saving requires <code className="text-ink-secondary">NEXT_PUBLIC_API_SECRET_KEY</code>{" "}
          on the web app (same value as API <code className="text-ink-secondary">API_SECRET_KEY</code>
          ).
        </p>
        {saved && (
          <p>Last updated: {new Date(saved.updated_at).toLocaleString()}</p>
        )}
      </div>

      {error && (
        <p className="text-stamp-orange text-sm" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="text-semantic-verified text-sm" role="status">
          {message}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="btn-primary"
          disabled={saving || !dirty}
          onClick={() => void handleSave()}
        >
          {saving ? "Saving…" : "Save model settings"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={saving}
          onClick={() => void load()}
        >
          Reset
        </button>
      </div>
    </section>
  );
}
