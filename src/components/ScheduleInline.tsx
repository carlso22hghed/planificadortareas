import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const TIMES: string[] = [];
for (let h = 8; h < 20; h++) {
  TIMES.push(`${String(h).padStart(2, '0')}:00`);
  TIMES.push(`${String(h).padStart(2, '0')}:30`);
}

interface ScheduleCell {
  id?: string;
  content: string;
}

const ScheduleInline = ({ userId }: { userId: string }) => {
  const [grid, setGrid] = useState<Record<string, ScheduleCell>>({});
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');

  useEffect(() => {
    supabase.from('schedule').select('*').eq('user_id', userId).then(({ data }) => {
      const g: Record<string, ScheduleCell> = {};
      data?.forEach((r: any) => {
        g[`${r.day_of_week}-${r.time_slot}`] = { id: r.id, content: r.content };
      });
      setGrid(g);
    });
  }, [userId]);

  const saveCell = async (day: number, time: string) => {
    const key = `${day}-${time}`;
    const existing = grid[key];
    if (!tempValue.trim()) {
      if (existing?.id) {
        await supabase.from('schedule').delete().eq('id', existing.id);
        setGrid(prev => { const n = { ...prev }; delete n[key]; return n; });
      }
    } else if (existing?.id) {
      await supabase.from('schedule').update({ content: tempValue.trim() }).eq('id', existing.id);
      setGrid(prev => ({ ...prev, [key]: { ...existing, content: tempValue.trim() } }));
    } else {
      const { data } = await supabase.from('schedule').insert({
        user_id: userId, day_of_week: day, time_slot: time, content: tempValue.trim(),
      }).select().single();
      if (data) setGrid(prev => ({ ...prev, [key]: { id: data.id, content: tempValue.trim() } }));
    }
    setEditingCell(null);
  };

  return (
    <div className="animate-slide-up">
      <h2 className="font-bold text-foreground mb-3">🗓️ Horario</h2>
      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="p-1 text-muted-foreground font-bold sticky left-0 bg-background z-10 w-16">Hora</th>
                {DAYS.map((d, i) => (
                  <th key={i} className="p-1 text-center font-bold text-foreground min-w-[60px]">{d.slice(0, 3)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIMES.map(time => (
                <tr key={time} className="border-t border-border/50">
                  <td className="p-1 text-muted-foreground font-semibold sticky left-0 bg-background z-10 text-[10px]">{time}</td>
                  {DAYS.map((_, dayIdx) => {
                    const key = `${dayIdx}-${time}`;
                    const cell = grid[key];
                    const isEditing = editingCell === key;
                    return (
                      <td key={dayIdx} className="p-0.5">
                        {isEditing ? (
                          <Input
                            autoFocus
                            value={tempValue}
                            onChange={e => setTempValue(e.target.value)}
                            onBlur={() => saveCell(dayIdx, time)}
                            onKeyDown={e => e.key === 'Enter' && saveCell(dayIdx, time)}
                            className="h-7 text-[10px] px-1"
                          />
                        ) : (
                          <button
                            onClick={() => { setEditingCell(key); setTempValue(cell?.content || ''); }}
                            className="w-full h-7 rounded bg-muted/30 hover:bg-muted/60 text-[10px] px-1 text-left truncate transition-colors"
                          >
                            {cell?.content || ''}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollArea>
    </div>
  );
};

export default ScheduleInline;
