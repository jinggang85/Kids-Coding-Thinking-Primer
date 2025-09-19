/** 
 * @file ShapePuzzleGame.tsx
 * @description 图形拼图挑战（简洁稳定版）
 * - 支持：难度（EASY/NORMAL/HARD）、每题提示次数、拖拽放置、暂停、提交、结果淡入。
 * - 规则：将“待放区”的彩色图形拖到对应槽位（按类型匹配），全部匹配即为正确。
 * - UI：突出对比度与可读性，移动端友好，使用原生 HTML5 DnD，尽量避免闪烁。
 */

import React from 'react'
import clsx from 'clsx'
import { Pause, PlayCircle, RotateCcw, Timer, Award, Crown, CheckCircle2, XCircle, Lightbulb, X } from 'lucide-react'

/** 形状类型（以语义名称区分） */
type ShapeKind = 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'pentagon' | 'hexagon'

/** 组件参数 */
export interface ShapePuzzleGameProps {
  /** 退出回调 */
  onExit?: () => void
  /** 完成回调：score/total/elapsedMs */
  onFinish?: (score: number, total: number, elapsedMs?: number) => void
  /** 题目数量（默认 6） */
  count?: number
  /** 难度（默认 easy） */
  level?: 'easy' | 'normal' | 'hard'
  /** 每题提示次数上限（默认根据难度推导） */
  maxHints?: number
}

/** 单题（一个拼图板） */
interface PuzzleQuestion {
  slots: Slot[]
  shapes: ShapeItem[]
}

/** 槽位（目标） */
interface Slot {
  key: string
  kind: ShapeKind
}

/** 可拖拽图形 */
interface ShapeItem {
  key: string
  kind: ShapeKind
  color: string
  /** 当前是否已放入某槽位（用槽位 key 表示），null 表示在待放区 */
  placedIn: string | null
}

/** 复盘项（简化） */
interface ReviewItem {
  ok: boolean
  timeMs: number
  usedHints: number
}

/** 颜色池（高对比） */
const COLOR_POOL = ['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316', '#22c55e']

/** 全部形状 */
const ALL_KINDS: ShapeKind[] = ['circle', 'square', 'triangle', 'diamond', 'star', 'pentagon', 'hexagon']

/** 难度配置：不同难度的槽位数量范围与默认提示 */
const DIFFICULTY = {
  easy: { min: 3, max: 4, hints: 3 },
  normal: { min: 4, max: 5, hints: 2 },
  hard: { min: 5, max: 6, hints: 1 },
}

/** 洗牌 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 从区间取整随机 */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** 生成一题（若可选形状不足，回退到可用数量） */
function genQuestion(level: 'easy' | 'normal' | 'hard'): PuzzleQuestion {
  const cfg = DIFFICULTY[level]
  const n = Math.min(ALL_KINDS.length, randInt(cfg.min, cfg.max))
  const kinds = shuffle(ALL_KINDS).slice(0, n)
  const slots: Slot[] = kinds.map((k, i) => ({ key: `slot-${i}-${k}`, kind: k }))
  const shapes: ShapeItem[] = kinds
    .map((k, i) => ({
      key: `shape-${i}-${k}`,
      kind: k,
      color: COLOR_POOL[i % COLOR_POOL.length],
      placedIn: null,
    }))
  // 混洗待放区的顺序
  return { slots, shapes: shuffle(shapes) }
}

/** 判断是否完全正确：所有槽位都有图形且类型匹配 */
function isAllCorrect(q: PuzzleQuestion): boolean {
  for (const s of q.slots) {
    const sh = q.shapes.find((it) => it.placedIn === s.key)
    if (!sh || sh.kind !== s.kind) return false
  }
  return true
}

/** 将图形放入槽位（处理交换/覆盖/清除） */
function placeShape(q: PuzzleQuestion, shapeKey: string, slotKey: string): PuzzleQuestion {
  const next: PuzzleQuestion = {
    slots: q.slots.map((s) => ({ ...s })),
    shapes: q.shapes.map((sh) => ({ ...sh })),
  }
  const shIdx = next.shapes.findIndex((s) => s.key === shapeKey)
  if (shIdx < 0) return q
  const inSlot = next.shapes[shIdx].placedIn

  // 若目标槽已有图形，先清空其放置
  const existedIdx = next.shapes.findIndex((s) => s.placedIn === slotKey)
  if (existedIdx >= 0) {
    next.shapes[existedIdx].placedIn = null
  }

  // 清理该图形在旧槽位的占用
  if (inSlot) {
    next.shapes[shIdx].placedIn = null
  }

  // 放入新槽
  next.shapes[shIdx].placedIn = slotKey
  return next
}

/** 从槽位取回图形 */
function removeFromSlot(q: PuzzleQuestion, slotKey: string): PuzzleQuestion {
  const next: PuzzleQuestion = {
    slots: q.slots.map((s) => ({ ...s })),
    shapes: q.shapes.map((sh) => ({ ...sh })),
  }
  const idx = next.shapes.findIndex((s) => s.placedIn === slotKey)
  if (idx >= 0) next.shapes[idx].placedIn = null
  return next
}

/** 找一个需要提示的槽位（空或错误） */
function findHintTarget(q: PuzzleQuestion): { slotKey: string; needKind: ShapeKind } | null {
  for (const s of q.slots) {
    const sh = q.shapes.find((it) => it.placedIn === s.key)
    if (!sh) return { slotKey: s.key, needKind: s.kind }
    if (sh.kind !== s.kind) return { slotKey: s.key, needKind: s.kind }
  }
  return null
}

/** 主组件：图形拼图挑战 */
export const ShapePuzzleGame: React.FC<ShapePuzzleGameProps> = ({
  onExit,
  onFinish,
  count = 6,
  level = 'easy',
  maxHints,
}) => {
  const total = Math.max(1, count)
  const [idx, setIdx] = React.useState(0)
  const [score, setScore] = React.useState(0)
  const [finished, setFinished] = React.useState(false)
  const [paused, setPaused] = React.useState(false)
  const [feedback, setFeedback] = React.useState<'correct' | 'wrong' | null>(null)

  // 每题提示次数
  const defaultHints = typeof maxHints === 'number' ? maxHints : DIFFICULTY[level].hints
  const [hintsLeft, setHintsLeft] = React.useState<number>(defaultHints)
  const hintsUsedRef = React.useRef<number>(0)

  // 结果淡入
  const [resultMounted, setResultMounted] = React.useState(false)
  React.useEffect(() => {
    if (finished) {
      const t = window.setTimeout(() => setResultMounted(true), 20)
      return () => window.clearTimeout(t)
    } else {
      setResultMounted(false)
    }
  }, [finished])

  // 计时
  const roundStartRef = React.useRef<number>(Date.now())
  const qStartRef = React.useRef<number>(Date.now())

  // 当前题
  const [q, setQ] = React.useState<PuzzleQuestion>(() => genQuestion(level))

  // DnD 源 key
  const dragKeyRef = React.useRef<string | null>(null)

  // 初始化
  React.useEffect(() => {
    roundStartRef.current = Date.now()
    qStartRef.current = Date.now()
  }, [])

  /** 拖拽开始 */
  const onDragStart = (e: React.DragEvent<HTMLDivElement>, shapeKey: string) => {
    if (finished || paused) return
    dragKeyRef.current = shapeKey
    try {
      e.dataTransfer?.setData('text/plain', shapeKey)
      e.dataTransfer.effectAllowed = 'move'
    } catch {
      // ignore
    }
  }

  /** 放到槽位 */
  const onDropToSlot = (e: React.DragEvent<HTMLDivElement>, slotKey: string) => {
    e.preventDefault()
    if (finished || paused) return
    const key = dragKeyRef.current || e.dataTransfer?.getData('text/plain')
    if (!key) return
    setQ((prev) => placeShape(prev, key, slotKey))
  }

  /** 点击槽位（若已有图形 -> 取回） */
  const onClickSlot = (slotKey: string) => {
    if (finished || paused) return
    setQ((prev) => removeFromSlot(prev, slotKey))
  }

  /** 提示：将第一个空/错误槽位自动填对 */
  const hint = () => {
    if (hintsLeft <= 0 || finished || paused) return
    const target = findHintTarget(q)
    if (!target) return
    // 找一个正确类型、尚未放入或放错的图形
    const candidate = q.shapes.find((s) => s.kind === target.needKind && s.placedIn !== target.slotKey)
    if (!candidate) return
    setQ((prev) => placeShape(prev, candidate.key, target.slotKey))
    setHintsLeft((h) => h - 1)
    hintsUsedRef.current += 1
  }

  /** 提交当前题 */
  const submit = () => {
    if (finished || paused) return
    const ok = isAllCorrect(q)
    setFeedback(ok ? 'correct' : 'wrong')
    if (ok) setScore((s) => s + 1)

    // 展示 900/1200ms，减少突兀切换
    window.setTimeout(() => {
      if (idx + 1 >= total) {
        setFinished(true)
        onFinish?.(ok ? score + 1 : score, total, Date.now() - roundStartRef.current)
      } else {
        const nq = genQuestion(level)
        setQ(nq)
        setIdx((i) => i + 1)
        setFeedback(null)
        setHintsLeft(defaultHints)
        hintsUsedRef.current = 0
        qStartRef.current = Date.now()
      }
    }, ok ? 900 : 1200)
  }

  /** 暂停切换 */
  const togglePause = () => setPaused((p) => !p)

  /** 再来一局（保持现有难度/提示上限） */
  const restart = () => {
    setIdx(0)
    setScore(0)
    setFinished(false)
    setPaused(false)
    setFeedback(null)
    setHintsLeft(defaultHints)
    hintsUsedRef.current = 0
    setQ(genQuestion(level))
    roundStartRef.current = Date.now()
    qStartRef.current = Date.now()
  }

  const percent = finished ? 100 : Math.floor((idx / total) * 100)

  /** 槽位可视化：简单轮廓 + 名称 */
  const renderSlot = (s: Slot) => {
    const placed = q.shapes.find((it) => it.placedIn === s.key)
    const correct = placed && placed.kind === s.kind
    const has = !!placed
    return (
      <div
        key={s.key}
        className={clsx(
          'relative flex aspect-[4/3] w-32 select-none flex-col items-center justify-center rounded-2xl bg-white ring-1 shadow-sm',
          has ? (correct ? 'ring-emerald-300' : 'ring-rose-300') : 'ring-slate-200'
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onDropToSlot(e, s.key)}
        onClick={() => onClickSlot(s.key)}
        title={has ? '点击清空' : '拖拽图形到这里'}
        role="button"
        tabIndex={0}
      >
        <div className="text-xs font-semibold text-slate-600">{s.kind}</div>
        <div
          className={clsx(
            'mt-1 h-6 w-14 rounded-lg border-2 border-dashed',
            has ? (correct ? 'border-emerald-400' : 'border-rose-400') : 'border-slate-300'
          )}
          aria-hidden
        />
        {placed && (
          <span
            className="absolute right-1 top-1 inline-flex items-center justify-center rounded-full bg-slate-100 p-0.5 text-slate-600 ring-1 ring-slate-200"
            title="清空"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    )
  }

  /** 待放区图形可视化：色块 + 名称 */
  const renderShape = (sh: ShapeItem) => {
    if (sh.placedIn) return null // 已放入槽位则不在待放区显示
    return (
      <div
        key={sh.key}
        draggable
        onDragStart={(e) => onDragStart(e, sh.key)}
        className="flex select-none items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 shadow-sm hover:bg-slate-50"
        title="拖拽我到槽位"
      >
        <span className="inline-block h-4 w-6 rounded-md" style={{ background: sh.color }} />
        {sh.kind}
      </div>
    )
  }

  return (
    <div className="relative mx-auto w-full max-w-3xl">
      {/* 顶部 HUD */}
      <div className="sticky top-0 z-10 mb-3 -mx-4 bg-white/85 px-4 pb-2 pt-1 backdrop-blur supports-[backdrop-filter]:bg-white/75">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600">进度</span>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800">
              {Math.min(idx + (finished ? 1 : 0), total)} / {total}
            </span>
            <span
              className={clsx(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1',
                level === 'hard'
                  ? 'bg-rose-50 text-rose-700 ring-rose-200'
                  : level === 'normal'
                  ? 'bg-sky-50 text-sky-700 ring-sky-200'
                  : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              )}
            >
              {level.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (hintsLeft > 0) hint()
              }}
              disabled={hintsLeft <= 0}
              className={clsx(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
                hintsLeft > 0
                  ? 'bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100'
                  : 'bg-slate-50 text-slate-400 ring-slate-200'
              )}
              type="button"
              aria-pressed={hintsLeft > 0}
              title="给一个槽位放入正确图形"
            >
              <Lightbulb className="h-4 w-4" />
              提示
              <span className="ml-1 rounded-full bg-white/70 px-1.5 text-[10px] font-bold text-amber-700">{hintsLeft}</span>
            </button>

            <button
              onClick={togglePause}
              className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              aria-pressed={paused}
              type="button"
              title={paused ? '继续' : '暂停'}
            >
              {paused ? <PlayCircle className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {paused ? '继续' : '暂停'}
            </button>
          </div>
        </div>

        {/* 进度条 */}
        <div
          className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="拼图进度"
        >
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {!finished ? (
        <div className="space-y-4">
          {/* 题目卡片 */}
          <div className="rounded-3xl bg-gradient-to-br from-emerald-50 to-sky-50 p-5 ring-1 ring-emerald-100">
            <div className="text-center text-lg font-extrabold tracking-wide text-slate-900">把图形拖到对应的槽位</div>
            <p className="mt-1 text-center text-sm text-slate-600">匹配类型即可（点击槽位可清空）</p>
          </div>

          {/* 拼图板（槽位区） */}
          <div className="grid grid-cols-2 justify-items-center gap-3 sm:grid-cols-3">
            {q.slots.map((s) => renderSlot(s))}
          </div>

          {/* 待放区 */}
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="mb-2 text-sm font-semibold text-slate-900">待放区</div>
            <div className="flex flex-wrap gap-2">{q.shapes.map((sh) => renderShape(sh))}</div>
          </div>

          {/* 操作区 */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={submit}
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              type="button"
            >
              <CheckCircle2 className="h-4 w-4" />
              提交
            </button>
            <button
              onClick={onExit}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              type="button"
            >
              退出
            </button>
          </div>

          {/* 反馈提示（淡入） */}
          {feedback && (
            <div
              className={clsx(
                'text-center text-sm font-semibold transition-opacity duration-300',
                feedback === 'correct' ? 'text-emerald-600' : 'text-rose-600'
              )}
              role="status"
            >
              {feedback === 'correct' ? '太棒了！已全部匹配' : '还有不匹配的槽位～再看看'}
            </div>
          )}

          {/* 暂停遮罩 */}
          {paused && <div className="pointer-events-none absolute inset-0 rounded-3xl bg-white/60" aria-hidden="true" />}
        </div>
      ) : (
        <div className={`space-y-5 transition-opacity duration-300 ${resultMounted ? 'opacity-100' : 'opacity-0'}`}>
          {/* 结果卡片 */}
          <div className="rounded-3xl bg-gradient-to-br from-emerald-50 to-sky-50 p-6 ring-1 ring-emerald-100">
            <div className="flex items-center justify-center gap-2 text-2xl font-extrabold text-slate-900">
              {score / total >= 0.9 ? <Crown className="h-6 w-6 text-amber-500" /> : <Award className="h-6 w-6 text-emerald-600" />}
              完成啦！
            </div>
            <p className="mt-1 text-center text-sm text-slate-700">
              本轮得分：<span className="font-bold">{score} / {total}</span>
            </p>
            <div className="mt-2 grid grid-cols-3 text-center text-xs text-slate-600">
              <div>
                正确率
                <div className="mt-0.5 text-base font-bold text-slate-900">{Math.round((score / total) * 100)}%</div>
              </div>
              <div>
                用时
                <div className="mt-0.5 text-base font-bold text-slate-900">{Math.round((Date.now() - roundStartRef.current) / 1000)}s</div>
              </div>
              <div>
                题目数
                <div className="mt-0.5 text-base font-bold text-slate-900">{total}</div>
              </div>
            </div>
          </div>

          {/* 复盘（简要） */}
          <div className="rounded-2xl bg-white p-4 text-center text-xs text-slate-600 shadow-sm ring-1 ring-slate-100">
            本模式为“类型匹配”简易版。需要更复杂的旋转/翻转/干扰项，我们可以继续升级。
          </div>

          {/* 操作 */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={restart}
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              type="button"
            >
              <RotateCcw className="h-4 w-4" />
              再来一局
            </button>
            <button
              onClick={onExit}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              type="button"
            >
              返回
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ShapePuzzleGame
