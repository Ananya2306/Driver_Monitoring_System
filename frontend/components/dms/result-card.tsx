"use client"

import { Progress } from "@/components/ui/progress"
import { AlertTriangle, CheckCircle, Brain, CigaretteOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface ResultCardProps {
  detected: boolean
  confidence: number
  label: string
  mode: "fatigue" | "smoking"
  microFatigueCount?: number
  smokingEventCount?: number
  lightingCondition?: "Normal" | "Low"
  enhancementActive?: boolean
  snapshotTimestamp?: number
}

export function ResultCard({ detected, confidence, label, mode, microFatigueCount, smokingEventCount, lightingCondition, enhancementActive, snapshotTimestamp }: ResultCardProps) {
  const confidencePercent = Math.round(confidence * 100)
  
  const formatSnapshotTime = (timestamp?: number) => {
    if (!timestamp) return null
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }
  
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border-2 p-6 transition-all duration-500 animate-in slide-in-from-bottom-4 fade-in",
      detected 
        ? "border-destructive/50 bg-destructive/10" 
        : "border-success/50 bg-success/10"
    )}>
      {/* Background glow */}
      <div className={cn(
        "absolute inset-0 opacity-20",
        detected 
          ? "bg-gradient-to-br from-destructive/30 to-transparent" 
          : "bg-gradient-to-br from-success/30 to-transparent"
      )} />
      
      <div className="relative z-10 flex flex-col items-center text-center gap-4">
        {/* Icon */}
        <div className={cn(
          "p-4 rounded-full",
          detected ? "bg-destructive/20" : "bg-success/20"
        )}>
          {detected ? (
            <AlertTriangle className={cn(
              "w-12 h-12",
              detected ? "text-destructive" : "text-success"
            )} />
          ) : (
            <CheckCircle className={cn(
              "w-12 h-12",
              detected ? "text-destructive" : "text-success"
            )} />
          )}
        </div>
        
        {/* Label */}
        <div>
          <h3 className={cn(
            "text-3xl font-bold mb-1",
            detected ? "text-destructive" : "text-success"
          )}>
            {label}
          </h3>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
            {mode === "fatigue" ? (
              <Brain className="w-4 h-4" />
            ) : (
              <CigaretteOff className="w-4 h-4" />
            )}
            {mode === "fatigue" ? "Fatigue Detection" : "Smoking Detection"}
          </p>
        </div>

        {/* Confidence Bar */}
        <div className="w-full max-w-xs space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Confidence</span>
            <span className={cn(
              "font-semibold",
              detected ? "text-destructive" : "text-success"
            )}>
              {confidencePercent}%
            </span>
          </div>
          <Progress 
            value={confidencePercent} 
            className={cn(
              "h-3",
              detected 
                ? "[&>[data-slot=progress-indicator]]:bg-destructive" 
                : "[&>[data-slot=progress-indicator]]:bg-success"
            )}
          />
        </div>

        {/* Additional Metrics */}
        <div className="w-full grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border/30">
          {mode === "fatigue" && microFatigueCount !== undefined && (
            <>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Micro-Fatigue Events</p>
                <p className="text-lg font-bold">{microFatigueCount}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Severity</p>
                <p className={cn(
                  "text-lg font-bold",
                  microFatigueCount >= 5 ? "text-destructive" :
                  microFatigueCount >= 3 ? "text-yellow-500" :
                  "text-success"
                )}>
                  {microFatigueCount >= 5 ? "High" : microFatigueCount >= 3 ? "Medium" : "Low"}
                </p>
              </div>
            </>
          )}

          {mode === "smoking" && smokingEventCount !== undefined && (
            <>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Smoking Events</p>
                <p className="text-lg font-bold">{smokingEventCount}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Frequency</p>
                <p className={cn(
                  "text-lg font-bold",
                  smokingEventCount >= 5 ? "text-destructive" :
                  smokingEventCount >= 3 ? "text-yellow-500" :
                  "text-success"
                )}>
                  {smokingEventCount >= 5 ? "High" : smokingEventCount >= 3 ? "Medium" : "Low"}
                </p>
              </div>
            </>
          )}

          {lightingCondition && (
            <>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Lighting</p>
                <p className={cn(
                  "text-lg font-bold",
                  lightingCondition === "Low" ? "text-yellow-500" : "text-success"
                )}>
                  {lightingCondition}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Enhancement</p>
                <p className="text-lg font-bold">{enhancementActive ? "ON" : "OFF"}</p>
              </div>
            </>
          )}

          {snapshotTimestamp && (
            <div className="col-span-2 text-center p-2 rounded-lg bg-primary/10 border border-primary/30">
              <p className="text-xs text-muted-foreground mb-1">Snapshot Captured</p>
              <p className="text-sm font-semibold">{formatSnapshotTime(snapshotTimestamp)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
