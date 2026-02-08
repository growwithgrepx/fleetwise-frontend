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
    <div className="flex flex-col gap-3 sm:gap-4 bg-background pt-3 sm:pt-4 pb-3 sm:pb-4 px-2 sm:px-0 rounded-t-lg sm:rounded-t-xl">
      <div className="sm:px-4">
        <h3 className="font-bold text-text-main mb-2 sm:mb-3 text-sm sm:text-base">Filter by status</h3>
        <div className="flex flex-wrap gap-1.5 sm:gap-2 w-full">
          {statuses.map((status) => {
            const tabValue = status.value === 'all' ? '' : status.value;
            return (
              <button
                key={status.value}
                onClick={() => onChange(tabValue)}
                className={clsx(
                  'px-2 sm:px-3 py-2 sm:py-2 rounded-lg text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 flex-nowrap whitespace-nowrap',
                  normalizedActive === tabValue
                    ? 'bg-primary text-white shadow-lg'
                    : 'bg-transparent text-text-main border border-border-color hover:border-primary'
                )}
              >
                <span className="font-medium">{status.label}</span>
                <span className="text-xs bg-white/20 rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1">
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
