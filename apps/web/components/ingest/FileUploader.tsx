"use client";

interface FileUploaderProps {
  accept: string;
  label: string;
  hint: string;
  disabled?: boolean;
  onFile: (file: File) => void;
}

export function FileUploader({
  accept,
  label,
  hint,
  disabled,
  onFile,
}: FileUploaderProps) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="border-2 border-dashed rounded p-8 text-center bg-raised transition-colors hover:border-stamp-orange/40"
      style={{ borderColor: "rgba(43,44,48,0.14)" }}
    >
      <p className="font-semibold text-ink text-sm">{label}</p>
      <p className="text-xs text-ink-secondary mt-1 mb-4">{hint}</p>
      <label className="btn-secondary cursor-pointer inline-block">
        Choose file
        <input
          type="file"
          accept={accept}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
      </label>
      <p className="text-xs text-ink-dim mt-3">or drag and drop here</p>
    </div>
  );
}
