import type { Task } from '@/types/app';
import { Check, Trash2, Clock, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const typeColorMap: Record<Task['type'], string> = {
  homework: 'bg-primary/10 text-primary',
  exam: 'bg-exam/10 text-exam',
  event: 'bg-event/10 text-event',
  match: 'bg-accent/10 text-accent',
};

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
        <div className="flex items-center gap-3 mt-1">
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
        </div>
      </div>

      <button onClick={() => onDelete(task.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  );
};

export default TaskItem;
