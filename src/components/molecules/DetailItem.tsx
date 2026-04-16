import React from 'react';

export function DetailItem({
  label,
  value,
  clamp,
}: {
  label: string;
  value: React.ReactNode;
  clamp?: boolean;
}) {
    if (!value && typeof value !== 'number') return null;
    return (
        <div>
            <dt className="text-sm font-medium text-text-secondary">{label}</dt>
            <dd className={`mt-1 text-sm text-text-main break-words${clamp ? ' line-clamp-3' : ''}`}>{value}</dd>
        </div>
    );
} 