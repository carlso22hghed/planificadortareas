// Shared logic for the "borde resaltado" (highlighted border) feature.
// Determines whether a task is currently in the urgent window.
//
// Rules:
// - If today is Mon-Thu (and not Friday): highlighted = due today, OR due tomorrow before 14:30.
// - If today is Fri/Sat/Sun, OR Mon before 14:30: highlighted = due any time
//   between now and the upcoming Monday 14:30 (inclusive of all of Fri/Sat/Sun).

import type { DbTask } from '@/types/app';

/** Returns the start (Date) and end (Date) of the current "highlight window" given `now`. */
export function getHighlightWindow(now: Date = new Date()): { start: Date; end: Date } {
  const dow = now.getDay(); // 0 Sun ... 6 Sat
  const isMondayBefore1430 = dow === 1 && (now.getHours() < 14 || (now.getHours() === 14 && now.getMinutes() <= 30));
  const isWeekend = dow === 5 || dow === 6 || dow === 0 || isMondayBefore1430;

  if (isWeekend) {
    // Window: from start of "now" day up to next Monday 14:30 (inclusive).
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    // Find next Monday at or after today.
    const end = new Date(now);
    const daysUntilMonday = (1 - dow + 7) % 7; // 0 if today is Monday
    end.setDate(end.getDate() + daysUntilMonday);
    end.setHours(14, 30, 0, 0);
    // If today is Monday before 14:30, daysUntilMonday=0 and end is today 14:30 — correct.
    return { start, end };
  }

  // Weekday: today + tomorrow before 14:30
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setDate(end.getDate() + 1);
  end.setHours(14, 30, 0, 0);
  return { start, end };
}

/** True if a task's due datetime falls within the current highlight window and it is pending. */
export function isTaskHighlighted(task: DbTask, now: Date = new Date()): boolean {
  if (task.completed || !task.due_date) return false;
  const time = task.due_time || '23:59';
  const due = new Date(`${task.due_date}T${time}:00`);
  const { start, end } = getHighlightWindow(now);
  return due >= start && due <= end;
}
