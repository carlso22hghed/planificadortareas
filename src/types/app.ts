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
  type: 'homework' | 'exam' | 'event' | 'match' | 'task';
  subject?: string;
  rival?: string;
  homeAway?: 'home' | 'away';
}

export type TabType = 'inicio' | 'deberes' | 'examenes' | 'eventos' | 'partidos' | 'tareas';

export type PartidosMode = 'off' | 'replace' | 'new_tab';

export interface AppSettings {
  appName: string;
  schoolName: string;
  partidosMode: PartidosMode;
  tareasEnabled: boolean;
  enabledSubjects: string[];
}

export const ALL_SUBJECTS = [
  'Matemáticas', 'Lengua', 'Inglés', 'Francés', 'Alemán', 'Italiano', 'Portugués', 'Chino',
  'Ciencias Naturales', 'Biología', 'Física', 'Química',
  'Ciencias Sociales', 'Historia', 'Geografía',
  'Educación Física', 'Música', 'Arte', 'Dibujo',
  'Tecnología', 'Informática', 'Programación',
  'Filosofía', 'Ética', 'Religión',
  'Economía', 'Latín', 'Griego',
  'Educación Cívica', 'Psicología',
  'Teatro', 'Danza',
  'Robótica', 'Astronomía',
  'Otra',
];

export const DEFAULT_SETTINGS: AppSettings = {
  appName: 'Cosas que Hacer',
  schoolName: 'Colegio Portaceli',
  partidosMode: 'off',
  tareasEnabled: false,
  enabledSubjects: ['Matemáticas', 'Lengua', 'Inglés', 'Ciencias Naturales', 'Ciencias Sociales', 'Educación Física', 'Música', 'Arte', 'Tecnología', 'Religión'],
};
