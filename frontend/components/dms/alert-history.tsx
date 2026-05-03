'use client';

import { useEffect, useState } from 'react';
import { useSessionStore, SessionMetrics } from '@/lib/stores/session-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, AlertTriangle, Clock, TrendingUp } from 'lucide-react';

interface AlertHistoryProps {
  maxItems?: number;
}

export function AlertHistory({ maxItems = 10 }: AlertHistoryProps) {
  const [metrics, setMetrics] = useState<SessionMetrics | null>(null);
  const sessionStore = useSessionStore();

  useEffect(() => {
    const unsubscribe = useSessionStore.subscribe(
      (state) => state.metrics,
      () => setMetrics(sessionStore.getSessionData())
    );

    setMetrics(sessionStore.getSessionData());
    return unsubscribe;
  }, [sessionStore]);

  if (!metrics || metrics.alerts.length === 0) {
    return (
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle>Alert History</CardTitle>
          <CardDescription>Recent alerts during session</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No alerts triggered</p>
        </CardContent>
      </Card>
    );
  }

  const recentAlerts = [...metrics.alerts].reverse().slice(0, maxItems);

  return (
    <Card className="border-border/40">
      <CardHeader>
        <CardTitle>Alert History</CardTitle>
        <CardDescription>Recent alerts during session</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {recentAlerts.map((alert, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-border/40"
            >
              {alert.level === 'CRITICAL' ? (
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {alert.level === 'CRITICAL' ? 'Critical' : 'Warning'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-1">{alert.reason}</p>
                {alert.evidence && (
                  <p className="text-xs text-muted-foreground">
                    Score: {alert.evidence.score} | Frame: {alert.evidence.frameIndex}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
