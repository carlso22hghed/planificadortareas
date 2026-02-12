import type { Tables } from '@/integrations/supabase/types';

export type DbTask = Tables<'tasks'>;
export type DbCountdown = Tables<'countdowns'>;
export type DbProfile = Tables<'profiles'>;
export type DbSettings = Tables<'user_settings'>;

export type TaskType = 'homework' | 'exam' | 'event' | 'match' | 'task';
export type TabType = 'inicio' | 'deberes' | 'examenes' | 'eventos' | 'partidos' | 'tareas';
export type PartidosMode = 'off' | 'replace' | 'new_tab';

export const ALL_SUBJECTS = [
  // Educación Primaria y Secundaria
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
  // Bachillerato
  'Matemáticas Aplicadas', 'Matemáticas Académicas',
  'Historia del Arte', 'Cultura Audiovisual',
  'Dibujo Técnico', 'Diseño',
  'Fundamentos de Administración', 'Cultura Emprendedora',
  // Universidad
  'Cálculo', 'Álgebra Lineal', 'Estadística',
  'Derecho', 'Medicina', 'Enfermería', 'Farmacia',
  'Arquitectura', 'Ingeniería', 'Electrónica',
  'Contabilidad', 'Marketing', 'Finanzas',
  'Sociología', 'Antropología', 'Ciencias Políticas',
  'Periodismo', 'Comunicación Audiovisual',
  'Traducción e Interpretación',
  'Bioquímica', 'Biotecnología', 'Genética',
  'Fisioterapia', 'Nutrición', 'Odontología',
  'Veterinaria', 'Ciencias Ambientales',
  'Trabajo Social', 'Educación Social',
  'Magisterio', 'Pedagogía',
  'Criminología', 'Relaciones Internacionales',
  // FP (Formación Profesional)
  'Administración y Finanzas',
  'Desarrollo de Aplicaciones Web',
  'Desarrollo de Aplicaciones Multiplataforma',
  'Sistemas Microinformáticos y Redes',
  'Electricidad y Electrónica',
  'Mecánica', 'Automoción',
  'Cocina y Gastronomía', 'Pastelería',
  'Peluquería y Estética',
  'Sanidad', 'Laboratorio',
  'Comercio y Marketing',
  'Turismo', 'Hostelería',
  'Educación Infantil',
  'Animación Sociocultural',
  'Imagen y Sonido',
  'Construcción',
  'Otra',
];

export const ALL_SPORT_TYPES = ['Fútbol', 'Baloncesto', 'Voleibol'];

export const DEFAULT_ENABLED_SUBJECTS = [
  'Matemáticas', 'Lengua', 'Inglés', 'Ciencias Naturales',
  'Ciencias Sociales', 'Educación Física', 'Música', 'Arte', 'Tecnología', 'Religión',
];
