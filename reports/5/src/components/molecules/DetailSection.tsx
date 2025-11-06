import React from 'react';

export function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="relative p-4 rounded-xl border-2 border-blue-500/60 bg-background-light shadow-lg mb-2 mt-2"
            style={{ boxShadow: '0 0 16px 2px rgba(59,130,246,0.3)' }}>
            <span className="absolute -top-4 left-4 px-3 py-1 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-bold rounded-full shadow-lg drop-shadow-[0_0_8px_rgba(59,130,246,0.7)] border-2 border-blue-400">
                {title}
            </span>
            <dl className="space-y-4 mt-2">
                {children}
            </dl>
        </div>
    );
} 