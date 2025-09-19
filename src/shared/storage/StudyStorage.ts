/**
 * @file StudyStorage.ts
 * @description Local storage utilities to persist study records and compute summaries for the Parent Center.
 */

export interface StudyRecord {
  /** Module name, e.g., '加减法练习' */
  module: string
  /** Correct count */
  score: number
  /** Total count */
  total: number
  /** Elapsed time in ms */
  elapsedMs: number
  /** Timestamp (ms) */
  timestamp: number
}

const KEY = 'kids-coding-study-records:v1'

/**
 * @description Read all records from localStorage.
 */
export function getRecords(): StudyRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StudyRecord[]
    // Basic validation
    return Array.isArray(parsed) ? parsed.filter(v => typeof v?.timestamp === 'number') : []
  } catch {
    return []
  }
}

/**
 * @description Append a new record to localStorage.
 */
export function addRecord(rec: StudyRecord): void {
  if (typeof window === 'undefined') return
  const arr = getRecords()
  arr.push(rec)
  try {
    localStorage.setItem(KEY, JSON.stringify(arr))
  } catch {
    // silent fail if quota issues
  }
}

/**
 * @description Remove all records from localStorage.
 */
export function clearRecords(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

/**
 * @description Get latest N records, most recent first.
 */
export function getRecentRecords(limit = 3): StudyRecord[] {
  const arr = getRecords().sort((a, b) => b.timestamp - a.timestamp)
  return arr.slice(0, limit)
}

/**
 * @description Utility: format a timestamp to yyyy-MM-dd.
 */
export function toDateKey(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * @description Get labels for last 7 days ending today, as Chinese weekdays.
 * Output: [{key: '2025-08-18', label: '周一'} ...]
 */
export function getLast7DayLabels(): { key: string; label: string }[] {
  const res: { key: string; label: string }[] = []
  const map = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    res.push({ key: toDateKey(d.getTime()), label: map[d.getDay()] })
  }
  return res
}

/**
 * @description Get records within the last N days (inclusive of today).
 */
export function getRecordsWithinDays(days: number): StudyRecord[] {
  const end = Date.now()
  const start = end - (days - 1) * 24 * 60 * 60 * 1000
  return getRecords().filter(r => r.timestamp >= start && r.timestamp <= end)
}

/**
 * @description Get distinct module names from records.
 */
export function getModulesFromRecords(): string[] {
  const set = new Set(getRecords().map(r => r.module))
  return Array.from(set)
}

/**
 * @description Export all records as CSV string. Header included.
 * Columns: module,score,total,elapsedMs,timestamp,iso
 */
export function exportRecordsToCSV(): string {
  const rows = [
    ['module', 'score', 'total', 'elapsedMs', 'timestamp', 'iso'],
    ...getRecords().map(r => [
      escapeCsv(r.module),
      String(r.score),
      String(r.total),
      String(r.elapsedMs),
      String(r.timestamp),
      new Date(r.timestamp).toISOString(),
    ]),
  ]
  return rows.map(cols => cols.join(',')).join('\n')
}

/**
 * @description Escape CSV field (quote when necessary).
 */
function escapeCsv(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return '"' + v.replaceAll('"', '""') + '"'
  }
  return v
}

/**
 * @description Aggregate weekly stats from storage (last 7 days).
 * Returns chart-ready array and summary metrics.
 */
export function getWeeklySummaryFromStorage(): {
  weekly: { day: string; minutes: number; correctRate: number }[]
  totalMinutes: number
  avgCorrectRate: number
  streakDays: number
  correctMinutes: number
  wrongMinutes: number
} {
  const labels = getLast7DayLabels()
  const records = getRecords()
  const byDay: Record<string, { minutes: number; correct: number; total: number }> = {}
  labels.forEach(l => (byDay[l.key] = { minutes: 0, correct: 0, total: 0 }))

  for (const r of records) {
    const key = toDateKey(r.timestamp)
    if (!byDay[key]) continue
    const m = Math.max(0, Math.round(r.elapsedMs / 60000)) // minutes
    byDay[key].minutes += m
    byDay[key].correct += r.score
    byDay[key].total += r.total
  }

  const weekly = labels.map(l => {
    const v = byDay[l.key]
    const cr = v.total > 0 ? v.correct / v.total : 0
    return { day: l.label, minutes: v.minutes, correctRate: Number(cr.toFixed(2)) }
  })

  const totalMinutes = weekly.reduce((s, d) => s + d.minutes, 0)
  // Weighted by minutes if available else simple average
  let avgCorrectRate = 0
  const minuteSum = weekly.reduce((s, d) => s + d.minutes, 0)
  if (minuteSum > 0) {
    const weighted = weekly.reduce((s, d) => s + d.correctRate * d.minutes, 0)
    avgCorrectRate = Math.round((weighted / minuteSum) * 100)
  } else {
    const avg = weekly.reduce((s, d) => s + d.correctRate, 0) / (weekly.length || 1)
    avgCorrectRate = Math.round(avg * 100)
  }

  // Streak: from today backwards, count consecutive days with minutes > 0
  let streak = 0
  for (let i = weekly.length - 1; i >= 0; i--) {
    if (weekly[i].minutes > 0) streak++
    else break
  }

  const correctMinutes = weekly.reduce((s, d) => s + Math.round(d.minutes * d.correctRate), 0)
  const wrongMinutes = Math.max(0, totalMinutes - correctMinutes)

  return {
    weekly,
    totalMinutes,
    avgCorrectRate,
    streakDays: streak,
    correctMinutes,
    wrongMinutes,
  }
}
