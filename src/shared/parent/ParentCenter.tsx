/**
 * @file ParentCenter.tsx
 * @description 家长中心数据看板 2.0：概览 / 记录 / 设置。
 * - 概览：摘要卡片、时长柱状图、正确/错误分布、模块分布。
 * - 记录：完整记录列表 + 模块筛选 + 时间范围（7/30/90 天） + 导出 CSV + 一键清空。
 * - 设置：隐私提示与演示数据说明（保留为简要文案）。
 */

import React from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BookOpen, Calculator, Download, ListOrdered, Trash2, Trophy, Filter, Clock } from 'lucide-react'
import {
  exportRecordsToCSV,
  getModulesFromRecords,
  getRecentRecords,
  getRecords,
  getRecordsWithinDays,
  getWeeklySummaryFromStorage,
  clearRecords,
} from '../storage/StudyStorage'

/**
 * @description 一周/多天学习数据结构。
 */
interface DayData {
  /** 标签，如 08/18 或 周一 */
  day: string
  /** 学习时长（分钟） */
  minutes: number
  /** 正确率（0-1） */
  correctRate: number
}

/**
 * @description 最近学习记录（UI 展示）。
 */
interface RecentRecordItem {
  module: string
  scoreText: string
  date: string
  icon: React.ReactNode
}

/**
 * @description 顶部标签。
 */
type TabKey = 'overview' | 'records' | 'settings'

/**
 * @description 家长中心主组件。
 */
export const ParentCenter: React.FC = () => {
  const [tab, setTab] = React.useState<TabKey>('overview')

  // 概览：沿用 7 天聚合，若无数据使用回退示例
  const summary = React.useMemo(() => getWeeklySummaryFromStorage(), [])
  let weekly: DayData[] = summary.weekly
  let totalMinutes = summary.totalMinutes
  let avgCorrectRate = summary.avgCorrectRate
  let streak = summary.streakDays
  let correctSum = summary.correctMinutes
  let wrongSum = summary.wrongMinutes

  const hasData = totalMinutes > 0 || avgCorrectRate > 0

  if (!hasData) {
    // 回退示例数据
    weekly = [
      { day: '周一', minutes: 18, correctRate: 0.75 },
      { day: '周二', minutes: 25, correctRate: 0.8 },
      { day: '周三', minutes: 12, correctRate: 0.6 },
      { day: '周四', minutes: 30, correctRate: 0.85 },
      { day: '周五', minutes: 20, correctRate: 0.7 },
      { day: '周六', minutes: 35, correctRate: 0.9 },
      { day: '周日', minutes: 28, correctRate: 0.78 },
    ]
    totalMinutes = weekly.reduce((s, d) => s + d.minutes, 0)
    avgCorrectRate = Math.round(
      (weekly.reduce((s, d) => s + d.correctRate, 0) / weekly.length) * 100
    )
    streak = (() => {
      let count = 0
      for (let i = weekly.length - 1; i >= 0; i--) {
        if (weekly[i].minutes > 0) count++
        else break
      }
      return count
    })()
    correctSum = Math.round((avgCorrectRate / 100) * totalMinutes)
    wrongSum = Math.max(0, totalMinutes - correctSum)
  }

  // 模块分布（按条目数量近似）
  const modulePie = React.useMemo(() => {
    const group: Record<string, number> = {}
    for (const r of getRecords()) {
      group[r.module] = (group[r.module] || 0) + 1
    }
    const entries = Object.entries(group)
    if (entries.length === 0)
      return [
        { name: '加减法练习', value: 6, fill: '#10b981' },
        { name: '序列排列游戏', value: 4, fill: '#6366f1' },
        { name: '逻辑思维训练', value: 3, fill: '#f59e0b' },
      ]
    const palette = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6']
    return entries.map(([name, value], i) => ({ name, value, fill: palette[i % palette.length] }))
  }, [])

  // 最近记录（保留回退）
  const recentsRaw = React.useMemo(() => getRecentRecords(3), [])
  const recent: RecentRecordItem[] =
    recentsRaw.length > 0
      ? recentsRaw.map((r) => {
          const d = new Date(r.timestamp)
          const mm = String(d.getMonth() + 1).padStart(2, '0')
          const dd = String(d.getDate()).padStart(2, '0')
          return {
            module: r.module,
            scoreText: `${r.score}/${r.total}`,
            date: `${mm}-${dd}`,
            icon: iconForModule(r.module),
          }
        })
      : [
          { module: '加减法练习', scoreText: '6/8', date: '08-18', icon: <Calculator className="h-4 w-4 text-rose-500" /> },
          { module: '序列排列游戏', scoreText: '7/10', date: '08-17', icon: <ListOrdered className="h-4 w-4 text-fuchsia-500" /> },
          { module: '逻辑思维训练', scoreText: '完成任务', date: '08-16', icon: <BookOpen className="h-4 w-4 text-indigo-500" /> },
        ]

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* 选项卡 */}
      <div className="mb-3 inline-flex overflow-hidden rounded-full bg-white ring-1 ring-slate-200 shadow-sm">
        {(
          [
            { k: 'overview', label: '概览' },
            { k: 'records', label: '记录' },
            { k: 'settings', label: '设置' },
          ] as { k: TabKey; label: string }[]
        ).map((t) => {
          const sel = tab === t.k
          return (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`px-4 py-1.5 text-sm font-semibold ${sel ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
              aria-pressed={sel}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          {/* 顶部摘要 */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryCard title="本周学习" value={`${totalMinutes} 分钟`} hint="建议 60~120 分钟/周" tone="emerald" icon={<Trophy className="h-4 w-4" />} />
            <SummaryCard title="平均正确率" value={`${avgCorrectRate}%`} hint="循序渐进，重在坚持" tone="sky" icon={<Calculator className="h-4 w-4" />} />
            <SummaryCard title="连续学习" value={`${streak} 天`} hint="保持良好习惯" tone="amber" icon={<BookOpen className="h-4 w-4" />} />
          </div>

          {/* 每周学习时长图表 */}
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900">每日学习时长</h4>
              <span className="text-xs text-slate-500">单位：分钟</span>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekly} barSize={24}>
                  <CartesianGrid stroke="#E5E7EB" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: '#E5E7EB' }} tick={{ fill: '#64748B', fontSize: 12 }} />
                  <YAxis width={24} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#E5E7EB' }} tickLine={false} />
                  {/* @ts-ignore */}
                  <Tooltip cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }} contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0' }} />
                  <Bar dataKey="minutes" radius={[8, 8, 0, 0]} fill="url(#barFill)" />
                  <defs>
                    <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* 正确率分布 + 模块分布 */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">正确与错误分布（近似）</h4>
                <span className="text-xs text-slate-500">按总分钟换算</span>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[{ name: '正确', value: correctSum, fill: '#10b981' }, { name: '错误', value: wrongSum, fill: '#f43f5e' }]} dataKey="value" innerRadius={42} outerRadius={70} paddingAngle={2} />
                    {/* @ts-ignore */}
                    <Tooltip cursor={{ fill: 'rgba(15,23,42,0.04)' }} contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 模块分布 */}
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">模块分布</h4>
                <span className="text-xs text-slate-500">按记录条目计</span>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={modulePie} dataKey="value" innerRadius={42} outerRadius={70} paddingAngle={2} />
                    {/* @ts-ignore */}
                    <Tooltip cursor={{ fill: 'rgba(15,23,42,0.04)' }} contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* 最近记录 */}
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <h4 className="mb-2 text-sm font-semibold text-slate-900">最近学习记录</h4>
            <div className="divide-y divide-slate-100">
              {recent.map((r, idx) => (
                <div key={idx} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">{r.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{r.module}</div>
                      <div className="text-xs text-slate-500">{r.date}</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-700">{r.scoreText}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === 'records' && <RecordsTab />}

      {tab === 'settings' && (
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <h4 className="text-sm font-semibold text-slate-900">数据与隐私</h4>
          <p className="mt-2 text-sm text-slate-600">所有学习记录仅保存在当前浏览器的本地存储，不会上传到任何服务器。你可以随时导出或清空数据。</p>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
            <li>如果想在不同设备间同步，可手动导出 CSV 后自行备份。</li>
            <li>清空数据不可恢复，请谨慎操作。</li>
          </ul>
        </section>
      )}
    </div>
  )
}

/**
 * @description 记录页：筛选 + 表格 + 导出/清空。
 */
const RecordsTab: React.FC = () => {
  const [days, setDays] = React.useState<7 | 30 | 90>(7)
  const modules = React.useMemo(() => ['全部', ...getModulesFromRecords()], [])
  const [module, setModule] = React.useState<string>('全部')

  const list = React.useMemo(() => {
    const base = getRecordsWithinDays(days).sort((a, b) => b.timestamp - a.timestamp)
    const filtered = module === '全部' ? base : base.filter((r) => r.module === module)
    return filtered
  }, [days, module])

  /** 导出 CSV 并下载 */
  const downloadCSV = () => {
    const csv = exportRecordsToCSV()
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'study-records.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const onClear = () => {
    if (window.confirm('确定要清空全部学习记录吗？此操作不可撤销。')) {
      clearRecords()
      // 触发刷新
      setModule('全部')
      setDays(7)
    }
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"><Filter className="h-3.5 w-3.5" />筛选</span>
          <div className="inline-flex overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
            {([7, 30, 90] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-xs font-semibold ${days === d ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                aria-pressed={days === d}
              >
                {d} 天
              </button>
            ))}
          </div>
          <div className="inline-flex overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
            {modules.map((m) => {
              const sel = module === m
              return (
                <button
                  key={m}
                  onClick={() => setModule(m)}
                  className={`px-3 py-1.5 text-xs font-semibold ${sel ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                  aria-pressed={sel}
                >
                  {m}
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={downloadCSV} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Download className="h-3.5 w-3.5" />导出 CSV</button>
          <button onClick={onClear} className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"><Trash2 className="h-3.5 w-3.5" />清空</button>
        </div>
      </div>

      {/* 表格 */}
      <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">时间</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">模块</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">得分</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">用时</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {list.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-500">暂无记录</td>
              </tr>
            ) : (
              list.map((r, i) => {
                const d = new Date(r.timestamp)
                const time = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                const score = `${r.score}/${r.total}`
                const mins = Math.max(1, Math.round(r.elapsedMs / 60000))
                return (
                  <tr key={i} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2 text-sm text-slate-700">{time}</td>
                    <td className="px-3 py-2 text-sm font-medium text-slate-900">{r.module}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">{score}</td>
                    <td className="px-3 py-2 text-sm text-slate-700 inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-slate-400" />{mins} 分钟</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/**
 * @description 摘要卡片。
 */
function SummaryCard({ title, value, hint, icon, tone }: { title: string; value: string; hint?: string; icon?: React.ReactNode; tone?: 'emerald' | 'sky' | 'amber' }) {
  const toneClass =
    tone === 'sky'
      ? 'from-sky-50 to-indigo-50 ring-sky-100'
      : tone === 'amber'
      ? 'from-amber-50 to-pink-50 ring-amber-100'
      : 'from-emerald-50 to-lime-50 ring-emerald-100'
  return (
    <div className={`rounded-2xl bg-gradient-to-br p-4 ring-1 ${toneClass}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-slate-600">{title}</div>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-white text-slate-700 ring-1 ring-slate-200">{icon}</span>
      </div>
      <div className="mt-1 text-lg font-extrabold text-slate-900">{value}</div>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
    </div>
  )
}

/**
 * @description 根据模块名返回一个小图标。
 */
function iconForModule(name: string): React.ReactNode {
  if (name.includes('加减')) return <Calculator className="h-4 w-4 text-rose-500" />
  if (name.includes('序列')) return <ListOrdered className="h-4 w-4 text-fuchsia-500" />
  return <BookOpen className="h-4 w-4 text-indigo-500" />
}
