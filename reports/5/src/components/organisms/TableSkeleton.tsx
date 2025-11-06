import React from 'react';

export default function TableSkeleton({ rows = 6, columns = 8 }: { rows?: number; columns?: number }) {
  return (
    <div className="animate-pulse">
      <table className="w-full text-sm text-left text-text-main">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3 bg-background-light" />
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx} className="border-b border-border-color">
              {Array.from({ length: columns }).map((_, colIdx) => (
                <td key={colIdx} className="px-4 py-3">
                  <div className="h-4 bg-border-color rounded w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 