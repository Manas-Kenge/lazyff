import React, { useState, useEffect, useMemo } from "react"
import { useTheme } from "../../context/theme.tsx"
import { createFrames, createColors, type KnightRiderOptions } from "./spinner.ts"

export interface SpinnerProps {
  /** Width of spinner in characters (default: 8) */
  width?: number
  /** Animation interval in ms (default: 80) */
  interval?: number
  /** Custom color override (uses theme.primary by default) */
  color?: string
}

/**
 * Animated Knight Rider style spinner component
 * Uses block characters with a scanning trail effect
 */
export function Spinner({ width = 8, interval = 80, color }: SpinnerProps) {
  const { theme } = useTheme()
  const [frameIndex, setFrameIndex] = useState(0)

  // Generate frames once with blocks style, memoized to avoid recalculation
  const { frames, colorGenerator } = useMemo(() => {
    const spinnerColor = color ?? theme.primary
    const options: KnightRiderOptions = {
      width,
      style: "blocks",
      color: spinnerColor,
      holdStart: 15,
      holdEnd: 5,
      trailSteps: 4,
      inactiveFactor: 0.15,
      enableFading: true,
      minAlpha: 0.1,
    }
    return {
      frames: createFrames(options),
      colorGenerator: createColors(options),
    }
  }, [width, color, theme.primary])

  // Animate through frames
  useEffect(() => {
    const timer = setInterval(() => {
      setFrameIndex((i) => (i + 1) % frames.length)
    }, interval)
    return () => clearInterval(timer)
  }, [frames.length, interval])

  const currentFrame = frames[frameIndex] ?? ""

  // Render each character with its color from the color generator
  const chars = currentFrame.split("")

  return (
    <box flexDirection="row">
      {chars.map((char, charIndex) => {
        const rgba = colorGenerator(frameIndex, charIndex, frames.length, width)
        // Convert RGBA to hex color string for the text component
        const r = Math.round(rgba.r * 255)
        const g = Math.round(rgba.g * 255)
        const b = Math.round(rgba.b * 255)
        const hexColor = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`

        return (
          <text key={charIndex} fg={hexColor}>
            {char}
          </text>
        )
      })}
    </box>
  )
}
