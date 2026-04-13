import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, ExternalLink, Paperclip, Repeat, Timer } from 'lucide-react';
import type { DbTask } from '@/types/app';
import { cn } from '@/lib/utils';
import { getSubjectColor } from '@/lib/subject-colors';

interface TaskDetailDialogProps {
  task: DbTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatSpanishDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getCountdownText(dateStr: string, timeStr?: string | null): { text: string; isUrgent: boolean; isExpired: boolean } {
  const now = new Date();
  const target = new Date(`${dateStr}T${timeStr || '23:59'}:00`);
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) return { text: 'Vencida', isUrgent: true, isExpired: true };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  if (days === 0 && hours === 0) return { text: `${minutes} min`, isUrgent: true, isExpired: false };
  if (days === 0) return { text: hours === 1 ? `${hours} hora` : `${hours} horas`, isUrgent: true, isExpired: false };
  if (days === 0 && hours <= 2) return { text: '¡Hoy!', isUrgent: true, isExpired: false };
  return { text: days === 1 ? '1 día' : `${days} días`, isUrgent: days <= 1, isExpired: false };
}

const IMPORTANCE_LABELS: Record<string, string> = {
  importante: '❗ Importante',
  urgente: '🔴 Urgente',
  voluntario: '💚 Voluntario',
  normal: 'Normal',
};

const TaskDetailDialog = ({ task, open, onOpenChange }: TaskDetailDialogProps) => {
  const [countdown, setCountdown] = useState<{ text: string; isUrgent: boolean; isExpired: boolean } | null>(null);

  useEffect(() => {
    if (!task?.due_date || !open) {
      setCountdown(null);
      return;
    }
    const update = () => setCountdown(getCountdownText(task.due_date!, task.due_time));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [task?.due_date, task?.due_time, open]);

  if (!task) return null;

  const subjectColor = task.subject ? getSubjectColor(task.subject) : null;
  const importance = task.importance;
  const importanceLabel = importance && importance !== 'normal' ? IMPORTANCE_LABELS[importance] || importance : null;

  // Detect classroom task by checking if description exists and subject looks like a course name
  // We store courseId/courseWorkId in the task for classroom-sourced tasks
  const classroomCourseId = (task as any).classroom_course_id;
  const classroomWorkId = (task as any).classroom_work_id;
  const isClassroom = !!(classroomCourseId && classroomWorkId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl leading-tight">{task.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Subject badge */}
          {task.subject && subjectColor && (
            <Badge variant="secondary" className={cn("text-xs", subjectColor.bg, subjectColor.text)}>
              {task.subject}
            </Badge>
          )}

          {/* Due date + countdown */}
          {task.due_date && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarDays className="w-4 h-4" />
                <span className="capitalize">{formatSpanishDate(task.due_date)}</span>
              </div>
              {task.due_time && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{task.due_time}</span>
                </div>
              )}
              {countdown && (
                <Badge variant={countdown.isExpired ? 'destructive' : countdown.isUrgent ? 'default' : 'secondary'}
                  className={cn("text-xs", countdown.isExpired && "animate-pulse")}>
                  {countdown.isExpired ? '🔴 ' : '⏳ '}{countdown.text}
                </Badge>
              )}
            </div>
          )}

          {/* Importance */}
          {importanceLabel && (
            <p className="text-sm font-medium">{importanceLabel}</p>
          )}

          {/* Description */}
          {task.description && (
            <div className="bg-muted/50 rounded-xl p-3 border border-border">
              <p className="text-sm text-foreground whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Location */}
          {task.location && (
            <p className="text-sm text-muted-foreground">📍 {task.location}</p>
          )}

          {/* Estimated time */}
          {(task as any).estimated_minutes && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Timer className="w-4 h-4" />
              <span>Tiempo estimado: {(task as any).estimated_minutes} min</span>
            </div>
          )}

          {/* Recurrence */}
          {(task as any).recurrence_rule && (task as any).recurrence_rule !== 'none' && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Repeat className="w-4 h-4" />
              <span>Tarea recurrente</span>
            </div>
          )}

          {/* Attachments */}
          {(task as any).attachments && (task as any).attachments.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-1"><Paperclip className="w-4 h-4" /> Archivos adjuntos</p>
              <div className="space-y-1">
                {((task as any).attachments as string[]).map((url, i) => {
                  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                  return (
                    <div key={i}>
                      {isImage ? (
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt={`Adjunto ${i + 1}`} className="rounded-lg max-h-40 object-cover border border-border" />
                        </a>
                      ) : (
                        <a href={url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm text-primary hover:bg-muted transition-colors">
                          <Paperclip className="w-4 h-4" />
                          Archivo {i + 1}
                          <ExternalLink className="w-3 h-3 ml-auto" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Classroom link */}
          {isClassroom && (
            <Button
              variant="outline"
              className="w-full gap-2 border-[#1e8a6e] text-[#1e8a6e] hover:bg-[#1e8a6e]/10"
              onClick={() => window.open(`https://classroom.google.com/c/${classroomCourseId}/a/${classroomWorkId}/details`, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
              Más detalles en Classroom
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;
