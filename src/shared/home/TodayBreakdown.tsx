/**
 * @file TodayBreakdown.tsx
 * @description 今日模块分钟分布徽章行：展示今天各模块用时（分钟），便于家长快速了解训练结构。
 */

import React from 'react'
import { Calculator, ListOrdered, Puzzle, BookOpen } from 'lucide-react'

/** @description 展示项 */
export interface TodayBreakItem {
  /** 模块名（如“加减法练习”） */
  module: string
  /** 今日分钟数 */
  minutes: number
}

/** @description 组件 Props */
export interface TodayBreakdownProps {
  /** 数据源（已按分钟数排序） */
  items: TodayBreakItem[]
}

/** @description 根据模块名挑选图标与色彩 */
function getModuleVisual(module: string) {
  if (module.includes('加减') || module.includes('数学')) {
    return {
      icon: <Calculator className="h-3.5 w-3.5" />,
      cls: 'from-rose-50 to-orange-50 ring-rose-100 text-rose-700',
    }
  }
  if (module.includes('序列')) {
    return {
      icon: <ListOrdered className="h-3.5 w-3.5" />,
      cls: 'from-fuchsia-50 to-violet-50 ring-fuchsia-100 text-fuchsia-700',
    }
  }
  if (module.includes('拼图') || module.includes('图形')) {
    return {
      icon: <Puzzle className="h-3.5 w-3.5" />,
      cls: 'from-emerald-50 to-lime-50 ring-emerald-100 text-emerald-700',
    }
  }
  // 默认逻辑训练
  return {
    icon: <BookOpen className="h-3.5 w-3.5" />,
    cls: 'from-indigo-50 to-sky-50 ring-indigo-100 text-indigo-700',
  }
}

/**
 * @description 今日模块分布组件。
 */
export const TodayBreakdown: React.FC<TodayBreakdownProps> = ({ items }) => {
  if (!items || items.length === 0) return null

  return (
    <div className="mt-3">
      <div className="mb-1 text-xs font-medium text-slate-600">今日模块分布</div>
      <div className="flex flex-wrap gap-2">
        {items.map((it, idx) => {
          const v = getModuleVisual(it.module)
          return (
            <span
              key={idx}
              className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-br px-2.5 py-1 text-xs font-semibold ring-1 ${v.cls}`}
              title={`${it.module} · ${it.minutes} 分钟`}
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/70 text-slate-700 ring-1 ring-white/80">
                {v.icon}
              </span>
              {it.module}
              <span className="ml-1 rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-bold text-slate-800 ring-1 ring-white/80">
                {it.minutes} 分
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

export default TodayBreakdown
