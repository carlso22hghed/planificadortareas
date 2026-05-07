import { useState, useEffect, useCallback, useMemo } from 'react';
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

const STORAGE_KEY = 'productivityStreak';
const HISTORY_KEY = 'productivityHistory';

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function getStreakData(): StreakData {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      currentStreak: raw.currentStreak || 0,
      bestStreak: raw.bestStreak || 0,
      lastActiveDate: raw.lastActiveDate || '',
      activeDates: raw.activeDates || [],
    };
  } catch {
    return { currentStreak: 0, bestStreak: 0, lastActiveDate: '', activeDates: [] };
  }
}

function saveStreakData(data: StreakData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getHistory(): DayHistory[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveHistory(history: DayHistory[]) {
  // Keep last 60 days max
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 60);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  const trimmed = history.filter(h => h.date >= cutoffStr);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

export function useProductivity(tasks: DbTask[], scheduleBlocks?: { day: number; time: string }[]) {
  const [streak, setStreak] = useState<StreakData>(() => getStreakData());

  const hasCompletedTaskToday = useMemo(() => {
    const today = getToday();
    return tasks.some(t => t.completed && (t.due_date === today || t.created_at?.startsWith(today)));
  }, [tasks]);

  useEffect(() => {
    const data = getStreakData();
    const today = getToday();
    const yesterday = getYesterday();

    if (hasCompletedTaskToday) {
      if (data.lastActiveDate === today) {
        setStreak({ ...data });
        return;
      }
      if (!data.activeDates) data.activeDates = [];
      if (!data.activeDates.includes(today)) data.activeDates.push(today);
      if (data.lastActiveDate === yesterday) {
        data.currentStreak += 1;
      } else if (!data.lastActiveDate) {
        data.currentStreak = 1;
      } else {
        data.currentStreak = 1;
      }
      data.lastActiveDate = today;
      if (data.currentStreak > (data.bestStreak || 0)) {
        data.bestStreak = data.currentStreak;
      }
    } else {
      if (data.lastActiveDate && data.lastActiveDate !== today && data.lastActiveDate !== yesterday) {
        data.currentStreak = 0;
      }
    }
    saveStreakData(data);
    setStreak({ ...data });
  }, [hasCompletedTaskToday, tasks]);

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

  // Build and save daily history
  const weeklyHistory = useMemo<DayHistory[]>(() => {
    const history = getHistory();
    const today = getToday();
    
    // Update today's entry
    const todayTasks = tasks.filter(t => t.due_date === today || t.created_at?.startsWith(today));
    const todayCompleted = todayTasks.filter(t => t.completed).length;
    const todayTotal = todayTasks.length;
    
    const existingIdx = history.findIndex(h => h.date === today);
    if (existingIdx >= 0) {
      history[existingIdx] = { date: today, completed: todayCompleted, total: todayTotal };
    } else {
      history.push({ date: today, completed: todayCompleted, total: todayTotal });
    }

    // Also build entries from task data for past dates we might have missed
    const dateMap = new Map<string, { completed: number; total: number }>();
    tasks.forEach(t => {
      const date = t.due_date || (t.created_at ? t.created_at.split('T')[0] : null);
      if (!date) return;
      const entry = dateMap.get(date) || { completed: 0, total: 0 };
      entry.total++;
      if (t.completed) entry.completed++;
      dateMap.set(date, entry);
    });

    dateMap.forEach((val, date) => {
      if (date === today) return; // already handled
      const idx = history.findIndex(h => h.date === date);
      if (idx < 0) {
        history.push({ date, completed: val.completed, total: val.total });
      }
    });

    history.sort((a, b) => a.date.localeCompare(b.date));
    saveHistory(history);
    return history;
  }, [tasks]);

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

  return { streak, productivity, level, levelConfig: LEVEL_CONFIG, weeklyHistory };
}
