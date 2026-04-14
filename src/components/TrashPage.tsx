import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import type { DbTask } from '@/types/app';
import { Trash2, RotateCcw, X, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { getSubjectColor } from '@/lib/subject-colors';

const TYPE_LABELS: Record<string, string> = {
  homework: 'Deber', exam: 'Examen', event: 'Evento', match: 'Partido', task: 'Tarea',
};

const TrashPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: trashedTasks = [] } = useQuery({
    queryKey: ['trashed-tasks', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user!.id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      return (data || []) as DbTask[];
    },
    enabled: !!user,
  });

  const restore = async (id: string) => {
    await supabase.from('tasks').update({ deleted_at: null } as any).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['trashed-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    toast({ title: 'Tarea restaurada' });
  };

  const deletePermanently = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['trashed-tasks'] });
    toast({ title: 'Eliminada permanentemente', variant: 'destructive' });
  };

  const emptyTrash = async () => {
    if (!trashedTasks.length) return;
    await Promise.all(trashedTasks.map(t => supabase.from('tasks').delete().eq('id', t.id)));
    queryClient.invalidateQueries({ queryKey: ['trashed-tasks'] });
    toast({ title: 'Papelera vaciada', variant: 'destructive' });
  };

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-foreground flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-destructive" /> Papelera
        </h2>
        {trashedTasks.length > 0 && (
          <button onClick={emptyTrash} className="text-xs text-destructive font-semibold hover:underline">
            Vaciar papelera
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">Las tareas en la papelera se pueden restaurar o eliminar permanentemente.</p>

      {trashedTasks.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <Trash2 className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">La papelera está vacía</p>
        </div>
      ) : (
        <div className="space-y-2">
          {trashedTasks.map(task => {
            const subjectColor = task.subject ? getSubjectColor(task.subject) : null;
            return (
              <div key={task.id} className="glass-card rounded-xl p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate line-through opacity-60">{task.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{TYPE_LABELS[task.type] || task.type}</Badge>
                    {task.subject && subjectColor && (
                      <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", subjectColor.bg, subjectColor.text)}>{task.subject}</Badge>
                    )}
                    {task.due_date && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <CalendarDays className="w-2.5 h-2.5" />
                        {new Date(task.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => restore(task.id)} className="p-2 rounded-lg hover:bg-primary/10 transition-colors" title="Restaurar">
                  <RotateCcw className="w-4 h-4 text-primary" />
                </button>
                <button onClick={() => deletePermanently(task.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors" title="Eliminar">
                  <X className="w-4 h-4 text-destructive" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TrashPage;
