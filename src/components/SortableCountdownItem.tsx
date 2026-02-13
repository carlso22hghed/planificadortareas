import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DbCountdown } from '@/types/app';
import CountdownCard from './CountdownCard';

interface Props {
  event: DbCountdown;
  onRemove: (id: string) => void;
  onEdit: (countdown: DbCountdown) => void;
}

const SortableCountdownItem = ({ event, onRemove, onEdit }: Props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: event.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CountdownCard event={event} onRemove={onRemove} onEdit={onEdit} />
    </div>
  );
};

export default SortableCountdownItem;
