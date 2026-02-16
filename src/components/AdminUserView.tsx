import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import type { DbTask, DbCountdown, DbSettings, DbProfile, TabType } from '@/types/app';
import SortableCountdownItem from '@/components/SortableCountdownItem';
import TaskList from '@/components/TaskList';
import ScheduleInline from '@/components/ScheduleInline';
import { Home, BookOpen, GraduationCap, Calendar, Trophy, ClipboardList, CalendarClock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AdminUserViewProps {
  userId: string;
  profile: DbProfile;
  onBack: () => void;
}

const AdminUserViewInner = ({ userId, profile, onBack }: AdminUserViewProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('inicio');
  const [settings, setSettings] = useState<DbSettings | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.from('user_settings').select('*').eq('user_id', userId).single()
      .then(({ data }) => setSettings(data));
  }, [userId]);

  const { data: tasks = [] } = useQuery({
    queryKey: ['admin-tasks', userId],
    queryFn: async () => {
      const { data } = await supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      return (data || []) as DbTask[];
    },
  });

  const { data: countdowns = [] } = useQuery({
    queryKey: ['admin-countdowns', userId],
    queryFn: async () => {
      const { data } = await supabase.from('countdowns').select('*').eq('user_id', userId).order('sort_order');
      return (data || []) as DbCountdown[];
    },
  });

  if (!settings) return <p className="text-sm text-muted-foreground p-4">Cargando...</p>;

  const allSubjects = [...settings.enabled_subjects, ...settings.custom_subjects];
  const pendingHomework = tasks.filter(t => t.type === 'homework' && !t.completed).length;
  const pendingExams = tasks.filter(t => t.type === 'exam' && !t.completed).length;

  const buildTabs = () => {
    const result: { id: TabType; label: string; icon: typeof Home }[] = [
      { id: 'inicio', label: 'Inicio', icon: Home },
      { id: 'deberes', label: 'Deberes', icon: BookOpen },
      { id: 'examenes', label: 'Exámenes', icon: GraduationCap },
    ];
    if (settings.tareas_enabled) result.push({ id: 'tareas', label: 'Tareas', icon: ClipboardList });
    if (settings.partidos_mode === 'replace') {
      result.push({ id: 'partidos', label: 'Partidos', icon: Trophy });
    } else {
      result.push({ id: 'eventos', label: 'Eventos', icon: Calendar });
      if (settings.partidos_mode === 'new_tab') result.push({ id: 'partidos', label: 'Partidos', icon: Trophy });
    }
    if ((settings as any).schedule_tab_enabled) result.push({ id: 'horario' as TabType, label: 'Horario', icon: CalendarClock });
    return result;
  };

  const currentTabs = buildTabs();

  // Read-only stubs
  const noop = () => {};
  const noopAsync = async () => {};
  const noopTask = async (_t: any) => {};

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      <header className="gradient-hero px-5 pt-8 pb-6 rounded-b-3xl flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-primary-foreground hover:bg-primary-foreground/20">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-extrabold text-primary-foreground">{settings.app_name}</h1>
            <p className="text-primary-foreground/70 text-sm font-medium mt-0.5">{settings.school_name}</p>
            <p className="text-primary-foreground/60 text-xs mt-0.5">Vista de {profile.display_name} 👁️</p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-24 overflow-y-auto">
        {activeTab === 'inicio' && (
          <div className="space-y-5 animate-slide-up">
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card rounded-2xl p-4 text-center">
                <p className="text-3xl font-extrabold text-primary">{pendingHomework}</p>
                <p className="text-xs text-muted-foreground font-semibold mt-1">Deberes pendientes</p>
              </div>
              <div className="glass-card rounded-2xl p-4 text-center">
                <p className="text-3xl font-extrabold text-exam">{pendingExams}</p>
                <p className="text-xs text-muted-foreground font-semibold mt-1">Exámenes próximos</p>
              </div>
            </div>
            <div>
              <h2 className="font-bold text-foreground mb-3">⏳ Contadores</h2>
              {countdowns.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin contadores</p>
              ) : (
                <div className="space-y-3">
                  {countdowns.map(c => (
                    <div key={c.id} className="glass-card rounded-2xl p-4">
                      <p className="font-semibold text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(c.target_date).toLocaleDateString('es-ES')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'deberes' && (
          <ReadOnlyTaskList tasks={tasks} type="homework" groupingMode={(settings as any).grouping_mode || 'subject_title'} />
        )}
        {activeTab === 'examenes' && (
          <ReadOnlyTaskList tasks={tasks} type="exam" groupingMode={(settings as any).grouping_mode || 'subject_title'} />
        )}
        {activeTab === 'tareas' && (
          <ReadOnlyTaskList tasks={tasks} type="task" />
        )}
        {activeTab === 'eventos' && (
          <ReadOnlyTaskList tasks={tasks} type="event" />
        )}
        {activeTab === 'partidos' && (
          <ReadOnlyTaskList tasks={tasks} type="match" />
        )}
        {activeTab === ('horario' as TabType) && (
          <ScheduleInline userId={userId} readOnly />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-md border-t border-border">
        <div className="max-w-lg mx-auto flex">
          {currentTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn('flex-1 flex flex-col items-center py-3 gap-1 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}>
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase tracking-wide">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

// Simple read-only task list
const ReadOnlyTaskList = ({ tasks, type, groupingMode }: { tasks: DbTask[]; type: string; groupingMode?: string }) => {
  const filtered = tasks.filter(t => t.type === type).sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  if (filtered.length === 0) return <p className="text-sm text-muted-foreground text-center py-12">Sin elementos</p>;

  return (
    <div className="space-y-2">
      {filtered.map(t => (
        <div key={t.id} className={cn('glass-card rounded-2xl p-4', t.completed && 'opacity-50')}>
          <div className="flex items-center gap-3">
            <span className="shrink-0">{t.completed ? '✅' : '⬜'}</span>
            <div className="flex-1 min-w-0">
              <p className={cn('font-semibold text-sm', t.completed && 'line-through')}>{t.name}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {new Date(t.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </span>
                {t.subject && <span className="text-xs text-muted-foreground">· {t.subject}</span>}
                {t.due_time && <span className="text-xs text-muted-foreground">· {t.due_time}</span>}
              </div>
              {type === 'exam' && (
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px]">{(t as any).study_completed ? '✅' : '⬜'}</span>
                  <span className={cn('text-[10px] text-muted-foreground', (t as any).study_completed && 'line-through')}>
                    Estudiar / Practicar
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const AdminUserView = (props: AdminUserViewProps) => {
  const qc = new QueryClient();
  return (
    <QueryClientProvider client={qc}>
      <AdminUserViewInner {...props} />
    </QueryClientProvider>
  );
};

export default AdminUserView;
