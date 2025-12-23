import React, { useRef } from "react"
import { useTheme, THEME_NAMES, type ThemeName } from "../context/theme"
import { DialogSelect, type DialogSelectOption } from "./ui/dialog-select"
import { useDialog } from "./ui/dialog"

export function ThemeDialog() {
  const { themeName, setTheme, setThemePreview } = useTheme()
  const dialog = useDialog()

  // Store initial theme to revert if cancelled
  const initialTheme = useRef(themeName).current

  const options: DialogSelectOption<ThemeName>[] = THEME_NAMES.map((name) => ({
    title: name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " "),
    value: name,
    category: "Themes",
  }))

  return (
    <DialogSelect
      title="Select Theme"
      placeholder="Search themes..."
      options={options}
      current={themeName}
      onMove={(option) => {
        setThemePreview(option.value)
      }}
      onSelect={(option) => {
        setTheme(option.value)
        dialog.close()
      }}
      onCancel={() => {
        setThemePreview(initialTheme)
      }}
    />
  )
}
