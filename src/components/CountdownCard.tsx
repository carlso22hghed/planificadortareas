import { useCountdown } from '@/hooks/use-countdown';
import type { CountdownEvent } from '@/types/app';
import { X, Timer } from 'lucide-react';

interface CountdownCardProps {
  event: CountdownEvent;
  onRemove: (id: string) => void;
}

const CountdownCard = ({ event, onRemove }: CountdownCardProps) => {
  const { days, hours, minutes, seconds, expired } = useCountdown(event.targetDate, event.targetTime);

  return (
    <div className="glass-card rounded-xl p-4 animate-slide-up relative group">
      <button
        onClick={() => onRemove(event.id)}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-muted"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
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
          ].map((item) => (
            <div key={item.label}>
              <div className="text-2xl font-extrabold text-primary tabular-nums">{item.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{item.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CountdownCard;
