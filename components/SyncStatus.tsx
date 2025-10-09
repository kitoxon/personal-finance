'use client';

import { formatDistanceToNow } from 'date-fns';

type SyncStatusProps = {
  isLoading: boolean;
  isFetching: boolean;
  lastUpdated?: number;
  className?: string;
};

export default function SyncStatus({
  isLoading,
  isFetching,
  lastUpdated,
  className,
}: SyncStatusProps) {
  if (!lastUpdated && isLoading) {
    return null;
  }

  const statusLabel = (() => {
    if (isFetching && !isLoading) {
      return 'Syncing latest changes…';
    }
    if (lastUpdated) {
      return `Synced ${formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}`;
    }
    return 'Loaded from cache';
  })();

  const indicatorClass = isFetching
    ? 'bg-amber-400/90 animate-pulse'
    : 'bg-emerald-400/80';

  return (
    <div className={`flex items-center gap-2 text-xs text-slate-400 ${className ?? ''}`}>
      <span className={`inline-flex h-2.5 w-2.5 rounded-full ${indicatorClass}`} />
      <span>{statusLabel}</span>
    </div>
  );
}
