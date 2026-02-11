import type { Task } from '@/types/app';
import { Check, Trash2, Clock, CalendarDays, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const TaskItem = ({ task, onToggle, onDelete }: TaskItemProps) => {
  const isPast = new Date(task.dueDate) < new Date(new Date().toDateString());

  return (
    <div className={cn(
      'glass-card rounded-xl p-4 flex items-center gap-3 animate-slide-up transition-all',
      task.completed && 'opacity-50'
    )}>
      <button
        onClick={() => onToggle(task.id)}
        className={cn(
          'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
          task.completed ? 'bg-success border-success' : 'border-muted-foreground/30 hover:border-primary'
        )}
      >
        {task.completed && <Check className="w-3.5 h-3.5 text-success-foreground" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn('font-semibold text-sm', task.completed && 'line-through')}>{task.name}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className={cn('text-xs flex items-center gap-1', isPast && !task.completed ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
            <CalendarDays className="w-3 h-3" />
            {new Date(task.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </span>
          {task.dueTime && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {task.dueTime}
            </span>
          )}
          {task.subject && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{task.subject}</Badge>
          )}
          {task.rival && (
            <span className="text-xs text-muted-foreground">vs {task.rival}</span>
          )}
          {task.homeAway && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <MapPin className="w-3 h-3" />
              {task.homeAway === 'home' ? 'Casa' : 'Fuera'}
            </span>
          )}
        </div>
      </div>

      <button onClick={() => onDelete(task.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  );
};

export default TaskItem;
