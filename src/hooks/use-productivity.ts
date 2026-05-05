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

export type ProductivityLevel = 'Vago' | 'Aprendiz' | 'Constante' | 'Estudioso' | 'Máquina';

const LEVEL_CONFIG: { name: ProductivityLevel; emoji: string; minScore: number; color: string }[] = [
  { name: 'Vago', emoji: 'bed', minScore: 0, color: 'text-red-400' },
  { name: 'Aprendiz', emoji: 'book-open', minScore: 20, color: 'text-orange-400' },
  { name: 'Constante', emoji: 'dumbbell', minScore: 40, color: 'text-yellow-400' },
  { name: 'Estudioso', emoji: 'graduation-cap', minScore: 65, color: 'text-green-400' },
  { name: 'Máquina', emoji: 'rocket', minScore: 85, color: 'text-purple-400' },
];

const STORAGE_KEY = 'productivityStreak';

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

export function useProductivity(tasks: DbTask[], scheduleBlocks?: { day: number; time: string }[]) {
  const [streak, setStreak] = useState<StreakData>(() => getStreakData());

  // Check if any task was completed today
  const hasCompletedTaskToday = useMemo(() => {
    const today = getToday();
    return tasks.some(t => t.completed && (t.due_date === today || t.created_at?.startsWith(today)));
  }, [tasks]);

  // Update streak whenever tasks change
  useEffect(() => {
    const data = getStreakData();
    const today = getToday();
    const yesterday = getYesterday();

    if (hasCompletedTaskToday) {
      // User completed a task today
      if (data.lastActiveDate === today) {
        // Already recorded today, no change needed
        setStreak({ ...data });
        return;
      }
      
      // New active day
      if (!data.activeDates) data.activeDates = [];
      if (!data.activeDates.includes(today)) data.activeDates.push(today);

      if (data.lastActiveDate === yesterday) {
        // Consecutive day - extend streak
        data.currentStreak += 1;
      } else if (!data.lastActiveDate) {
        // First ever active day
        data.currentStreak = 1;
      } else {
        // Missed at least one day - reset streak to 1
        data.currentStreak = 1;
      }
      
      data.lastActiveDate = today;
      if (data.currentStreak > (data.bestStreak || 0)) {
        data.bestStreak = data.currentStreak;
      }
    } else {
      // No task completed today
      // If last active was before yesterday, streak is broken
      if (data.lastActiveDate && data.lastActiveDate !== today && data.lastActiveDate !== yesterday) {
        data.currentStreak = 0;
      }
    }

    saveStreakData(data);
    setStreak({ ...data });
  }, [hasCompletedTaskToday, tasks]);

  // Calculate productivity - includes today AND tomorrow morning tasks
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

    return {
      tasksCompletedToday: completed,
      totalTasksToday: relevantTasks.length,
      percentComplete: percent,
      avgMinutesPerTask: avgPerTask,
      activeMinutesToday: availableMinutes,
    };
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

  return { streak, productivity, level, levelConfig: LEVEL_CONFIG };
}
