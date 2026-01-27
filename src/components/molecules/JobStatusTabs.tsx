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
    <div className="flex flex-wrap gap-2 mb-4">
      {statuses.map((status) => {
        const tabValue = status.value === 'all' ? '' : status.value;
        return (
          <button
            key={status.value}
            onClick={() => onChange(tabValue)}
            className={clsx(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              normalizedActive === tabValue
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            )}
          >
            {status.label} ({counts[status.value] || 0})
          </button>
        );
      })}
    </div>
  );
};
