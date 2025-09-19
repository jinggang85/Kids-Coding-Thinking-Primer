/**
 * @file QuickActions.tsx
 * @description A pair of quick action buttons (e.g., Continue, Daily Challenge).
 */

import React from 'react'
import clsx from 'clsx'

/**
 * @description Quick action item type.
 */
export interface QuickActionItem {
  /** Unique id */
  id: string
  /** Display label */
  label: string
  /** Leading icon */
  icon?: React.ReactNode
  /** Color tone keyword: 'emerald' | 'amber' | 'sky' etc. */
  tone?: 'emerald' | 'amber' | 'sky' | 'indigo' | 'rose'
}

/**
 * @description Props for QuickActions.
 */
export interface QuickActionsProps {
  /** Items to render */
  items: QuickActionItem[]
  /** Click callback */
  onClick?: (id: string) => void
}

/**
 * @description Two nicely styled quick action buttons with solid contrast.
 */
export const QuickActions: React.FC<QuickActionsProps> = ({ items, onClick }) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.slice(0, 2).map((item) => (
        <button
          key={item.id}
          onClick={() => onClick?.(item.id)}
          className={clsx(
            'group relative flex items-center justify-between overflow-hidden rounded-2xl p-4 text-left shadow-sm ring-1 transition-all',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            toneToClasses(item.tone ?? 'emerald')
          )}
          aria-label={item.label}
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-white">
              {item.icon}
            </span>
            <span className="text-base font-semibold text-white">{item.label}</span>
          </div>
          <span className="text-white/80">Go</span>
        </button>
      ))}
    </div>
  )
}

/**
 * @description Map a tone to background and ring classes.
 */
function toneToClasses(tone: QuickActionItem['tone']) {
  switch (tone) {
    case 'amber':
      return 'bg-gradient-to-r from-amber-500 to-pink-500 ring-amber-300/40 hover:brightness-[1.04]'
    case 'sky':
      return 'bg-gradient-to-r from-sky-500 to-indigo-500 ring-sky-300/40 hover:brightness-[1.04]'
    case 'indigo':
      return 'bg-gradient-to-r from-indigo-500 to-violet-500 ring-indigo-300/40 hover:brightness-[1.04]'
    case 'rose':
      return 'bg-gradient-to-r from-rose-500 to-orange-500 ring-rose-300/40 hover:brightness-[1.04]'
    case 'emerald':
    default:
      return 'bg-gradient-to-r from-emerald-500 to-lime-500 ring-emerald-300/40 hover:brightness-[1.04]'
  }
}
