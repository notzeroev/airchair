"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import {
  DropdownMenuItem
} from "@/components/ui/dropdown-menu"

export function DropdownModeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  return (
    <DropdownMenuItem
      onClick={e => {
        e.preventDefault()
        toggleTheme()
      }}
    >
      <div className="relative flex items-center">
        <Sun className="h-[1rem] w-[1rem] transition-all dark:scale-0 dark:-rotate-90" />
        <Moon className="absolute h-[1rem] w-[1rem] transition-all scale-0 rotate-90 dark:scale-100 dark:rotate-0" />
      </div>
      <span>Toggle theme</span>
    </DropdownMenuItem>
  )
}