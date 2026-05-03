"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Camera, ImageIcon, FolderOpen, ArrowLeft, Brain, CigaretteOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { WebcamTab } from "./webcam-tab"
import { ImageUploadTab } from "./image-upload-tab"
import { BatchUploadTab } from "./batch-upload-tab"

interface DetectionPanelProps {
  mode: "fatigue" | "smoking"
  onReset: () => void
  backendUrl: string
}

export function DetectionPanel({ mode, onReset, backendUrl }: DetectionPanelProps) {
  const [activeTab, setActiveTab] = useState("webcam")
  
  const isFatigue = mode === "fatigue"
  
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            "bg-primary/20"
          )}>
            {isFatigue ? (
              <Brain className="w-5 h-5 text-primary" />
            ) : (
              <CigaretteOff className="w-5 h-5 text-primary" />
            )}
          </div>
          <div>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-primary/20 text-primary">
              Mode: {isFatigue ? "Fatigue Detection" : "Smoking Detection"}
            </span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onReset} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Change Mode
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-auto p-1">
          <TabsTrigger 
            value="webcam" 
            className="gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Webcam</span>
          </TabsTrigger>
          <TabsTrigger 
            value="image"
            className="gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <ImageIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Upload Image</span>
          </TabsTrigger>
          <TabsTrigger 
            value="batch"
            className="gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <FolderOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Batch Mode</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="webcam" className="mt-0">
            <WebcamTab mode={mode} backendUrl={backendUrl} />
          </TabsContent>
          <TabsContent value="image" className="mt-0">
            <ImageUploadTab mode={mode} backendUrl={backendUrl} />
          </TabsContent>
          <TabsContent value="batch" className="mt-0">
            <BatchUploadTab mode={mode} backendUrl={backendUrl} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
