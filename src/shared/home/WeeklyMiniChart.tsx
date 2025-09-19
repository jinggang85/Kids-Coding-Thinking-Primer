/**
 * @file WeeklyMiniChart.tsx
 * @description Home 卡片内的 7 天学习时长迷你柱状图（紧凑、快速感知趋势）。
 */

import React from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts'
import { getWeeklySummaryFromStorage } from '../storage/StudyStorage'

/**
 * @description 7 天学习时长迷你图（柱高体现分钟，隐藏网格，保留极简 X 轴）。
 */
export const WeeklyMiniChart: React.FC = () => {
  const data = React.useMemo(() => {
    const s = getWeeklySummaryFromStorage()
    // 转换为小写标签（周一 → 一）
    const labelShort = (d: string) => (d.startsWith('周') ? d.replace('周', '') : d)
    return s.weekly.map((d) => ({ day: labelShort(d.day), minutes: d.minutes }))
  }, [])

  const max = React.useMemo(() => Math.max(1, ...data.map((d) => d.minutes)), [data])

  if (!data || data.length === 0) return null

  return (
    <div className="mt-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-xs font-medium text-slate-600">近 7 天时长</div>
        <div className="text-[10px] text-slate-500">单位：分钟</div>
      </div>
      <div className="h-20 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={10}>
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
            />
            {/* @ts-ignore */}
            <Tooltip
              cursor={{ fill: 'rgba(15,23,42,0.04)' }}
              contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0' }}
              formatter={(v: any) => [`${v} 分钟`, '时长']}
              labelFormatter={(l: string) => `周${l}`}
            />
            <Bar
              dataKey="minutes"
              radius={[4, 4, 0, 0]}
              fill="url(#miniBarFill)"
              isAnimationActive={false}
              maxBarSize={10}
            />
            <defs>
              <linearGradient id="miniBarFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 text-[10px] text-slate-500">
        峰值 {max} 分钟
      </div>
    </div>
  )
}

export default WeeklyMiniChart
