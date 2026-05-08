import { useMemo } from 'react';
import type { DbTask } from '@/types/app';

interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastActiveDate: string;
  activeDates: string[];
}

interface ProductivityData {
  tasksCompletedToday: number;
  totalTasksToday: number;
  percentComplete: number;
  avgMinutesPerTask: number;
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

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function getDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function useProductivity(tasks: DbTask[], scheduleBlocks?: { day: number; time: string }[]) {
  // Build complete history from task data only (no localStorage)
  const weeklyHistory = useMemo<DayHistory[]>(() => {
    const dateMap = new Map<string, { completed: number; total: number }>();

    tasks.forEach(t => {
      // Use due_date as the primary date, fallback to created_at
      const date = t.due_date || (t.created_at ? t.created_at.split('T')[0] : null);
      if (!date) return;
      const entry = dateMap.get(date) || { completed: 0, total: 0 };
      entry.total++;
      if (t.completed) entry.completed++;
      dateMap.set(date, entry);
    });

    const history: DayHistory[] = [];
    dateMap.forEach((val, date) => {
      history.push({ date, completed: val.completed, total: val.total });
    });

    history.sort((a, b) => a.date.localeCompare(b.date));

    // Keep last 60 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);
    const cutoffStr = getDateStr(cutoff);
    return history.filter(h => h.date >= cutoffStr);
  }, [tasks]);

  // Calculate streaks from task completion data
  const streak = useMemo<StreakData>(() => {
    const today = getToday();

    // Get unique dates where user completed at least one task
    const completedDates = new Set<string>();
    tasks.forEach(t => {
      if (!t.completed) return;
      const date = t.due_date || (t.created_at ? t.created_at.split('T')[0] : null);
      if (date) completedDates.add(date);
    });

    const sortedDates = Array.from(completedDates).sort().reverse();
    if (sortedDates.length === 0) {
      return { currentStreak: 0, bestStreak: 0, lastActiveDate: '', activeDates: [] };
    }

    // Calculate current streak - must include today or yesterday
    let currentStreak = 0;
    const checkDate = new Date();
    const todayStr = getDateStr(checkDate);
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = getDateStr(yesterdayDate);

    if (completedDates.has(todayStr) || completedDates.has(yesterdayStr)) {
      // Start counting from the most recent active date
      const startDate = completedDates.has(todayStr) ? new Date(todayStr + 'T12:00:00') : new Date(yesterdayStr + 'T12:00:00');
      const d = new Date(startDate);
      while (completedDates.has(getDateStr(d))) {
        currentStreak++;
        d.setDate(d.getDate() - 1);
      }
    }

    // Calculate best streak
    let bestStreak = 0;
    let tempStreak = 1;
    const allDates = Array.from(completedDates).sort();
    for (let i = 1; i < allDates.length; i++) {
      const prev = new Date(allDates[i - 1] + 'T12:00:00');
      const curr = new Date(allDates[i] + 'T12:00:00');
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else {
        bestStreak = Math.max(bestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    bestStreak = Math.max(bestStreak, tempStreak, currentStreak);

    return {
      currentStreak,
      bestStreak,
      lastActiveDate: sortedDates[0] || '',
      activeDates: Array.from(completedDates),
    };
  }, [tasks]);

  const productivity = useMemo<ProductivityData>(() => {
    const today = getToday();
    const tomorrow = getTomorrow();
    const relevantTasks = tasks.filter(t => {
      if (t.due_date === today) return true;
      if (t.completed && t.created_at?.startsWith(today)) return true;
      if (t.due_date === tomorrow) {
        const time = t.due_time || '23:59';
        const hour = parseInt(time.split(':')[0]);
        if (hour < 12) return true;
      }
      return false;
    });
    const completed = relevantTasks.filter(t => t.completed).length;
    const total = Math.max(relevantTasks.length, 1);
    const percent = Math.round((completed / total) * 100);
    const now = new Date();
    const todayDay = now.getDay();
    let busyMinutes = 0;
    if (scheduleBlocks) {
      busyMinutes = scheduleBlocks.filter(b => b.day === todayDay).length * 60;
    }
    const availableMinutes = Math.max(360 - busyMinutes, 60);
    const avgPerTask = completed > 0 ? Math.round(availableMinutes / completed) : 0;
    return { tasksCompletedToday: completed, totalTasksToday: relevantTasks.length, percentComplete: percent, avgMinutesPerTask: avgPerTask, activeMinutesToday: availableMinutes };
  }, [tasks, scheduleBlocks]);

  const level = useMemo(() => {
    const streakScore = Math.min(streak.currentStreak * 10, 50);
    const productivityScore = productivity.percentComplete * 0.5;
    const totalScore = streakScore + productivityScore;
    let current = LEVEL_CONFIG[0];
    for (const l of LEVEL_CONFIG) {
      if (totalScore >= l.minScore) current = l;
    }
    return { ...current, score: Math.round(totalScore) };
  }, [streak.currentStreak, productivity.percentComplete]);

  // Weekly summary data for Monday recap
  const lastWeekSummary = useMemo(() => {
    const now = new Date();
    const lastMonday = new Date(now);
    lastMonday.setDate(lastMonday.getDate() - lastMonday.getDay() - 6);
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastSunday.getDate() + 6);
    const startStr = getDateStr(lastMonday);
    const endStr = getDateStr(lastSunday);

    const weekTasks = tasks.filter(t => {
      const d = t.due_date || (t.created_at ? t.created_at.split('T')[0] : null);
      return d && d >= startStr && d <= endStr;
    });

    const completed = weekTasks.filter(t => t.completed).length;
    const pending = weekTasks.filter(t => !t.completed).length;

    // Most productive day
    const dayCount = [0, 0, 0, 0, 0, 0, 0];
    weekTasks.filter(t => t.completed).forEach(t => {
      const d = t.due_date || (t.created_at ? t.created_at.split('T')[0] : null);
      if (d) {
        const dow = new Date(d + 'T12:00:00').getDay();
        dayCount[dow]++;
      }
    });
    const bestDayIdx = dayCount.indexOf(Math.max(...dayCount));
    const bestDay = DAY_NAMES[bestDayIdx];

    return { completed, pending, bestDay, total: weekTasks.length };
  }, [tasks]);

  return { streak, productivity, level, levelConfig: LEVEL_CONFIG, weeklyHistory, lastWeekSummary };
}
