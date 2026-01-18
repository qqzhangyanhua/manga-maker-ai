import * as React from "react"
import { cn } from "@/lib/utils"

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean
  variant?: "default" | "flat"
}

export function GlassCard({ 
  className, 
  hoverEffect = true, 
  variant = "default",
  ...props 
}: GlassCardProps) {
  return (
    <div
      className={cn(
        // Base styles
        "relative overflow-hidden rounded-xl border border-zinc-800 transition-all duration-300",
        
        // Background & Blur
        "bg-zinc-900/50 backdrop-blur-sm",
        
        // Variants
        variant === "default" && "shadow-sm",
        
        // Hover Effects
        hoverEffect && "hover:border-primary/50 hover:bg-zinc-900 hover:shadow-glow/20",
        
        className
      )}
      {...props}
    />
  )
}
