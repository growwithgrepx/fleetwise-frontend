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
    <div className="mb-4">
      {/* Header Label */}
      <div className="mb-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Filter by Status
        </h3>
      </div>

      {/* Status Pills Container */}
      <div className="bg-[#0F172A] rounded-xl p-4 shadow-lg border border-gray-800/50">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
          {statuses.map((status) => {
            const tabValue = status.value === 'all' ? '' : status.value;
            const isActive = normalizedActive === tabValue;
            const count = status.value === 'all' ? counts['all'] || 0 : counts[status.value] || 0;

            return (
              <button
                key={status.value}
                onClick={() => onChange(tabValue)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 border',
                  isActive
                    ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/25 hover:bg-blue-600 hover:border-blue-600'
                    : 'bg-gray-800/50 text-gray-300 border-gray-700/50 hover:bg-gray-700/60 hover:border-gray-600 hover:text-white'
                )}
              >
                <span>{status.label}</span>
                <span
                  className={clsx(
                    'flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-700/80 text-gray-300'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
