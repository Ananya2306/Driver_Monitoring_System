'use client';

import { useEffect, useState } from 'react';
import { useSessionStore } from '@/lib/stores/session-store';

export function usePerformanceMonitoring() {
  const [fps, setFps] = useState(0);
  const [apiLatency, setApiLatency] = useState(0);
  const [processingTime, setProcessingTime] = useState(0);
  const { updatePerformance } = useSessionStore();

  useEffect(() => {
    const handleStorageUpdate = () => {
      const state = useSessionStore.getState();
      const metrics = state.performanceMetrics;
      setFps(metrics.fps);
      setApiLatency(metrics.apiLatency);
      setProcessingTime(metrics.processingTime);
    };

    const unsubscribe = useSessionStore.subscribe(
      (state) => state.performanceMetrics,
      () => handleStorageUpdate()
    );

    return unsubscribe;
  }, []);

  const recordMetric = (apiLatency: number, processingTime: number) => {
    // Calculate FPS
    const now = performance.now();
    setApiLatency(apiLatency);
    setProcessingTime(processingTime);
    updatePerformance(30, apiLatency, processingTime);
  };

  return { fps, apiLatency, processingTime, recordMetric };
}
