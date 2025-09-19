/**
 * @file MathQuickGame.tsx
 * @description 心算选择题小游戏：加/减法，4 选 1，支持自适应、每题倒计时、暂停、声音反馈、结果复盘（只看错题/导出错题）。
 * 视觉高对比、移动端友好、无外部依赖。
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'

/** 游戏难度 */
export type Level = 'easy' | 'normal'

/** 组件 Props */
export interface MathQuickGameProps {
  /** 退出回调 */
  onExit: () => void
  /** 完成回调：score 正确数、total 题数、elapsedMs 总用时 */
  onFinish: (score: number, total: number, elapsedMs?: number) => void
  /** 题量（默认 8） */
  count?: number
  /** 难度（默认 easy） */
  level?: Level
  /** 是否自适应（连对升级范围） */
  adaptive?: boolean
  /** 每题倒计时（秒，0 代表不计时） */
  timedPerQuestionSec?: number
}

/** 单题结构 */
interface Q {
  text: string
  answer: number
  choices: number[]
}

/** 作答记录 */
interface Ans {
  pick: number | null
  correct: boolean
  timeUsedMs: number
}

/** WebAudio 简易音效：正确/错误 */
function useSound() {
  const ctxRef = useRef<AudioContext | null>(null)
  const [enabled, setEnabled] = useState(true)

  const ensure = () => {
    if (!ctxRef.current) {
      try {
        ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      } catch {
        // ignore
      }
    }
    return ctxRef.current
  }

  /** 短促提示音 */
  const beep = (freq: number, durationMs = 120, type: OscillatorType = 'sine', vol = 0.04) => {
    if (!enabled) return
    const ctx = ensure()
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.value = vol
    osc.connect(gain).connect(ctx.destination)
    const now = ctx.currentTime
    osc.start(now)
    osc.stop(now + durationMs / 1000)
  }

  const playCorrect = () => {
    // 上扬两音
    beep(660, 100, 'triangle')
    setTimeout(() => beep(880, 120, 'triangle'), 100)
  }
  const playWrong = () => {
    // 下落两音
    beep(330, 120, 'sawtooth')
    setTimeout(() => beep(220, 140, 'sawtooth'), 110)
  }

  return { enabled, setEnabled, playCorrect, playWrong }
}

/** 根据难度获取数值范围 */
function getRange(level: Level) {
  return level === 'easy' ? { min: 1, max: 20 } : { min: 5, max: 50 }
}

/** 生成单题（加/减随机） */
function genQuestion(level: Level): Q {
  const { min, max } = getRange(level)
  const a = rand(min, max)
  const b = rand(min, max)
  const sub = Math.random() < 0.5
  const text = sub ? `${a + b} - ${b} = ?` : `${a} + ${b} = ?`
  const answer = sub ? a : a + b
  const choices = shuffle(unique([answer, answer + 1, answer - 1, answer + rand(-3, 3)])).slice(0, 4)
  return { text, answer, choices: ensureChoices(choices, answer) }
}

/** 确保四选项且包含答案 */
function ensureChoices(choices: number[], answer: number) {
  const set = new Set(choices)
  set.add(answer)
  while (set.size < 4) set.add(answer + rand(-5, 5))
  return shuffle(Array.from(set)).slice(0, 4)
}

/** 数组去重 */
function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}

/** 打乱 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 随机整数 [min, max] */
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 数学选择题小游戏主组件
 */
export const MathQuickGame: React.FC<MathQuickGameProps> = ({
  onExit,
  onFinish,
  count = 8,
  level: initLevel = 'easy',
  adaptive = true,
  timedPerQuestionSec = 0,
}) => {
  const [level, setLevel] = useState<Level>(initLevel)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [startTs] = useState<number>(() => Date.now())
  const pauseAccumRef = useRef(0)
  const pauseBeginRef = useRef<number | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const { enabled: soundOn, setEnabled: setSoundOn, playCorrect, playWrong } = useSound()

  // 题库
  const questions = useMemo(() => {
    return Array.from({ length: count }, () => genQuestion(level))
  }, [count, level])

  // 每题计时
  const [timeLeft, setTimeLeft] = useState(timedPerQuestionSec)
  const qStartRef = useRef<number>(Date.now())
  useEffect(() => {
    qStartRef.current = Date.now()
    setTimeLeft(timedPerQuestionSec)
  }, [index, timedPerQuestionSec])

  useEffect(() => {
    if (!timedPerQuestionSec || paused) return
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 0) return 0
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [timedPerQuestionSec, paused])

  // 作答记录
  const [answers, setAnswers] = useState<Ans[]>([])
  const [finished, setFinished] = useState(false)
  const [reviewWrongOnly, setReviewWrongOnly] = useState(false)

  // 超时自动判错并进入下一题
  useEffect(() => {
    if (!timedPerQuestionSec) return
    if (paused) return
    if (timeLeft > 0) return
    if (finished) return
    // 当 timeLeft == 0 且当前题未提交，判错并前进
    commitAnswer(null)
    // 反馈等待 1200ms
    const delay = setTimeout(() => goNext(), 1200)
    return () => clearTimeout(delay)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])

  /** 暂停/继续 */
  const togglePause = () => {
    if (!paused) {
      pauseBeginRef.current = Date.now()
      setPaused(true)
    } else {
      if (pauseBeginRef.current) {
        pauseAccumRef.current += Date.now() - pauseBeginRef.current
      }
      pauseBeginRef.current = null
      setPaused(false)
    }
  }

  /** 提交答案 */
  const commitAnswer = (pick: number | null) => {
    const q = questions[index]
    const used = Date.now() - qStartRef.current
    const correct = pick === q.answer
    setAnswers((arr) => [...arr, { pick, correct, timeUsedMs: used }])
    if (pick === null) {
      playWrong()
    } else {
      correct ? playCorrect() : playWrong()
    }
    if (adaptive && pick !== null) {
      // 自适应：连对提升范围（轻量）
      if (correct && level === 'easy') setLevel('normal')
      if (!correct && level === 'normal') setLevel('easy')
    }
  }

  /** 进入下一题或结束 */
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

  /** 导出错题（CSV） */
  const exportWrongCSV = () => {
    const rows = [
      ['index', 'question', 'answer', 'yourPick', 'correct'],
      ...answers.map((a, i) => [
        String(i + 1),
        questions[i].text,
        String(questions[i].answer),
        a.pick === null ? 'timeout' : String(a.pick),
        a.correct ? '1' : '0',
      ]),
    ]
    const wrongOnly = rows.filter((r, idx) => idx === 0 || r[4] === '0')
    const csv = wrongOnly.map((r) => r.map(escapeCSV).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'math-wrong.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // 渲染
  const q = questions[index]
  const score = answers.filter((a) => a.correct).length

  return (
    <div className="space-y-3">
      {/* 顶部 HUD */}
      <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-200">
            进度 {Math.min(index + 1, questions.length)}/{questions.length}
          </span>
          <span className="text-slate-600">难度 {level.toUpperCase()}</span>
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
          <button
            onClick={onExit}
            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            退出
          </button>
        </div>
      </div>

      {/* 设置面板 */}
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
          <p className="mt-2 text-xs text-slate-500">小提示：更改后应用于下一题。</p>
        </div>
      )}

      {/* 主体/结果 */}
      {!finished ? (
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-3 flex items-center justify-between text-sm">
            <div className="font-semibold text-slate-800">选择正确答案</div>
            <div className="text-slate-600">
              已对 <span className="font-bold text-emerald-700">{score}</span> 题
            </div>
          </div>
          <div className="mb-4 rounded-xl bg-slate-50 p-4 text-center text-2xl font-extrabold text-slate-900">
            {q.text}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {q.choices.map((c) => (
              <button
                key={c}
                onClick={() => {
                  if (paused) return
                  commitAnswer(c)
                  setTimeout(() => goNext(), c === q.answer ? 900 : 1200)
                }}
                className="rounded-xl bg-white px-3 py-3 text-center text-lg font-bold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                {c}
              </button>
            ))}
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
              return (
                <div
                  key={i}
                  className={
                    'rounded-xl p-3 ring-1 ' +
                    (a.correct
                      ? 'bg-emerald-50 ring-emerald-200'
                      : 'bg-rose-50 ring-rose-200')
                  }
                >
                  <div className="text-sm font-semibold text-slate-900">
                    {i + 1}. {qq.text}
                  </div>
                  <div className="mt-1 text-xs text-slate-700">
                    正确答案：{qq.answer} · 你的作答：
                    {a.pick === null ? '超时' : a.pick}{' '}
                    {a.correct ? '✅' : '❌'}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-3 flex justify-end">
            <button
              onClick={onExit}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MathQuickGame

/** CSV 字段转义 */
function escapeCSV(v: string) {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return '"' + v.replaceAll('"', '""') + '"'
  }
  return v
}
