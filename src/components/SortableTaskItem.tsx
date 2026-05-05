import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DbTask } from '@/types/app';
import TaskItem from './TaskItem';

interface SortableTaskItemProps {
  task: DbTask;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: DbTask) => void;
  onToggleStudy?: (id: string) => void;
  highlightUrgent?: boolean;
}

const SortableTaskItem = ({ task, onToggle, onDelete, onEdit, onToggleStudy, highlightUrgent }: SortableTaskItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: task.completed,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskItem task={task} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} onToggleStudy={onToggleStudy} highlightUrgent={highlightUrgent} />
    </div>
  );
};

export default SortableTaskItem;
