/**
 * @file Home.tsx
 * @description 应用首页（无“今日目标”且去掉近7天曲线图）。保留问候、今日学习时长、连续天数、上次学习、今日分布、功能入口和抽屉式游戏。
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Award,
  BookOpen,
  Calculator,
  ChartBar,
  ChevronRight,
  Crown,
  ListOrdered,
  Play,
  Puzzle,
  Timer,
  Flame,
  Clock,
} from 'lucide-react'
import { ModuleCard } from '../shared/home/ModuleCard'
import { QuickActions } from '../shared/home/QuickActions'
import { AchievementStrip } from '../shared/home/AchievementStrip'
import { ModuleDetailModal } from '../shared/home/ModuleDetailModal'
import { GameDrawer } from '../shared/game/GameDrawer'
import { MathQuickGame } from '../shared/game/MathQuickGame'
import { LogicTrainingGame } from '../shared/game/LogicTrainingGame'
import { ComingSoon } from '../shared/game/ComingSoon'
import { SequenceOrderGame } from '../shared/game/SequenceOrderGame'
import { ShapePuzzleGame } from '../shared/game/ShapePuzzleGame'
import { ParentCenter } from '../shared/parent/ParentCenter'
import {
  addRecord,
  getRecordsWithinDays,
  toDateKey,
  getWeeklySummaryFromStorage,
  getRecentRecords,
} from '../shared/storage/StudyStorage'
import { AchievementsCenter } from '../shared/achievements/AchievementsCenter'
import { TodayBreakdown } from '../shared/home/TodayBreakdown'
import { Toaster } from 'sonner'

/** 模块描述 */
interface FeatureModule {
  id: string
  name: string
  description: string
  gradient: string
  accent: string
  image: string
  icon: JSX.Element
  submodules: string[]
}

/** 抽屉内容类型 */
type DrawerState =
  | { type: 'math'; title: string; level?: 'easy' | 'normal'; count?: number; timedPerQuestionSec?: number }
  | { type: 'logic'; title: string; count?: number }
  | { type: 'puzzle'; title: string; count?: number; level?: 'easy' | 'normal' | 'hard'; hints?: number }
  | { type: 'sequence'; title: string; count?: number; level?: 'easy' | 'normal' | 'hard'; timedPerQuestionSec?: number }
  | { type: 'soon'; title: string }
  | { type: 'parent'; title: string }
  | { type: 'achievements'; title: string }
  | null

/** 首页主体 */
export default function Home() {
  const [userName] = useState('小朋友')
  const [activeModule, setActiveModule] = useState<FeatureModule | null>(null)
  const [drawer, setDrawer] = useState<DrawerState>(null)

  const [refreshTick, setRefreshTick] = useState(0)

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 11) return '早上好'
    if (h < 14) return '中午好'
    if (h < 18) return '下午好'
    return '晚上好'
  }, [])

  /** 今日学习统计（分钟、连续天、上次学习时间） */
  const todayStats = useMemo(() => {
    const todayKey = toDateKey(Date.now())
    const recordsToday = getRecordsWithinDays(1).filter((r) => toDateKey(r.timestamp) === todayKey)
    const minutes = recordsToday.reduce((s, r) => s + Math.max(1, Math.round(r.elapsedMs / 60000)), 0)
    const streakDays = getWeeklySummaryFromStorage().streakDays
    const last = getRecentRecords(1)[0]
    const lastText = last ? formatTimeShort(new Date(last.timestamp)) : '暂无'
    return { minutes, streakDays, lastText }
  }, [refreshTick])

  /** 今日模块分布（分钟） */
  const todayBreakdown = useMemo(() => {
    const todayKey = toDateKey(Date.now())
    const recordsToday = getRecordsWithinDays(1).filter((r) => toDateKey(r.timestamp) === todayKey)
    const group = new Map<string, number>()
    for (const r of recordsToday) {
      const m = Math.max(1, Math.round(r.elapsedMs / 60000))
      group.set(r.module, (group.get(r.module) || 0) + m)
    }
    const items = Array.from(group.entries())
      .map(([module, minutes]) => ({ module, minutes }))
      .sort((a, b) => b.minutes - a.minutes)
    return items.slice(0, 4)
  }, [refreshTick])

  const modules: FeatureModule[] = useMemo(
    () => [
      {
        id: 'logic',
        name: '逻辑思维训练',
        description: '判断、推理、分类、流程',
        gradient: 'from-indigo-500 to-sky-500',
        accent: 'bg-indigo-600',
        image:
          'https://pub-cdn.sider.ai/u/U0E5HGEZ0W/web-coder/68a3d55e7b28bae498079916/resource/ce2f539c-3b09-48b3-83ab-f1eff8701002.jpg',
        icon: <BookOpen className="h-5 w-5 text-white" />,
        submodules: ['真假判断', '因果推断', '逆否命题', '常识辨析'],
      },
      {
        id: 'math',
        name: '数学计算游戏',
        description: '加减、比较、数列、计数',
        gradient: 'from-rose-500 to-orange-500',
        accent: 'bg-rose-600',
        image:
          'https://pub-cdn.sider.ai/u/U0E5HGEZ0W/web-coder/68a3d55e7b28bae498079916/resource/46a7bd3d-5363-4862-9edd-c8d21183014c.jpg',
        icon: <Calculator className="h-5 w-5 text-white" />,
        submodules: ['加减法练习', '数字大小比较', '数列规律发现', '计数游戏'],
      },
      {
        id: 'puzzle',
        name: '图形拼图挑战',
        description: '形状、拼图、创作、对称',
        gradient: 'from-emerald-500 to-lime-500',
        accent: 'bg-emerald-600',
        image:
          'https://pub-cdn.sider.ai/u/U0E5HGEZ0W/web-coder/68a3d55e7b28bae498079916/resource/7e27147b-e45d-42d8-beec-46c18cfcf93c.jpg',
        icon: <Puzzle className="h-5 w-5 text-white" />,
        submodules: ['几何形状认知', '2D/3D 拼图', '图案创作工具', '对称图形练习'],
      },
      {
        id: 'sequence',
        name: '序列排列游戏',
        description: '颜色、大小、时间、指令',
        gradient: 'from-fuchsia-500 to-violet-500',
        accent: 'bg-fuchsia-600',
        image:
          'https://pub-cdn.sider.ai/u/U0E5HGEZ0W/web-coder/68a3d55e7b28bae498079916/resource/1e08ccd4-171e-4473-be42-2db2abcb34af.jpg',
        icon: <ListOrdered className="h-5 w-5 text-white" />,
        submodules: ['颜色序列', '大小顺序', '时间顺序', '编程指令序列'],
      },
      {
        id: 'logic-judge',
        name: '真假命题判断',
        description: '命题、逆否、因果、常识',
        gradient: 'from-violet-500 to-indigo-500',
        accent: 'bg-violet-600',
        image:
          'https://pub-cdn.sider.ai/u/U0E5HGEZ0W/web-coder/68a3d55e7b28bae498079916/resource/7d9e2691-88b4-4aa3-bef4-6d36da56d0c5.jpg',
        icon: <BookOpen className="h-5 w-5 text-white" />,
        submodules: ['真假判断', '因果推断', '逆否命题', '常识辨析'],
      },
      {
        id: 'achievements',
        name: '成就系统',
        description: '徽章、等级、榜单、分享',
        gradient: 'from-amber-500 to-pink-500',
        accent: 'bg-amber-600',
        image:
          'https://pub-cdn.sider.ai/u/U0E5HGEZ0W/web-coder/68a3d55e7b28bae498079916/resource/b20dd75b-5da7-436b-b673-707274c11c11.jpg',
        icon: <Award className="h-5 w-5 text-white" />,
        submodules: ['徽章收集', '等级系统', '排行榜', '分享功能'],
      },
    ],
    []
  )

  const achievements = useMemo(
    () => [
      { id: 'a1', name: '逻辑小达人', icon: <span className="h-4 w-4">👑</span> },
      { id: 'a2', name: '计算明星', icon: <span className="h-4 w-4">➗</span> },
      { id: 'a3', name: '拼图王者', icon: <span className="h-4 w-4">🧩</span> },
      { id: 'a4', name: '序列专家', icon: <span className="h-4 w-4">🔢</span> },
      { id: 'a5', name: '学习先锋', icon: <span className="h-4 w-4">📘</span> },
    ],
    []
  )

  /**
   * @description 根据模块类型启动对应的抽屉内容。
   * @param m 目标模块
   * @param opts 额外参数（难度、题量、倒计时等）
   */
  const startModule = (
    m: FeatureModule,
    opts?: { level?: 'easy' | 'normal' | 'hard'; count?: number; timedPerQuestionSec?: number }
  ) => {
    if (m.id === 'math') {
      setDrawer({
        type: 'math',
        title: m.name,
        level: (opts?.level as any) ?? 'easy',
        count: opts?.count ?? 8,
        timedPerQuestionSec: opts?.timedPerQuestionSec,
      })
    } else if (m.id.startsWith('logic')) {
      setDrawer({ type: 'logic', title: m.name, count: opts?.count ?? 8 })
    } else if (m.id === 'puzzle') {
      const level: 'easy' | 'normal' | 'hard' = 'easy'
      const hints = level === 'hard' ? 1 : level === 'normal' ? 2 : 3
      setDrawer({ type: 'puzzle', title: m.name, count: opts?.count ?? 6, level, hints })
    } else if (m.id === 'sequence') {
      const level: 'easy' | 'normal' | 'hard' = (opts?.level as any) ?? 'easy'
      setDrawer({ type: 'sequence', title: m.name, count: opts?.count ?? 6, level, timedPerQuestionSec: opts?.timedPerQuestionSec ?? 0 })
    } else if (m.id === 'achievements') {
      setDrawer({ type: 'achievements', title: m.name })
    } else {
      setDrawer({ type: 'soon', title: m.name })
    }
    setActiveModule(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAFBFF] to-[#F4F7FF]">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <header className="mx-auto max-w-6xl px-4 pt-8 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">
              {greeting}，{userName}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">儿童编程思维启蒙</h1>
          </div>
          <div className="relative">
            <img
              src="https://pub-cdn.sider.ai/u/U0E5HGEZ0W/web-coder/68a3d55e7b28bae498079916/resource/cc2dd2e6-3477-451c-9b88-2362f93ca13f.jpg"
              alt="avatar"
              className="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow"
            />
            <span className="absolute -right-1 -bottom-1 inline-flex items-center justify-center rounded-full bg-emerald-500 p-1 ring-2 ring-white">
              <Timer className="h-3 w-3 text-white" />
            </span>
          </div>
        </div>

        {/* 今日学习统计卡（去掉近7天曲线图） */}
        <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-emerald-600" />
              <span className="font-medium text-slate-800">今日学习</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setDrawer({ type: 'parent', title: '家长中心' })}
                aria-label="打开家长中心"
              >
                <ChartBar className="h-3.5 w-3.5" />
                家长中心
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-3">
            <div className="inline-flex items-center gap-2">
              <span className="h-4 w-4 rounded-full bg-emerald-100 ring-1 ring-emerald-200" />
              今日：<span className="font-semibold text-slate-900">{todayStats.minutes} 分钟</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-500" />
              连续学习
              <span className="font-semibold text-slate-900">{todayStats.streakDays}</span>
              天
            </div>
            <div className="inline-flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              上次学习：<span className="font-medium text-slate-900">{todayStats.lastText}</span>
            </div>
          </div>

          {/* 今日模块分布（保留） */}
          <TodayBreakdown items={todayBreakdown} />
          {/* 近7天趋势图已移除 */}
        </div>
      </header>

      {/* 快速动作 */}
      <section className="mx-auto max-w-6xl px-4">
        <QuickActions
          items={[
            { id: 'continue', label: '继续上次', icon: <Play className="h-4 w-4" />, tone: 'emerald' },
            { id: 'challenge', label: '每日挑战', icon: <Crown className="h-4 w-4" />, tone: 'amber' },
          ]}
          onClick={(id) => {
            if (id === 'continue') {
              const m = modules.find((mm) => mm.id === 'math')!
              startModule(m, { level: 'easy', count: 8 })
            }
            if (id === 'challenge') {
              const m = modules.find((mm) => mm.id === 'math')!
              startModule(m, { level: 'normal', count: 10, timedPerQuestionSec: 10 })
            }
          }}
        />
      </section>

      {/* 功能模块 */}
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <ModuleCard
              key={m.id}
              title={m.name}
              description={m.description}
              gradient={m.gradient}
              accent={m.accent}
              image={m.image}
              icon={m.icon}
              onClick={() => setActiveModule(m)}
              longPressText="长按查看说明"
              infoText={m.description}
            />
          ))}
        </div>

        {/* 成就条 */}
        <div className="mt-8">
          <AchievementStrip
            title="我的成就"
            items={achievements.map((a) => ({
              id: a.id,
              label: a.name,
              icon: a.icon,
            }))}
            trailing={
              <button
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium text-slate-600 hover:text-slate-900"
                onClick={() => setDrawer({ type: 'achievements', title: '成就系统' })}
                aria-label="查看全部成就"
              >
                查看全部
                <ChevronRight className="h-4 w-4" />
              </button>
            }
          />
        </div>
      </main>

      {/* 模块详情弹窗 */}
      <ModuleDetailModal
        open={!!activeModule}
        onClose={() => setActiveModule(null)}
        module={
          activeModule && {
            id: activeModule.id,
            title: activeModule.name,
            description: activeModule.description,
            image: activeModule.image,
            submodules: activeModule.submodules,
          }
        }
        onStart={() => {
          if (activeModule) startModule(activeModule)
        }}
      />

      {/* 抽屉：游戏与中心 */}
      <GameDrawer open={!!drawer} onClose={() => setDrawer(null)} title={drawer?.title}>
        {drawer?.type === 'math' ? (
          <MathQuickGame
            onExit={() => setDrawer(null)}
            onFinish={(score, total, elapsedMs) => {
              addRecord({
                module: '加减法练习',
                score,
                total,
                elapsedMs: elapsedMs ?? 0,
                timestamp: Date.now(),
              })
              setRefreshTick((t) => t + 1)
            }}
            count={drawer?.count ?? 8}
            level={drawer?.level ?? 'easy'}
            adaptive={true}
            timedPerQuestionSec={drawer?.timedPerQuestionSec}
          />
        ) : drawer?.type === 'logic' ? (
          <LogicTrainingGame
            onExit={() => setDrawer(null)}
            onFinish={(score, total, elapsedMs) => {
              addRecord({
                module: '逻辑思维训练',
                score,
                total,
                elapsedMs: elapsedMs ?? 0,
                timestamp: Date.now(),
              })
              setRefreshTick((t) => t + 1)
            }}
            count={drawer?.count ?? 8}
          />
        ) : drawer?.type === 'puzzle' ? (
          <>
            {/* 启动面板：难度 + 提示 */}
            <div className="mb-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">难度</span>
                  <div className="inline-flex overflow-hidden rounded-full bg-white ring-1 ring-slate-200 shadow-sm">
                    {(['easy', 'normal', 'hard'] as const).map((lv) => {
                      const selected = (drawer?.level ?? 'easy') === lv
                      return (
                        <button
                          key={lv}
                          onClick={() =>
                            setDrawer((d) =>
                              d && d.type === 'puzzle'
                                ? {
                                    ...d,
                                    level: lv,
                                    hints: lv === 'hard' ? 1 : lv === 'normal' ? 2 : 3,
                                  }
                                : d
                            )
                          }
                          className={
                            'px-3 py-1.5 text-xs font-semibold ' +
                            (selected ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50')
                          }
                          aria-pressed={selected}
                          type="button"
                        >
                          {lv.toUpperCase()}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">提示</span>
                  <div className="inline-flex items-center overflow-hidden rounded-full bg-white ring-1 ring-slate-200 shadow-sm">
                    <button
                      onClick={() =>
                        setDrawer((d) => (d && d.type === 'puzzle' ? { ...d, hints: Math.max(0, (d.hints ?? 0) - 1) } : d))
                      }
                      className="px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      aria-label="减少提示次数"
                      type="button"
                    >
                      −
                    </button>
                    <span className="px-2 text-xs font-bold text-slate-900">
                      {drawer?.hints ??
                        ((drawer?.level ?? 'easy') === 'hard'
                          ? 1
                          : (drawer?.level ?? 'easy') === 'normal'
                          ? 2
                          : 3)}
                    </span>
                    <button
                      onClick={() =>
                        setDrawer((d) => (d && d.type === 'puzzle' ? { ...d, hints: Math.min(5, (d.hints ?? 0) + 1) } : d))
                      }
                      className="px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      aria-label="增加提示次数"
                      type="button"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <ShapePuzzleGame
              key={`puzzle-${drawer?.level ?? 'easy'}-${drawer?.hints ?? 0}-${drawer?.count ?? 6}`}
              onExit={() => setDrawer(null)}
              onFinish={(score, total, elapsedMs) => {
                addRecord({
                  module: '图形拼图挑战',
                  score,
                  total,
                  elapsedMs: elapsedMs ?? 0,
                  timestamp: Date.now(),
                })
                setRefreshTick((t) => t + 1)
              }}
              count={drawer?.count ?? 6}
              level={drawer?.level ?? 'easy'}
              maxHints={
                drawer?.hints ??
                ((drawer?.level ?? 'easy') === 'hard' ? 1 : (drawer?.level ?? 'easy') === 'normal' ? 2 : 3)
              }
            />
          </>
        ) : drawer?.type === 'sequence' ? (
          <>
            {/* 启动面板：难度 + 倒计时 */}
            <div className="mb-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">难度</span>
                  <div className="inline-flex overflow-hidden rounded-full bg-white ring-1 ring-slate-200 shadow-sm">
                    {(['easy', 'normal', 'hard'] as const).map((lv) => {
                      const selected = (drawer?.level ?? 'easy') === lv
                      return (
                        <button
                          key={lv}
                          onClick={() =>
                            setDrawer((d) => (d && d.type === 'sequence' ? { ...d, level: lv } : d))
                          }
                          className={
                            'px-3 py-1.5 text-xs font-semibold ' +
                            (selected ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50')
                          }
                          aria-pressed={selected}
                          type="button"
                        >
                          {lv.toUpperCase()}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">倒计时/题</span>
                  <div className="inline-flex items-center overflow-hidden rounded-full bg-white ring-1 ring-slate-200 shadow-sm">
                    <button
                      onClick={() =>
                        setDrawer((d) =>
                          d && d.type === 'sequence'
                            ? { ...d, timedPerQuestionSec: Math.max(0, (d.timedPerQuestionSec ?? 0) - 5) }
                            : d
                        )
                      }
                      className="px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      aria-label="减少倒计时"
                      type="button"
                    >
                      −
                    </button>
                    <span className="px-2 text-xs font-bold text-slate-900">
                      {drawer?.timedPerQuestionSec ?? 0} s
                    </span>
                    <button
                      onClick={() =>
                        setDrawer((d) =>
                          d && d.type === 'sequence'
                            ? { ...d, timedPerQuestionSec: Math.min(60, (d.timedPerQuestionSec ?? 0) + 5) }
                            : d
                        )
                      }
                      className="px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      aria-label="增加倒计时"
                      type="button"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <SequenceOrderGame
              key={`seq-${drawer?.level ?? 'easy'}-${drawer?.count ?? 6}-${drawer?.timedPerQuestionSec ?? 0}`}
              onExit={() => setDrawer(null)}
              onFinish={(score, total, elapsedMs) => {
                addRecord({
                  module: '序列排列游戏',
                  score,
                  total,
                  elapsedMs: elapsedMs ?? 0,
                  timestamp: Date.now(),
                })
                setRefreshTick((t) => t + 1)
              }}
              count={drawer?.count ?? 6}
              level={drawer?.level ?? 'easy'}
              maxHints={(drawer?.level ?? 'easy') === 'hard' ? 0 : (drawer?.level ?? 'easy') === 'normal' ? 1 : 2}
              timedPerQuestionSec={drawer?.timedPerQuestionSec ?? 0}
            />
          </>
        ) : drawer?.type === 'parent' ? (
          <ParentCenter />
        ) : drawer?.type === 'achievements' ? (
          <AchievementsCenter />
        ) : drawer?.type === 'soon' ? (
          <ComingSoon name={drawer?.title} />
        ) : null}
      </GameDrawer>

      {/* Footer */}
      <footer className="mx-auto max-w-6xl px-4 pb-8 pt-2">
        <div className="rounded-xl bg-white/60 p-3 text-center text-xs text-slate-500">
          © 2025 儿童编程思维启蒙 · 体验版
        </div>
      </footer>
    </div>
  )
}

/** 将日期格式化为 MM-DD HH:mm */
function formatTimeShort(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${mi}`
}
