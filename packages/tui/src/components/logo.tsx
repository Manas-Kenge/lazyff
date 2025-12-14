import React from "react"
import { TextAttributes } from "@opentui/core"
import { useTheme } from "../context/theme"

const LOGO_LEFT = [
  `█▀▀▀ █▀▀▀ █   █   █`,
  `█▀▀  █▀▀  █   █   █`,
  `▀    ▀    ▀▀▀ ▀▀▀ ▀`
]

const LOGO_RIGHT = [
  `█▀▀█ █▀▀█ █▀▀█`,
  `█▄▄▀ █▄▄█ █░░█`,
  `▀░▀▀ ▀░░▀ █▀▀▀`
]

export function Logo() {
  const { theme } = useTheme()

  return (
    <box flexDirection="column" alignItems="center">
      {LOGO_LEFT.map((line, index) => (
        <box key={index} flexDirection="row">
          <text fg={theme.textMuted} selectable={false}>
            {line}
          </text>
          <text fg={theme.text} attributes={TextAttributes.BOLD} selectable={false}>
            {LOGO_RIGHT[index]}
          </text>
        </box>
      ))}
    </box>
  )
}