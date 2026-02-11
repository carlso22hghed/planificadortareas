import { useState } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { CountdownEvent, Task, TabType } from '@/types/app';
import CountdownCard from '@/components/CountdownCard';
import AddCountdownDialog from '@/components/AddCountdownDialog';
import TaskList from '@/components/TaskList';
import { Home, BookOpen, GraduationCap, Calendar, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const tabs: { id: TabType; label: string; icon: typeof Home }[] = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'deberes', label: 'Deberes', icon: BookOpen },
  { id: 'examenes', label: 'Exámenes', icon: GraduationCap },
  { id: 'eventos', label: 'Eventos', icon: Calendar },
];

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabType>('inicio');
  const [countdowns, setCountdowns] = useLocalStorage<CountdownEvent[]>('deberes-countdowns', []);
  const [tasks, setTasks] = useLocalStorage<Task[]>('deberes-tasks', []);
  const [usePartidos, setUsePartidos] = useLocalStorage<boolean>('deberes-partidos', false);

  const addCountdown = (event: CountdownEvent) => setCountdowns([...countdowns, event]);
  const removeCountdown = (id: string) => setCountdowns(countdowns.filter((c) => c.id !== id));

  const addTask = (task: Task) => setTasks([...tasks, task]);
  const toggleTask = (id: string) => setTasks(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  const deleteTask = (id: string) => setTasks(tasks.filter((t) => t.id !== id));

  const currentTabs = tabs.map((tab) => {
    if (tab.id === 'eventos' && usePartidos) {
      return { id: 'eventos' as TabType, label: 'Partidos', icon: Trophy };
    }
    return tab;
  });

  const pendingHomework = tasks.filter(t => t.type === 'homework' && !t.completed).length;
  const pendingExams = tasks.filter(t => t.type === 'exam' && !t.completed).length;

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="gradient-hero px-5 pt-8 pb-6 rounded-b-3xl">
        <h1 className="text-2xl font-extrabold text-primary-foreground">📚 Deberes</h1>
        <p className="text-primary-foreground/70 text-sm font-medium mt-0.5">Colegio Portaceli</p>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-4 pb-24 overflow-y-auto">
        {activeTab === 'inicio' && (
          <div className="space-y-5 animate-slide-up">
            {/* Quick stats */}
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

            {/* Countdowns */}
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
                  {countdowns.map((c) => (
                    <CountdownCard key={c.id} event={c} onRemove={removeCountdown} />
                  ))}
                </div>
              )}
            </div>

            {/* Partidos toggle */}
            <div className="glass-card rounded-xl p-4 flex items-center justify-between">
              <Label className="cursor-pointer text-sm font-semibold flex items-center gap-2">
                <Trophy className="w-4 h-4 text-accent" />
                Usar pestaña de Partidos
              </Label>
              <Switch checked={usePartidos} onCheckedChange={setUsePartidos} />
            </div>
          </div>
        )}

        {activeTab === 'deberes' && (
          <TaskList
            tasks={tasks}
            type="homework"
            onAdd={addTask}
            onToggle={toggleTask}
            onDelete={deleteTask}
            triggerLabel="Añadir deber"
            emptyMessage="¡No tienes deberes pendientes!"
            emptyEmoji="🎉"
          />
        )}

        {activeTab === 'examenes' && (
          <TaskList
            tasks={tasks}
            type="exam"
            onAdd={addTask}
            onToggle={toggleTask}
            onDelete={deleteTask}
            triggerLabel="Añadir examen"
            emptyMessage="No hay exámenes próximos"
            emptyEmoji="📝"
          />
        )}

        {activeTab === 'eventos' && (
          <TaskList
            tasks={tasks}
            type={usePartidos ? 'match' : 'event'}
            onAdd={addTask}
            onToggle={toggleTask}
            onDelete={deleteTask}
            triggerLabel={usePartidos ? 'Añadir partido' : 'Añadir evento'}
            emptyMessage={usePartidos ? 'No hay partidos programados' : 'No hay eventos próximos'}
            emptyEmoji={usePartidos ? '⚽' : '🎪'}
          />
        )}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-md border-t border-border">
        <div className="max-w-lg mx-auto flex">
          {currentTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 flex flex-col items-center py-3 gap-1 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
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
