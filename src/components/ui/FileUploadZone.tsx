import React, { useRef, useState } from 'react';
import { Upload, X, FileText, Loader2 } from 'lucide-react';

interface Props {
  /** Caller-provided upload function — must return an axios-like response with `data.url` or `data.fileUrl`. */
  uploadFn: (fd: FormData) => Promise<any>;
  /** Called on successful upload. */
  onSuccess: (url: string, fileName: string) => void;
  /** Called on validation or network failure. */
  onError?: (message: string) => void;
  /** Currently uploaded file — if provided, shows it instead of the drop zone. */
  value?: { url: string; fileName: string } | null;
  /** Remove the current file value. */
  onClear?: () => void;
  /** Native file input `accept` string, e.g. ".pdf,.jpg,.png" */
  accept?: string;
  /** Max allowed file size in MB (default 20). */
  maxSizeMb?: number;
  /** Label shown inside the drop zone. */
  label?: string;
  disabled?: boolean;
}

export function FileUploadZone({
  uploadFn,
  onSuccess,
  onError,
  value,
  onClear,
  accept,
  maxSizeMb = 20,
  label = 'Click or drag a file here',
  disabled,
}: Props) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging,  setDragging]  = useState(false);

  async function processFile(file: File) {
    const limitBytes = maxSizeMb * 1024 * 1024;
    if (file.size > limitBytes) {
      const msg = `File is too large. Maximum size is ${maxSizeMb} MB.`;
      onError?.(msg);
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadFn(fd);
      const url = res?.data?.url ?? res?.data?.fileUrl;
      if (!url) throw new Error('Upload response did not include a file URL.');
      onSuccess(url, file.name);
    } catch {
      onError?.('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  // ── Uploaded state ──────────────────────────────────────────────────────────
  if (value?.url) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-[rgba(184,144,71,0.35)] bg-[rgba(184,144,71,0.04)]">
        <FileText size={15} className="text-[#b89047] shrink-0" />
        <a
          href={value.url}
          target="_blank"
          rel="noreferrer"
          className="flex-1 text-[12px] font-semibold text-[var(--text-primary)] truncate hover:underline"
        >
          {value.fileName}
        </a>
        {onClear && !disabled && (
          <button
            type="button"
            onClick={onClear}
            className="text-[var(--text-muted)] hover:text-rose-500 transition-colors cursor-pointer border-0 bg-transparent p-0.5"
          >
            <X size={13} />
          </button>
        )}
      </div>
    );
  }

  // ── Drop zone ────────────────────────────────────────────────────────────────
  return (
    <div
      role="button"
      tabIndex={disabled || uploading ? -1 : 0}
      onClick={() => !disabled && !uploading && inputRef.current?.click()}
      onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !disabled && !uploading) inputRef.current?.click(); }}
      onDragOver={e => { e.preventDefault(); if (!disabled && !uploading) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={disabled || uploading ? undefined : onDrop}
      className={[
        'flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed transition-all cursor-pointer select-none',
        dragging
          ? 'border-[#b89047] bg-[rgba(184,144,71,0.08)]'
          : 'border-[var(--border)] hover:border-[rgba(184,144,71,0.4)] hover:bg-[rgba(184,144,71,0.03)]',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onInputChange}
        disabled={disabled || uploading}
      />
      {uploading ? (
        <>
          <Loader2 size={22} className="text-[#b89047] animate-spin" />
          <p className="text-[11.5px] text-[var(--text-muted)]">Uploading…</p>
        </>
      ) : (
        <>
          <Upload size={22} className={dragging ? 'text-[#b89047]' : 'text-[var(--text-muted)]'} />
          <div className="text-center">
            <p className="text-[12px] font-semibold text-[var(--text-secondary)]">{label}</p>
            {maxSizeMb && (
              <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5">
                Max {maxSizeMb} MB{accept ? ` · ${accept.split(',').join(', ')}` : ''}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
