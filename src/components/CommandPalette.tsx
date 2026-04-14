import { useEffect, useState, useMemo } from 'react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Home, BookOpen, GraduationCap, Calendar, Trophy, ClipboardList, CalendarClock, AlertTriangle, FileText, BarChart3, Gift, Search, CalendarDays, Trash2 } from 'lucide-react';
import type { DbTask, TabType } from '@/types/app';

interface CommandPaletteProps {
  tasks: DbTask[];
  onNavigate: (tab: TabType) => void;
  onTaskClick?: (task: DbTask) => void;
}

const TAB_ITEMS: { id: TabType; label: string; icon: typeof Home }[] = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'deberes', label: 'Deberes', icon: BookOpen },
  { id: 'examenes', label: 'Exámenes', icon: GraduationCap },
  { id: 'eventos', label: 'Eventos', icon: Calendar },
  { id: 'tareas', label: 'Tareas', icon: ClipboardList },
  { id: 'partidos', label: 'Partidos', icon: Trophy },
  { id: 'horario', label: 'Horario', icon: CalendarClock },
  { id: 'no-olvidar', label: 'No olvidar', icon: AlertTriangle },
  { id: 'notas', label: 'Notas', icon: FileText },
  { id: 'productividad', label: 'Progreso', icon: BarChart3 },
  { id: 'premios', label: 'Premios', icon: Gift },
  { id: 'calendario' as TabType, label: 'Calendario', icon: CalendarDays },
  { id: 'papelera' as TabType, label: 'Papelera', icon: Trash2 },
];

const CommandPalette = ({ tasks, onNavigate, onTaskClick }: CommandPaletteProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const pendingTasks = useMemo(() =>
    tasks.filter(t => !t.completed && !(t as any).deleted_at).slice(0, 10),
    [tasks]
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar tareas, pestañas..." />
      <CommandList>
        <CommandEmpty>No se encontraron resultados.</CommandEmpty>
        <CommandGroup heading="Navegación">
          {TAB_ITEMS.map(tab => {
            const Icon = tab.icon;
            return (
              <CommandItem key={tab.id} onSelect={() => { onNavigate(tab.id); setOpen(false); }}>
                <Icon className="mr-2 h-4 w-4" />
                <span>{tab.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        {pendingTasks.length > 0 && (
          <CommandGroup heading="Tareas pendientes">
            {pendingTasks.map(t => (
              <CommandItem key={t.id} onSelect={() => { onTaskClick?.(t); setOpen(false); }}>
                <Search className="mr-2 h-4 w-4" />
                <span>{t.name}</span>
                {t.subject && <span className="ml-auto text-xs text-muted-foreground">{t.subject}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
