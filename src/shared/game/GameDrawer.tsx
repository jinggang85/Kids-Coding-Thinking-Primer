/**
 * @file GameDrawer.tsx
 * @description 可复用的底部抽屉容器（原用于小游戏，此处也承载家长中心等内容）。
 * - 打开时锁定 body 滚动，避免页面“飘移”
 * - 支持 ESC / 背景点击关闭
 * - 处理安全区内边距
 */

import React from 'react'
import { X } from 'lucide-react'

/**
 * @description Props for GameDrawer.
 */
export interface GameDrawerProps {
  /** Whether drawer is open */
  open: boolean
  /** Close callback */
  onClose: () => void
  /** Drawer title */
  title?: string
  /** Drawer content */
  children?: React.ReactNode
}

/**
 * @description 锁定/恢复 body 滚动（避免抽屉打开导致的页面位移）。
 * 通过 fixed + 保存/恢复滚动位置来避免滚动条消失引起的 reflow 跳动。
 */
function useBodyScrollLock(active: boolean) {
  React.useEffect(() => {
    if (!active) return
    const { style } = document.body
    const prev = {
      position: style.position,
      top: style.top,
      overflow: style.overflow,
      width: style.width,
    }
    const scrollY = window.scrollY
    style.position = 'fixed'
    style.top = `-${scrollY}px`
    style.width = '100%'
    style.overflow = 'hidden'

    return () => {
      // 恢复
      const top = style.top
      style.position = prev.position
      style.top = prev.top
      style.overflow = prev.overflow
      style.width = prev.width
      // 回到之前的滚动位置
      const y = top ? parseInt(top, 10) : 0
      window.scrollTo(0, Math.abs(y))
    }
  }, [active])
}

/**
 * @description Bottom sheet drawer with overlay. Closes on ESC or background click.
 */
export const GameDrawer: React.FC<GameDrawerProps> = ({ open, onClose, title, children }) => {
  // 锁定滚动
  useBodyScrollLock(open)

  // ESC 关闭
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? '抽屉'}
    >
      <div
        className="w-full max-w-3xl translate-y-0 rounded-t-3xl bg-white shadow-xl ring-1 ring-slate-200"
        style={{
          // 设定最大高度，内容区域滚动；同时给到安全区底部空间
          maxHeight: '88vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex items-center justify-center pt-2">
          <div className="h-1.5 w-10 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content area */}
        <div
          className="overflow-y-auto px-4 pb-6"
          style={{
            // 为全面屏设备底部手势留白（同时保留原有下内边距）
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
