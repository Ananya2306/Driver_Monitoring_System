"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import Webcam from "react-webcam"
import { Button } from "@/components/ui/button"
import { Camera, Square, AlertTriangle, CheckCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ResultCard } from "./result-card"
import { AnalyticsDashboard } from "./analytics-dashboard"
import { AlertHistory } from "./alert-history"
import { PerformanceMonitor } from "./performance-monitor"
import { useSessionStore } from "@/lib/stores/session-store"
import { FatigueScoringEngine } from "@/lib/scoring/fatigue-scorer"
import { useAudioAlert } from "@/hooks/use-audio-alert"

interface WebcamTabProps {
  mode: "fatigue" | "smoking"
  backendUrl: string
}

type DetectionResult = {
  detected: boolean
  confidence: number
  label: string
  microFatigueCount?: number
  smokingEventCount?: number
  lightingCondition?: "Normal" | "Low"
  enhancementActive?: boolean
  snapshotTimestamp?: number
} | null

export function WebcamTab({ mode, backendUrl }: WebcamTabProps) {
  const webcamRef = useRef<Webcam>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const frameCountRef = useRef(0)
  const startTimeRef = useRef<number | null>(null)
  
  const [isStreaming, setIsStreaming] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<DetectionResult>(null)
  const [showAnalytics, setShowAnalytics] = useState(false)
  
  const sessionStore = useSessionStore()
  const scoringEngineRef = useRef<FatigueScoringEngine | null>(null)
  const { evaluate: evalAlert, alertState, consecutiveWarnings, escalationThreshold } = useAudioAlert()
  
  // Initialize scoring engine only
  useEffect(() => {
    scoringEngineRef.current = new FatigueScoringEngine()
  }, [])

  const captureAndDetect = useCallback(async () => {
    if (!webcamRef.current) return

    const imageSrc = webcamRef.current.getScreenshot()
    if (!imageSrc) return

    setIsProcessing(true)
    const apiStartTime = performance.now()

    try {
      // Convert base64 to blob
      const res = await fetch(imageSrc)
      const blob = await res.blob()
      const formData = new FormData()
      formData.append("file", blob, "capture.jpg")

      const endpoint = mode === "fatigue" 
        ? `${backendUrl}/predict/fatigue` 
        : `${backendUrl}/predict/smoking`

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Detection failed")

      const data = await response.json()
      const detected = data.detected ?? data.fatigue ?? data.smoking ?? false
      const confidence = data.confidence ?? 0.85

      // KEY FIX: pass drowsiness probability, not raw confidence
      // If NOT drowsy with 90% confidence → drowsyProb = 0.10 (low, safe)
      // If Drowsy with 90% confidence → drowsyProb = 0.90 (high, alert)
      const drowsyProb = detected ? confidence : (1 - confidence)
      
      // Extract new metrics from backend response
      const microFatigueCount = data.micro_fatigue_count ?? data.microFatigueCount ?? 0
      const smokingEventCount = data.smoking_events ?? data.smokingEventCount ?? 0
      const lightingCondition = data.lighting_condition ?? data.lightingCondition ?? 'Normal'
      const enhancementActive = data.enhancement_active ?? data.enhancementActive ?? false
      const snapshotCaptured = data.snapshot_captured ?? data.snapshotCaptured ?? false
      const snapshotTimestamp = data.snapshot_timestamp ?? data.snapshotTimestamp
      
      // Only run scoring + alerts in fatigue mode
      let fatigueScore = 0
      let alertLevel = undefined
      if (mode === "fatigue" && scoringEngineRef.current) {
        const scoringResult = scoringEngineRef.current.addFrame(drowsyProb)
        fatigueScore = scoringResult.score
        alertLevel = scoringResult.state
        // FIX: pass detected so counter resets when person is awake
        evalAlert(fatigueScore, frameCountRef.current, "fatigue", detected)
      }
      // Smoking: only alert when actually detected
      if (mode === "smoking" && detected) {
        evalAlert(40, frameCountRef.current, "smoking", true)
      }

      setResult({
        detected,
        confidence,
        label: mode === "fatigue" 
          ? (detected ? "DROWSY" : "ALERT") 
          : (detected ? "SMOKING" : "NOT SMOKING"),
        microFatigueCount: mode === "fatigue" ? microFatigueCount : undefined,
        smokingEventCount: mode === "smoking" ? smokingEventCount : undefined,
        lightingCondition: lightingCondition as "Normal" | "Low",
        enhancementActive,
        snapshotTimestamp: snapshotCaptured ? snapshotTimestamp || Date.now() : undefined,
      })

      // Record metrics in session store
      const apiLatency = performance.now() - apiStartTime
      sessionStore.addEvent({
        timestamp: Date.now(),
        mode,
        prediction: confidence,
        fatigueScore: mode === "fatigue" ? fatigueScore : undefined,
        alertLevel: mode === "fatigue" ? alertLevel : undefined,
        frameIndex: frameCountRef.current,
        microFatigueCount: mode === "fatigue" ? microFatigueCount : undefined,
        smokingEventCount: mode === "smoking" ? smokingEventCount : undefined,
        lightingCondition: lightingCondition as "Normal" | "Low",
        enhancementActive,
        snapshotCaptured,
        snapshotTimestamp: snapshotCaptured ? snapshotTimestamp || Date.now() : undefined,
      })
      
      sessionStore.updatePerformance(30, apiLatency, 0)
      frameCountRef.current++
    } catch {
      // Simulate result for demo purposes when backend is unavailable
      const simulatedDetected = Math.random() > 0.5           // 50/50 — was biased to 60% drowsy
      const simulatedConfidence = 0.55 + Math.random() * 0.30 // 0.55–0.85 — was always 0.75–0.95
      // KEY FIX: pass drowsy probability not raw confidence
      const simulatedDrowsyProb = simulatedDetected
        ? simulatedConfidence
        : (1 - simulatedConfidence)
      
      // Realistic simulated metrics
      const simulatedMicroFatigue = Math.floor(Math.random() * 3)
      const simulatedSmokingEvents = Math.floor(Math.random() * 3)
      const simulatedLighting = Math.random() > 0.3 ? 'Normal' : 'Low'
      const simulatedEnhancementActive = simulatedLighting === 'Low'
      const simulatedSnapshotCaptured = false // don't spam snapshots in simulation
      
      let fatigueScore = 0
      let alertLevel = undefined
      if (mode === "fatigue" && scoringEngineRef.current) {
        const scoringResult = scoringEngineRef.current.addFrame(simulatedDrowsyProb)
        fatigueScore = scoringResult.score
        alertLevel = scoringResult.state
        evalAlert(fatigueScore, frameCountRef.current, "fatigue", simulatedDetected)
      }
      if (mode === "smoking" && simulatedDetected) {
        evalAlert(40, frameCountRef.current, "smoking", true)
      }
      
      setResult({
        detected: simulatedDetected,
        confidence: simulatedConfidence,
        label: mode === "fatigue" 
          ? (simulatedDetected ? "DROWSY" : "ALERT") 
          : (simulatedDetected ? "SMOKING" : "NOT SMOKING"),
        microFatigueCount: mode === "fatigue" ? simulatedMicroFatigue : undefined,
        smokingEventCount: mode === "smoking" ? simulatedSmokingEvents : undefined,
        lightingCondition: simulatedLighting as "Normal" | "Low",
        enhancementActive: simulatedEnhancementActive,
        snapshotTimestamp: simulatedSnapshotCaptured ? Date.now() : undefined,
      })

      sessionStore.addEvent({
        timestamp: Date.now(),
        mode,
        prediction: simulatedConfidence,
        fatigueScore: mode === "fatigue" ? fatigueScore : undefined,
        alertLevel: mode === "fatigue" ? alertLevel : undefined,
        frameIndex: frameCountRef.current,
        microFatigueCount: mode === "fatigue" ? simulatedMicroFatigue : undefined,
        smokingEventCount: mode === "smoking" ? simulatedSmokingEvents : undefined,
        lightingCondition: simulatedLighting as "Normal" | "Low",
        enhancementActive: simulatedEnhancementActive,
        snapshotCaptured: simulatedSnapshotCaptured,
        snapshotTimestamp: simulatedSnapshotCaptured ? Date.now() : undefined,
      })
      
      frameCountRef.current++
    } finally {
      setIsProcessing(false)
    }
  }, [mode, backendUrl, sessionStore, evalAlert])

  const startDetection = useCallback(() => {
    sessionStore.initSession(mode)
    startTimeRef.current = Date.now()
    frameCountRef.current = 0
    setIsStreaming(true)
    // Capture and detect every 2 seconds
    intervalRef.current = setInterval(captureAndDetect, 2000)
    // Initial capture
    captureAndDetect()
  }, [captureAndDetect, mode, sessionStore])

  const stopDetection = useCallback(() => {
    setIsStreaming(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    sessionStore.endSession()
    setShowAnalytics(true)
  }, [sessionStore])

  return (
    <div className="space-y-6">
      {/* ── Full-screen alert flash overlay ── */}
      {alertState && (
        <div className={cn(
          "fixed inset-0 pointer-events-none z-50 animate-in fade-in duration-100",
          alertState.level === "ESCALATION"
            ? "bg-orange-600/25 border-4 border-orange-500"
            : alertState.level === "CRITICAL"
              ? "bg-red-600/20 border-4 border-red-600"
              : alertState.mode === "smoking"
                ? "bg-amber-500/15 border-4 border-amber-500"
                : "bg-yellow-400/15 border-4 border-yellow-400"
        )}>
          <div className={cn(
            "absolute top-0 left-0 right-0 py-3 px-6 flex flex-col items-center justify-center gap-1 text-white font-bold",
            alertState.level === "ESCALATION"
              ? "bg-orange-600/95"
              : alertState.level === "CRITICAL"
                ? "bg-red-600/90"
                : alertState.mode === "smoking"
                  ? "bg-amber-500/90"
                  : "bg-yellow-500/90"
          )}>
            <div className="flex items-center gap-3 text-lg">
              <span className="animate-pulse">
                {alertState.level === "ESCALATION" ? "🚨" : alertState.mode === "smoking" ? "🚬" : "⚠️"}
              </span>
              {/* Mode-aware English message */}
              {alertState.mode === "smoking"
                ? alertState.level === "CRITICAL"
                  ? "Danger! Stop smoking while driving immediately."
                  : "Alert! Smoking detected. Put out the cigarette."
                : alertState.level === "ESCALATION"
                  ? "Emergency! Park the vehicle aside immediately."
                  : alertState.level === "CRITICAL"
                    ? "Danger! Do not sleep while driving."
                    : "Warning! Do not fall asleep. Stay alert."}
              <span className="animate-pulse">
                {alertState.level === "ESCALATION" ? "🚨" : alertState.mode === "smoking" ? "🚬" : "⚠️"}
              </span>
            </div>
            {/* Mode-aware Hindi message */}
            <div className="text-sm font-semibold opacity-90">
              {alertState.mode === "smoking"
                ? alertState.level === "CRITICAL"
                  ? "Khatre mein hain! Gaadi chalate waqt smoking band karo."
                  : "Savdhaan! Smoking detect hui. Cigarette bujhao abhi."
                : alertState.level === "ESCALATION"
                  ? "Tatkal! Gaadi ko side mein park karein abhi."
                  : alertState.level === "CRITICAL"
                    ? "Khatre mein hain! Gaadi chalate waqt mat soye."
                    : "Khabardar! Neend mat lo. Savdhaan rahein."}
            </div>
          </div>
        </div>
      )}

      {/* ── Escalation Progress Bar (visible during streaming) ── */}
      {isStreaming && mode === "fatigue" && consecutiveWarnings > 0 && (
        <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-3 space-y-1.5">
          <div className="flex justify-between items-center text-sm">
            <span className="text-yellow-400 font-semibold flex items-center gap-1.5">
              ⚠️ Warning Escalation
            </span>
            <span className="text-yellow-300 font-bold">
              {consecutiveWarnings} / {escalationThreshold}
              {consecutiveWarnings >= escalationThreshold - 1 ? " — CRITICAL IMMINENT" : ""}
            </span>
          </div>
          <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                consecutiveWarnings >= escalationThreshold - 1
                  ? "bg-red-500 animate-pulse"
                  : "bg-yellow-400"
              )}
              style={{ width: `${Math.min(100, (consecutiveWarnings / escalationThreshold) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            After {escalationThreshold} consecutive warnings, alert auto-escalates to CRITICAL
          </p>
        </div>
      )}
      {/* Webcam Preview */}
      <div className="relative rounded-xl overflow-hidden border-2 border-border bg-secondary/30">
        <div className={cn(
          "relative aspect-video",
          isStreaming && "animate-pulse-glow"
        )}>
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              width: 1280,
              height: 720,
              facingMode: "user",
            }}
            className="w-full h-full object-cover"
          />
          
          {/* Scanning overlay when active */}
          {isStreaming && (
            <>
              <div className="absolute inset-0 border-4 border-primary/30 rounded-lg pointer-events-none" />
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-x-0 h-1 bg-gradient-to-b from-primary/50 to-transparent animate-scan-line" />
              </div>
            </>
          )}

          {/* Live indicator */}
          {isStreaming && (
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-destructive/90 rounded-full">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-xs font-medium text-white">LIVE</span>
            </div>
          )}

          {/* Processing indicator */}
          {isProcessing && (
            <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-primary/90 rounded-full">
              <Loader2 className="w-3 h-3 text-white animate-spin" />
              <span className="text-xs font-medium text-white">Analyzing...</span>
            </div>
          )}

          {/* Real-time result overlay */}
          {isStreaming && result && (
            <div className={cn(
              "absolute bottom-4 left-4 right-4 flex items-center justify-between p-4 rounded-lg backdrop-blur-sm",
              result.detected 
                ? "bg-destructive/80 text-destructive-foreground" 
                : "bg-success/80 text-success-foreground"
            )}>
              <div className="flex items-center gap-3">
                {result.detected ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <CheckCircle className="w-6 h-6" />
                )}
                <span className="text-lg font-bold">{result.label}</span>
              </div>
              <span className="text-sm font-medium opacity-90">
                {(result.confidence * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4">
        {!isStreaming ? (
          <Button 
            onClick={startDetection} 
            size="lg" 
            className="gap-2 px-8"
          >
            <Camera className="w-5 h-5" />
            Start Detection
          </Button>
        ) : (
          <Button 
            onClick={stopDetection} 
            size="lg" 
            variant="destructive"
            className="gap-2 px-8"
          >
            <Square className="w-5 h-5" />
            Stop
          </Button>
        )}
      </div>

      {/* Performance Monitor */}
      {isStreaming && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PerformanceMonitor />
          <AlertHistory maxItems={5} />
        </div>
      )}

      {/* Analytics after session */}
      {showAnalytics && !isStreaming && (
        <div className="space-y-6">
          <Button
            variant="outline"
            onClick={() => setShowAnalytics(false)}
            className="w-full"
          >
            Start New Session
          </Button>
          <AnalyticsDashboard mode={mode} isActive={false} />
        </div>
      )}

      {/* Result Card (when not streaming) */}
      {!isStreaming && !showAnalytics && result && (
        <ResultCard 
          detected={result.detected}
          confidence={result.confidence}
          label={result.label}
          mode={mode}
          microFatigueCount={result.microFatigueCount}
          smokingEventCount={result.smokingEventCount}
          lightingCondition={result.lightingCondition}
          enhancementActive={result.enhancementActive}
          snapshotTimestamp={result.snapshotTimestamp}
        />
      )}
    </div>
  )
}
