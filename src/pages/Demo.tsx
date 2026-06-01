import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Trash2, Plus, X, LogOut, Clock, CalendarDays, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { parseNaturalLanguage } from '@/lib/natural-language-parser';
import { isTaskHighlighted } from '@/lib/highlight';

interface DemoTask {
  id: string;
  name: string;
  type: 'task' | 'homework' | 'exam' | 'event';
  due_date?: string;
  due_time?: string;
  subject?: string;
  completed: boolean;
  created_at: string;
  completed_at?: string;
}

const STORAGE_KEY = 'demo-tasks';
const DEMO_FLAG = 'demo-mode';

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function seed(): DemoTask[] {
  const now = new Date().toISOString();
  return [
    { id: '1', name: 'Completar mi perfil', type: 'task', due_date: todayPlus(0), due_time: '20:00', completed: false, created_at: now },
    { id: '2', name: 'Organizar la semana', type: 'task', due_date: todayPlus(0), due_time: '21:00', completed: false, created_at: now },
    { id: '3', name: 'Comprar café', type: 'task', due_date: todayPlus(1), due_time: '10:00', completed: false, created_at: now },
    { id: '4', name: 'Ejercicios de matemáticas', type: 'homework', subject: 'Matemáticas', due_date: todayPlus(1), due_time: '23:59', completed: false, created_at: now },
    { id: '5', name: 'Examen de historia', type: 'exam', subject: 'Historia', due_date: todayPlus(3), due_time: '09:00', completed: false, created_at: now },
    { id: '6', name: 'Leer 20 páginas', type: 'task', due_date: todayPlus(-1), due_time: '22:00', completed: true, created_at: now, completed_at: now },
  ];
}

function loadTasks(): DemoTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = seed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return seed();
  }
}

const TYPE_LABEL: Record<string, string> = {
  task: 'Tarea', homework: 'Deber', exam: 'Examen', event: 'Evento',
};

const Demo = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<DemoTask[]>(() => loadTasks());
  const [input, setInput] = useState('');
  const [type, setType] = useState<DemoTask['type']>('task');

  useEffect(() => {
    localStorage.setItem(DEMO_FLAG, 'true');
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const add = () => {
    const parsed = parseNaturalLanguage(input, ['Matemáticas', 'Lengua', 'Inglés', 'Historia', 'Ciencias', 'Música', 'Arte', 'Tecnología', 'Religión', 'Educación Física']);
    if (!parsed) return;
    const newTask: DemoTask = {
      id: Math.random().toString(36).slice(2),
      name: parsed.name,
      type,
      due_date: parsed.due_date,
      due_time: parsed.due_time,
      subject: parsed.subject,
      completed: false,
      created_at: new Date().toISOString(),
    };
    setTasks([newTask, ...tasks]);
    setInput('');
  };

  const toggle = (id: string) => {
    setTasks(tasks.map(t => t.id === id
      ? { ...t, completed: !t.completed, completed_at: !t.completed ? new Date().toISOString() : undefined }
      : t));
  };

  const remove = (id: string) => setTasks(tasks.filter(t => t.id !== id));

  const reset = () => {
    if (!confirm('¿Reiniciar el modo demo? Se borrarán los cambios.')) return;
    const fresh = seed();
    setTasks(fresh);
  };

  const exitDemo = () => {
    localStorage.removeItem(DEMO_FLAG);
    localStorage.removeItem(STORAGE_KEY);
    navigate('/auth');
  };

  const sorted = useMemo(() => [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return (a.due_date || '').localeCompare(b.due_date || '');
  }), [tasks]);

  const pending = sorted.filter(t => !t.completed).length;
  const done = sorted.filter(t => t.completed).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-card/90 backdrop-blur-md px-4 py-2.5 flex items-center justify-between gap-3 shadow-sm border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 shrink-0 text-primary" />
          <p className="text-xs sm:text-sm font-semibold truncate text-foreground">
            Planificador Tareas
          </p>
        </div>
        <InstallAppButton size="sm" variant="secondary" label="Instalar" className="shrink-0 h-8 rounded-lg" />
      </div>


      <div className="max-w-2xl mx-auto p-4 space-y-5">
        <header className="text-center pt-4">
          <h1 className="text-3xl font-extrabold text-foreground">📚 Planificador Tareas</h1>
          <p className="text-muted-foreground text-sm mt-1">Prueba la app sin necesidad de registrarte</p>
          <div className="flex justify-center gap-4 mt-4 text-sm">
            <div className="text-center">
              <p className="text-2xl font-extrabold text-primary">{pending}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Pendientes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-extrabold text-success">{done}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Hechas</p>
            </div>
          </div>
        </header>

        {/* Quick capture */}
        <div className="glass-card rounded-2xl p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            {(['task', 'homework', 'exam', 'event'] as const).map(t => (
              <button key={t} onClick={() => setType(t)}
                className={cn('px-3 py-1 rounded-full text-xs font-bold transition-colors',
                  type === t ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted')}>
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              placeholder="mañana 18:00 ejercicios matemáticas..."
              className="flex-1 bg-muted/50 rounded-xl px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
            />
            <Button onClick={add} disabled={!input.trim()} className="rounded-xl">
              <Plus className="w-4 h-4" /> Crear
            </Button>
          </div>
        </div>

        {/* Tasks */}
        <div className="space-y-2">
          {sorted.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No hay tareas. Añade una arriba.</p>
          )}
          {sorted.map(t => {
            const fakeDb: any = { ...t };
            const highlighted = isTaskHighlighted(fakeDb);
            return (
              <div key={t.id}
                className={cn('glass-card rounded-2xl p-3 flex items-center gap-3 transition-all',
                  t.completed && 'opacity-50',
                  highlighted && 'ring-2 ring-amber-500 border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                )}>
                <button onClick={() => toggle(t.id)}
                  className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                    t.completed ? 'bg-success border-success' : 'border-muted-foreground/30 hover:border-primary')}>
                  {t.completed && <Check className="w-3.5 h-3.5 text-success-foreground" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={cn('font-semibold text-sm', t.completed && 'line-through')}>{t.name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="text-[10px] px-1.5 py-0 rounded bg-primary/10 text-primary font-bold">{TYPE_LABEL[t.type]}</span>
                    {t.subject && <span className="text-[10px] text-muted-foreground">{t.subject}</span>}
                    {t.due_date && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {new Date(t.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    {t.due_time && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />{t.due_time}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => remove(t.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center gap-2 pt-4">
          <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground underline">
            Reiniciar datos demo
          </button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center pb-8">
          Esto es solo una vista previa. <Link to="/auth" className="text-primary underline">Crea tu cuenta</Link> para acceder a todas las funciones (Nox AI, calendario, sincronización con Classroom, etc.)
        </p>
      </div>
    </div>
  );
};

export default Demo;
