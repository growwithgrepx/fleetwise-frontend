/**
 * Resource Monitoring Dashboard Component
 * 
 * Displays real-time system health metrics, resource usage, and circuit breaker status.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Cpu, 
  Database, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Zap
} from 'lucide-react';

interface SystemHealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  issues: string[];
  timestamp: string;
  components: {
    database: {
      status: 'healthy' | 'unhealthy';
      pool_stats: {
        total_connections: number;
        active_connections: number;
        utilization_percent: number;
      };
    };
    scheduler: {
      status: 'healthy' | 'unhealthy';
      stats: any;
    };
    firebase: {
      status: 'healthy' | 'unhealthy';
    };
    system: {
      memory_mb: number;
      memory_percent: number;
      cpu_percent: number;
      thread_count: number;
      file_descriptors?: number;
      garbage_collector: {
        collections: number;
        collected: number;
      };
    };
    circuit_breakers: Record<string, {
      status: 'OPEN' | 'HALF_OPEN' | 'CLOSED';
      failures: number;
      last_failure: string | null;
    }>;
  };
  configuration: {
    thresholds: {
      memory: string;
      cpu: string;
      db_pool: string;
      threads: number;
    };
    monitoring_interval: string;
    circuit_breaker_enabled: boolean;
    circuit_breaker_threshold: number;
    circuit_breaker_timeout: string;
  };
}

interface CircuitBreakerStatus {
  circuit_breakers: Record<string, {
    status: 'OPEN' | 'HALF_OPEN' | 'CLOSED';
    failures: number;
    last_failure_time: string | null;
    can_attempt_request: boolean;
  }>;
  global_config: {
    enabled: boolean;
    failure_threshold: number;
    timeout_seconds: number;
    monitored_services: string[];
  };
  timestamp: string;
}

const ResourceMonitoringDashboard: React.FC = () => {
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [circuitBreakerData, setCircuitBreakerData] = useState<CircuitBreakerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Fetch system health data
  const fetchSystemHealth = async () => {
    try {
      const response = await fetch('/api/system-health');
      if (!response.ok) throw new Error('Failed to fetch system health');
      const data = await response.json();
      setHealthData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Fetch circuit breaker status
  const fetchCircuitBreakerStatus = async () => {
    try {
      const response = await fetch('/api/circuit-breaker-status');
      if (!response.ok) throw new Error('Failed to fetch circuit breaker status');
      const data = await response.json();
      setCircuitBreakerData(data);
    } catch (err) {
      console.error('Failed to fetch circuit breaker status:', err);
    }
  };

  // Reset circuit breaker (admin only)
  const resetCircuitBreaker = async (serviceName: string) => {
    try {
      const response = await fetch(`/api/reset-circuit-breaker/${serviceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) throw new Error('Failed to reset circuit breaker');
      
      const result = await response.json();
      console.log(result.message);
      
      // Refresh data
      await fetchCircuitBreakerStatus();
    } catch (err) {
      console.error('Failed to reset circuit breaker:', err);
    }
  };

  // Start auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSystemHealth();
      fetchCircuitBreakerStatus();
    }, 30000); // Refresh every 30 seconds
    
    setRefreshInterval(interval);
    
    // Initial fetch
    fetchSystemHealth();
    fetchCircuitBreakerStatus();
    setLoading(false);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [refreshInterval]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin mr-2" />
        <span>Loading system health...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-medium">Error loading system health: {error}</span>
        </div>
      </div>
    );
  }

  if (!healthData || !circuitBreakerData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-yellow-800">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-medium">No health data available</span>
        </div>
      </div>
    );
  }

  const { components, configuration, issues, status } = healthData;
  const { system, database, circuit_breakers } = components;

  // Determine overall status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getCircuitBreakerStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'HALF_OPEN': return <Activity className="h-4 w-4 text-yellow-500" />;
      case 'CLOSED': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  // Simple progress bar component
  const ProgressBar = ({ value, max = 100, className = "" }: { value: number; max?: number; className?: string }) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    const colorClass = percentage > 80 ? 'bg-red-500' : percentage > 60 ? 'bg-yellow-500' : 'bg-green-500';
    
    return (
      <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
        <div 
          className={`h-2 rounded-full ${colorClass} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">System Health Dashboard</h2>
          <p className="text-gray-600">
            Real-time monitoring of system resources and service health
          </p>
        </div>
        <Button onClick={() => { fetchSystemHealth(); fetchCircuitBreakerStatus(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="flex items-center gap-2 text-lg font-medium">
            <Activity className="h-5 w-5" />
            Overall System Status
          </h3>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4">
            <span className={`px-4 py-2 rounded-full text-lg font-medium ${
              status === 'healthy' ? 'bg-green-100 text-green-800' : 
              status === 'degraded' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
            }`}>
              {status.toUpperCase()}
            </span>
            <span className={`text-xl font-semibold ${getStatusColor(status)}`}>
              {status === 'healthy' ? 'All systems operational' : 
               status === 'degraded' ? 'Performance issues detected' : 
               'System experiencing problems'}
            </span>
          </div>
          
          {issues.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium text-red-600 mb-2">Active Issues:</h3>
              <ul className="list-disc list-inside space-y-1">
                {issues.map((issue, index) => (
                  <li key={index} className="text-red-600">{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Resource Usage */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Memory */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4" />
              <h4 className="font-medium">Memory Usage</h4>
            </div>
            <div className="text-2xl font-bold">{system.memory_mb.toFixed(1)} MB</div>
            <ProgressBar value={system.memory_percent} className="mt-2" />
            <div className="text-xs text-gray-500 mt-1">
              {system.memory_percent.toFixed(1)}% (Threshold: {configuration.thresholds.memory})
            </div>
          </div>
        </div>

        {/* CPU */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="h-4 w-4" />
              <h4 className="font-medium">CPU Usage</h4>
            </div>
            <div className="text-2xl font-bold">{system.cpu_percent.toFixed(1)}%</div>
            <ProgressBar value={system.cpu_percent} className="mt-2" />
            <div className="text-xs text-gray-500 mt-1">
              Threshold: {configuration.thresholds.cpu}
            </div>
          </div>
        </div>

        {/* Database Pool */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4" />
              <h4 className="font-medium">DB Connections</h4>
            </div>
            <div className="text-2xl font-bold">
              {database.pool_stats.active_connections}/{database.pool_stats.total_connections}
            </div>
            <ProgressBar value={database.pool_stats.utilization_percent} className="mt-2" />
            <div className="text-xs text-gray-500 mt-1">
              {database.pool_stats.utilization_percent.toFixed(1)}% (Threshold: {configuration.thresholds.db_pool})
            </div>
          </div>
        </div>

        {/* Threads */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-4">
            <div className="mb-2">
              <h4 className="font-medium">Thread Count</h4>
            </div>
            <div className="text-2xl font-bold">{system.thread_count}</div>
            <ProgressBar 
              value={system.thread_count} 
              max={configuration.thresholds.threads}
              className="mt-2" 
            />
            <div className="text-xs text-gray-500 mt-1">
              Threshold: {configuration.thresholds.threads}
            </div>
          </div>
        </div>
      </div>

      {/* Circuit Breaker Status */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="flex items-center gap-2 text-lg font-medium">
            <Zap className="h-5 w-5" />
            Circuit Breaker Status
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(circuit_breakers).map(([service, status]) => (
              <div key={service} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium capitalize">{service.replace('_', ' ')}</h3>
                  <div className="flex items-center gap-2">
                    {getCircuitBreakerStatusIcon(status.status)}
                    <span className="text-xs font-mono">
                      {status.failures} failures
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Status:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      status.status === 'CLOSED' ? 'bg-green-100 text-green-800' :
                      status.status === 'HALF_OPEN' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {status.status}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Last failure: {status.last_failure || 'Never'}
                  </div>
                  
                  {status.status !== 'CLOSED' && (
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="w-full"
                      onClick={() => resetCircuitBreaker(service)}
                    >
                      Reset Circuit Breaker
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {Object.keys(circuit_breakers).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No circuit breakers configured
            </div>
          )}
        </div>
      </div>

      {/* Configuration Info */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium">Monitoring Configuration</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Monitoring Interval:</span>
              <div>{configuration.monitoring_interval}</div>
            </div>
            <div>
              <span className="font-medium">Circuit Breaker:</span>
              <div>{configuration.circuit_breaker_enabled ? 'Enabled' : 'Disabled'}</div>
            </div>
            <div>
              <span className="font-medium">Failure Threshold:</span>
              <div>{configuration.circuit_breaker_threshold} failures</div>
            </div>
            <div>
              <span className="font-medium">Timeout:</span>
              <div>{configuration.circuit_breaker_timeout}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceMonitoringDashboard;