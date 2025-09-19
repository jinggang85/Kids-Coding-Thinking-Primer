/**
 * @file LogicTrainingGame.tsx
 * @description 真假命题判断：从题库中抽题判断 True/False。支持声音开关、题库统计、避免重复、结果复盘（只看错题/导出错题）。
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'

export type Level = 'easy' | 'normal' | 'hard'

export interface LogicTrainingGameProps {
  onExit: () => void
  onFinish: (score: number, total: number, elapsedMs?: number) => void
  count?: number
}

/** 命题结构 */
interface Item {
  id: number
  text: string
  truth: boolean
  level: Level
}

interface Ans {
  pick: boolean | null
  correct: boolean
  timeUsedMs: number
}

/** 生成 100 道基础题库（可扩展） */
function buildBank(): Item[] {
  const items: Item[] = []
  let id = 1
  // EASY 40：小数值加减/比较/奇偶
  for (let i = 0; i < 40; i++) {
    const a = rand(1, 20)
    const b = rand(1, 20)
    const kind = i % 3
    if (kind === 0) {
      const ans = a + b
      const tweak = rand(-2, 2)
      const show = ans + (Math.random() < 0.5 ? 0 : tweak)
      items.push({ id: id++, text: `${a} + ${b} = ${show}`, truth: show === ans, level: 'easy' })
    } else if (kind === 1) {
      const ans = a - b
      const show = ans + (Math.random() < 0.5 ? 0 : rand(-2, 2))
      items.push({ id: id++, text: `${a} - ${b} = ${show}`, truth: show === ans, level: 'easy' })
    } else {
      const even = a % 2 === 0
      const claimEven = Math.random() < 0.5 ? even : !even
      items.push({ id: id++, text: `${a} 是偶数`, truth: claimEven === true && even === true ? true : claimEven === true ? false : !even, level: 'easy' })
    }
  }
  // NORMAL 40：大小比较/合取析取（简单语义）
  for (let i = 0; i < 40; i++) {
    const a = rand(10, 60)
    const b = rand(10, 60)
    if (i % 2 === 0) {
      const op = Math.random() < 0.5 ? '>' : '<'
      const truth = op === '>' ? a > b : a < b
      const maybeFlip = Math.random() < 0.3 ? (op === '>' ? '<' : '>') : op
      const t2 = maybeFlip === '>' ? a > b : a < b
      items.push({ id: id++, text: `${a} ${maybeFlip} ${b}`, truth: t2, level: 'normal' })
    } else {
      const p = a % 2 === 0 // p: a 偶数
      const q = b % 2 === 1 // q: b 奇数
      const form = Math.random() < 0.5 ? '且' : '或'
      const claimTruth = form === '且' ? p && q : p || q
      // 随机保真/翻转
      const isTrue = Math.random() < 0.6 ? claimTruth : !claimTruth
      items.push({ id: id++, text: `“${a} 为偶数”${form}“${b} 为奇数”`, truth: isTrue, level: 'normal' })
    }
  }
  // HARD 20：蕴含/逆否简单模式
  for (let i = 0; i < 20; i++) {
    const a = rand(2, 9)
    const b = rand(2, 9)
    // 命题：若 x 为偶数，则 x+${a} 为偶数
    const even = Math.random() < 0.5
    const text = `若 x 为${even ? '偶数' : '奇数'}，则 x+${a} 为${(even && a % 2 === 0) || (!even && a % 2 === 0) ? '偶数' : '奇数'}`
    const truth = a % 2 === 0 // x+偶 偶，x+奇 奇 -> 该命题恒真；我们再随机反转部分以混淆
    const finalTruth = Math.random() < 0.7 ? truth : !truth
    items.push({ id: id++, text, truth: finalTruth, level: 'hard' })
  }
  return items
}

const BANK = buildBank() // 100 题
const BANK_COUNT = BANK.length

function pickIndices(level: Level, used: Set<number>, n: number) {
  // 优先当前难度池
  const pool = BANK.filter((x) => x.level === level && !used.has(x.id))
  const others = BANK.filter((x) => !used.has(x.id))
  const res: number[] = []
  const source = (arr: Item[]) => {
    const ids = arr.map((x) => x.id)
    shuffle(ids)
    for (const id of ids) {
      if (res.length >= n) break
      res.push(id)
    }
  }
  source(pool)
  if (res.length < n) source(others)
  return res
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
  const beep = (f: number, ms = 120, type: OscillatorType = 'sine', vol = 0.04) => {
    if (!enabled) return
    const ctx = ensure()
    if (!ctx) return
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    g.gain.value = vol
    osc.type = type
    osc.frequency.value = f
    osc.connect(g).connect(ctx.destination)
    const t = ctx.currentTime
    osc.start(t)
    osc.stop(t + ms / 1000)
  }
  const ok = () => {
    beep(680, 100, 'triangle')
    setTimeout(() => beep(920, 120, 'triangle'), 110)
  }
  const bad = () => {
    beep(320, 140, 'sawtooth')
    setTimeout(() => beep(220, 160, 'sawtooth'), 120)
  }
  return { enabled, setEnabled, ok, bad }
}

/**
 * 真假命题判断组件
 */
export const LogicTrainingGame: React.FC<LogicTrainingGameProps> = ({ onExit, onFinish, count = 8 }) => {
  const [level, setLevel] = useState<Level>('easy')
  const usedRef = useRef<Set<number>>(new Set())
  const [indices, setIndices] = useState<number[]>(() => pickIndices(level, usedRef.current, count))
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [showBankInfo, setShowBankInfo] = useState(false)
  const [startTs] = useState(() => Date.now())
  const pauseAccumRef = useRef(0)
  const pauseBeginRef = useRef<number | null>(null)
  const { enabled: soundOn, setEnabled: setSoundOn, ok: playOk, bad: playBad } = useSound()

  const q = useMemo(() => BANK.find((x) => x.id === indices[index])!, [indices, index])

  useEffect(() => {
    // 每轮开始时，确保不重复
    indices.forEach((id) => usedRef.current.add(id))
  }, [indices])

  const [answers, setAnswers] = useState<Ans[]>([])
  const [finished, setFinished] = useState(false)
  const [reviewWrongOnly, setReviewWrongOnly] = useState(false)

  const qStartRef = useRef<number>(Date.now())
  useEffect(() => {
    qStartRef.current = Date.now()
  }, [index])

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

  const answer = (pick: boolean) => {
    const used = Date.now() - qStartRef.current
    const correct = pick === q.truth
    setAnswers((arr) => [...arr, { pick, correct, timeUsedMs: used }])
    correct ? playOk() : playBad()
    setTimeout(() => goNext(), correct ? 900 : 1200)
  }

  const goNext = () => {
    if (index + 1 >= indices.length) {
      setFinished(true)
      const elapsed = Date.now() - startTs - (pauseAccumRef.current || 0)
      const score = answers.filter((a) => a.correct).length
      onFinish(score, indices.length, elapsed)
    } else {
      setIndex((i) => i + 1)
    }
  }

  /** 切换难度并重新抽题（避免重复） */
  const switchLevel = (lv: Level) => {
    setLevel(lv)
    const ids = pickIndices(lv, usedRef.current, count)
    setIndices(ids)
    setIndex(0)
    setAnswers([])
    setFinished(false)
  }

  /** 导出错题 CSV */
  const exportWrongCSV = () => {
    const rows = [['index', 'text', 'truth', 'yourPick', 'correct']]
    answers.forEach((a, i) => {
      rows.push([
        String(i + 1),
        BANK.find((x) => x.id === indices[i])?.text || '',
        (BANK.find((x) => x.id === indices[i])?.truth ? '1' : '0'),
        a.pick === null ? 'null' : a.pick ? '1' : '0',
        a.correct ? '1' : '0',
      ])
    })
    const wrongOnly = rows.filter((r, idx) => idx === 0 || r[4] === '0')
    const csv = wrongOnly.map((r) => r.map(escapeCSV).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'logic-wrong.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const score = answers.filter((a) => a.correct).length

  return (
    <div className="space-y-3">
      {/* HUD */}
      <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700 ring-1 ring-indigo-200">
            进度 {Math.min(index + 1, indices.length)}/{indices.length}
          </span>
          <div className="inline-flex overflow-hidden rounded-full ring-1 ring-slate-200">
            {(['easy','normal','hard'] as const).map((lv) => {
              const sel = lv === level
              return (
                <button
                  key={lv}
                  onClick={() => switchLevel(lv)}
                  className={'px-3 py-1 text-xs font-semibold ' + (sel ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50')}
                >
                  {lv.toUpperCase()}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setShowBankInfo((v) => !v)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            title="题库统计"
          >
            库：{BANK_COUNT}
          </button>
          <span className="text-slate-600">已对 {score} 题</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundOn(!soundOn)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            声音：{soundOn ? '开' : '关'}
          </button>
          <button
            onClick={togglePause}
            className={'rounded-full px-3 py-1 text-xs font-semibold ' + (paused ? 'bg-amber-600 text-white' : 'bg-slate-900 text-white')}
          >
            {paused ? '继续' : '暂停'}
          </button>
          <button onClick={onExit} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
            退出
          </button>
        </div>
      </div>

      {/* 题库统计卡片 */}
      {showBankInfo && (
        <div className="rounded-xl bg-white p-3 text-sm shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center gap-4">
            <span className="text-slate-700">总题数：{BANK_COUNT}</span>
            <span className="text-slate-700">EASY：40</span>
            <span className="text-slate-700">NORMAL：40</span>
            <span className="text-slate-700">HARD：20</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">系统会优先抽取当前难度未使用题，若不足则回退到所有未使用题，避免本轮重复。</p>
        </div>
      )}

      {/* 主体/结果 */}
      {!finished ? (
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-3 text-sm font-semibold text-slate-800">判断下列命题的真假</div>
          <div className="mb-4 rounded-xl bg-slate-50 p-4 text-center text-lg font-bold text-slate-900">
            {q.text}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => answer(true)}
              disabled={paused}
              className="rounded-xl bg-emerald-600 px-3 py-3 text-center text-white ring-1 ring-emerald-500 hover:bg-emerald-700"
            >
              正确
            </button>
            <button
              onClick={() => answer(false)}
              disabled={paused}
              className="rounded-xl bg-rose-600 px-3 py-3 text-center text-white ring-1 ring-rose-500 hover:bg-rose-700"
            >
              错误
            </button>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-2 text-lg font-bold text-slate-900">本次结果</div>
          <div className="mb-3 text-sm text-slate-700">正确 {score}/{indices.length}</div>

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
            {indices.map((id, i) => {
              const item = BANK.find((x) => x.id === id)!
              const a = answers[i]
              if (reviewWrongOnly && a.correct) return null
              return (
                <div
                  key={id}
                  className={
                    'rounded-xl p-3 ring-1 ' +
                    (a.correct ? 'bg-emerald-50 ring-emerald-200' : 'bg-rose-50 ring-rose-200')
                  }
                >
                  <div className="text-sm font-semibold text-slate-900">
                    {i + 1}. {item.text}
                  </div>
                  <div className="mt-1 text-xs text-slate-700">
                    正确答案：{item.truth ? '正确' : '错误'} · 你的判断：{a.pick ? '正确' : '错误'} {a.correct ? '✅' : '❌'}
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

export default LogicTrainingGame

function escapeCSV(v: string) {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) return '"' + v.replaceAll('"', '""') + '"'
  return v
}
