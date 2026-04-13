export interface TaskTemplate {
  id: string;
  name: string;
  emoji: string;
  description: string;
  tasks: {
    name: string;
    type: string;
    daysOffset: number; // days before the target date
    description?: string;
    estimated_minutes?: number;
  }[];
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'exam-final',
    name: 'Examen Final',
    emoji: '📝',
    description: 'Prepárate para un examen con un plan escalonado',
    tasks: [
      { name: 'Hacer resumen del tema', type: 'homework', daysOffset: 7, description: 'Resume los conceptos clave', estimated_minutes: 60 },
      { name: 'Repasar apuntes', type: 'homework', daysOffset: 5, description: 'Revisa todos los apuntes de clase', estimated_minutes: 45 },
      { name: 'Hacer ejercicios de práctica', type: 'homework', daysOffset: 3, description: 'Resuelve problemas de exámenes anteriores', estimated_minutes: 90 },
      { name: 'Simulacro de examen', type: 'homework', daysOffset: 1, description: 'Hazte un examen simulado completo', estimated_minutes: 60 },
      { name: 'Examen', type: 'exam', daysOffset: 0, description: '¡Buena suerte!' },
    ],
  },
  {
    id: 'project',
    name: 'Trabajo/Proyecto',
    emoji: '🎯',
    description: 'Organiza un trabajo en grupo o individual',
    tasks: [
      { name: 'Investigar el tema', type: 'homework', daysOffset: 10, estimated_minutes: 60 },
      { name: 'Crear esquema/índice', type: 'homework', daysOffset: 8, estimated_minutes: 30 },
      { name: 'Redactar borrador', type: 'homework', daysOffset: 5, estimated_minutes: 120 },
      { name: 'Revisar y corregir', type: 'homework', daysOffset: 2, estimated_minutes: 45 },
      { name: 'Entrega final', type: 'homework', daysOffset: 0, description: 'Entregar el proyecto completo' },
    ],
  },
  {
    id: 'presentation',
    name: 'Presentación Oral',
    emoji: '🎤',
    description: 'Prepara una exposición paso a paso',
    tasks: [
      { name: 'Preparar contenido', type: 'homework', daysOffset: 7, estimated_minutes: 60 },
      { name: 'Crear diapositivas', type: 'homework', daysOffset: 4, estimated_minutes: 90 },
      { name: 'Ensayar presentación', type: 'homework', daysOffset: 2, estimated_minutes: 30 },
      { name: 'Ensayo final', type: 'homework', daysOffset: 1, estimated_minutes: 20 },
      { name: 'Presentación', type: 'event', daysOffset: 0, description: '¡A presentar!' },
    ],
  },
  {
    id: 'weekly-study',
    name: 'Estudio Semanal',
    emoji: '📚',
    description: 'Plan de estudio para una semana',
    tasks: [
      { name: 'Lunes: Repasar apuntes', type: 'homework', daysOffset: 6, estimated_minutes: 45 },
      { name: 'Martes: Ejercicios prácticos', type: 'homework', daysOffset: 5, estimated_minutes: 60 },
      { name: 'Miércoles: Lectura complementaria', type: 'homework', daysOffset: 4, estimated_minutes: 30 },
      { name: 'Jueves: Esquemas y resúmenes', type: 'homework', daysOffset: 3, estimated_minutes: 45 },
      { name: 'Viernes: Autoevaluación', type: 'homework', daysOffset: 2, estimated_minutes: 30 },
    ],
  },
];

export function generateTasksFromTemplate(
  template: TaskTemplate,
  targetDate: string,
  subject?: string,
): Partial<any>[] {
  const target = new Date(targetDate + 'T12:00:00');
  return template.tasks.map(t => {
    const d = new Date(target);
    d.setDate(d.getDate() - t.daysOffset);
    return {
      name: t.name,
      type: t.type,
      due_date: d.toISOString().split('T')[0],
      completed: false,
      subject: subject || null,
      description: t.description || null,
      estimated_minutes: t.estimated_minutes || null,
      template_name: template.id,
    };
  });
}