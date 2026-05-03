/**
 * Event logger for tracking all detection events and metrics
 */

export interface LogEntry {
  timestamp: number;
  event: string;
  data: Record<string, any>;
  severity: 'INFO' | 'WARNING' | 'ERROR';
}

export class EventLogger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 10000;

  log(event: string, data: Record<string, any> = {}, severity: 'INFO' | 'WARNING' | 'ERROR' = 'INFO'): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      event,
      data,
      severity,
    };

    this.logs.push(entry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output for debugging
    if (severity !== 'INFO') {
      console.log(`[${severity}] ${event}:`, data);
    }
  }

  getLogs(filter?: { severity?: string; event?: string; minTime?: number }): LogEntry[] {
    return this.logs.filter((log) => {
      if (filter?.severity && log.severity !== filter.severity) return false;
      if (filter?.event && log.event !== filter.event) return false;
      if (filter?.minTime && log.timestamp < filter.minTime) return false;
      return true;
    });
  }

  getLogsSince(timestamp: number): LogEntry[] {
    return this.logs.filter((log) => log.timestamp >= timestamp);
  }

  clear(): void {
    this.logs = [];
  }

  export(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  getStatistics(): {
    totalLogs: number;
    infoCount: number;
    warningCount: number;
    errorCount: number;
    timeSpan: number;
  } {
    if (this.logs.length === 0) {
      return {
        totalLogs: 0,
        infoCount: 0,
        warningCount: 0,
        errorCount: 0,
        timeSpan: 0,
      };
    }

    const firstTime = this.logs[0].timestamp;
    const lastTime = this.logs[this.logs.length - 1].timestamp;

    return {
      totalLogs: this.logs.length,
      infoCount: this.logs.filter((l) => l.severity === 'INFO').length,
      warningCount: this.logs.filter((l) => l.severity === 'WARNING').length,
      errorCount: this.logs.filter((l) => l.severity === 'ERROR').length,
      timeSpan: lastTime - firstTime,
    };
  }
}
