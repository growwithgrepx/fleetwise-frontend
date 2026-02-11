/**
 * Comprehensive frontend logging service with telemetry and performance monitoring
 */
import axios from 'axios';

class FrontendLogger {
  private static instance: FrontendLogger;
  private logBuffer: any[] = [];
  private bufferSize = 50;
  private flushInterval: NodeJS.Timeout | null = null;
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  private constructor() {
    this.initializeNetworkListeners();
    this.startPeriodicFlush();
  }

  static getInstance(): FrontendLogger {
    if (!FrontendLogger.instance) {
      FrontendLogger.instance = new FrontendLogger();
    }
    return FrontendLogger.instance;
  }

  private initializeNetworkListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.flushLogs();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  private startPeriodicFlush() {
    // Flush logs every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flushLogs();
    }, 30000);
  }

  private getSessionInfo() {
    return {
      sessionId: sessionStorage.getItem('sessionId') || this.generateSessionId(),
      userId: typeof window !== 'undefined' ? localStorage.getItem('userId') : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      platform: typeof navigator !== 'undefined' ? navigator.platform : '',
      language: typeof navigator !== 'undefined' ? navigator.language : '',
      screenWidth: typeof screen !== 'undefined' ? screen.width : 0,
      screenHeight: typeof screen !== 'undefined' ? screen.height : 0,
      viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
      viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: new Date().toISOString()
    };
  }

  private generateSessionId(): string {
    const sessionId = 'sess_' + Math.random().toString(36).substr(2, 9);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  private createLogEntry(level: string, message: string, data: any = {}) {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data: {
        ...data,
        ...this.getSessionInfo(),
        url: typeof window !== 'undefined' ? window.location.href : '',
        referrer: typeof document !== 'undefined' ? document.referrer : ''
      }
    };
  }

  private addToBuffer(logEntry: any) {
    this.logBuffer.push(logEntry);
    
    // Flush if buffer is full
    if (this.logBuffer.length >= this.bufferSize) {
      this.flushLogs();
    }
  }

  info(message: string, data: any = {}) {
    const logEntry = this.createLogEntry('INFO', message, data);
    this.addToBuffer(logEntry);
    
    if (process.env.NODE_ENV === 'development') {
      console.info(`[INFO] ${message}`, data);
    }
  }

  warn(message: string, data: any = {}) {
    const logEntry = this.createLogEntry('WARN', message, data);
    this.addToBuffer(logEntry);
    
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[WARN] ${message}`, data);
    }
  }

  error(message: string, error: any = {}, data: any = {}) {
    const logEntry = this.createLogEntry('ERROR', message, {
      ...data,
      error: {
        message: error.message || error,
        stack: error.stack,
        name: error.name
      }
    });
    this.addToBuffer(logEntry);
    
    if (process.env.NODE_ENV === 'development') {
      console.error(`[ERROR] ${message}`, error, data);
    }
  }

  debug(message: string, data: any = {}) {
    if (process.env.NODE_ENV === 'development') {
      const logEntry = this.createLogEntry('DEBUG', message, data);
      this.addToBuffer(logEntry);
      console.debug(`[DEBUG] ${message}`, data);
    }
  }

  // Performance monitoring
  logPageLoad(pageName: string, loadTimeMs: number) {
    this.info('PAGE_LOAD', {
      page: pageName,
      loadTimeMs,
      type: 'navigation'
    });
  }

  logApiCall(url: string, method: string, durationMs: number, statusCode: number) {
    this.info('API_CALL', {
      url,
      method,
      durationMs,
      statusCode,
      type: 'api'
    });
  }

  logUserAction(action: string, element: string, additionalData: any = {}) {
    this.info('USER_ACTION', {
      action,
      element,
      ...additionalData,
      type: 'interaction'
    });
  }

  logErrorBoundary(error: Error, componentStack: string) {
    this.error('REACT_ERROR_BOUNDARY', error, {
      componentStack,
      type: 'react_error'
    });
  }

  logUnhandledRejection(reason: any) {
    this.error('UNHANDLED_REJECTION', reason, {
      type: 'promise_rejection'
    });
  }

  logComponentRender(componentName: string, renderTimeMs: number) {
    if (renderTimeMs > 100) { // Log slow renders
      this.warn('SLOW_RENDER', {
        component: componentName,
        renderTimeMs,
        type: 'performance'
      });
    }
  }

  // Network performance
  logNetworkMetrics(metrics: PerformanceNavigationTiming) {
    this.info('NAVIGATION_TIMING', {
      dnsLookup: metrics.domainLookupEnd - metrics.domainLookupStart,
      tcpConnection: metrics.connectEnd - metrics.connectStart,
      tlsHandshake: metrics.secureConnectionStart ? 
        metrics.connectEnd - metrics.secureConnectionStart : 0,
      requestTime: metrics.responseStart - metrics.requestStart,
      responseTime: metrics.responseEnd - metrics.responseStart,
      domContentLoaded: metrics.domContentLoadedEventEnd - metrics.fetchStart,
      loadEvent: metrics.loadEventEnd - metrics.fetchStart,
      fetchStart: metrics.fetchStart,
      type: 'navigation_performance'
    });
  }

  // Flush logs to backend
  async flushLogs() {
    if (this.logBuffer.length === 0 || !this.isOnline) {
      return;
    }

    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];

    try {
      // Send to backend logging endpoint
      await axios.post('/api/frontend-logs', {
        logs: logsToSend,
        clientTimestamp: new Date().toISOString()
      }, {
        timeout: 5000
      });
    } catch (error) {
      // If sending fails, put logs back in buffer
      this.logBuffer.unshift(...logsToSend);
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to send frontend logs:', error);
      }
    }
  }

  // Cleanup
  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushLogs(); // Final flush
  }
}

// Global error handlers
if (typeof window !== 'undefined') {
  const logger = FrontendLogger.getInstance();
  
  window.addEventListener('error', (event) => {
    logger.error('WINDOW_ERROR', event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      type: 'javascript_error'
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.logUnhandledRejection(event.reason);
  });

  // Performance monitoring
  if ('performance' in window) {
    // Use performance observer for better timing
    const perfObserver = new PerformanceObserver((list) => {
      const entries = list.getEntriesByType('navigation');
      if (entries.length > 0) {
        const navigation = entries[0] as PerformanceNavigationTiming;
        logger.logNetworkMetrics(navigation);
      }
    });
    
    try {
      perfObserver.observe({ entryTypes: ['navigation'] });
    } catch (e) {
      // Fallback for older browsers
      window.addEventListener('load', () => {
        if (performance.getEntriesByType) {
          const entries = performance.getEntriesByType('navigation');
          if (entries.length > 0) {
            const navigation = entries[0] as PerformanceNavigationTiming;
            logger.logNetworkMetrics(navigation);
          }
        }
      }, { once: true });
    }
  }
}

// Export singleton instance
const frontendLogger = FrontendLogger.getInstance();
export default frontendLogger;

// Convenience functions
export const logPageView = (pageName: string) => {
  const startTime = performance.now();
  return () => {
    const loadTime = performance.now() - startTime;
    frontendLogger.logPageLoad(pageName, loadTime);
  };
};

export const withErrorLogging = <T extends (...args: any[]) => any>(
  fn: T,
  context: string
): T => {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        return result.catch((error: any) => {
          frontendLogger.error(`${context}_ASYNC_ERROR`, error);
          throw error;
        });
      }
      return result;
    } catch (error) {
      frontendLogger.error(`${context}_SYNC_ERROR`, error as Error);
      throw error;
    }
  }) as T;
};