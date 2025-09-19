/**
 * @file DailyGoalControl.tsx
 * @description 今日目标分钟控制：预设胶囊按钮 + 自定义设置小面板（5~120 分钟）。
 * 轻交互、就地保存，强调高对比与移动端友好。
 */

import React from 'react'

/** @description 组件 Props */
export interface DailyGoalControlProps {
  /** 当前目标分钟数 */
  value: number
  /** 预设档位 */
  presets?: number[]
  /** 保存回调 */
  onChange?: (v: number) => void
}

/**
 * @description 今日目标分钟控制组件。
 */
export const DailyGoalControl: React.FC<DailyGoalControlProps> = ({
  value,
  presets = [20, 30, 45],
  onChange,
}) => {
  const [editing, setEditing] = React.useState(false)
  const [customVal, setCustomVal] = React.useState<number>(value)

  /** @description 规范化至 5~120 区间（步进到整数） */
  const clamp = (v: number) => Math.max(5, Math.min(120, Math.round(v || 0)))

  /** @description 保存自定义目标 */
  const save = () => {
    const v = clamp(customVal)
    onChange?.(v)
    setEditing(false)
  }

  /** @description 取消编辑，回退到当前 value */
  const cancel = () => {
    setCustomVal(value)
    setEditing(false)
  }

  React.useEffect(() => {
    if (!editing) setCustomVal(value)
  }, [value, editing])

  return (
    <div className="inline-flex items-center gap-2">
      {/* 预设档位 */}
      <div className="inline-flex overflow-hidden rounded-full bg-white ring-1 ring-slate-200 shadow-sm">
        {presets.map((g) => {
          const selected = value === g
          return (
            <button
              key={g}
              onClick={() => onChange?.(g)}
              className={
                'px-3 py-1 text-xs font-semibold ' +
                (selected ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50')
              }
              aria-pressed={selected}
              type="button"
              aria-label={`设置目标 ${g} 分钟`}
              title="设置今日目标（分钟）"
            >
              {g} 分
            </button>
          )
        })}
      </div>

      {/* 自定义按钮 */}
      {!editing ? (
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          type="button"
          aria-label="自定义目标"
          title="自定义目标（5~120 分钟）"
        >
          自定义
        </button>
      ) : (
        <div
          className="inline-flex items-center gap-1 overflow-hidden rounded-full bg-white ring-1 ring-slate-200 shadow-sm"
          role="group"
          aria-label="自定义目标编辑"
        >
          <button
            onClick={() => setCustomVal((v) => clamp(v - 5))}
            className="px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            aria-label="减少 5 分钟"
            type="button"
          >
            −
          </button>
          <input
            type="number"
            min={5}
            max={120}
            step={5}
            value={customVal}
            onChange={(e) => setCustomVal(clamp(Number(e.target.value)))}
            className="w-16 border-x border-slate-200 px-2 py-1.5 text-center text-xs font-bold text-slate-900 outline-none"
            aria-label="目标分钟数"
          />
          <button
            onClick={() => setCustomVal((v) => clamp(v + 5))}
            className="px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            aria-label="增加 5 分钟"
            type="button"
          >
            +
          </button>

          <button
            onClick={save}
            className="px-2 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
            aria-label="保存"
            type="button"
            title="保存目标"
          >
            保存
          </button>
          <button
            onClick={cancel}
            className="px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            aria-label="取消"
            type="button"
            title="取消"
          >
            取消
          </button>
        </div>
      )}
    </div>
  )
}

export default DailyGoalControl
