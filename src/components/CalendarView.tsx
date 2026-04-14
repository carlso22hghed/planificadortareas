import { useState, useMemo } from 'react';
import type { DbTask } from '@/types/app';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, CalendarDays, GraduationCap, BookOpen, ClipboardList, Trophy, Calendar as CalIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getSubjectColor } from '@/lib/subject-colors';

interface CalendarViewProps {
  tasks: DbTask[];
  onTaskClick?: (task: DbTask) => void;
}

const TYPE_ICONS: Record<string, typeof BookOpen> = {
  homework: BookOpen,
  exam: GraduationCap,
  event: CalIcon,
  match: Trophy,
  task: ClipboardList,
};

const TYPE_COLORS: Record<string, string> = {
  homework: 'bg-primary/20 text-primary',
  exam: 'bg-destructive/20 text-destructive',
  event: 'bg-accent/80 text-accent-foreground',
  match: 'bg-warning/20 text-warning-foreground',
  task: 'bg-muted text-muted-foreground',
};

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const CalendarView = ({ tasks, onTaskClick }: CalendarViewProps) => {
  const [view, setView] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const tasksByDate = useMemo(() => {
    const map: Record<string, DbTask[]> = {};
    tasks.filter(t => t.due_date && !t.completed && !(t as any).deleted_at).forEach(t => {
      if (!map[t.due_date!]) map[t.due_date!] = [];
      map[t.due_date!].push(t);
    });
    return map;
  }, [tasks]);

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * 7);
    setCurrentDate(d);
  };

  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];
    // Previous month fill
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: formatDate(d), day: d.getDate(), isCurrentMonth: false });
    }
    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({ date: formatDate(d), day: i, isCurrentMonth: true });
    }
    // Next month fill
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i);
        days.push({ date: formatDate(d), day: i, isCurrentMonth: false });
      }
    }
    return days;
  };

  const getWeekDays = () => {
    const d = new Date(currentDate);
    const dow = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((dow + 6) % 7));
    const days: { date: string; day: number; dayName: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const wd = new Date(monday);
      wd.setDate(monday.getDate() + i);
      days.push({ date: formatDate(wd), day: wd.getDate(), dayName: DAYS[i] });
    }
    return days;
  };

  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const weekDays = view === 'week' ? getWeekDays() : [];
  const monthDays = view === 'month' ? getMonthDays() : [];

  const headerLabel = view === 'month'
    ? `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    : (() => {
        const days = getWeekDays();
        return `${days[0].day} - ${days[6].day} ${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
      })();

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-foreground">Calendario</h2>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setView('week')}
            className={cn('px-3 py-1 rounded-lg text-xs font-semibold transition-colors', view === 'week' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
            Semana
          </button>
          <button onClick={() => setView('month')}
            className={cn('px-3 py-1 rounded-lg text-xs font-semibold transition-colors', view === 'month' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
            Mes
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="font-semibold text-foreground">{headerLabel}</h3>
        <button onClick={() => navigate(1)} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Month View */}
      {view === 'month' && (
        <div>
          <div className="grid grid-cols-7 gap-px mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px">
            {monthDays.map((day, i) => {
              const dayTasks = tasksByDate[day.date] || [];
              const isToday = day.date === today;
              return (
                <div key={i} className={cn(
                  'min-h-[70px] p-1 rounded-lg border border-transparent transition-colors',
                  !day.isCurrentMonth && 'opacity-30',
                  isToday && 'bg-primary/10 border-primary/30',
                )}>
                  <span className={cn('text-xs font-semibold', isToday ? 'text-primary' : 'text-foreground/70')}>{day.day}</span>
                  <div className="space-y-0.5 mt-0.5">
                    {dayTasks.slice(0, 3).map(t => {
                      const Icon = TYPE_ICONS[t.type] || ClipboardList;
                      return (
                        <button key={t.id} onClick={() => onTaskClick?.(t)}
                          className={cn('w-full text-left px-1 py-0.5 rounded text-[9px] font-medium truncate flex items-center gap-0.5', TYPE_COLORS[t.type] || 'bg-muted text-muted-foreground')}>
                          <Icon className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{t.name}</span>
                        </button>
                      );
                    })}
                    {dayTasks.length > 3 && (
                      <span className="text-[9px] text-muted-foreground font-semibold pl-1">+{dayTasks.length - 3} más</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {view === 'week' && (
        <div className="space-y-2">
          {weekDays.map(day => {
            const dayTasks = tasksByDate[day.date] || [];
            const isToday = day.date === today;
            return (
              <div key={day.date} className={cn(
                'glass-card rounded-xl p-3',
                isToday && 'ring-2 ring-primary/30'
              )}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn('text-sm font-bold', isToday ? 'text-primary' : 'text-foreground')}>{day.dayName}</span>
                  <span className={cn('text-xs', isToday ? 'text-primary' : 'text-muted-foreground')}>{day.day}</span>
                  {isToday && <Badge className="text-[9px] px-1.5 py-0">Hoy</Badge>}
                </div>
                {dayTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Sin entregas</p>
                ) : (
                  <div className="space-y-1.5">
                    {dayTasks.map(t => {
                      const Icon = TYPE_ICONS[t.type] || ClipboardList;
                      const subjectColor = t.subject ? getSubjectColor(t.subject) : null;
                      return (
                        <button key={t.id} onClick={() => onTaskClick?.(t)}
                          className="w-full text-left flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <Icon className={cn('w-4 h-4 shrink-0', t.type === 'exam' ? 'text-destructive' : 'text-primary')} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{t.name}</p>
                            <div className="flex items-center gap-1.5">
                              {t.due_time && <span className="text-[10px] text-muted-foreground">{t.due_time}</span>}
                              {t.subject && subjectColor && (
                                <Badge variant="secondary" className={cn("text-[9px] px-1 py-0", subjectColor.bg, subjectColor.text)}>{t.subject}</Badge>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CalendarView;
