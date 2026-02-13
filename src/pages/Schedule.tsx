import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

const Schedule = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [grid, setGrid] = useState<Record<string, ScheduleCell>>({});
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase.from('schedule').select('*').eq('user_id', user.id).then(({ data }) => {
      const g: Record<string, ScheduleCell> = {};
      data?.forEach((r: any) => {
        g[`${r.day_of_week}-${r.time_slot}`] = { id: r.id, content: r.content };
      });
      setGrid(g);
    });
  }, [user]);

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
        user_id: user!.id, day_of_week: day, time_slot: time, content: tempValue.trim(),
      }).select().single();
      if (data) setGrid(prev => ({ ...prev, [key]: { id: data.id, content: tempValue.trim() } }));
    }
    setEditingCell(null);
  };

  return (
    <div className="min-h-screen bg-background max-w-4xl mx-auto">
      <header className="gradient-hero px-5 pt-8 pb-6 rounded-b-3xl flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-primary-foreground hover:bg-primary-foreground/20">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-extrabold text-primary-foreground">🗓️ Horario</h1>
      </header>

      <ScrollArea className="h-[calc(100vh-120px)]">
        <div className="px-2 py-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="p-1 text-muted-foreground font-bold sticky left-0 bg-background z-10 w-16">Hora</th>
                  {DAYS.map((d, i) => (
                    <th key={i} className="p-1 text-center font-bold text-foreground min-w-[80px]">{d}</th>
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
        </div>
      </ScrollArea>
    </div>
  );
};

export default Schedule;
