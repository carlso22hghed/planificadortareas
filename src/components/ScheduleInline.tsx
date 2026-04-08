import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

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

interface ScheduleInlineProps {
  userId: string;
  readOnly?: boolean;
}

const ScheduleInline = ({ userId, readOnly = false }: ScheduleInlineProps) => {
  const [scheduleNames, setScheduleNames] = useState<string[]>([]);
  const [grids, setGrids] = useState<Record<string, Record<string, ScheduleCell>>>({});
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [newScheduleName, setNewScheduleName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    supabase.from('schedule').select('*').eq('user_id', userId).then(({ data }) => {
      const allGrids: Record<string, Record<string, ScheduleCell>> = {};
      const names = new Set<string>();
      data?.forEach((r: any) => {
        const sName = r.schedule_name || 'Mi Horario';
        names.add(sName);
        if (!allGrids[sName]) allGrids[sName] = {};
        allGrids[sName][`${r.day_of_week}-${r.time_slot}`] = { id: r.id, content: r.content };
      });
      const nameList = Array.from(names);
      if (nameList.length === 0) nameList.push('Mi Horario');
      setScheduleNames(nameList);
      setGrids(allGrids);
    });
  }, [userId]);

  const saveCell = async (scheduleName: string, day: number, time: string) => {
    const key = `${day}-${time}`;
    const grid = grids[scheduleName] || {};
    const existing = grid[key];
    if (!tempValue.trim()) {
      if (existing?.id) {
        await supabase.from('schedule').delete().eq('id', existing.id);
        setGrids(prev => {
          const g = { ...prev[scheduleName] };
          delete g[key];
          return { ...prev, [scheduleName]: g };
        });
      }
    } else if (existing?.id) {
      await supabase.from('schedule').update({ content: tempValue.trim() }).eq('id', existing.id);
      setGrids(prev => ({
        ...prev,
        [scheduleName]: { ...prev[scheduleName], [key]: { ...existing, content: tempValue.trim() } },
      }));
    } else {
      const { data } = await supabase.from('schedule').insert({
        user_id: userId, day_of_week: day, time_slot: time, content: tempValue.trim(), schedule_name: scheduleName,
      }).select().single();
      if (data) {
        setGrids(prev => ({
          ...prev,
          [scheduleName]: { ...(prev[scheduleName] || {}), [key]: { id: data.id, content: tempValue.trim() } },
        }));
      }
    }
    setEditingCell(null);
  };

  const addSchedule = () => {
    if (!newScheduleName.trim() || scheduleNames.includes(newScheduleName.trim())) return;
    setScheduleNames(prev => [...prev, newScheduleName.trim()]);
    setGrids(prev => ({ ...prev, [newScheduleName.trim()]: {} }));
    setNewScheduleName('');
    setShowAddForm(false);
  };

  const deleteSchedule = async (name: string) => {
    if (scheduleNames.length <= 1) return;
    const grid = grids[name] || {};
    const ids = Object.values(grid).filter(c => c.id).map(c => c.id!);
    if (ids.length > 0) {
      await Promise.all(ids.map(id => supabase.from('schedule').delete().eq('id', id)));
    }
    setScheduleNames(prev => prev.filter(n => n !== name));
    setGrids(prev => {
      const n = { ...prev };
      delete n[name];
      return n;
    });
  };

  return (
    <div className="animate-slide-up space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-foreground flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> Horarios</h2>
        {!readOnly && (
          showAddForm ? (
            <div className="flex gap-2">
              <Input
                value={newScheduleName}
                onChange={e => setNewScheduleName(e.target.value)}
                placeholder="Nombre del horario"
                className="h-8 text-sm w-40"
                onKeyDown={e => e.key === 'Enter' && addSchedule()}
                autoFocus
              />
              <Button size="sm" variant="outline" className="h-8" onClick={addSchedule}>Añadir</Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowAddForm(false)}>✕</Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setShowAddForm(true)}>
              <Plus className="w-3.5 h-3.5" /> Horario
            </Button>
          )
        )}
      </div>

      {scheduleNames.map(scheduleName => {
        const grid = grids[scheduleName] || {};
        return (
          <div key={scheduleName} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">{scheduleName}</h3>
              {!readOnly && scheduleNames.length > 1 && (
                <button onClick={() => deleteSchedule(scheduleName)} className="p-1 hover:bg-destructive/10 rounded">
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              )}
            </div>
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full border-collapse text-xs min-w-[500px]">
                <thead>
                  <tr>
                    <th className="p-1 text-muted-foreground font-bold sticky left-0 bg-background z-10 w-14">Hora</th>
                    {DAYS.map((d, i) => (
                      <th key={i} className="p-1 text-center font-bold text-foreground min-w-[70px]">{d.slice(0, 3)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIMES.map(time => (
                    <tr key={time} className="border-t border-border/50">
                      <td className="p-1 text-muted-foreground font-semibold sticky left-0 bg-background z-10 text-[10px]">{time}</td>
                      {DAYS.map((_, dayIdx) => {
                        const key = `${dayIdx}-${time}`;
                        const cellKey = `${scheduleName}-${key}`;
                        const cell = grid[key];
                        const isEditing = editingCell === cellKey;
                        return (
                          <td key={dayIdx} className="p-0.5">
                            {readOnly ? (
                              <div className="w-full h-7 rounded bg-muted/30 text-[10px] px-1 flex items-center truncate">
                                {cell?.content || ''}
                              </div>
                            ) : isEditing ? (
                              <Input
                                autoFocus
                                value={tempValue}
                                onChange={e => setTempValue(e.target.value)}
                                onBlur={() => saveCell(scheduleName, dayIdx, time)}
                                onKeyDown={e => e.key === 'Enter' && saveCell(scheduleName, dayIdx, time)}
                                className="h-7 text-[10px] px-1"
                              />
                            ) : (
                              <button
                                onClick={() => { setEditingCell(cellKey); setTempValue(cell?.content || ''); }}
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
        );
      })}
    </div>
  );
};

export default ScheduleInline;
