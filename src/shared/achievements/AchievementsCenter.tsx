/**
 * @file AchievementsCenter.tsx
 * @description Achievements drawer content: profile summary (level/points), badges grid, demo leaderboard, and share action.
 */

import React from 'react'
import { Award, Calculator, Crown, Star, Target, Trophy, Share2, User } from 'lucide-react'
import { getAchievementsState, toneToClasses, BadgeStatus } from './AchievementsData'

/** @description Small pill component for consistent badge-like chips. */
function Pill({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'emerald' | 'sky' | 'amber' | 'rose' | 'violet' | 'indigo' }) {
  const map: Record<string, string> = {
    slate: 'bg-slate-50 text-slate-700 ring-slate-200',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    sky: 'bg-sky-50 text-sky-700 ring-sky-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    rose: 'bg-rose-50 text-rose-700 ring-rose-200',
    violet: 'bg-violet-50 text-violet-700 ring-violet-200',
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  }
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${map[tone] || map['slate']}`}>{children}</span>
}

/** @description Map icon keyword -> Lucide icon element. */
function BadgeIcon({ name, className }: { name: BadgeStatus['icon']; className?: string }) {
  if (name === 'Trophy') return <Trophy className={className} />
  if (name === 'Award') return <Award className={className} />
  if (name === 'Crown') return <Crown className={className} />
  if (name === 'Star') return <Star className={className} />
  if (name === 'Target') return <Target className={className} />
  return <Calculator className={className} />
}

/** @description Progress bar for a badge (when not unlocked). */
function MiniProgress({ value }: { value: number }) {
  const v = Math.max(0, Math.min(1, value))
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500" style={{ width: `${Math.round(v * 100)}%` }} />
    </div>
  )
}

/** @description Achievements center main component. */
export const AchievementsCenter: React.FC = () => {
  const { level, points, stats, badges } = React.useMemo(() => getAchievementsState(), [])
  const unlockedCount = badges.filter((b) => b.unlocked).length

  const share = async () => {
    const text = `我在「儿童编程思维启蒙」解锁了 ${unlockedCount} 枚成就，当前等级 Lv.${level}，累计积分 ${points}！一起来挑战吧～`
    try {
      await navigator.clipboard.writeText(text)
      alert('已复制分享文案到剪贴板')
    } catch {
      // fallback
      prompt('复制下面的分享文案', text)
    }
  }

  // Demo leaderboard (local only)
  const leaderboard = [
    { name: '你', points },
    { name: 'Coco', points: Math.max(points - 10, 40) },
    { name: 'Luna', points: Math.max(points - 20, 20) },
    { name: 'Max', points: Math.max(points - 30, 10) },
  ].sort((a, b) => b.points - a.points)

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      {/* Profile summary */}
      <section className="rounded-2xl bg-gradient-to-br from-amber-50 to-pink-50 p-4 ring-1 ring-amber-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 ring-1 ring-slate-200">
              <User className="h-5 w-5" />
            </span>
            <div>
              <div className="text-sm font-semibold text-slate-900">当前等级 Lv.{level}</div>
              <div className="text-xs text-slate-600">累计积分 {points} · 已解锁 {unlockedCount} 枚徽章</div>
            </div>
          </div>
          <button
            onClick={share}
            className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            aria-label="分享成就"
            type="button"
          >
            <Share2 className="h-3.5 w-3.5" />
            分享
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center text-xs text-slate-600">
          <div>
            学习次数
            <div className="mt-0.5 text-base font-bold text-slate-900">{stats.sessions}</div>
          </div>
          <div>
            累计答题
            <div className="mt-0.5 text-base font-bold text-slate-900">{stats.totalAnswered}</div>
          </div>
          <div>
            最佳正确率
            <div className="mt-0.5 text-base font-bold text-slate-900">{Math.round(stats.bestAccuracy * 100)}%</div>
          </div>
        </div>
      </section>

      {/* Badges grid */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-900">我的徽章</h4>
          <Pill tone="slate">已解锁 {unlockedCount}</Pill>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {badges.map((b) => {
            const tone = toneToClasses(b.tone)
            return (
              <div
                key={b.id}
                className={`relative overflow-hidden rounded-2xl border bg-white p-3 ring-1 ${tone.ring} ${b.unlocked ? 'border-transparent' : 'border-dashed border-slate-200'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
                    <BadgeIcon name={b.icon} className="h-4 w-4 text-slate-700" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{b.title}</div>
                    <div className="text-[11px] text-slate-500">{b.description}</div>
                  </div>
                </div>

                {/* Status */}
                <div className="mt-2">
                  {b.unlocked ? (
                    <div className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${tone.badge}`}>
                      已解锁
                    </div>
                  ) : (
                    <>
                      <MiniProgress value={b.progress ?? 0} />
                      {typeof b.goal !== 'undefined' && (
                        <div className="mt-1 text-right text-[11px] text-slate-500">
                          {Math.min(100, Math.round((b.progress ?? 0) * 100))}% · 目标 {b.goal}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Leaderboard (local demo) */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-900">小小排行榜（本地）</h4>
          <Pill tone="sky">按积分</Pill>
        </div>
        <div className="divide-y divide-slate-100">
          {leaderboard.map((u, i) => (
            <div key={u.name} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-700 ring-1 ring-slate-200">{i + 1}</span>
                <div className="text-sm font-medium text-slate-900">{u.name}</div>
              </div>
              <div className="text-sm text-slate-700">{u.points} 分</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
