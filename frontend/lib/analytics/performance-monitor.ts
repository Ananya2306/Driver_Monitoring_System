/**
 * Performance monitoring for FPS, API latency, and processing time
 */

export interface PerformanceMetric {
  timestamp: number;
  fps: number;
  apiLatency: number;
  processingTime: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private frameCount: number = 0;
  private lastFrameTime: number = Date.now();
  private maxMetrics: number = 500;

  recordFrame(apiLatency: number, processingTime: number): void {
    const now = Date.now();
    this.frameCount++;

    // Calculate FPS every second
    const timeDelta = now - this.lastFrameTime;
    if (timeDelta >= 1000) {
      const fps = (this.frameCount * 1000) / timeDelta;

      const metric: PerformanceMetric = {
        timestamp: now,
        fps: Math.round(fps),
        apiLatency: Math.round(apiLatency),
        processingTime: Math.round(processingTime),
      };

      this.metrics.push(metric);

      // Keep only recent metrics
      if (this.metrics.length > this.maxMetrics) {
        this.metrics = this.metrics.slice(-this.maxMetrics);
      }

      this.frameCount = 0;
      this.lastFrameTime = now;
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getAverageMetrics(): {
    avgFps: number;
    avgApiLatency: number;
    avgProcessingTime: number;
    maxFps: number;
    minFps: number;
  } {
    if (this.metrics.length === 0) {
      return {
        avgFps: 0,
        avgApiLatency: 0,
        avgProcessingTime: 0,
        maxFps: 0,
        minFps: 0,
      };
    }

    const avgFps = Math.round(
      this.metrics.reduce((sum, m) => sum + m.fps, 0) / this.metrics.length
    );
    const avgApiLatency = Math.round(
      this.metrics.reduce((sum, m) => sum + m.apiLatency, 0) / this.metrics.length
    );
    const avgProcessingTime = Math.round(
      this.metrics.reduce((sum, m) => sum + m.processingTime, 0) / this.metrics.length
    );
    const maxFps = Math.max(...this.metrics.map((m) => m.fps));
    const minFps = Math.min(...this.metrics.map((m) => m.fps));

    return {
      avgFps,
      avgApiLatency,
      avgProcessingTime,
      maxFps,
      minFps,
    };
  }

  clear(): void {
    this.metrics = [];
    this.frameCount = 0;
    this.lastFrameTime = Date.now();
  }

  export(): string {
    return JSON.stringify(this.metrics, null, 2);
  }
}
