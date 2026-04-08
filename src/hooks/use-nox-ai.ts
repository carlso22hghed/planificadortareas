import { useState, useEffect, useCallback, useMemo } from 'react';
import type { DbTask } from '@/types/app';

interface CourseMemory {
  courseName: string;
  assignmentDays: number[]; // 0=Sunday, 6=Saturday
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

const STORAGE_MEMORY = 'noxMemory';
const STORAGE_LAST = 'noxLastRecommendation';
const STORAGE_ENABLED = 'noxEnabled';

function getMemory(): NoxMemory {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_MEMORY) || '{"courses":{}}');
  } catch { return { courses: {} }; }
}

function saveMemory(m: NoxMemory) {
  localStorage.setItem(STORAGE_MEMORY, JSON.stringify(m));
}

function getLastRecommendation(): NoxRecommendation | null {
  try {
    const raw = localStorage.getItem(STORAGE_LAST);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function calcPriority(task: DbTask): number {
  if (!task.due_date) return 20;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(task.due_date);
  const days = Math.ceil((due.getTime() - now.getTime()) / (86400000));
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
    if (course.assignmentDays.length === 0) continue;
    
    // Check if today matches a pattern day
    if (course.assignmentDays.includes(todayDay)) {
      // Check if a task was already assigned this week for this course
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

  // Holiday week detection
  const pendingWithDates = tasks.filter(t => !t.completed && t.due_date);
  if (pendingWithDates.length > 0) {
    const futureDues = pendingWithDates
      .map(t => new Date(t.due_date!).getTime())
      .filter(d => d > today.getTime())
      .sort();
    
    if (futureDues.length === 0 || (futureDues[0] - today.getTime()) > 7 * 86400000) {
      predictions.push('Nox AI cree que esta semana habrá pocas tareas nuevas — parece la última semana antes de vacaciones');
    }
  }

  return predictions;
}

export function useNoxAI(tasks: DbTask[]) {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(STORAGE_ENABLED) !== 'false');
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<NoxRecommendation | null>(() => getLastRecommendation());

  const toggleEnabled = useCallback((val: boolean) => {
    setEnabled(val);
    localStorage.setItem(STORAGE_ENABLED, String(val));
  }, []);

  const clearMemory = useCallback(() => {
    localStorage.removeItem(STORAGE_MEMORY);
    localStorage.removeItem(STORAGE_LAST);
    setRecommendation(null);
  }, []);

  // Update memory when tasks change
  const updateMemory = useCallback((allTasks: DbTask[]) => {
    const memory = getMemory();

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

    // Recalculate patterns
    for (const course of Object.values(memory.courses)) {
      const dates = course.taskHistory
        .map(h => h.assignedDate)
        .filter(Boolean)
        .sort();
      
      // Calculate assignment day frequencies
      const dayCounts: Record<number, number> = {};
      for (const d of dates) {
        const day = new Date(d).getDay();
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      }
      // Days that appear more than 30% of the time
      const total = dates.length;
      course.assignmentDays = Object.entries(dayCounts)
        .filter(([, count]) => count / total >= 0.3)
        .map(([day]) => parseInt(day));

      // Average frequency
      if (dates.length > 1) {
        const timestamps = dates.map(d => new Date(d).getTime()).sort();
        let totalGap = 0;
        for (let i = 1; i < timestamps.length; i++) {
          totalGap += timestamps[i] - timestamps[i - 1];
        }
        course.avgFrequencyDays = Math.round(totalGap / (timestamps.length - 1) / 86400000);
      }
    }

    saveMemory(memory);
    return memory;
  }, []);

  const generate = useCallback((allTasks: DbTask[]) => {
    if (!enabled) return;
    setLoading(true);

    // Simulate brief thinking delay
    setTimeout(() => {
      const memory = updateMemory(allTasks);
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

      // Encouragement
      let encouragement = '';
      if (pending.length === 0) encouragement = '¡Increíble! No tienes tareas pendientes. ¡Disfruta tu tiempo libre! 🎉';
      else if (pending.length <= 2) encouragement = `¡Vas bien! Solo tienes ${pending.length} tarea${pending.length > 1 ? 's' : ''} pendiente${pending.length > 1 ? 's' : ''}`;
      else if (todayTasks.length === 0) encouragement = 'Esta semana parece tranquila, aprovecha para repasar 📚';
      else encouragement = `Tienes ${todayTasks.length} tarea${todayTasks.length > 1 ? 's' : ''} urgente${todayTasks.length > 1 ? 's' : ''} — ¡tú puedes! 💪`;

      const rec: NoxRecommendation = { todayTasks, tomorrowTasks, predictions, encouragement };
      setRecommendation(rec);
      localStorage.setItem(STORAGE_LAST, JSON.stringify(rec));
      setLoading(false);
    }, 800);
  }, [enabled, updateMemory]);

  // Auto-generate on tasks change
  useEffect(() => {
    if (tasks.length > 0 && enabled) {
      generate(tasks);
    }
  }, [tasks, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return { enabled, toggleEnabled, loading, recommendation, generate, clearMemory };
}
