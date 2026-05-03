import { create } from 'zustand';

export interface DetectionEvent {
  id: string;
  timestamp: number;
  mode: 'fatigue' | 'smoking';
  prediction: number;
  fatigueScore?: number;
  alertLevel?: 'SAFE' | 'WARNING' | 'CRITICAL' | 'ESCALATION';
  frameIndex?: number;
  microFatigueCount?: number;
  smokingEventCount?: number;
  lightingCondition?: 'Normal' | 'Low';
  enhancementActive?: boolean;
  snapshotCaptured?: boolean;
  snapshotTimestamp?: number;
}

export interface SessionMetrics {
  sessionId: string;
  startTime: number;
  endTime?: number;
  mode: 'fatigue' | 'smoking';
  totalFrames: number;
  events: DetectionEvent[];
  avgScore: number;
  maxScore: number;
  alerts: Array<{
    timestamp: number;
    level: 'WARNING' | 'CRITICAL' | 'ESCALATION';
    reason: string;
  }>;
  microFatigueStats?: {
    totalCount: number;
    severity: 'Low' | 'Medium' | 'High';
  };
  smokingStats?: {
    totalCount: number;
    frequency: 'Low' | 'Medium' | 'High';
  };
  snapshotStats?: {
    totalSnapshots: number;
    lastSnapshotTime?: number;
  };
  lightingStats?: {
    normalCount: number;
    lowCount: number;
    enhancementActivatedCount: number;
  };
}

interface SessionStore {
  sessionId: string;
  events: DetectionEvent[];
  metrics: SessionMetrics | null;
  performanceMetrics: {
    fps: number;
    apiLatency: number;
    processingTime: number;
  };
  
  initSession: (mode: 'fatigue' | 'smoking') => void;
  addEvent: (event: Omit<DetectionEvent, 'id'>) => void;
  updatePerformance: (fps: number, apiLatency: number, processingTime: number) => void;
  endSession: () => SessionMetrics | null;
  clearSession: () => void;
  getSessionData: () => SessionMetrics | null;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessionId: '',
  events: [],
  metrics: null,
  performanceMetrics: {
    fps: 0,
    apiLatency: 0,
    processingTime: 0,
  },

  initSession: (mode: 'fatigue' | 'smoking') => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    set({
      sessionId,
      events: [],
      metrics: {
        sessionId,
        startTime: Date.now(),
        mode,
        totalFrames: 0,
        events: [],
        avgScore: 0,
        maxScore: 0,
        alerts: [],
      },
    });
  },

  addEvent: (event: Omit<DetectionEvent, 'id'>) => {
    const id = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullEvent: DetectionEvent = { ...event, id };

    set((state) => {
      const newEvents = [...state.events, fullEvent];
      
      // Calculate micro-fatigue stats (if fatigue mode)
      let microFatigueStats = state.metrics?.microFatigueStats;
      if (state.metrics?.mode === 'fatigue' && fullEvent.microFatigueCount !== undefined) {
        const totalMicroFatigue = newEvents.reduce((sum, e) => sum + (e.microFatigueCount || 0), 0);
        let severity: 'Low' | 'Medium' | 'High' = 'Low';
        if (totalMicroFatigue >= 5) severity = 'High';
        else if (totalMicroFatigue >= 3) severity = 'Medium';
        microFatigueStats = { totalCount: totalMicroFatigue, severity };
      }

      // Calculate smoking stats (if smoking mode)
      let smokingStats = state.metrics?.smokingStats;
      if (state.metrics?.mode === 'smoking' && fullEvent.smokingEventCount !== undefined) {
        const totalSmokingEvents = newEvents.reduce((sum, e) => sum + (e.smokingEventCount || 0), 0);
        let frequency: 'Low' | 'Medium' | 'High' = 'Low';
        if (totalSmokingEvents >= 5) frequency = 'High';
        else if (totalSmokingEvents >= 3) frequency = 'Medium';
        smokingStats = { totalCount: totalSmokingEvents, frequency };
      }

      // Calculate snapshot stats
      let snapshotStats = state.metrics?.snapshotStats || { totalSnapshots: 0 };
      if (fullEvent.snapshotCaptured) {
        snapshotStats = {
          totalSnapshots: (snapshotStats.totalSnapshots || 0) + 1,
          lastSnapshotTime: fullEvent.snapshotTimestamp,
        };
      }

      // Calculate lighting stats
      let lightingStats = state.metrics?.lightingStats || { normalCount: 0, lowCount: 0, enhancementActivatedCount: 0 };
      if (fullEvent.lightingCondition) {
        if (fullEvent.lightingCondition === 'Normal') {
          lightingStats.normalCount++;
        } else if (fullEvent.lightingCondition === 'Low') {
          lightingStats.lowCount++;
        }
        if (fullEvent.enhancementActive) {
          lightingStats.enhancementActivatedCount++;
        }
      }

      const newMetrics = state.metrics
        ? {
            ...state.metrics,
            events: newEvents,
            totalFrames: newEvents.length,
            avgScore: newEvents.reduce((sum, e) => sum + (e.prediction || 0), 0) / newEvents.length,
            maxScore: Math.max(...newEvents.map((e) => e.prediction || 0), 0),
            microFatigueStats,
            smokingStats,
            snapshotStats,
            lightingStats,
          }
        : null;

      return {
        events: newEvents,
        metrics: newMetrics,
      };
    });
  },

  updatePerformance: (fps: number, apiLatency: number, processingTime: number) => {
    set({
      performanceMetrics: {
        fps: Math.round(fps),
        apiLatency: Math.round(apiLatency),
        processingTime: Math.round(processingTime),
      },
    });
  },

  endSession: () => {
    const state = get();
    if (!state.metrics) return null;

    const endedMetrics: SessionMetrics = {
      ...state.metrics,
      endTime: Date.now(),
    };

    set({ metrics: endedMetrics });
    return endedMetrics;
  },

  clearSession: () => {
    set({
      sessionId: '',
      events: [],
      metrics: null,
      performanceMetrics: {
        fps: 0,
        apiLatency: 0,
        processingTime: 0,
      },
    });
  },

  getSessionData: () => {
    return get().metrics;
  },
}));
