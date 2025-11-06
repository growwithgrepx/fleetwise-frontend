import React from 'react';

export function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
    if (!value && typeof value !== 'number') return null;
    return (
        <div>
            <dt className="text-sm font-medium text-text-secondary">{label}</dt>
            <dd className="mt-1 text-sm text-text-main break-words">{value}</dd>
        </div>
    );
} 