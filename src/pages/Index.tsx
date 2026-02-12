import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import type { DbTask, DbCountdown, TabType } from '@/types/app';
import CountdownCard from '@/components/CountdownCard';
import AddCountdownDialog from '@/components/AddCountdownDialog';
import EditCountdownDialog from '@/components/EditCountdownDialog';
import TaskList from '@/components/TaskList';
import SettingsPanel from '@/components/SettingsPanel';
import { Home, BookOpen, GraduationCap, Calendar, Trophy, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const { user, profile, settings, updateSettings, isAdmin } = useAuth();
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
      const { data } = await supabase.from('countdowns').select('*').eq('user_id', user!.id);
      return (data || []) as DbCountdown[];
    },
    enabled: !!user,
  });

  // Notification check: day before
  useEffect(() => {
    if (notifiedRef.current || !tasks.length) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const sessionKey = 'notified-' + tomorrowStr;
    if (sessionStorage.getItem(sessionKey)) return;

    const dueTomorrow = tasks.filter(t => !t.completed && t.due_date === tomorrowStr);
    const typeNames: Record<string, string> = {
      homework: 'deber', exam: 'examen', event: 'evento', match: 'partido', task: 'tarea',
    };

    dueTomorrow.forEach(t => {
      new Notification(`📚 Mañana: ${t.name}`, {
        body: `Tienes un ${typeNames[t.type] || 'evento'} mañana`,
        icon: '/favicon.ico',
      });
    });

    if (dueTomorrow.length > 0) sessionStorage.setItem(sessionKey, 'true');
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
        <div>
          <h1 className="text-2xl font-extrabold text-primary-foreground">📚 {settings.app_name}</h1>
          <p className="text-primary-foreground/70 text-sm font-medium mt-0.5">{settings.school_name}</p>
          {profile && <p className="text-primary-foreground/60 text-xs mt-0.5">Hola, {profile.display_name} 👋</p>}
        </div>
        <div className="flex items-center gap-1">
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
              <div className="glass-card rounded-xl p-4 text-center">
                <p className="text-3xl font-extrabold text-primary">{pendingHomework}</p>
                <p className="text-xs text-muted-foreground font-semibold mt-1">Deberes pendientes</p>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                <p className="text-3xl font-extrabold text-exam">{pendingExams}</p>
                <p className="text-xs text-muted-foreground font-semibold mt-1">Exámenes próximos</p>
              </div>
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
                <div className="space-y-3">
                  {countdowns.map(c => (
                    <CountdownCard key={c.id} event={c} onRemove={removeCountdown} onEdit={setEditCountdown} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'deberes' && (
          <TaskList tasks={tasks} type="homework" onAdd={addTask} onToggle={toggleTask} onDelete={deleteTask} onUpdate={updateTask}
            triggerLabel="Añadir deber" emptyMessage="¡No tienes deberes pendientes!" emptyEmoji="🎉"
            subjects={allSubjects} sportTypes={settings.sport_types} />
        )}

        {activeTab === 'examenes' && (
          <TaskList tasks={tasks} type="exam" onAdd={addTask} onToggle={toggleTask} onDelete={deleteTask} onUpdate={updateTask}
            triggerLabel="Añadir examen" emptyMessage="No hay exámenes próximos" emptyEmoji="📝"
            subjects={allSubjects} sportTypes={settings.sport_types} />
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
                <span className="text-[10px] font-bold uppercase tracking-wide">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Index;
