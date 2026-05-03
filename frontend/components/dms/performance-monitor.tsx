'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePerformanceMonitoring } from '@/hooks/use-performance';
import { Activity, Zap, Cpu } from 'lucide-react';

export function PerformanceMonitor() {
  const { fps, apiLatency, processingTime } = usePerformanceMonitoring();
  const [status, setStatus] = useState<'optimal' | 'good' | 'warning' | 'poor'>('optimal');

  useEffect(() => {
    if (fps < 15) setStatus('poor');
    else if (fps < 24) setStatus('warning');
    else if (fps < 28) setStatus('good');
    else setStatus('optimal');
  }, [fps]);

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'optimal': return 'text-success';
      case 'good': return 'text-success';
      case 'warning': return 'text-warning';
      case 'poor': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card className="border-border/40 bg-card/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Performance
        </CardTitle>
        <CardDescription>Real-time system metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">FPS</span>
              <span className={`text-2xl font-bold ${getStatusColor(status)}`}>{fps}</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-success to-warning"
                style={{ width: `${Math.min(fps / 30 * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground capitalize">{status}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-border/40">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-warning" />
                <span className="text-xs font-medium text-muted-foreground">API Latency</span>
              </div>
              <p className="text-xl font-bold">{apiLatency}ms</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 border border-border/40">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Processing</span>
              </div>
              <p className="text-xl font-bold">{processingTime}ms</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
