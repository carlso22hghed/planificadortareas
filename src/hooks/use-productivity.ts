import { useMemo } from 'react';
import type { DbTask } from '@/types/app';
import { isTaskHighlighted } from '@/lib/highlight';

interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastActiveDate: string;
  activeDates: string[];
}

interface ProductivityData {
  tasksCompletedToday: number;        // total completed today (highlighted + not)
  highlightedCompleted: number;       // completed AND in current highlight window
  totalTasksToday: number;            // count of currently-highlighted (pending+completed-from-today's-highlight)
  percentComplete: number;            // can exceed 100 per spec
  avgMinutesPerTask: number;          // avg gap between consecutive completions today
  activeMinutesToday: number;
}

interface DayHistory {
  date: string;
  completed: number;
  total: number;
}

export type ProductivityLevel = 'Vago' | 'Aprendiz' | 'Constante' | 'Estudioso' | 'Máquina';

const LEVEL_CONFIG: { name: ProductivityLevel; emoji: string; minScore: number; color: string }[] = [
  { name: 'Vago', emoji: 'bed', minScore: 0, color: 'text-red-400' },
  { name: 'Aprendiz', emoji: 'book-open', minScore: 20, color: 'text-orange-400' },
  { name: 'Constante', emoji: 'dumbbell', minScore: 40, color: 'text-yellow-400' },
  { name: 'Estudioso', emoji: 'graduation-cap', minScore: 65, color: 'text-green-400' },
  { name: 'Máquina', emoji: 'rocket', minScore: 85, color: 'text-purple-400' },
];

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function getDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Returns the date a task counts as completed for productivity (yyyy-mm-dd) or null.
 *  Exams: only count "estudiar/practicar" (study_completed) and attribute to the
 *  day BEFORE the exam's due_date (so it boosts productivity on the study day).
 *  Other tasks: use completed + completed_at as usual.
 */
function completionDate(t: DbTask): string | null {
  if (t.type === 'exam') {
    if (!(t as any).study_completed) return null;
    if (t.due_date) {
      const d = new Date(t.due_date + 'T12:00:00');
      d.setDate(d.getDate() - 1);
      return getDateStr(d);
    }
    const ca = (t as any).completed_at;
    if (ca) return ca.split('T')[0];
    return t.created_at ? t.created_at.split('T')[0] : null;
  }
  if (!t.completed) return null;
  const ca = (t as any).completed_at;
  if (ca) return ca.split('T')[0];
  return t.due_date || (t.created_at ? t.created_at.split('T')[0] : null);
}

function completionTimestamp(t: DbTask): Date | null {
  if (t.type === 'exam') {
    if (!(t as any).study_completed) return null;
    if (t.due_date) {
      const d = new Date(t.due_date + 'T12:00:00');
      d.setDate(d.getDate() - 1);
      return d;
    }
    return null;
  }
  if (!t.completed) return null;
  const ca = (t as any).completed_at;
  if (ca) return new Date(ca);
  if (t.created_at) return new Date(t.created_at);
  return null;
}

export function useProductivity(tasks: DbTask[], _scheduleBlocks?: { day: number; time: string }[]) {
  const todayStr = getDateStr(new Date());

  // Per-day completion history (driven entirely by completed tasks)
  const weeklyHistory = useMemo<DayHistory[]>(() => {
    const dateMap = new Map<string, number>();
    tasks.forEach(t => {
      const date = completionDate(t);
      if (!date) return;
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    });

    const history: DayHistory[] = [];
    dateMap.forEach((completed, date) => {
      history.push({ date, completed, total: completed });
    });
    history.sort((a, b) => a.date.localeCompare(b.date));
    return history;
  }, [tasks]);

  // Streak: consecutive days ending today (or yesterday) with ≥1 completion.
  const streak = useMemo<StreakData>(() => {
    const completedDates = new Set<string>();
    tasks.forEach(t => {
      const d = completionDate(t);
      if (d) completedDates.add(d);
    });

    if (completedDates.size === 0) {
      return { currentStreak: 0, bestStreak: 0, lastActiveDate: '', activeDates: [] };
    }

    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = getDateStr(yesterdayDate);

    // Current streak: count back from today (if completed today) or yesterday.
    let currentStreak = 0;
    if (completedDates.has(todayStr)) {
      const d = new Date(todayStr + 'T12:00:00');
      while (completedDates.has(getDateStr(d))) {
        currentStreak++;
        d.setDate(d.getDate() - 1);
      }
    } else if (completedDates.has(yesterdayStr)) {
      const d = new Date(yesterdayStr + 'T12:00:00');
      while (completedDates.has(getDateStr(d))) {
        currentStreak++;
        d.setDate(d.getDate() - 1);
      }
    }
    // else: streak is 0 (the user broke the streak by not completing yesterday and today).

    // Best streak: longest run of consecutive days with completions.
    let bestStreak = 0;
    let temp = 1;
    const allDates = Array.from(completedDates).sort();
    for (let i = 1; i < allDates.length; i++) {
      const prev = new Date(allDates[i - 1] + 'T12:00:00');
      const curr = new Date(allDates[i] + 'T12:00:00');
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diffDays === 1) temp++;
      else { bestStreak = Math.max(bestStreak, temp); temp = 1; }
    }
    bestStreak = Math.max(bestStreak, temp, currentStreak);

    return {
      currentStreak,
      bestStreak,
      lastActiveDate: allDates[allDates.length - 1] || '',
      activeDates: Array.from(completedDates),
    };
  }, [tasks, todayStr]);

  // Today's productivity: based on highlighted tasks + raw completions today.
  const productivity = useMemo<ProductivityData>(() => {
    const now = new Date();
    // Highlighted set (those with the urgent border right now)
    const highlightedTasks = tasks.filter(t => isTaskHighlighted(t, now) || (t.completed && t.due_date && (() => {
      // Include tasks that *would* be highlighted if not completed (so totals are stable when toggled)
      const fakePending = { ...t, completed: false } as DbTask;
      return isTaskHighlighted(fakePending, now);
    })()));

    // Completions today (any task, regardless of highlight)
    const completedToday = tasks.filter(t => completionDate(t) === todayStr);

    const highlightedCompleted = highlightedTasks.filter(t => t.completed).length;
    const total = highlightedTasks.length;

    // % completed = completedToday / max(total,1) * 100, can exceed 100
    const percent = total > 0
      ? Math.round((completedToday.length / total) * 100)
      : (completedToday.length > 0 ? 100 : 0);

    // Avg minutes between consecutive completions today
    const stamps = completedToday
      .map(completionTimestamp)
      .filter((d): d is Date => !!d)
      .sort((a, b) => a.getTime() - b.getTime());
    let avgGap = 0;
    if (stamps.length >= 2) {
      let sum = 0;
      for (let i = 1; i < stamps.length; i++) sum += (stamps[i].getTime() - stamps[i - 1].getTime());
      avgGap = Math.round(sum / (stamps.length - 1) / 60000);
    }

    return {
      tasksCompletedToday: completedToday.length,
      highlightedCompleted,
      totalTasksToday: total,
      percentComplete: percent,
      avgMinutesPerTask: avgGap,
      activeMinutesToday: 0,
    };
  }, [tasks, todayStr]);

  // Productivity level: only grows with completions and streak.
  const level = useMemo(() => {
    const totalCompleted = tasks.filter(t => t.completed).length;
    const completionScore = Math.min(totalCompleted * 0.5, 50);
    const streakScore = Math.min(streak.currentStreak * 5, 50);
    const totalScore = Math.round(completionScore + streakScore);
    let current = LEVEL_CONFIG[0];
    for (const l of LEVEL_CONFIG) if (totalScore >= l.minScore) current = l;
    return { ...current, score: totalScore };
  }, [tasks, streak.currentStreak]);

  // Last week summary (Monday recap)
  const lastWeekSummary = useMemo(() => {
    const now = new Date();
    const lastMonday = new Date(now);
    lastMonday.setDate(lastMonday.getDate() - lastMonday.getDay() - 6);
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastSunday.getDate() + 6);
    const startStr = getDateStr(lastMonday);
    const endStr = getDateStr(lastSunday);

    const weekCompleted = tasks.filter(t => {
      const d = completionDate(t);
      return d && d >= startStr && d <= endStr;
    });
    const completed = weekCompleted.length;
    const dayCount = [0, 0, 0, 0, 0, 0, 0];
    weekCompleted.forEach(t => {
      const d = completionDate(t);
      if (d) dayCount[new Date(d + 'T12:00:00').getDay()]++;
    });
    const bestDayIdx = dayCount.indexOf(Math.max(...dayCount));
    return { completed, pending: 0, bestDay: DAY_NAMES[bestDayIdx], total: completed };
  }, [tasks]);

  return { streak, productivity, level, levelConfig: LEVEL_CONFIG, weeklyHistory, lastWeekSummary };
}
