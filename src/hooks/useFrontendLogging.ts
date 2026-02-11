/**
 * React hook for integrating frontend logging with performance monitoring
 */
import { useEffect, useRef } from 'react';
import frontendLogger, { logPageView, withErrorLogging } from '@/services/frontendLogger';

export const useFrontendLogging = (componentName: string) => {
  const renderStartTime = useRef<number>(0);
  const pageViewLogged = useRef<boolean>(false);

  // Log component render performance
  useEffect(() => {
    renderStartTime.current = performance.now();
    
    return () => {
      const renderTime = performance.now() - renderStartTime.current;
      frontendLogger.logComponentRender(componentName, renderTime);
    };
  });

  // Log page views for top-level components
  useEffect(() => {
    if (!pageViewLogged.current && typeof window !== 'undefined') {
      const logPageLoad = logPageView(componentName);
      pageViewLogged.current = true;
      
      // Log when page is fully loaded
      if (document.readyState === 'complete') {
        logPageLoad();
      } else {
        window.addEventListener('load', logPageLoad, { once: true });
      }
    }
  }, [componentName]);

  return {
    logUserAction: (action: string, element: string, data?: any) => {
      frontendLogger.logUserAction(action, element, data);
    },
    
    logError: (error: Error, context: string) => {
      frontendLogger.error(context, error);
    },
    
    logInfo: (message: string, data?: any) => {
      frontendLogger.info(message, data);
    },
    
    logWarning: (message: string, data?: any) => {
      frontendLogger.warn(message, data);
    },
    
    withErrorLogging: <T extends (...args: any[]) => any>(fn: T, context: string): T => {
      return withErrorLogging(fn, context);
    }
  };
};

// Hook for API call monitoring
export const useApiLogging = () => {
  const logApiCall = (url: string, method: string, startTime: number, statusCode: number) => {
    const duration = performance.now() - startTime;
    frontendLogger.logApiCall(url, method, duration, statusCode);
  };

  return { logApiCall };
};

// Hook for error boundary integration
export const useErrorBoundaryLogging = () => {
  return {
    logErrorBoundary: (error: Error, componentStack: string) => {
      frontendLogger.logErrorBoundary(error, componentStack);
    }
  };
};

// Global performance monitoring
if (typeof window !== 'undefined') {
  // Monitor long tasks
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'longtask' && entry.duration > 50) {
          frontendLogger.warn('LONG_TASK_DETECTED', {
            duration: entry.duration,
            startTime: entry.startTime,
            type: 'performance'
          });
        }
      });
    });
    
    try {
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      // Long tasks API not supported
    }
  }

  // Monitor memory usage (if available)
  if ('memory' in performance) {
    setInterval(() => {
      const memory = (performance as any).memory;
      if (memory) {
        frontendLogger.info('MEMORY_USAGE', {
          usedMB: Math.round(memory.usedJSHeapSize / 1048576),
          totalMB: Math.round(memory.totalJSHeapSize / 1048576),
          limitMB: Math.round(memory.jsHeapSizeLimit / 1048576),
          type: 'memory'
        });
      }
    }, 300000); // Every 5 minutes
  }
}