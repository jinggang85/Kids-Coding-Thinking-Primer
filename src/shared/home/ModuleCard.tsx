/**
 * @file ModuleCard.tsx
 * @description Feature module card with long-press hint and kids-friendly imagery.
 */

import React, { useMemo, useRef, useState } from 'react'
import { Info } from 'lucide-react'

/**
 * @description Props for ModuleCard.
 */
export interface ModuleCardProps {
  /** Main title */
  title: string
  /** Short description to show on long press */
  description: string
  /** Gradient tailwind class, e.g., 'from-indigo-500 to-sky-500' */
  gradient: string
  /** Small solid accent for the icon circle */
  accent: string
  /** Image URL (kids-friendly). */
  image: string
  /** Icon element (white preferred). */
  icon: React.ReactNode
  /** Click handler to open details */
  onClick?: () => void
  /** Text to show as long press hint */
  longPressText?: string
  /** Info text for the bubble */
  infoText?: string
}

/**
 * @description Internal helper: clamp press time logic for long-press interaction.
 */
const LONG_PRESS_MS = 600

export const ModuleCard: React.FC<ModuleCardProps> = ({
  title,
  description,
  gradient,
  accent,
  image,
  icon,
  onClick,
  longPressText = '长按查看',
  infoText = description,
}) => {
  const [info, setInfo] = useState(false)
  const timerRef = useRef<number | null>(null)

  /**
   * @description Start long-press detection on pointer down.
   */
  const onPointerDown = () => {
    clearTimer()
    timerRef.current = window.setTimeout(() => {
      setInfo(true)
    }, LONG_PRESS_MS)
  }

  /**
   * @description End long-press detection; if not long-pressed, treat as click.
   */
  const onPointerUp = () => {
    if (timerRef.current) {
      // short press -> click
      clearTimer()
      onClick?.()
    }
  }

  /**
   * @description Cancel long-press on leave/cancel.
   */
  const onPointerCancel = () => {
    clearTimer()
  }

  /**
   * @description Clear the running timer.
   */
  const clearTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  /**
   * @description Hide the info bubble after showing it.
   */
  const hideInfo = () => setInfo(false)

  const gradientClass = useMemo(() => `bg-gradient-to-br ${gradient}`, [gradient])

  return (
    <div
      className="group relative overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-md"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerCancel}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
      aria-label={title}
    >
      <div className="p-4">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${accent}`}>
              {icon}
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500">{longPressText}</p>
            </div>
          </div>

          <Info className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
        </div>

        {/* Illustration */}
        <div className="mt-3 overflow-hidden rounded-2xl">
          <div className={`relative h-28 w-full ${gradientClass}`}>
            <img src={image} alt={title} className="absolute inset-0 h-full w-full object-cover mix-blend-overlay" />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-slate-600">{description}</p>
          <span className="text-sm font-semibold text-slate-800">开始</span>
        </div>
      </div>

      {/* Info bubble on long press */}
      {info && (
        <div
          className="absolute inset-0 z-10 flex items-end bg-black/10 backdrop-blur-[2px]"
          onClick={hideInfo}
          role="dialog"
          aria-label={`${title} 说明`}
        >
          <div className="m-4 w-full rounded-2xl bg-white p-3 shadow-lg ring-1 ring-slate-100">
            <p className="text-sm text-slate-700">{infoText}</p>
            <div className="mt-2 text-right">
              <button
                onClick={hideInfo}
                className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800"
              >
                知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
