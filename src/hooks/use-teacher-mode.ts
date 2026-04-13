import { useAuth } from '@/hooks/use-auth';

/** Returns teacher-mode labels when profile.role === 'Profesor' */
export function useTeacherMode() {
  const { profile } = useAuth();
  const isTeacher = profile?.role?.toLowerCase() === 'profesor';

  const labels = isTeacher ? {
    homework: 'Planificación',
    homeworkPlural: 'Planificaciones de Clases',
    exam: 'Evaluación',
    examPlural: 'Evaluaciones',
    task: 'Actividad',
    taskPlural: 'Actividades',
    addHomework: 'Nueva planificación',
    addExam: 'Nueva evaluación',
    addTask: 'Nueva actividad',
    emptyHomework: 'No hay planificaciones pendientes',
    emptyExam: 'No hay evaluaciones próximas',
    emptyTask: 'No hay actividades pendientes',
    tabHomework: 'Clases',
    tabExam: 'Evaluaciones',
    tabTask: 'Actividades',
    shortHomework: 'Cla.',
    shortExam: 'Eval.',
    shortTask: 'Act.',
    pendingHomework: 'Clases pendientes',
    pendingExams: 'Evaluaciones próximas',
  } : {
    homework: 'Deber',
    homeworkPlural: 'Deberes',
    exam: 'Examen',
    examPlural: 'Exámenes',
    task: 'Tarea',
    taskPlural: 'Tareas',
    addHomework: 'Añadir deber',
    addExam: 'Añadir examen',
    addTask: 'Añadir tarea',
    emptyHomework: '¡No tienes deberes pendientes!',
    emptyExam: 'No hay exámenes próximos',
    emptyTask: 'No hay tareas pendientes',
    tabHomework: 'Deberes',
    tabExam: 'Exámenes',
    tabTask: 'Tareas',
    shortHomework: 'Deb.',
    shortExam: 'Exám.',
    shortTask: 'Tar.',
    pendingHomework: 'Deberes pendientes',
    pendingExams: 'Exámenes próximos',
  };

  return { isTeacher, labels };
}