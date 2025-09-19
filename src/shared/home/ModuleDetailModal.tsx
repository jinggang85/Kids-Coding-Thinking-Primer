/**
 * @file ModuleDetailModal.tsx
 * @description 模块详情弹窗：展示模块封面、简介、子项目和主动作按钮。
 * - 针对“成就系统/学习记录中心”将主按钮文案显示为「打开」；
 * - 其他游戏型模块显示为「开始」；
 * - 保持无路由、在首页以浮层形式展示；
 * - 支持键盘 Esc 关闭。
 */

import React, { useEffect } from 'react'

/** @description 模块信息结构（来自 Home） */
interface ModuleInfo {
  id: string
  title: string
  description: string
  image: string
  submodules?: string[]
}

/** @description 组件属性 */
interface ModuleDetailModalProps {
  open: boolean
  onClose: () => void
  module?: ModuleInfo
  /** 主按钮点击回调（由父组件决定打开/开始的行为） */
  onStart: () => void
}

/**
 * @description 模块详情弹窗组件。
 */
export const ModuleDetailModal: React.FC<ModuleDetailModalProps> = ({
  open,
  onClose,
  module,
  onStart,
}) => {
  // 键盘 ESC 关闭
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open || !module) return null

  const isOpenType = module.id === 'achievements' || module.id === 'records'
  const primaryLabel = isOpenType ? '打开' : '开始'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`${module.title} 详情`}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 封面 */}
        <div className="relative h-40 w-full overflow-hidden sm:h-48">
          <img
            src={module.image}
            alt={module.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <h3 className="text-lg font-extrabold text-white drop-shadow">
              {module.title}
            </h3>
            <p className="mt-0.5 line-clamp-2 text-xs text-white/90">
              {module.description}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/60"
          >
            ×
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4">
          {module.submodules && module.submodules.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-slate-900">包含内容</div>
              <ul className="mt-2 grid list-disc grid-cols-1 gap-1 pl-5 text-sm text-slate-600 sm:grid-cols-2">
                {module.submodules.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 操作条 */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              {isOpenType ? '点击打开中心面板' : '点击开始体验'}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                type="button"
              >
                取消
              </button>
              <button
                onClick={onStart}
                className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
                aria-label={primaryLabel}
                type="button"
              >
                {primaryLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModuleDetailModal
