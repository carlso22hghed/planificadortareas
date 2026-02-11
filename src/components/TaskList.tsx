import type { Task } from '@/types/app';
import TaskItem from './TaskItem';
import AddTaskDialog from './AddTaskDialog';

interface TaskListProps {
  tasks: Task[];
  type: Task['type'];
  onAdd: (task: Task) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  triggerLabel: string;
  emptyMessage: string;
  emptyEmoji: string;
}

const TaskList = ({ tasks, type, onAdd, onToggle, onDelete, triggerLabel, emptyMessage, emptyEmoji }: TaskListProps) => {
  const filtered = tasks
    .filter((t) => t.type === type)
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-semibold">
          {filtered.filter(t => !t.completed).length} pendiente{filtered.filter(t => !t.completed).length !== 1 ? 's' : ''}
        </p>
        <AddTaskDialog type={type} onAdd={onAdd} triggerLabel={triggerLabel} />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-2">{emptyEmoji}</p>
          <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => (
            <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskList;
