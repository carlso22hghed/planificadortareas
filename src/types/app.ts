export interface CountdownEvent {
  id: string;
  name: string;
  targetDate: string; // ISO string
  targetTime: string; // HH:mm
}

export interface Task {
  id: string;
  name: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  reminderTime?: string; // HH:mm
  completed: boolean;
  type: 'homework' | 'exam' | 'event' | 'match';
}

export type TabType = 'inicio' | 'deberes' | 'examenes' | 'eventos';
