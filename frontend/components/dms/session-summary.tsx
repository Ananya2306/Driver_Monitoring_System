'use client';

import { useEffect, useState } from 'react';
import { useSessionStore, SessionMetrics } from '@/lib/stores/session-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Share2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SessionSummary() {
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

  if (!metrics) {
    return (
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle>Session Summary</CardTitle>
          <CardDescription>No active session</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Start a session to view summary</p>
        </CardContent>
      </Card>
    );
  }

  const duration = metrics.endTime
    ? Math.round((metrics.endTime - metrics.startTime) / 1000)
    : Math.round((Date.now() - metrics.startTime) / 1000);

  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  const exportAsCSV = () => {
    const headers = ['Timestamp', 'Prediction', 'Score', 'Alert Level'];
    const rows = metrics.events.map((event) => [
      new Date(event.timestamp).toISOString(),
      event.prediction?.toFixed(2),
      event.fatigueScore || (event.prediction! * 100).toFixed(0),
      event.alertLevel || 'NONE',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session_${metrics.sessionId}_${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportAsJSON = () => {
    const json = JSON.stringify(metrics, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session_${metrics.sessionId}_${new Date().toISOString()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-border/40">
      <CardHeader>
        <CardTitle>Session Summary</CardTitle>
        <CardDescription>Overview of detection session</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-border/40">
              <p className="text-xs text-muted-foreground mb-1">Mode</p>
              <p className="text-sm font-bold capitalize">{metrics.mode}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border/40">
              <p className="text-xs text-muted-foreground mb-1">Duration</p>
              <p className="text-sm font-bold">
                {minutes}m {seconds}s
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border/40">
              <p className="text-xs text-muted-foreground mb-1">Frames</p>
              <p className="text-sm font-bold">{metrics.totalFrames}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border/40">
              <p className="text-xs text-muted-foreground mb-1">Alerts</p>
              <p className="text-sm font-bold">{metrics.alerts.length}</p>
            </div>
          </div>

          {/* Micro-Fatigue Stats (Fatigue Mode) */}
          {metrics.mode === 'fatigue' && metrics.microFatigueStats && (
            <div className="p-4 rounded-lg bg-muted/50 border border-border/40">
              <p className="text-sm font-semibold mb-2">Micro-Fatigue Detection</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Events</p>
                  <p className="text-lg font-bold">{metrics.microFatigueStats.totalCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Severity</p>
                  <p className={cn(
                    "text-lg font-bold",
                    metrics.microFatigueStats.severity === 'High' ? "text-destructive" :
                    metrics.microFatigueStats.severity === 'Medium' ? "text-yellow-500" :
                    "text-success"
                  )}>
                    {metrics.microFatigueStats.severity}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Smoking Stats (Smoking Mode) */}
          {metrics.mode === 'smoking' && metrics.smokingStats && (
            <div className="p-4 rounded-lg bg-muted/50 border border-border/40">
              <p className="text-sm font-semibold mb-2">Smoking Frequency</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Events</p>
                  <p className="text-lg font-bold">{metrics.smokingStats.totalCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Frequency</p>
                  <p className={cn(
                    "text-lg font-bold",
                    metrics.smokingStats.frequency === 'High' ? "text-destructive" :
                    metrics.smokingStats.frequency === 'Medium' ? "text-yellow-500" :
                    "text-success"
                  )}>
                    {metrics.smokingStats.frequency}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Snapshot Stats */}
          {metrics.snapshotStats && metrics.snapshotStats.totalSnapshots > 0 && (
            <div className="p-4 rounded-lg bg-muted/50 border border-border/40">
              <p className="text-sm font-semibold mb-2">Evidence Capture</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Snapshots</p>
                  <p className="text-lg font-bold">{metrics.snapshotStats.totalSnapshots}</p>
                </div>
                {metrics.snapshotStats.lastSnapshotTime && (
                  <div>
                    <p className="text-xs text-muted-foreground">Last Snapshot</p>
                    <p className="text-sm font-semibold">
                      {new Date(metrics.snapshotStats.lastSnapshotTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lighting Stats */}
          {metrics.lightingStats && (metrics.lightingStats.normalCount > 0 || metrics.lightingStats.lowCount > 0) && (
            <div className="p-4 rounded-lg bg-muted/50 border border-border/40">
              <p className="text-sm font-semibold mb-2">Lighting Conditions</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Normal</p>
                  <p className="text-lg font-bold text-success">{metrics.lightingStats.normalCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Low</p>
                  <p className="text-lg font-bold text-yellow-500">{metrics.lightingStats.lowCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Enhanced</p>
                  <p className="text-lg font-bold text-primary">{metrics.lightingStats.enhancementActivatedCount}</p>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 rounded-lg bg-muted/50 border border-border/40">
            <p className="text-sm text-muted-foreground mb-2">Session ID</p>
            <p className="text-xs font-mono text-foreground break-all">{metrics.sessionId}</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportAsCSV}
              className="flex-1 gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportAsJSON}
              className="flex-1 gap-2"
            >
              <Share2 className="w-4 h-4" />
              Export JSON
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
