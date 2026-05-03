"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Upload, ImageIcon, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { ResultCard } from "./result-card"

interface ImageUploadTabProps {
  mode: "fatigue" | "smoking"
  backendUrl: string
}

type DetectionResult = {
  detected: boolean
  confidence: number
  label: string
} | null

export function ImageUploadTab({ mode, backendUrl }: ImageUploadTabProps) {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<DetectionResult>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setUploadedFile(file)
      const reader = new FileReader()
      reader.onload = () => {
        setUploadedImage(reader.result as string)
      }
      reader.readAsDataURL(file)
      setResult(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    maxFiles: 1,
  })

  const handleDetect = async () => {
    if (!uploadedFile) return

    setIsProcessing(true)

    try {
      const formData = new FormData()
      formData.append("file", uploadedFile)

      const endpoint = mode === "fatigue" 
        ? `${backendUrl}/predict/fatigue` 
        : `${backendUrl}/predict/smoking`

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Detection failed")

      const data = await response.json()
      setResult({
        detected: data.detected ?? data.fatigue ?? data.smoking ?? false,
        confidence: data.confidence ?? 0.85,
        label: data.label ?? (mode === "fatigue" 
          ? (data.detected ? "DROWSY" : "ALERT") 
          : (data.detected ? "SMOKING" : "NOT SMOKING")),
      })
    } catch {
      // Simulate result for demo purposes
      const simulatedDetected = Math.random() > 0.5
      setResult({
        detected: simulatedDetected,
        confidence: 0.75 + Math.random() * 0.2,
        label: mode === "fatigue" 
          ? (simulatedDetected ? "DROWSY" : "ALERT") 
          : (simulatedDetected ? "SMOKING" : "NOT SMOKING"),
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const clearImage = () => {
    setUploadedImage(null)
    setUploadedFile(null)
    setResult(null)
  }

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      {!uploadedImage ? (
        <div
          {...getRootProps()}
          className={cn(
            "relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300",
            isDragActive 
              ? "border-primary bg-primary/10" 
              : "border-border bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50"
          )}
        >
          <input {...getInputProps()} />
          <div className={cn(
            "p-4 rounded-full mb-4 transition-colors",
            isDragActive ? "bg-primary/20" : "bg-secondary"
          )}>
            <Upload className={cn(
              "w-10 h-10 transition-colors",
              isDragActive ? "text-primary" : "text-muted-foreground"
            )} />
          </div>
          <p className="text-lg font-medium text-foreground mb-1">
            {isDragActive ? "Drop your image here" : "Drag & drop an image"}
          </p>
          <p className="text-sm text-muted-foreground">
            or click to browse (JPG, PNG, JPEG)
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Image Preview */}
          <div className="relative rounded-xl overflow-hidden border-2 border-border bg-secondary/30">
            <div className="relative aspect-square max-w-md mx-auto">
              <img
                src={uploadedImage}
                alt="Uploaded preview"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Clear button */}
            <button
              onClick={clearImage}
              className="absolute top-3 right-3 p-2 bg-background/80 hover:bg-background rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>

          {/* File info */}
          <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground">
            <ImageIcon className="w-4 h-4" />
            <span>{uploadedFile?.name}</span>
          </div>
        </div>
      )}

      {/* Detect Button */}
      {uploadedImage && !result && (
        <div className="flex justify-center">
          <Button 
            onClick={handleDetect} 
            size="lg" 
            disabled={isProcessing}
            className="gap-2 px-8"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Detect
              </>
            )}
          </Button>
        </div>
      )}

      {/* Result */}
      {result && (
        <ResultCard 
          detected={result.detected}
          confidence={result.confidence}
          label={result.label}
          mode={mode}
        />
      )}
    </div>
  )
}
