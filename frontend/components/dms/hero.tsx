"use client"

import { Cpu, ShieldCheck, Zap } from "lucide-react"

export function Hero() {
  return (
    <div className="text-center space-y-6">
      {/* Logo / Title */}
      <div className="space-y-2">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-4">
          <ShieldCheck className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight text-balance">
          Driver Monitoring System
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
          AI-powered Fatigue & Smoking Detection for safer driving
        </p>
      </div>

      {/* Feature badges */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/80 text-sm text-muted-foreground">
          <Cpu className="w-4 h-4 text-primary" />
          CNN-Based Deep Learning
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/80 text-sm text-muted-foreground">
          <Zap className="w-4 h-4 text-primary" />
          Real-Time Detection
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/80 text-sm text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-primary" />
          ADAS Compatible
        </div>
      </div>
    </div>
  )
}
