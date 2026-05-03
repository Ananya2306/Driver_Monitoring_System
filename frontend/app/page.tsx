"use client"

import { useState, useRef, useEffect } from "react"
import { Hero } from "@/components/dms/hero"
import { ModeCard } from "@/components/dms/mode-card"
import { DetectionPanel } from "@/components/dms/detection-panel"
import { Footer } from "@/components/dms/footer"
import { AnalyticsDashboard } from "@/components/dms/analytics-dashboard"
import { SessionSummary } from "@/components/dms/session-summary"

type Mode = "fatigue" | "smoking" | null

// Backend URL - change this to your Flask/FastAPI server URL
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

export default function HomePage() {
  const [selectedMode, setSelectedMode] = useState<Mode>(null)
  const [showPanel, setShowPanel] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const dashboardRef = useRef<HTMLDivElement>(null)

  const handleModeSelect = (mode: "fatigue" | "smoking") => {
    setSelectedMode(mode)
    setShowPanel(true)
  }

  const handleReset = () => {
    setShowPanel(false)
    setSelectedMode(null)
    setShowDashboard(false)
  }

  // Smooth scroll to panel when mode is selected
  useEffect(() => {
    if (showPanel && panelRef.current) {
      setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 100)
    }
  }, [showPanel])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-12 sm:py-16 lg:py-20">
          <div className="container mx-auto px-4">
            <Hero />
          </div>
        </section>

        {/* Mode Selection */}
        <section className="py-8 sm:py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-center text-lg font-medium text-muted-foreground mb-6">
                Select Detection Mode
              </h2>
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                <ModeCard
                  mode="fatigue"
                  isSelected={selectedMode === "fatigue"}
                  onSelect={() => handleModeSelect("fatigue")}
                />
                <ModeCard
                  mode="smoking"
                  isSelected={selectedMode === "smoking"}
                  onSelect={() => handleModeSelect("smoking")}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Detection Panel */}
        {showPanel && selectedMode && (
          <section ref={panelRef} className="py-8 sm:py-12 border-t border-border bg-card/50">
            <div className="container mx-auto px-4">
              <DetectionPanel
                mode={selectedMode}
                onReset={handleReset}
                backendUrl={BACKEND_URL}
              />
            </div>
          </section>
        )}

        {/* Dashboard and Reports Section */}
        {showPanel && selectedMode && (
          <section ref={dashboardRef} className="py-8 sm:py-12 border-t border-border">
            <div className="container mx-auto px-4 space-y-8">
              {/* Analytics Dashboard */}
              <div>
                <h2 className="text-2xl font-bold mb-6">Session Analytics</h2>
                <AnalyticsDashboard mode={selectedMode} isActive={true} />
              </div>

              {/* Session Summary and Reports */}
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <SessionSummary />
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
