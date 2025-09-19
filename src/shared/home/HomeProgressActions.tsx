/**
 * @file HomeProgressActions.tsx
 * @description 今日进度卡内的“快速补足”行动区，显示剩余分钟并提供一键开始。
 */

import React from 'react'
import { Target, Play } from 'lucide-react'

/** @description 组件 Props */
export interface HomeProgressActionsProps {
  /** 还差多少分钟（若为 0 则不展示按钮区） */
  remainingMinutes: number
  /** 最近一次学习的模块名（用于个性化文案） */
  lastModuleName?: string
  /** 点击快速补足 */
  onQuickFill?: () => void
}

/**
 * @description 今日进度行动区：剩余分钟 + 快速补足按钮。
 */
export const HomeProgressActions: React.FC<HomeProgressActionsProps> = ({
  remainingMinutes,
  lastModuleName,
  onQuickFill,
}) => {
  if (!remainingMinutes || remainingMinutes <= 0) return null

  return (
    <div className="mt-3 flex flex-col items-stretch gap-2 rounded-xl bg-gradient-to-br from-emerald-50 to-sky-50 p-3 ring-1 ring-emerald-100 sm:flex-row sm:items-center sm:justify-between">
      <div className="inline-flex items-center gap-2 text-sm text-slate-800">
        <Target className="h-4 w-4 text-emerald-600" />
        还差
        <span className="font-bold text-slate-900">{remainingMinutes} 分钟</span>
        达成今日目标
        {lastModuleName ? (
          <span className="ml-1 text-xs text-slate-500">（上次：{lastModuleName}）</span>
        ) : null}
      </div>
      <div className="text-right">
        <button
          onClick={onQuickFill}
          className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
          type="button"
          aria-label="快速补足目标"
          title="根据剩余分钟生成一局合适的练习"
        >
          <Play className="h-4 w-4" />
          快速补足
        </button>
      </div>
    </div>
  )
}

export default HomeProgressActions
