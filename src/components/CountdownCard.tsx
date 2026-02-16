import { useCountdown } from '@/hooks/use-countdown';
import type { DbCountdown } from '@/types/app';
import { X, Timer, Pencil } from 'lucide-react';

interface CountdownCardProps {
  event: DbCountdown;
  onRemove: (id: string) => void;
  onEdit: (countdown: DbCountdown) => void;
}

const CountdownCard = ({ event, onRemove, onEdit }: CountdownCardProps) => {
  const { days, hours, minutes, seconds, expired } = useCountdown(event.target_date, event.target_time);

  return (
    <div className="glass-card rounded-2xl p-4 animate-slide-up relative group">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <button onClick={() => onEdit(event)} className="p-1 rounded-full hover:bg-muted">
          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button onClick={() => onRemove(event.id)} className="p-1 rounded-full hover:bg-muted">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg gradient-hero flex items-center justify-center">
          <Timer className="w-4 h-4 text-primary-foreground" />
        </div>
        <h3 className="font-bold text-sm text-foreground truncate">{event.name}</h3>
      </div>
      {expired ? (
        <p className="text-center text-sm font-semibold text-accent">¡Ya llegó! 🎉</p>
      ) : (
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { value: days, label: 'días' },
            { value: hours, label: 'hrs' },
            { value: minutes, label: 'min' },
            { value: seconds, label: 'seg' },
          ].map(item => (
            <div key={item.label}>
              <div className="text-lg font-extrabold text-primary tabular-nums">{item.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{item.label}</div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground text-center mt-2">
        📅 {new Date(event.target_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
        {event.target_time !== '00:00' && ` a las ${event.target_time}`}
      </p>
    </div>
  );
};

export default CountdownCard;
