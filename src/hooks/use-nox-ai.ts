import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import type { DbTask } from '@/types/app';

interface CourseMemory {
  courseName: string;
  assignmentDays: number[];
  avgFrequencyDays: number;
  taskHistory: { title: string; assignedDate: string; dueDate: string }[];
}

interface NoxMemory {
  courses: Record<string, CourseMemory>;
}

interface NoxRecommendation {
  todayTasks: { name: string; subject: string; dueDate: string | null; daysUntilDue: number; priority: number }[];
  tomorrowTasks: { name: string; subject: string; dueDate: string | null; daysUntilDue: number; priority: number }[];
  predictions: string[];
  encouragement: string;
}

const MIN_HISTORY_FOR_PREDICTION = 4; // Need at least 4 historical tasks to predict patterns

function calcPriority(task: DbTask): number {
  if (!task.due_date) return 20;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(task.due_date);
  const days = Math.ceil((due.getTime() - now.getTime()) / 86400000);
  let score = days <= 1 ? 100 : days <= 3 ? 70 : days <= 7 ? 40 : 20;
  if (task.description) score += 10;
  if (task.importance === 'urgente') score += 30;
  else if (task.importance === 'importante') score += 15;
  return score;
}

function daysUntil(dateStr: string | null): number {
  if (!dateStr) return 999;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(dateStr).getTime() - now.getTime()) / 86400000);
}

function detectPatterns(memory: NoxMemory, tasks: DbTask[]): string[] {
  const predictions: string[] = [];
  const today = new Date();
  const todayDay = today.getDay();
  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  for (const [, course] of Object.entries(memory.courses)) {
    // Only predict if we have enough historical data
    if (course.taskHistory.length < MIN_HISTORY_FOR_PREDICTION) continue;
    if (course.assignmentDays.length === 0) continue;

    if (course.assignmentDays.includes(todayDay)) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - todayDay);
      const hasThisWeek = tasks.some(t =>
        t.subject === course.courseName &&
        t.created_at &&
        new Date(t.created_at) >= weekStart
      );
      if (!hasThisWeek) {
        const patternDayName = dayNames[todayDay];
        predictions.push(`${course.courseName} suele poner tarea los ${patternDayName}s, estate atento`);
      }
    }
  }

  // No speculative "holiday week" predictions - only show what we know from data

  return predictions;
}

function buildMemory(allTasks: DbTask[]): NoxMemory {
  const memory: NoxMemory = { courses: {} };

  for (const task of allTasks) {
    const courseName = task.subject || 'Sin asignatura';
    if (!memory.courses[courseName]) {
      memory.courses[courseName] = { courseName, assignmentDays: [], avgFrequencyDays: 0, taskHistory: [] };
    }
    const course = memory.courses[courseName];
    const exists = course.taskHistory.some(h => h.title === task.name && h.dueDate === (task.due_date || ''));
    if (!exists) {
      course.taskHistory.push({
        title: task.name,
        assignedDate: task.created_at.split('T')[0],
        dueDate: task.due_date || '',
      });
    }
  }

  for (const course of Object.values(memory.courses)) {
    const dates = course.taskHistory.map(h => h.assignedDate).filter(Boolean).sort();
    const dayCounts: Record<number, number> = {};
    for (const d of dates) {
      const day = new Date(d).getDay();
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    }
    const total = dates.length;
    // Only mark pattern days if there's enough data and the pattern is strong (>= 40%)
    if (total >= MIN_HISTORY_FOR_PREDICTION) {
      course.assignmentDays = Object.entries(dayCounts)
        .filter(([, count]) => count / total >= 0.4)
        .map(([day]) => parseInt(day));
    }

    if (dates.length > 1) {
      const timestamps = dates.map(d => new Date(d).getTime()).sort();
      let totalGap = 0;
      for (let i = 1; i < timestamps.length; i++) {
        totalGap += timestamps[i] - timestamps[i - 1];
      }
      course.avgFrequencyDays = Math.round(totalGap / (timestamps.length - 1) / 86400000);
    }
  }

  return memory;
}

export function useNoxAI(tasks: DbTask[]) {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(() => localStorage.getItem('noxEnabled') !== 'false');
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<NoxRecommendation | null>(null);
  const [dbLoaded, setDbLoaded] = useState(false);

  // Load last recommendation from database on mount
  useEffect(() => {
    if (!user || dbLoaded) return;
    (async () => {
      const { data } = await supabase
        .from('nox_memory')
        .select('last_recommendation')
        .eq('user_id', user.id)
        .single();
      if (data?.last_recommendation) {
        setRecommendation(data.last_recommendation as unknown as NoxRecommendation);
      }
      setDbLoaded(true);
    })();
  }, [user, dbLoaded]);

  const toggleEnabled = useCallback((val: boolean) => {
    setEnabled(val);
    localStorage.setItem('noxEnabled', String(val));
  }, []);

  const clearMemory = useCallback(async () => {
    if (!user) return;
    await supabase.from('nox_memory').delete().eq('user_id', user.id);
    setRecommendation(null);
  }, [user]);

  const generate = useCallback((allTasks: DbTask[]) => {
    if (!enabled || !user) return;
    setLoading(true);

    setTimeout(async () => {
      const memory = buildMemory(allTasks);
      const pending = allTasks.filter(t => !t.completed);

      const scored = pending.map(t => ({
        name: t.name,
        subject: t.subject || 'Sin asignatura',
        dueDate: t.due_date,
        daysUntilDue: daysUntil(t.due_date),
        priority: calcPriority(t),
      })).sort((a, b) => b.priority - a.priority);

      const todayTasks = scored.filter(t => t.daysUntilDue <= 1).slice(0, 5);
      const tomorrowTasks = scored.filter(t => t.daysUntilDue > 1 && t.daysUntilDue <= 3).slice(0, 5);

      const predictions = detectPatterns(memory, allTasks);

      let encouragement = '';
      if (pending.length === 0) encouragement = 'No tienes tareas pendientes. Disfruta tu tiempo libre.';
      else if (pending.length <= 2) encouragement = `Solo tienes ${pending.length} tarea${pending.length > 1 ? 's' : ''} pendiente${pending.length > 1 ? 's' : ''}`;
      else if (todayTasks.length === 0) encouragement = 'No tienes nada urgente para hoy';
      else encouragement = `Tienes ${todayTasks.length} tarea${todayTasks.length > 1 ? 's' : ''} urgente${todayTasks.length > 1 ? 's' : ''}`;

      const rec: NoxRecommendation = { todayTasks, tomorrowTasks, predictions, encouragement };
      setRecommendation(rec);

      // Save to database
      await supabase.from('nox_memory').upsert({
        user_id: user.id,
        memory_data: memory as any,
        last_recommendation: rec as any,
      }, { onConflict: 'user_id' });

      setLoading(false);
    }, 600);
  }, [enabled, user]);

  useEffect(() => {
    if (tasks.length > 0 && enabled && dbLoaded) {
      generate(tasks);
    }
  }, [tasks, enabled, dbLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  return { enabled, toggleEnabled, loading, recommendation, generate, clearMemory };
}
