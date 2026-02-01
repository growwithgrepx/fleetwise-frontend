import React from 'react';
import clsx from 'clsx';

export interface JobStatus {
  label: string;
  value: string;
}

interface JobStatusTabsProps {
  statuses: JobStatus[];
  counts: Record<string, number>;
  activeStatus: string | undefined;
  onChange: (status: string) => void;
}

export const JobStatusTabs: React.FC<JobStatusTabsProps> = ({
  statuses,
  counts,
  activeStatus,
  onChange
}) => {
  // Normalize activeStatus: treat undefined as empty string for 'all' tab
  const normalizedActive = activeStatus ?? '';

  return (
    <div className="flex flex-col gap-4 bg-background pt-4 pb-4 rounded-t-xl">
      <div className="px-4">
        <h3 className="font-bold text-text-main mb-3">Filter by status</h3>
        <div className="flex flex-wrap gap-2 w-full">
          {statuses.map((status) => {
            const tabValue = status.value === 'all' ? '' : status.value;
            return (
              <button
                key={status.value}
                onClick={() => onChange(tabValue)}
                className={clsx(
                  'px-3 py-2 rounded-lg text-sm transition-all flex-1 min-w-[100px] text-center flex flex-col items-center sm:flex-row sm:min-w-0',
                  normalizedActive === tabValue
                    ? 'bg-primary text-white shadow-lg'
                    : 'bg-transparent text-text-main border border-border-color hover:border-primary'
                )}
              >
                <span className="font-medium truncate max-w-full">{status.label}</span>
                <span className="text-xs bg-white/20 rounded-full px-2 py-1 mt-1 sm:ml-2 sm:mt-0">
                  {status.value === 'all' ? counts['all'] || 0 : counts[status.value] || 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
