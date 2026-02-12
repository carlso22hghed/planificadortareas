import { useState } from 'react';
import type { DbTask } from '@/types/app';
import TaskItem from './TaskItem';
import AddTaskDialog from './AddTaskDialog';
import EditTaskDialog from './EditTaskDialog';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
      // Use sort_order first, then due_date
      if ((a as any).sort_order !== (b as any).sort_order) return ((a as any).sort_order || 0) - ((b as any).sort_order || 0);
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

  const moveTask = async (index: number, direction: 'up' | 'down') => {
    const pending = filtered.filter(t => !t.completed);
    const targetIdx = pending.findIndex(t => t.id === filtered[index].id);
    if (targetIdx < 0) return;
    const swapIdx = direction === 'up' ? targetIdx - 1 : targetIdx + 1;
    if (swapIdx < 0 || swapIdx >= pending.length) return;

    const a = pending[targetIdx];
    const b = pending[swapIdx];
    const orderA = (a as any).sort_order || 0;
    const orderB = (b as any).sort_order || 0;

    await Promise.all([
      supabase.from('tasks').update({ sort_order: orderB }).eq('id', a.id),
      supabase.from('tasks').update({ sort_order: orderA }).eq('id', b.id),
    ]);
    // Trigger re-fetch by updating both
    onUpdate({ ...a, sort_order: orderB } as any);
  };

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
          {filtered.map((task, i) => (
            <div key={task.id} className="flex items-center gap-1">
              <div className="flex-1 min-w-0">
                <TaskItem task={task} onToggle={onToggle} onDelete={onDelete} onEdit={setEditTask} />
              </div>
              {!task.completed && (
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => moveTask(i, 'up')}
                    className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-20"
                    disabled={i === 0 || filtered[i - 1]?.completed}
                  >
                    <ArrowUp className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => moveTask(i, 'down')}
                    className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-20"
                    disabled={i >= filtered.length - 1 || filtered[i + 1]?.completed}
                  >
                    <ArrowDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              )}
            </div>
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
