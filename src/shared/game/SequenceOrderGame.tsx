/**
 * @file SequenceOrderGame.tsx
 * @description 排序小游戏：将卡片按数值从小到大排序。支持拖拽重排、每题倒计时、提示矫正、声音反馈、结果复盘导出错题。
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'

export type Level = 'easy' | 'normal' | 'hard'

export interface SequenceOrderGameProps {
  onExit: () => void
  onFinish: (score: number, total: number, elapsedMs?: number) => void
  count?: number
  level?: Level
  /** 每题允许的提示次数（会自动纠正一个位置） */
  maxHints?: number
  /** 每题倒计时（秒，0 表示不限） */
  timedPerQuestionSec?: number
}

/** 单题 */
interface Q {
  values: number[]
  answer: number[]
}

/** 作答记录 */
interface Ans {
  order: number[]
  correct: boolean
  timeUsedMs: number
  hintsUsed: number
}

function useSound() {
  const ctxRef = useRef<AudioContext | null>(null)
  const [enabled, setEnabled] = useState(true)
  const ensure = () => {
    if (!ctxRef.current) {
      try {
        ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      } catch {}
    }
    return ctxRef.current
  }
  const beep = (freq: number, ms = 120, type: OscillatorType = 'square', vol = 0.04) => {
    if (!enabled) return
    const ctx = ensure()
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    gain.gain.value = vol
    osc.type = type
    osc.frequency.value = freq
    osc.connect(gain).connect(ctx.destination)
    const t = ctx.currentTime
    osc.start(t)
    osc.stop(t + ms / 1000)
  }
  const ok = () => {
    beep(700, 90)
    setTimeout(() => beep(900, 100), 100)
  }
  const bad = () => {
    beep(300, 140, 'sawtooth')
    setTimeout(() => beep(200, 160, 'sawtooth'), 130)
  }
  return { enabled, setEnabled, ok, bad }
}

/** 根据难度生成一题 */
function genQuestion(level: Level): Q {
  const len = level === 'hard' ? 6 : level === 'normal' ? 5 : 4
  const base = level === 'hard' ? 80 : level === 'normal' ? 60 : 30
  const values = unique(
    Array.from({ length: len }, () => base + rand(1, 20) * (Math.random() < 0.5 ? -1 : 1))
  ).slice(0, len)
  const answer = [...values].sort((a, b) => a - b)
  return { values: shuffle(values), answer }
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 排序小游戏主组件
 */
export const SequenceOrderGame: React.FC<SequenceOrderGameProps> = ({
  onExit,
  onFinish,
  count = 6,
  level = 'easy',
  maxHints = 2,
  timedPerQuestionSec = 0,
}) => {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hintsLeft, setHintsLeft] = useState(maxHints)
  const [startTs] = useState(() => Date.now())
  const pauseAccumRef = useRef(0)
  const pauseBeginRef = useRef<number | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const { enabled: soundOn, setEnabled: setSoundOn, ok: playOk, bad: playBad } = useSound()

  const questions = useMemo(() => Array.from({ length: count }, () => genQuestion(level)), [count, level])
  const q = questions[index]

  // DnD 状态
  const [order, setOrder] = useState<number[]>(q.values)
  useEffect(() => setOrder(q.values), [q])

  // 每题计时
  const [timeLeft, setTimeLeft] = useState(timedPerQuestionSec)
  const qStartRef = useRef<number>(Date.now())
  useEffect(() => {
    qStartRef.current = Date.now()
    setTimeLeft(timedPerQuestionSec)
    setHintsLeft(maxHints)
  }, [index, timedPerQuestionSec, maxHints])

  useEffect(() => {
    if (!timedPerQuestionSec || paused) return
    const t = setInterval(() => {
      setTimeLeft((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(t)
  }, [timedPerQuestionSec, paused])

  const [answers, setAnswers] = useState<Ans[]>([])
  const [finished, setFinished] = useState(false)
  const [reviewWrongOnly, setReviewWrongOnly] = useState(false)

  // 超时自动提交
  useEffect(() => {
    if (!timedPerQuestionSec || paused || finished) return
    if (timeLeft > 0) return
    handleSubmit(true) // 超时
    // 反馈等待
    const delay = setTimeout(() => goNext(), 1200)
    return () => clearTimeout(delay)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])

  const togglePause = () => {
    if (!paused) {
      pauseBeginRef.current = Date.now()
      setPaused(true)
    } else {
      if (pauseBeginRef.current) pauseAccumRef.current += Date.now() - pauseBeginRef.current
      pauseBeginRef.current = null
      setPaused(false)
    }
  }

  const handleSubmit = (timeout = false) => {
    const used = Date.now() - qStartRef.current
    const correct = JSON.stringify(order) === JSON.stringify(q.answer)
    setAnswers((arr) => [...arr, { order, correct, timeUsedMs: used, hintsUsed: maxHints - hintsLeft }])
    timeout ? playBad() : correct ? playOk() : playBad()
  }

  const goNext = () => {
    if (index + 1 >= questions.length) {
      setFinished(true)
      const totalMs = Date.now() - startTs - (pauseAccumRef.current || 0)
      const score = answers.filter((a) => a.correct).length
      onFinish(score, questions.length, totalMs)
    } else {
      setIndex((i) => i + 1)
    }
  }

  const useHint = () => {
    if (hintsLeft <= 0) return
    // 找到第一个错位元素并放置到正确位置
    for (let i = 0; i < order.length; i++) {
      if (order[i] !== q.answer[i]) {
        const targetVal = q.answer[i]
        const curIdx = order.indexOf(targetVal)
        if (curIdx >= 0) {
          const arr = [...order]
          arr.splice(curIdx, 1)
          arr.splice(i, 0, targetVal)
          setOrder(arr)
          setHintsLeft((h) => h - 1)
          break
        }
      }
    }
  }

  const score = answers.filter((a) => a.correct).length

  /** 导出错题 CSV */
  const exportWrongCSV = () => {
    const rows = [['index', 'yourOrder', 'answer', 'correct']]
    answers.forEach((a, i) => {
      rows.push([String(i + 1), a.order.join(' '), questions[i].answer.join(' '), a.correct ? '1' : '0'])
    })
    const wrongOnly = rows.filter((r, idx) => idx === 0 || r[3] === '0')
    const csv = wrongOnly.map((r) => r.map(escapeCSV).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sequence-wrong.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // HTML5 拖拽
  const dragIndex = useRef<number | null>(null)
  const onDragStart = (i: number) => (e: React.DragEvent) => {
    dragIndex.current = i
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDragOver = (i: number) => (e: React.DragEvent) => {
    e.preventDefault()
    const from = dragIndex.current
    if (from === null || from === i) return
    const arr = [...order]
    const [moved] = arr.splice(from, 1)
    arr.splice(i, 0, moved)
    dragIndex.current = i
    setOrder(arr)
  }
  const onDragEnd = () => {
    dragIndex.current = null
  }

  return (
    <div className="space-y-3">
      {/* HUD */}
      <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-violet-700 ring-1 ring-violet-200">
            进度 {Math.min(index + 1, questions.length)}/{questions.length}
          </span>
          <span className="text-slate-600">难度 {level.toUpperCase()}</span>
          <span className="text-slate-600">提示 {hintsLeft}</span>
          {timedPerQuestionSec > 0 && (
            <span className="text-slate-600">
              倒计时/题 {timedPerQuestionSec}s · 剩余 {Math.max(0, timeLeft)}s
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundOn(!soundOn)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            声音：{soundOn ? '开' : '关'}
          </button>
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            设置
          </button>
          <button
            onClick={togglePause}
            className={
              'rounded-full px-3 py-1 text-xs font-semibold ' +
              (paused ? 'bg-amber-600 text-white' : 'bg-slate-900 text-white')
            }
          >
            {paused ? '继续' : '暂停'}
          </button>
          <button onClick={onExit} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
            退出
          </button>
        </div>
      </div>

      {/* 设置 */}
      {showSettings && (
        <div className="rounded-xl bg-white p-3 text-sm shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <div className="text-slate-700">每题倒计时</div>
            <div className="inline-flex items-center overflow-hidden rounded-full ring-1 ring-slate-200">
              <button
                onClick={() => (timedPerQuestionSec = Math.max(0, (timedPerQuestionSec || 0) - 5))}
                className="px-3 py-1.5 text-xs hover:bg-slate-50"
              >
                −
              </button>
              <span className="px-3 text-xs font-bold text-slate-900">
                {timedPerQuestionSec ? timedPerQuestionSec : 0} s
              </span>
              <button
                onClick={() => (timedPerQuestionSec = Math.min(60, (timedPerQuestionSec || 0) + 5))}
                className="px-3 py-1.5 text-xs hover:bg-slate-50"
              >
                +
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">提示：设置将在下一题生效。</p>
        </div>
      )}

      {/* 主体或结果 */}
      {!finished ? (
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-3 text-sm font-semibold text-slate-800">将卡片从小到大排序，然后提交</div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {order.map((v, i) => (
              <div
                key={i + '-' + v}
                draggable
                onDragStart={onDragStart(i)}
                onDragOver={onDragOver(i)}
                onDragEnd={onDragEnd}
                className="flex cursor-move items-center justify-between rounded-xl bg-slate-50 px-3 py-3 text-lg font-bold text-slate-900 ring-1 ring-slate-200"
                aria-grabbed="true"
              >
                <span>{v}</span>
                <span className="h-2 flex-1 rounded-full bg-gradient-to-r from-sky-400 to-blue-600 ml-3"
                  style={{ maxWidth: Math.max(40, Math.min(200, (v % 200) + 40)) }} />
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={useHint}
              disabled={hintsLeft <= 0}
              className={
                'rounded-full px-3 py-2 text-sm font-semibold ' +
                (hintsLeft > 0 ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-500')
              }
            >
              提示（剩 {hintsLeft}）
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  handleSubmit()
                  setTimeout(() => goNext(), JSON.stringify(order) === JSON.stringify(q.answer) ? 900 : 1200)
                }}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                提交
              </button>
              <button onClick={onExit} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
                退出
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-2 text-lg font-bold text-slate-900">本次结果</div>
          <div className="mb-3 text-sm text-slate-700">
            正确 {score}/{questions.length}
          </div>
          <div className="mb-2 flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={reviewWrongOnly}
                onChange={(e) => setReviewWrongOnly(e.target.checked)}
              />
              只看错题
            </label>
            <button
              onClick={exportWrongCSV}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              导出错题
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {questions.map((qq, i) => {
              const a = answers[i]
              if (reviewWrongOnly && a.correct) return null
              const you = a.order.join(' ')
              const ans = qq.answer.join(' ')
              return (
                <div
                  key={i}
                  className={
                    'rounded-xl p-3 ring-1 ' +
                    (a.correct ? 'bg-emerald-50 ring-emerald-200' : 'bg-rose-50 ring-rose-200')
                  }
                >
                  <div className="text-sm font-semibold text-slate-900">
                    {i + 1}. 排序
                  </div>
                  <div className="mt-1 text-xs text-slate-700">
                    正确：{ans} · 你的排序：{you} {a.correct ? '✅' : '❌'}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-3 flex justify-end">
            <button onClick={onExit} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default SequenceOrderGame

function escapeCSV(v: string) {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) return '"' + v.replaceAll('"', '""') + '"'
  return v
}
