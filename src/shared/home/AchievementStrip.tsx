/**
 * @file AchievementStrip.tsx
 * @description Horizontally scrollable strip of achievements/badges.
 */

import React from 'react'

/**
 * @description Item for achievement strip.
 */
export interface AchievementItem {
  /** Unique id */
  id: string
  /** Label text */
  label: string
  /** Optional icon */
  icon?: React.ReactNode
}

/**
 * @description Props for AchievementStrip.
 */
export interface AchievementStripProps {
  /** Section title */
  title: string
  /** Items to render */
  items: AchievementItem[]
  /** Optional trailing element (e.g., view all button) */
  trailing?: React.ReactNode
}

/**
 * @description Simple badge-like strip with overflow-x scroll for small screens.
 */
export const AchievementStrip: React.FC<AchievementStripProps> = ({ title, items, trailing }) => {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        {trailing}
      </div>
      <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
        {items.map((it) => (
          <div
            key={it.id}
            className="snap-start inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
            title={it.label}
          >
            {it.icon}
            <span>{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
