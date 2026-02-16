import type { DbTask } from '@/types/app';
import { Check, Trash2, Clock, CalendarDays, MapPin, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { getSubjectColor } from '@/lib/subject-colors';

interface TaskItemProps {
  task: DbTask;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: DbTask) => void;
  onToggleStudy?: (id: string) => void;
}

const TaskItem = ({ task, onToggle, onDelete, onEdit, onToggleStudy }: TaskItemProps) => {
  const isPast = new Date(task.due_date) < new Date(new Date().toDateString());
  const isExam = task.type === 'exam';

  return (
    <div className={cn(
      'glass-card rounded-2xl p-4 animate-slide-up transition-all',
      task.completed && 'opacity-50'
    )}>
      <div className="flex items-center gap-3">
        <button onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
          className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
            task.completed ? 'bg-success border-success' : 'border-muted-foreground/30 hover:border-primary')}>
          {task.completed && <Check className="w-3.5 h-3.5 text-success-foreground" />}
        </button>

        <div className="flex-1 min-w-0">
          <p className={cn('font-semibold text-sm', task.completed && 'line-through')}>{task.name}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className={cn('text-xs flex items-center gap-1', isPast && !task.completed ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
              <CalendarDays className="w-3 h-3" />
              {new Date(task.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </span>
            {task.due_time && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />{task.due_time}
              </span>
            )}
            {task.subject && (() => {
              const color = getSubjectColor(task.subject);
              return (
                <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 border-0", color.bg, color.text)}>{task.subject}</Badge>
              );
            })()}
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
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Study checkbox at same height for exams */}
          {isExam && !task.completed && onToggleStudy && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleStudy(task.id); }}
              title="Estudiar / Practicar"
              className={cn('w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors mr-1',
                task.study_completed ? 'bg-success border-success' : 'border-muted-foreground/30 hover:border-primary')}
            >
              {task.study_completed && <Check className="w-3 h-3 text-success-foreground" />}
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </div>

      {/* Study label below for exams */}
      {isExam && !task.completed && (
        <p className="ml-9 mt-1 text-[10px] text-muted-foreground">
          {task.study_completed ? '✅' : '📖'} Estudiar / Practicar
        </p>
      )}
    </div>
  );
};

export default TaskItem;
