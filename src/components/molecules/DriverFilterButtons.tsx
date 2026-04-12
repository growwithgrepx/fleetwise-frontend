/**
 * DriverFilterButtons
 * -------------------
 * Compact pill-button row for filtering the Jobs list by driver name.
 * Mirrors the pattern of CustomerFilterButtons but is entirely isolated –
 * it receives all its data as props and owns no shared state.
 *
 * Added as part of "Job Page Compact Layout" feature.
 * Existing components are NOT modified by this file.
 */
import React from 'react';
import clsx from 'clsx';

export interface DriverOption {
  id: number | string;
  name: string;
}

interface DriverFilterButtonsProps {
  /** Drivers derived from allJobs – only those with at least 1 job */
  drivers: DriverOption[];
  /** Per-driver job counts; use key 'unassigned' for jobs with no driver */
  counts: Record<string, number>;
  /** Currently selected driver name, '' = All Drivers, 'unassigned' = unassigned */
  selectedDriver: string;
  onChange: (driverName: string) => void;
}

export const DriverFilterButtons: React.FC<DriverFilterButtonsProps> = ({
  drivers,
  counts,
  selectedDriver,
  onChange,
}) => {
  const totalCount = Object.entries(counts)
    .filter(([key]) => key !== 'unassigned')
    .reduce((sum, [, v]) => sum + v, 0) + (counts['unassigned'] || 0);

  const btn = (label: string, value: string, count: number) => (
    <button
      key={value}
      onClick={() => onChange(value)}
      className={clsx(
        'px-2 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 whitespace-nowrap',
        selectedDriver === value
          ? 'bg-primary text-white shadow-lg'
          : 'bg-transparent text-text-main border border-border-color hover:border-primary',
      )}
    >
      <span className="font-medium">{label}</span>
      <span className="text-xs bg-white/20 rounded-full px-1.5 py-0.5">{count}</span>
    </button>
  );

  return (
    <div className="flex flex-col gap-2 bg-background pt-2 pb-2 px-2 sm:px-0 rounded-lg">
      <div className="sm:px-4">
        <h3 className="font-bold text-text-main mb-2 text-xs sm:text-sm">Filter by driver</h3>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {btn('All Drivers', '', totalCount)}
          {drivers.map((driver) =>
            btn(driver.name, driver.name, counts[driver.name] || 0),
          )}
          {btn('Unassigned', 'unassigned', counts['unassigned'] || 0)}
        </div>
      </div>
    </div>
  );
};
