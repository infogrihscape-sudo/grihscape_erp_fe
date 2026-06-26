import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface Props {
  title: string;
  message: string;
  /** Label for the confirm button (default "Confirm"). */
  confirmLabel?: string;
  /** "danger" renders a red confirm button; "primary" renders gold (default "danger"). */
  variant?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const btnBase = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed';

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'danger',
  loading,
  onConfirm,
  onCancel,
}: Props) {
  const confirmCls =
    variant === 'danger'
      ? `${btnBase} text-white bg-rose-600 hover:bg-rose-700`
      : `${btnBase} text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] hover:-translate-y-px hover:shadow-md`;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4"
        style={{ animation: 'modalShow 0.15s cubic-bezier(0.16,1,0.3,1) forwards' }}
      >
        {/* Icon + Title */}
        <div className="flex items-start gap-3">
          <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${variant === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-[rgba(184,144,71,0.08)] text-[#b89047]'}`}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-[var(--text-primary)] leading-snug">{title}</h3>
            <p className="text-[12px] text-[var(--text-muted)] mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className={`${btnBase} text-[var(--text-secondary)] bg-[var(--card-bg)] border border-[var(--border)] hover:border-[#b89047] hover:text-[#b89047]`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={confirmCls}
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
