import { useState, useCallback } from 'react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import type { DbTask } from '@/types/app';
import { PartyPopper, FileText, CheckCircle, Tent, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import SortableTaskItem from './SortableTaskItem';
import AddTaskDialog from './AddTaskDialog';
import EditTaskDialog from './EditTaskDialog';
import QuickCapture from './QuickCapture';
import { supabase } from '@/integrations/supabase/client';

interface TaskListProps {
  tasks: DbTask[];
  type: string;
  onAdd: (task: Partial<DbTask>) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (task: DbTask) => void;
  onToggleStudy?: (id: string) => void;
  triggerLabel: string;
  emptyMessage: string;
  emptyIcon?: LucideIcon;
  subjects?: string[];
  sportTypes?: string[];
  groupingMode?: string;
  highlightUrgent?: boolean;
}

const TaskList = ({ tasks, type, onAdd, onToggle, onDelete, onUpdate, onToggleStudy, triggerLabel, emptyMessage, emptyIcon: EmptyIcon, subjects, sportTypes, groupingMode = 'none', highlightUrgent = false }: TaskListProps) => {
  const [editTask, setEditTask] = useState<DbTask | null>(null);

  const filtered = tasks
    .filter(t => t.type === type)
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if ((a as any).sort_order !== (b as any).sort_order) return ((a as any).sort_order || 0) - ((b as any).sort_order || 0);
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

  // Group by subject based on grouping mode
  const shouldGroup = (type === 'homework' || type === 'exam') && groupingMode !== 'none';
  const grouped = shouldGroup ? groupBySubject(filtered) : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 300, tolerance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 5 } }),
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const pending = filtered.filter(t => !t.completed);
    const oldIndex = pending.findIndex(t => t.id === active.id);
    const newIndex = pending.findIndex(t => t.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(pending, oldIndex, newIndex);
    const updates = reordered.map((t, i) => supabase.from('tasks').update({ sort_order: i }).eq('id', t.id));
    await Promise.all(updates);
    // Trigger refetch by updating the moved task
    onUpdate({ ...reordered[newIndex], sort_order: newIndex } as any);
  }, [filtered, onUpdate]);

  const pendingTasks = filtered.filter(t => !t.completed);
  const completedTasks = filtered.filter(t => t.completed);

  return (
    <div className="space-y-4">
      {/* Quick Capture for this task type */}
      <QuickCapture onAdd={onAdd} type={type} subjects={subjects} />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-semibold">
          {pendingTasks.length} pendiente{pendingTasks.length !== 1 ? 's' : ''}
        </p>
        <AddTaskDialog type={type} onAdd={onAdd} triggerLabel={triggerLabel} subjects={subjects} sportTypes={sportTypes} />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          {EmptyIcon && <EmptyIcon className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />}
          <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        </div>
      ) : shouldGroup && grouped ? (
        <div className="space-y-4">
      {grouped.map(({ subject, tasks: groupTasks }) => (
            <div key={subject}>
              {groupingMode === 'subject_title' && (
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">{subject}</p>
              )}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={groupTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {groupTasks.map(task => (
                      <SortableTaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} onEdit={setEditTask} onToggleStudy={onToggleStudy} highlightUrgent={highlightUrgent} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={pendingTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {pendingTasks.map(task => (
                <SortableTaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} onEdit={setEditTask} onToggleStudy={onToggleStudy} highlightUrgent={highlightUrgent} />
              ))}
            </div>
          </SortableContext>
          {completedTasks.length > 0 && (
            <div className="space-y-2 mt-3">
              {completedTasks.map(task => (
                <SortableTaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} onEdit={setEditTask} onToggleStudy={onToggleStudy} highlightUrgent={highlightUrgent} />
              ))}
            </div>
          )}
        </DndContext>
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

function groupBySubject(tasks: DbTask[]) {
  const map = new Map<string, DbTask[]>();
  tasks.forEach(t => {
    const key = t.subject || 'Sin asignatura';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  });
  return Array.from(map.entries()).map(([subject, tasks]) => ({ subject, tasks }));
}

export default TaskList;
