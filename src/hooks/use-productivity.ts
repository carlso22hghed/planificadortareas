import { useState, useEffect, useCallback, useMemo } from 'react';
import type { DbTask } from '@/types/app';

interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  activeDates: string[];  // history of active dates
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

function getStreakData(): StreakData {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as StreakData;
  } catch {
    return { currentStreak: 0, bestStreak: 0, lastActiveDate: '', activeDates: [] };
  }
}

function saveStreakData(data: StreakData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useProductivity(tasks: DbTask[], scheduleBlocks?: { day: number; time: string }[]) {
  const [streak, setStreak] = useState<StreakData>(() => getStreakData());

  // Check and update streak based on today's activity
  const updateStreak = useCallback((completedToday: boolean) => {
    const data = getStreakData();
    const today = getToday();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (completedToday && data.lastActiveDate !== today) {
      // Mark today as active
      if (!data.activeDates) data.activeDates = [];
      if (!data.activeDates.includes(today)) data.activeDates.push(today);
      
      if (data.lastActiveDate === yesterdayStr) {
        data.currentStreak += 1;
      } else if (data.lastActiveDate !== today) {
        data.currentStreak = 1;
      }
      data.lastActiveDate = today;
      if (data.currentStreak > (data.bestStreak || 0)) {
        data.bestStreak = data.currentStreak;
      }
    } else if (!completedToday) {
      // Check if streak should reset (missed yesterday)
      if (data.lastActiveDate && data.lastActiveDate !== today && data.lastActiveDate !== yesterdayStr) {
        data.currentStreak = 0;
      }
    }

    saveStreakData(data);
    setStreak({ ...data });
  }, []);

  // Calculate productivity for today
  const productivity = useMemo<ProductivityData>(() => {
    const today = getToday();
    const todayTasks = tasks.filter(t => {
      // Tasks due today or completed today
      if (t.due_date === today) return true;
      if (t.completed && t.created_at?.startsWith(today)) return true;
      return false;
    });

    const completed = todayTasks.filter(t => t.completed).length;
    const total = Math.max(todayTasks.length, 1);
    const percent = Math.round((completed / total) * 100);

    // Estimate time: afternoon study period (15:00-21:00 = 360 mins) minus schedule blocks
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
      totalTasksToday: todayTasks.length,
      percentComplete: percent,
      avgMinutesPerTask: avgPerTask,
      activeMinutesToday: availableMinutes,
    };
  }, [tasks, scheduleBlocks]);

  // Calculate level
  const level = useMemo(() => {
    const streakScore = Math.min(streak.currentStreak * 10, 50); // max 50 from streak
    const productivityScore = productivity.percentComplete * 0.5; // max 50 from completion
    const totalScore = streakScore + productivityScore;

    let current = LEVEL_CONFIG[0];
    for (const l of LEVEL_CONFIG) {
      if (totalScore >= l.minScore) current = l;
    }
    return { ...current, score: Math.round(totalScore) };
  }, [streak.currentStreak, productivity.percentComplete]);

  // Auto-update streak when tasks change
  useEffect(() => {
    const today = getToday();
    const completedToday = tasks.some(t => t.completed && (t.due_date === today || t.created_at?.startsWith(today)));
    updateStreak(completedToday);
  }, [tasks, updateStreak]);

  return { streak, productivity, level, levelConfig: LEVEL_CONFIG };
}
