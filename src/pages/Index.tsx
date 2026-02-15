import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import type { DbTask, DbCountdown, TabType } from '@/types/app';
import SortableCountdownItem from '@/components/SortableCountdownItem';
import AddCountdownDialog from '@/components/AddCountdownDialog';
import EditCountdownDialog from '@/components/EditCountdownDialog';
import TaskList from '@/components/TaskList';
import ScheduleInline from '@/components/ScheduleInline';
import SettingsPanel from '@/components/SettingsPanel';
import { Home, BookOpen, GraduationCap, Calendar, Trophy, ClipboardList, CalendarClock } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const { user, profile, settings, updateSettings, isAdmin } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('inicio');
  const [editCountdown, setEditCountdown] = useState<DbCountdown | null>(null);
  const notifiedRef = useRef(false);

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('tasks').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
      return (data || []) as DbTask[];
    },
    enabled: !!user,
  });

  // Fetch countdowns
  const { data: countdowns = [] } = useQuery({
    queryKey: ['countdowns', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('countdowns').select('*').eq('user_id', user!.id).order('sort_order');
      return (data || []) as DbCountdown[];
    },
    enabled: !!user,
  });

  // Drag sensors for countdowns
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 300, tolerance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 5 } }),
  );

  const handleCountdownDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = countdowns.findIndex(c => c.id === active.id);
    const newIdx = countdowns.findIndex(c => c.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(countdowns, oldIdx, newIdx);
    await Promise.all(reordered.map((c, i) => supabase.from('countdowns').update({ sort_order: i }).eq('id', c.id)));
    queryClient.invalidateQueries({ queryKey: ['countdowns'] });
  }, [countdowns, queryClient]);

  // Notification check with custom reminder
  useEffect(() => {
    if (notifiedRef.current || !tasks.length) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const now = new Date();
    const typeNames: Record<string, string> = {
      homework: 'deber', exam: 'examen', event: 'evento', match: 'partido', task: 'tarea',
    };

    tasks.filter(t => !t.completed).forEach(t => {
      // Custom reminder date/time
      if ((t as any).reminder_date && t.reminder_time) {
        const reminderDate = new Date(`${(t as any).reminder_date}T${t.reminder_time}:00`);
        const dueDate = new Date(`${t.due_date}T${t.due_time || '23:59'}:00`);
        if (now >= reminderDate && now <= dueDate) {
          const sessionKey = `notified-custom-${t.id}-${now.toDateString()}`;
          if (!sessionStorage.getItem(sessionKey)) {
            new Notification(`📚 Recordatorio: ${t.name}`, {
              body: `Tienes un ${typeNames[t.type] || 'evento'} para ${new Date(t.due_date).toLocaleDateString('es-ES')}`,
              icon: '/logo.png',
            });
            sessionStorage.setItem(sessionKey, 'true');
          }
        }
      } else {
        // Default: day before
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        if (t.due_date === tomorrowStr) {
          const sessionKey = `notified-${tomorrowStr}`;
          if (!sessionStorage.getItem(sessionKey)) {
            new Notification(`📚 Mañana: ${t.name}`, {
              body: `Tienes un ${typeNames[t.type] || 'evento'} mañana`,
              icon: '/logo.png',
            });
            sessionStorage.setItem(sessionKey, 'true');
          }
        }
      }
    });

    notifiedRef.current = true;
  }, [tasks]);

  // Task CRUD
  const addTask = async (taskData: Partial<DbTask>) => {
    await supabase.from('tasks').insert({ ...taskData, user_id: user!.id } as any);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    await supabase.from('tasks').update({ completed: !task.completed }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const toggleStudy = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    await supabase.from('tasks').update({ study_completed: !(task as any).study_completed }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const updateTask = async (task: DbTask) => {
    const { id, user_id, created_at, ...rest } = task;
    await supabase.from('tasks').update(rest).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  // Countdown CRUD
  const addCountdown = async (data: { name: string; target_date: string; target_time: string }) => {
    await supabase.from('countdowns').insert({ ...data, user_id: user!.id });
    queryClient.invalidateQueries({ queryKey: ['countdowns'] });
  };

  const removeCountdown = async (id: string) => {
    await supabase.from('countdowns').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['countdowns'] });
  };

  const saveCountdown = async (countdown: DbCountdown) => {
    const { id, user_id, created_at, ...rest } = countdown;
    await supabase.from('countdowns').update(rest).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['countdowns'] });
  };

  if (!settings) return null;

  // Build tabs
  const buildTabs = () => {
    const result: { id: TabType; label: string; shortLabel: string; icon: typeof Home }[] = [
      { id: 'inicio', label: 'Inicio', shortLabel: 'Ini.', icon: Home },
      { id: 'deberes', label: 'Deberes', shortLabel: 'Deb.', icon: BookOpen },
      { id: 'examenes', label: 'Exámenes', shortLabel: 'Exám.', icon: GraduationCap },
    ];
    if (settings.tareas_enabled) result.push({ id: 'tareas', label: 'Tareas', shortLabel: 'Tar.', icon: ClipboardList });
    if (settings.partidos_mode === 'replace') {
      result.push({ id: 'partidos', label: 'Partidos', shortLabel: 'Part.', icon: Trophy });
    } else {
      result.push({ id: 'eventos', label: 'Eventos', shortLabel: 'Even.', icon: Calendar });
      if (settings.partidos_mode === 'new_tab') result.push({ id: 'partidos', label: 'Partidos', shortLabel: 'Part.', icon: Trophy });
    }
    if ((settings as any).schedule_tab_enabled) result.push({ id: 'horario' as TabType, label: 'Horario', shortLabel: 'Hor.', icon: CalendarClock });
    return result;
  };

  const currentTabs = buildTabs();
  if (!currentTabs.find(t => t.id === activeTab)) {
    setTimeout(() => setActiveTab('inicio'), 0);
  }

  const allSubjects = [...settings.enabled_subjects, ...settings.custom_subjects];
  const pendingHomework = tasks.filter(t => t.type === 'homework' && !t.completed).length;
  const pendingExams = tasks.filter(t => t.type === 'exam' && !t.completed).length;

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      <header className="gradient-hero px-5 pt-8 pb-6 rounded-b-3xl flex items-start justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-xl" />
          <div>
            <h1 className="text-2xl font-extrabold text-primary-foreground">{settings.app_name}</h1>
            <p className="text-primary-foreground/70 text-sm font-medium mt-0.5">{settings.school_name}</p>
            {profile && <p className="text-primary-foreground/60 text-xs mt-0.5">Hola, {profile.display_name} 👋</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => navigate('/schedule')} className="p-2 rounded-full hover:bg-primary-foreground/20 transition-colors text-primary-foreground">
            <CalendarClock className="w-5 h-5" />
          </button>
          {isAdmin && (
            <button onClick={() => navigate('/admin')} className="p-2 rounded-full hover:bg-primary-foreground/20 transition-colors text-primary-foreground text-xs font-bold">
              👥
            </button>
          )}
          <SettingsPanel settings={settings} onUpdate={updateSettings} />
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-24 overflow-y-auto">
        {activeTab === 'inicio' && (
          <div className="space-y-5 animate-slide-up">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setActiveTab('deberes')} className="glass-card rounded-xl p-4 text-center hover:ring-2 ring-primary/30 transition-all">
                <p className="text-3xl font-extrabold text-primary">{pendingHomework}</p>
                <p className="text-xs text-muted-foreground font-semibold mt-1">Deberes pendientes</p>
              </button>
              <button onClick={() => setActiveTab('examenes')} className="glass-card rounded-xl p-4 text-center hover:ring-2 ring-primary/30 transition-all">
                <p className="text-3xl font-extrabold text-exam">{pendingExams}</p>
                <p className="text-xs text-muted-foreground font-semibold mt-1">Exámenes próximos</p>
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-foreground">⏳ Contadores</h2>
                <AddCountdownDialog onAdd={addCountdown} />
              </div>
              {countdowns.length === 0 ? (
                <div className="glass-card rounded-xl p-6 text-center">
                  <p className="text-3xl mb-2">🏖️</p>
                  <p className="text-sm text-muted-foreground">Añade un contador para ver cuánto falta</p>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCountdownDragEnd}>
                  <SortableContext items={countdowns.map(c => c.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {countdowns.map(c => (
                        <SortableCountdownItem key={c.id} event={c} onRemove={removeCountdown} onEdit={setEditCountdown} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        )}

        {activeTab === 'deberes' && (
          <TaskList tasks={tasks} type="homework" onAdd={addTask} onToggle={toggleTask} onDelete={deleteTask} onUpdate={updateTask}
            triggerLabel="Añadir deber" emptyMessage="¡No tienes deberes pendientes!" emptyEmoji="🎉"
            subjects={allSubjects} sportTypes={settings.sport_types} groupingMode={(settings as any).grouping_mode || 'subject_title'} />
        )}

        {activeTab === 'examenes' && (
          <TaskList tasks={tasks} type="exam" onAdd={addTask} onToggle={toggleTask} onDelete={deleteTask} onUpdate={updateTask}
            onToggleStudy={toggleStudy}
            triggerLabel="Añadir examen" emptyMessage="No hay exámenes próximos" emptyEmoji="📝"
            subjects={allSubjects} sportTypes={settings.sport_types} groupingMode={(settings as any).grouping_mode || 'subject_title'} />
        )}

        {activeTab === 'tareas' && (
          <TaskList tasks={tasks} type="task" onAdd={addTask} onToggle={toggleTask} onDelete={deleteTask} onUpdate={updateTask}
            triggerLabel="Añadir tarea" emptyMessage="No hay tareas pendientes" emptyEmoji="✅"
            subjects={allSubjects} sportTypes={settings.sport_types} />
        )}

        {activeTab === 'eventos' && (
          <TaskList tasks={tasks} type="event" onAdd={addTask} onToggle={toggleTask} onDelete={deleteTask} onUpdate={updateTask}
            triggerLabel="Añadir evento" emptyMessage="No hay eventos próximos" emptyEmoji="🎪"
            sportTypes={settings.sport_types} />
        )}

        {activeTab === 'partidos' && (
          <TaskList tasks={tasks} type="match" onAdd={addTask} onToggle={toggleTask} onDelete={deleteTask} onUpdate={updateTask}
            triggerLabel="Añadir partido" emptyMessage="No hay partidos programados" emptyEmoji="⚽"
            sportTypes={settings.sport_types} />
        )}

        {activeTab === ('horario' as TabType) && (
          <ScheduleInline userId={user!.id} />
        )}
      </main>

      <EditCountdownDialog
        countdown={editCountdown}
        open={!!editCountdown}
        onOpenChange={(open) => !open && setEditCountdown(null)}
        onSave={saveCountdown}
      />

      <nav className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-md border-t border-border">
        <div className="max-w-lg mx-auto flex">
          {currentTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn('flex-1 flex flex-col items-center py-3 gap-1 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}>
                <Icon className={cn('w-5 h-5', isActive && 'animate-pulse-soft')} />
                <span className="text-[10px] font-bold uppercase tracking-wide">{isMobile ? tab.shortLabel : tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Index;
