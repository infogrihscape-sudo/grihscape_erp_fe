import React from 'react';

interface ShimmerBoxProps {
  className?: string;
  style?: React.CSSProperties;
}

/** A single shimmer-animated rectangle. Compose these to build skeletons. */
export const ShimmerBox: React.FC<ShimmerBoxProps> = ({ className = '', style }) => (
  <div className={`shimmer rounded ${className}`} style={style} />
);

/** One skeleton row that mimics a table/list row. */
export const ShimmerRow: React.FC<{ cols?: number; className?: string }> = ({
  cols = 5,
  className = '',
}) => (
  <div className={`flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] ${className}`}>
    <ShimmerBox className="h-3 rounded-full" style={{ width: '5%', minWidth: 28 }} />
    {Array.from({ length: cols - 1 }).map((_, i) => (
      <ShimmerBox
        key={i}
        className="h-3 rounded-full flex-1"
        style={{ maxWidth: i === 0 ? '22%' : i === 1 ? '18%' : '12%' }}
      />
    ))}
  </div>
);

/** Skeleton that looks like a header + N rows. */
export const ShimmerTable: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 7,
  cols = 5,
}) => (
  <div className="w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-bg)]">
    {/* Header row */}
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
      {Array.from({ length: cols }).map((_, i) => (
        <ShimmerBox
          key={i}
          className="h-2.5 rounded-full"
          style={{ width: i === 0 ? '5%' : i === 1 ? '22%' : '12%', minWidth: 24 }}
        />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <ShimmerRow key={i} cols={cols} />
    ))}
  </div>
);

/** Skeleton for a stat/metric card. */
export const ShimmerCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`g-card p-4 flex flex-col gap-3 ${className}`}>
    <div className="flex items-center justify-between">
      <ShimmerBox className="h-3 w-1/3 rounded-full" />
      <ShimmerBox className="h-7 w-7 rounded-lg" />
    </div>
    <ShimmerBox className="h-7 w-2/5 rounded-lg" />
    <ShimmerBox className="h-2.5 w-3/5 rounded-full" />
  </div>
);

/** Skeleton for an overview grid of stat cards. */
export const ShimmerCardGrid: React.FC<{ cards?: number }> = ({ cards = 4 }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    {Array.from({ length: cards }).map((_, i) => (
      <ShimmerCard key={i} />
    ))}
  </div>
);

/** A single compact list-item skeleton (used in mobile card layouts). */
export const ShimmerListItem: React.FC = () => (
  <div className="g-card p-3.5 flex flex-col gap-2.5">
    <div className="flex items-start justify-between gap-2">
      <ShimmerBox className="h-3.5 w-2/5 rounded-full" />
      <ShimmerBox className="h-5 w-16 rounded-full" />
    </div>
    <ShimmerBox className="h-3 w-3/5 rounded-full" />
    <div className="flex gap-2 mt-1">
      <ShimmerBox className="h-3 w-1/4 rounded-full" />
      <ShimmerBox className="h-3 w-1/4 rounded-full" />
    </div>
  </div>
);

/** A list of ShimmerListItems for card-based pages. */
export const ShimmerList: React.FC<{ items?: number }> = ({ items = 6 }) => (
  <div className="flex flex-col gap-2.5">
    {Array.from({ length: items }).map((_, i) => (
      <ShimmerListItem key={i} />
    ))}
  </div>
);
