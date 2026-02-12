import { useState } from 'react';
import type { DbTask } from '@/types/app';
import TaskItem from './TaskItem';
import AddTaskDialog from './AddTaskDialog';
import EditTaskDialog from './EditTaskDialog';

interface TaskListProps {
  tasks: DbTask[];
  type: string;
  onAdd: (task: Partial<DbTask>) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (task: DbTask) => void;
  triggerLabel: string;
  emptyMessage: string;
  emptyEmoji: string;
  subjects?: string[];
  sportTypes?: string[];
}

const TaskList = ({ tasks, type, onAdd, onToggle, onDelete, onUpdate, triggerLabel, emptyMessage, emptyEmoji, subjects, sportTypes }: TaskListProps) => {
  const [editTask, setEditTask] = useState<DbTask | null>(null);

  const filtered = tasks
    .filter(t => t.type === type)
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-semibold">
          {filtered.filter(t => !t.completed).length} pendiente{filtered.filter(t => !t.completed).length !== 1 ? 's' : ''}
        </p>
        <AddTaskDialog type={type} onAdd={onAdd} triggerLabel={triggerLabel} subjects={subjects} sportTypes={sportTypes} />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-2">{emptyEmoji}</p>
          <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => (
            <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} onEdit={setEditTask} />
          ))}
        </div>
      )}

      <EditTaskDialog
        task={editTask}
        open={!!editTask}
        onOpenChange={open => !open && setEditTask(null)}
        onSave={onUpdate}
        subjects={subjects}
        sportTypes={sportTypes}
      />
    </div>
  );
};

export default TaskList;
