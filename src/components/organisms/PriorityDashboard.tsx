import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { Card } from '@/components/atoms/Card';

export type PriorityAlert = {
  text: string;
  link: string;
  severity: 'critical' | 'warning' | 'ok';
  driverName?: string;
  driverId?: number;
};

const ActionButton = ({ children, onClick, variant = 'primary' }: { children: React.ReactNode; onClick: () => void; variant?: 'primary' | 'secondary' }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
      variant === 'primary'
        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
        : 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600 hover:border-gray-500'
    }`}
  >
    {children}
  </button>
);

const EmptyState = ({ message, icon, action }: { message: string; icon: React.ReactNode; action?: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <div className="text-gray-400 mb-3">{icon}</div>
    <p className="text-gray-400 text-sm mb-2">{message}</p>
    {action && <div className="mt-2">{action}</div>}
  </div>
);

const severityStyles = {
  critical: 'border-red-500 bg-red-900/20 shadow-lg shadow-red-500/10',
  warning: 'border-yellow-500 bg-yellow-900/20 shadow-lg shadow-yellow-500/10',
  ok: 'border-green-500 bg-green-900/20 shadow-lg shadow-green-500/10',
};
const severityDot = {
  critical: 'bg-red-500',
  warning: 'bg-yellow-500',
  ok: 'bg-green-500',
};

export default function PriorityDashboard({ alerts }: { alerts: PriorityAlert[] }) {
  const router = useRouter();
  const overallSeverity = alerts.length > 0 ? alerts[0].severity : 'ok';

  const handleViewAllJobs = () => router.push('/jobs');
  const handleCreateJob = () => router.push('/jobs/new');

  return (
    <Card className={`p-6 shadow-xl border-2 ${severityStyles[overallSeverity]} bg-gradient-to-br from-background-light to-background-dark`}>
      <div className="mb-4">
  {/* Heading row */}
  <div className="flex items-center gap-2 mb-3">
    <div className={`w-3 h-3 rounded-full ${severityDot[overallSeverity]} animate-pulse`} />
    <h3 className="text-lg font-bold text-white">Priority Dashboard</h3>
  </div>

  {/* Buttons row */}
  <div className="flex gap-2">
    <ActionButton onClick={handleViewAllJobs} variant="secondary">View All</ActionButton>
    <ActionButton onClick={handleCreateJob}>Create Job</ActionButton>
  </div>
</div>

      {alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.slice(0, 3).map((alert, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-background-dark/50 rounded-lg border border-gray-700">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${severityDot[alert.severity]}`} />
                <div>
                  <p className="text-sm font-medium text-white">{alert.text}</p>
                  <p className="text-xs text-gray-400">Driver: {alert.driverName || 'Unassigned'}</p>
                </div>
              </div>
              <Link href={alert.link} className="text-blue-400 hover:text-blue-300 text-xs underline">
                View
              </Link>
            </div>
          ))}
          {alerts.length > 3 && (
            <p className="text-xs text-gray-400 text-center">+{alerts.length - 3} more alerts</p>
          )}
        </div>
      ) : (
        <EmptyState
          message="No critical issues detected"
          icon={<CheckCircleIcon className="w-8 h-8" />}
          action={<ActionButton onClick={handleCreateJob}>Create New Job</ActionButton>}
        />
      )}
    </Card>
  );
} 