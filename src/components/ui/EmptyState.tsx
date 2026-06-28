import React from 'react';
import { typo, btnPrimary, btnSecondary } from './styles';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  body?: string;
  action?: { label: string; onClick: () => void; variant?: 'primary' | 'secondary' };
}

export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-4 py-14 px-6 animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-[rgba(184,144,71,0.08)] border border-[rgba(184,144,71,0.15)] flex items-center justify-center text-[#b89047]">
        {icon}
      </div>
      <div className="max-w-xs">
        <p className={typo.emptyHeading}>{title}</p>
        {body && <p className={`${typo.emptyBody} mt-1.5 leading-relaxed`}>{body}</p>}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className={action.variant === 'secondary' ? btnSecondary : btnPrimary}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
