"use client"

import { cn } from "@/lib/utils"
import { Brain, CigaretteOff } from "lucide-react"

interface ModeCardProps {
  mode: "fatigue" | "smoking"
  isSelected: boolean
  onSelect: () => void
}

export function ModeCard({ mode, isSelected, onSelect }: ModeCardProps) {
  const isFatigue = mode === "fatigue"
  
  return (
    <button
      onClick={onSelect}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border-2 transition-all duration-300 cursor-pointer w-full",
        "bg-card hover:bg-secondary/50",
        isSelected 
          ? "border-primary shadow-[0_0_30px_rgba(59,130,246,0.4)] scale-[1.02]" 
          : "border-border hover:border-primary/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]"
      )}
    >
      {/* Glow effect */}
      <div className={cn(
        "absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300",
        "bg-gradient-to-br from-primary/10 to-transparent",
        isSelected ? "opacity-100" : "group-hover:opacity-50"
      )} />
      
      {/* Icon */}
      <div className={cn(
        "relative z-10 p-4 rounded-full transition-all duration-300",
        isSelected 
          ? "bg-primary text-primary-foreground" 
          : "bg-secondary text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
      )}>
        {isFatigue ? (
          <Brain className="w-12 h-12" />
        ) : (
          <CigaretteOff className="w-12 h-12" />
        )}
      </div>
      
      {/* Title */}
      <div className="relative z-10 text-center">
        <h3 className="text-xl font-semibold text-foreground mb-1">
          {isFatigue ? "Fatigue Detection" : "Smoking Detection"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isFatigue 
            ? "Detect drowsiness and fatigue states" 
            : "Identify smoking behavior while driving"}
        </p>
      </div>
      
      {/* Select button */}
      <div className={cn(
        "relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-all duration-300",
        isSelected 
          ? "bg-primary text-primary-foreground" 
          : "bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground"
      )}>
        {isSelected ? "Selected" : "Select Mode"}
      </div>
    </button>
  )
}
