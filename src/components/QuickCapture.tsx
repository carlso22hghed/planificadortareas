import { useState } from 'react';
import { Zap } from 'lucide-react';
import { parseNaturalLanguage } from '@/lib/natural-language-parser';
import type { DbTask } from '@/types/app';
import { cn } from '@/lib/utils';

interface QuickCaptureProps {
  onAdd: (task: Partial<DbTask>) => Promise<void>;
}

const QuickCapture = ({ onAdd }: QuickCaptureProps) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const parsed = parseNaturalLanguage(input);
    if (!parsed) return;
    
    setLoading(true);
    await onAdd({
      name: parsed.name,
      type: 'task',
      due_date: parsed.due_date,
      due_time: parsed.due_time,
    });
    setInput('');
    setLoading(false);
  };

  const preview = input.trim() ? parseNaturalLanguage(input) : null;

  return (
    <div className="glass-card rounded-2xl p-3 space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="mañana 18:00 comprar leche..."
            className="w-full bg-muted/50 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
            disabled={loading}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || loading}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0',
            'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40'
          )}
        >
          {loading ? '...' : 'Crear'}
        </button>
      </div>
      {preview && (
        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground px-1">
          <span className="font-semibold text-foreground">{preview.name}</span>
          {preview.due_date && <span>📅 {new Date(preview.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>}
          {preview.due_time && <span>🕐 {preview.due_time}</span>}
        </div>
      )}
    </div>
  );
};

export default QuickCapture;
