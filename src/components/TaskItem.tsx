import { useState } from 'react';
import type { DbTask } from '@/types/app';
import { Check, Trash2, Clock, CalendarDays, MapPin, Pencil, CheckCircle, BookOpen, BarChart3, AlertCircle, CircleAlert, Paperclip, Repeat, PauseCircle, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getSubjectColor } from '@/lib/subject-colors';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import TaskDetailDialog from './TaskDetailDialog';

interface TaskItemProps {
  task: DbTask;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: DbTask) => void;
  onToggleStudy?: (id: string) => void;
  highlightUrgent?: boolean;
}

const IMPORTANCE_BADGES: Record<string, { label: string; icon: typeof AlertCircle; className: string }> = {
  importante: { label: 'Importante', icon: AlertCircle, className: 'bg-warning/20 text-warning-foreground border-warning/30' },
  urgente: { label: 'Urgente', icon: CircleAlert, className: 'bg-destructive/20 text-destructive border-destructive/30' },
  voluntario: { label: 'Voluntario', icon: CheckCircle, className: 'bg-success/20 text-success border-success/30' },
};

const TaskItem = ({ task, onToggle, onDelete, onEdit, onToggleStudy, highlightUrgent = false }: TaskItemProps) => {
  const queryClient = useQueryClient();
  const isPast = task.due_date ? new Date(task.due_date) < new Date(new Date().toDateString()) : false;
  const isExam = task.type === 'exam';
  const [gradeInput, setGradeInput] = useState(task.grade || '');
  const [showGradeInput, setShowGradeInput] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  // Highlight logic: task is due today or tomorrow before 14:30
  const isUrgentHighlight = (() => {
    if (!highlightUrgent || !task.due_date || task.completed) return false;
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    if (task.due_date === today) return true;
    if (task.due_date === tomorrowStr) {
      const time = task.due_time || '23:59';
      const [h, m] = time.split(':').map(Number);
      if (h < 14 || (h === 14 && m <= 30)) return true;
    }
    return false;
  })();

  const saveGrade = async (grade: string) => {
    await supabase.from('tasks').update({ grade }).eq('id', task.id);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    setShowGradeInput(false);
  };

  const importance = task.importance;
  const importanceBadge = importance && importance !== 'normal' ? IMPORTANCE_BADGES[importance] || { label: importance, icon: AlertCircle, className: 'bg-muted/50 text-muted-foreground' } : null;

  return (
    <>
    <div onClick={() => setShowDetail(true)} className={cn(
      'glass-card rounded-2xl p-4 animate-slide-up transition-all cursor-pointer hover:ring-1 ring-primary/20',
      task.completed && 'opacity-50',
      isUrgentHighlight && 'ring-2 ring-amber-500 border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
    )}>
      <div className="flex items-center gap-3">
        <button onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
          className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
            task.completed ? 'bg-success border-success' : 'border-muted-foreground/30 hover:border-primary')}>
          {task.completed && <Check className="w-3.5 h-3.5 text-success-foreground" />}
        </button>

        <div className="flex-1 min-w-0">
          <p className={cn('font-semibold text-sm', task.completed && 'line-through')}>{task.name}</p>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {task.due_date && (
              <span className={cn('text-xs flex items-center gap-1', isPast && !task.completed ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
                <CalendarDays className="w-3 h-3" />
                {new Date(task.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </span>
            )}
            {task.due_time && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />{task.due_time}
              </span>
            )}
            {task.subject && (() => {
              const color = getSubjectColor(task.subject);
              return <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 border-0", color.bg, color.text)}>{task.subject}</Badge>;
            })()}
            {importanceBadge && (
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 flex items-center gap-0.5", importanceBadge.className)}><importanceBadge.icon className="w-2.5 h-2.5" /> {importanceBadge.label}</Badge>
            )}
            {task.rival && <span className="text-xs text-muted-foreground">vs {task.rival}</span>}
            {task.sport_type && task.type === 'match' && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{task.sport_type}</Badge>
            )}
            {task.location && (
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <MapPin className="w-3 h-3" />{task.location}
              </span>
            )}
            {task.home_away && task.type === 'match' && (
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <MapPin className="w-3 h-3" />{task.home_away === 'home' ? 'Casa' : 'Fuera'}
              </span>
            )}
            {(task as any).recurrence_rule && (task as any).recurrence_rule !== 'none' && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex items-center gap-0.5">
                <Repeat className="w-2.5 h-2.5" /> Recurrente
              </Badge>
            )}
            {(task as any).attachments && (task as any).attachments.length > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex items-center gap-0.5">
                <Paperclip className="w-2.5 h-2.5" /> {(task as any).attachments.length}
              </Badge>
            )}
            {(task as any).estimated_minutes && (
              <span className="text-xs text-muted-foreground">⏱️ {(task as any).estimated_minutes}min</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </div>

      {isExam && !task.completed && onToggleStudy && (
        <div className="flex items-center gap-3 mt-2">
          <button onClick={(e) => { e.stopPropagation(); onToggleStudy(task.id); }} title="Estudiar / Practicar"
            className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
              task.study_completed ? 'bg-success border-success' : 'border-muted-foreground/30 hover:border-primary')}>
            {task.study_completed && <Check className="w-2.5 h-2.5 text-success-foreground" />}
          </button>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {task.study_completed ? <CheckCircle className="w-3 h-3 text-success" /> : <BookOpen className="w-3 h-3" />} Estudiar / Practicar
          </p>
        </div>
      )}

      {isExam && task.completed && (
        <div className="flex items-center gap-2 mt-2">
          {task.grade ? (
            <button onClick={() => { setGradeInput(task.grade || ''); setShowGradeInput(true); }} className="text-xs text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
              <BarChart3 className="w-3 h-3" /> Nota: {task.grade}
            </button>
          ) : showGradeInput ? (
            <div className="flex items-center gap-1">
              <Input value={gradeInput} onChange={e => setGradeInput(e.target.value)} placeholder="Ej: 8.5" className="h-6 text-xs w-20"
                autoFocus onKeyDown={e => e.key === 'Enter' && gradeInput && saveGrade(gradeInput)} />
              <button onClick={() => gradeInput && saveGrade(gradeInput)} className="text-xs text-primary font-bold">✓</button>
              <button onClick={() => setShowGradeInput(false)} className="text-xs text-muted-foreground">✕</button>
            </div>
          ) : (
            <button onClick={() => setShowGradeInput(true)} className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              <BarChart3 className="w-3 h-3" /> Añadir nota (opcional)
            </button>
          )}
        </div>
      )}
    </div>
    <TaskDetailDialog task={task} open={showDetail} onOpenChange={setShowDetail} />
    </>
  );
};

export default TaskItem;
