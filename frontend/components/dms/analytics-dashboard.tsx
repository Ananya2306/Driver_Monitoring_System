'use client';

import { useEffect, useState } from 'react';
import { useSessionStore, SessionMetrics } from '@/lib/stores/session-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AnalyticsDashboardProps {
  isActive?: boolean;
  mode?: 'fatigue' | 'smoking';
}

export function AnalyticsDashboard({ isActive = false, mode = 'fatigue' }: AnalyticsDashboardProps) {
  const [metrics, setMetrics] = useState<SessionMetrics | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const sessionStore = useSessionStore();

  useEffect(() => {
    const updateMetrics = () => {
      const currentMetrics = sessionStore.getSessionData();
      setMetrics(currentMetrics);

      if (currentMetrics?.events) {
        const data = currentMetrics.events
          .map((event, idx) => ({
            index: idx,
            prediction: Math.round((event.prediction || 0) * 100),
            score: event.fatigueScore || Math.round((event.prediction || 0) * 100),
            timestamp: new Date(event.timestamp).toLocaleTimeString(),
          }))
          .slice(-30); // Last 30 frames

        setChartData(data);
      }
    };

    const unsubscribe = useSessionStore.subscribe(
      (state) => state.metrics,
      updateMetrics
    );

    updateMetrics();
    return unsubscribe;
  }, [sessionStore]);

  if (!metrics) {
    return (
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle>Analytics Dashboard</CardTitle>
          <CardDescription>No active session data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Start a detection session to view analytics</p>
        </CardContent>
      </Card>
    );
  }

  const alertStats = {
    total: metrics.alerts.length,
    warnings: metrics.alerts.filter((a) => a.level === 'WARNING').length,
    criticals: metrics.alerts.filter((a) => a.level === 'CRITICAL').length,
  };

  const sessionDuration = metrics.endTime 
    ? Math.round((metrics.endTime - metrics.startTime) / 1000)
    : Math.round((Date.now() - metrics.startTime) / 1000);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Stats Cards */}
        <Card className="border-border/40 bg-card/50">
          <CardHeader className="pb-3">
            <CardDescription>Average Score</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{metrics.avgScore.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground mt-1">out of 100</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50">
          <CardHeader className="pb-3">
            <CardDescription>Max Score</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{metrics.maxScore.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground mt-1">peak detection</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50">
          <CardHeader className="pb-3">
            <CardDescription>Alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-warning">{alertStats.total}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {alertStats.criticals} critical
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50">
          <CardHeader className="pb-3">
            <CardDescription>Duration</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-success">{sessionDuration}s</p>
            <p className="text-xs text-muted-foreground mt-1">session time</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle className="text-lg">Fatigue Trend</CardTitle>
              <CardDescription>Last 30 frames</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="index" stroke="rgba(255,255,255,0.5)" />
                  <YAxis stroke="rgba(255,255,255,0.5)" domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#3b82f6"
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader>
              <CardTitle className="text-lg">Alert Distribution</CardTitle>
              <CardDescription>By severity level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Critical</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-destructive rounded" style={{ width: `${alertStats.criticals * 10}%` }} />
                    <span className="text-sm font-medium">{alertStats.criticals}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Warnings</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-warning rounded" style={{ width: `${alertStats.warnings * 10}%` }} />
                    <span className="text-sm font-medium">{alertStats.warnings}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Frames</span>
                  <span className="text-sm font-medium">{metrics.totalFrames}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
