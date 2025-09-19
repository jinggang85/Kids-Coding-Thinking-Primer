/**
 * @file AchievementsData.ts
 * @description Achievements definitions, progress computation from StudyStorage, and local persistence.
 * - Uses StudyStorage to read learning records and weekly summary.
 * - Computes badge unlock status and persists first unlock timestamps.
 */

import { getRecords, getWeeklySummaryFromStorage } from '../storage/StudyStorage'
import type { StudyRecord } from '../storage/StudyStorage'

/** @description LocalStorage key for unlocked badges (id -> timestamp). */
const ACH_KEY = 'kids-coding-achievements:v1'

/** @description Badge definition. */
export interface BadgeDef {
  id: string
  title: string
  description: string
  /** Tailwind color keyword for UI tone. */
  tone: 'emerald' | 'sky' | 'amber' | 'rose' | 'violet' | 'indigo'
  /** Icon keyword to be mapped in UI. */
  icon: 'Trophy' | 'Award' | 'Crown' | 'Star' | 'Target' | 'Calculator'
  /** Progress target (when applicable). */
  goal?: number
  /** Predicate to determine unlocked and progress from stats. */
  check: (stats: Stats) => { unlocked: boolean; progress?: number }
}

/** @description Compact stats derived from records. */
export interface Stats {
  sessions: number
  totalAnswered: number
  totalCorrect: number
  bestAccuracy: number // 0..1
  streakDays: number
  minutes: number
  /** Module -> times played */
  moduleCounts: Record<string, number>
}

/** @description Read unlocked badge map. */
export function getUnlockedMap(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(ACH_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, number>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/** @description Persist unlocked badge map. */
function setUnlockedMap(map: Record<string, number>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(ACH_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}

/** @description Compute overall stats from StudyStorage. */
export function computeStats(records: StudyRecord[]): Stats {
  const sessions = records.length
  let totalAnswered = 0
  let totalCorrect = 0
  let bestAccuracy = 0
  let minutes = 0
  const moduleCounts: Record<string, number> = {}

  for (const r of records) {
    totalAnswered += r.total
    totalCorrect += r.score
    const acc = r.total > 0 ? r.score / r.total : 0
    if (acc > bestAccuracy) bestAccuracy = acc
    minutes += Math.max(0, Math.round(r.elapsedMs / 60000))
    moduleCounts[r.module] = (moduleCounts[r.module] || 0) + 1
  }

  const { streakDays } = getWeeklySummaryFromStorage()

  return { sessions, totalAnswered, totalCorrect, bestAccuracy, streakDays, minutes, moduleCounts }
}

/** @description All badge definitions. Extend freely. */
export const BADGES: BadgeDef[] = [
  {
    id: 'starter-1',
    title: '新手启程',
    description: '完成 1 次学习',
    tone: 'emerald',
    icon: 'Trophy',
    goal: 1,
    check: (s) => ({ unlocked: s.sessions >= 1, progress: Math.min(1, s.sessions / 1) }),
  },
  {
    id: 'ten-sessions',
    title: '坚持练习',
    description: '完成 10 次学习',
    tone: 'sky',
    icon: 'Star',
    goal: 10,
    check: (s) => ({ unlocked: s.sessions >= 10, progress: Math.min(1, s.sessions / 10) }),
  },
  {
    id: 'hundred-answers',
    title: '百题勇士',
    description: '累计答题 100 题',
    tone: 'amber',
    icon: 'Target',
    goal: 100,
    check: (s) => ({ unlocked: s.totalAnswered >= 100, progress: Math.min(1, s.totalAnswered / 100) }),
  },
  {
    id: 'accuracy-90',
    title: '稳准狠',
    description: '任一局正确率 ≥ 90%',
    tone: 'violet',
    icon: 'Crown',
    check: (s) => ({ unlocked: s.bestAccuracy >= 0.9, progress: s.bestAccuracy }),
  },
  {
    id: 'streak-3',
    title: '连续习惯',
    description: '连续学习 3 天',
    tone: 'indigo',
    icon: 'Award',
    goal: 3,
    check: (s) => ({ unlocked: s.streakDays >= 3, progress: Math.min(1, s.streakDays / 3) }),
  },
  {
    id: 'math-3',
    title: '数学小能手',
    description: '加减法练习 3 次',
    tone: 'rose',
    icon: 'Calculator',
    goal: 3,
    check: (s) => {
      const c = s.moduleCounts['加减法练习'] || 0
      return { unlocked: c >= 3, progress: Math.min(1, c / 3) }
    },
  },
]

/** @description Convert tone to tailwind ring/bg for pills. */
export function toneToClasses(tone: BadgeDef['tone']): { ring: string; badge: string } {
  switch (tone) {
    case 'emerald':
      return { ring: 'ring-emerald-200', badge: 'bg-emerald-50 text-emerald-700' }
    case 'sky':
      return { ring: 'ring-sky-200', badge: 'bg-sky-50 text-sky-700' }
    case 'amber':
      return { ring: 'ring-amber-200', badge: 'bg-amber-50 text-amber-700' }
    case 'rose':
      return { ring: 'ring-rose-200', badge: 'bg-rose-50 text-rose-700' }
    case 'violet':
      return { ring: 'ring-violet-200', badge: 'bg-violet-50 text-violet-700' }
    case 'indigo':
    default:
      return { ring: 'ring-indigo-200', badge: 'bg-indigo-50 text-indigo-700' }
  }
}

/** @description Badge with runtime status. */
export interface BadgeStatus extends BadgeDef {
  unlocked: boolean
  /** 0..1 progress (optional). */
  progress?: number
  unlockedAt?: number
}

/**
 * @description Compute achievements state; persist first unlock timestamps.
 */
export function getAchievementsState(): {
  stats: Stats
  badges: BadgeStatus[]
  unlockedMap: Record<string, number>
  level: number
  points: number
} {
  const records = getRecords()
  const stats = computeStats(records)
  const unlockedMap = getUnlockedMap()

  const badges: BadgeStatus[] = BADGES.map((b) => {
    const res = b.check(stats)
    const unlocked = !!res.unlocked
    let unlockedAt = unlockedMap[b.id]
    if (unlocked && !unlockedAt && typeof window !== 'undefined') {
      unlockedAt = Date.now()
      unlockedMap[b.id] = unlockedAt
    }
    return {
      ...b,
      unlocked,
      progress: res.progress,
      unlockedAt,
    }
  })

  // Persist any new unlocks
  setUnlockedMap(unlockedMap)

  // Points & Level strategy (simple): points = totalCorrect; level every 50 pts.
  const points = stats.totalCorrect
  const level = Math.max(1, Math.floor(points / 50) + 1)

  return { stats, badges, unlockedMap, level, points }
}
