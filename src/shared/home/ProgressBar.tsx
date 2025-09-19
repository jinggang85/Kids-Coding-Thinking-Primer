/**
 * @file ProgressBar.tsx
 * @description A11y-friendly horizontal progress bar with gradient fill.
 */

import React from 'react'

/**
 * @description Props for ProgressBar.
 */
export interface ProgressBarProps {
  /** Progress value in percentage (0-100). */
  value: number
}

/**
 * @description Visual progress bar showing current percentage.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({ value }) => {
  const v = Math.max(0, Math.min(100, value))

  return (
    <div
      className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="今日学习进度"
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all duration-500 ease-out"
        style={{ width: `${v}%` }}
      />
    </div>
  )
}
