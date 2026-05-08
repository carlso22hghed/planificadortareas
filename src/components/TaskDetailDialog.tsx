import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, ExternalLink, Paperclip, Repeat, Timer, PauseCircle, Ban, Send, MessageCircle } from 'lucide-react';
import type { DbTask } from '@/types/app';
import { cn } from '@/lib/utils';
import { getSubjectColor } from '@/lib/subject-colors';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';

interface TaskDetailDialogProps {
  task: DbTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatSpanishDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
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
  return { text: days === 1 ? '1 día' : `${days} días`, isUrgent: days <= 1, isExpired: false };
}

const IMPORTANCE_LABELS: Record<string, string> = {
  importante: '❗ Importante',
  urgente: '🔴 Urgente',
  voluntario: '💚 Voluntario',
  normal: 'Normal',
};

const STATUS_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente', color: 'bg-muted' },
  { value: 'en_pausa', label: 'En pausa', color: 'bg-warning/20 text-warning' },
  { value: 'bloqueada', label: 'Bloqueada', color: 'bg-destructive/20 text-destructive' },
];

const TaskDetailDialog = ({ task, open, onOpenChange }: TaskDetailDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [countdown, setCountdown] = useState<{ text: string; isUrgent: boolean; isExpired: boolean } | null>(null);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<{ text: string; date: string }[]>([]);

  useEffect(() => {
    if (!task || !open) { setComments([]); return; }
    try {
      const c = (task as any).comments;
      setComments(Array.isArray(c) ? c : []);
    } catch { setComments([]); }
  }, [task, open]);

  useEffect(() => {
    if (!task?.due_date || !open) { setCountdown(null); return; }
    const update = () => setCountdown(getCountdownText(task.due_date!, task.due_time));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [task?.due_date, task?.due_time, open]);

  if (!task) return null;

  const subjectColor = task.subject ? getSubjectColor(task.subject) : null;
  const importance = task.importance;
  const importanceLabel = importance && importance !== 'normal' ? IMPORTANCE_LABELS[importance] || importance : null;
  const taskStatus = (task as any).task_status || 'pendiente';

  const classroomCourseId = (task as any).classroom_course_id;
  const classroomWorkId = (task as any).classroom_work_id;
  const isClassroom = !!(classroomCourseId && classroomWorkId);

  const addComment = async () => {
    if (!newComment.trim()) return;
    const updated = [...comments, { text: newComment.trim(), date: new Date().toISOString() }];
    await supabase.from('tasks').update({ comments: updated } as any).eq('id', task.id);
    setComments(updated);
    setNewComment('');
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const changeStatus = async (status: string) => {
    await supabase.from('tasks').update({ task_status: status } as any).eq('id', task.id);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl leading-tight">{task.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status selector */}
          <div className="flex gap-1.5">
            {STATUS_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => changeStatus(opt.value)}
                className={cn('text-[10px] px-2.5 py-1 rounded-full font-semibold transition-all border',
                  taskStatus === opt.value ? `${opt.color} border-current` : 'bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50'
                )}>
                {opt.value === 'en_pausa' && <PauseCircle className="w-2.5 h-2.5 inline mr-0.5" />}
                {opt.value === 'bloqueada' && <Ban className="w-2.5 h-2.5 inline mr-0.5" />}
                {opt.label}
              </button>
            ))}
          </div>

          {task.subject && subjectColor && (
            <Badge variant="secondary" className={cn("text-xs", subjectColor.bg, subjectColor.text)}>{task.subject}</Badge>
          )}

          {task.due_date && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarDays className="w-4 h-4" />
                <span className="capitalize">{formatSpanishDate(task.due_date)}</span>
              </div>
              {task.due_time && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" /><span>{task.due_time}</span>
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

          {importanceLabel && <p className="text-sm font-medium">{importanceLabel}</p>}

          {task.description && (
            <div className="bg-muted/50 rounded-xl p-3 border border-border">
              <p className="text-sm text-foreground whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {task.location && <p className="text-sm text-muted-foreground">📍 {task.location}</p>}

          {(task as any).estimated_minutes && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Timer className="w-4 h-4" /><span>Tiempo estimado: {(task as any).estimated_minutes} min</span>
            </div>
          )}

          {(task as any).recurrence_rule && (task as any).recurrence_rule !== 'none' && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Repeat className="w-4 h-4" /><span>Tarea recurrente</span>
            </div>
          )}

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
                          <Paperclip className="w-4 h-4" /> Archivo {i + 1} <ExternalLink className="w-3 h-3 ml-auto" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comments section */}
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-primary" /> Notas y comentarios
            </p>
            {comments.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {comments.map((c, i) => (
                  <div key={i} className="bg-muted/30 rounded-lg p-2">
                    <p className="text-sm text-foreground">{c.text}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {new Date(c.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-1.5">
              <input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addComment()}
                placeholder="Añadir nota o enlace..."
                className="flex-1 bg-muted/50 rounded-lg px-3 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
              />
              <button onClick={addComment} disabled={!newComment.trim()}
                className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 shrink-0">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {isClassroom && (
            <Button variant="outline" className="w-full gap-2 border-[#1e8a6e] text-[#1e8a6e] hover:bg-[#1e8a6e]/10"
              onClick={() => window.open(`https://classroom.google.com/c/${classroomCourseId}/a/${classroomWorkId}/details`, '_blank')}>
              <ExternalLink className="w-4 h-4" /> Más detalles en Classroom
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;
