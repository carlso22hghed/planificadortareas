import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DbTask } from '@/types/app';
import { cn } from '@/lib/utils';
import { Check, CalendarDays, Clock, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getSubjectColor } from '@/lib/subject-colors';

interface SharedListViewProps {
  token: string;
}

const SharedListView = ({ token }: SharedListViewProps) => {
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const load = async () => {
      // Get the shared list info
      const { data: share } = await supabase
        .from('shared_lists' as any)
        .select('*')
        .eq('share_token', token)
        .single();

      if (!share) {
        setError('Este enlace no es válido o ha expirado.');
        setLoading(false);
        return;
      }

      // Check expiration
      if ((share as any).expires_at && new Date((share as any).expires_at) < new Date()) {
        setError('Este enlace ha expirado.');
        setLoading(false);
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', (share as any).user_id)
        .single();
      
      if (profile) setUserName(profile.display_name);

      // Get tasks
      const { data: taskData } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', (share as any).user_id)
        .is('deleted_at', null)
        .order('due_date', { ascending: true });

      const listType = (share as any).list_type;
      let filtered = (taskData || []) as DbTask[];
      if (listType !== 'all') {
        filtered = filtered.filter(t => t.type === listType);
      }

      setTasks(filtered);
      setLoading(false);
    };

    load();

    // Realtime subscription
    const channel = supabase
      .channel(`shared-${token}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [token]);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground animate-pulse">Cargando...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="glass-card rounded-2xl p-8 text-center max-w-sm">
        <p className="text-4xl mb-3">🔗</p>
        <p className="font-bold text-foreground">{error}</p>
      </div>
    </div>
  );

  const pending = tasks.filter(t => !t.completed);
  const completed = tasks.filter(t => t.completed);

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-hero px-5 pt-8 pb-6 rounded-b-3xl">
        <h1 className="text-xl font-extrabold text-primary-foreground">Tareas compartidas</h1>
        {userName && <p className="text-primary-foreground/70 text-sm mt-1">De {userName}</p>}
        <p className="text-primary-foreground/60 text-xs mt-0.5">{pending.length} pendientes · {completed.length} completadas</p>
      </header>
      <main className="max-w-lg mx-auto px-4 py-4 space-y-2">
        {tasks.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No hay tareas para mostrar</p>
        ) : (
          [...pending, ...completed].map(t => {
            const isPast = t.due_date ? new Date(t.due_date) < new Date(new Date().toDateString()) : false;
            return (
              <div key={t.id} className={cn('glass-card rounded-2xl p-4', t.completed && 'opacity-50')}>
                <div className="flex items-center gap-3">
                  <div className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0',
                    t.completed ? 'bg-success border-success' : 'border-muted-foreground/30')}>
                    {t.completed && <Check className="w-3.5 h-3.5 text-success-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-semibold text-sm', t.completed && 'line-through')}>{t.name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {t.due_date && (
                        <span className={cn('text-xs flex items-center gap-1', isPast && !t.completed ? 'text-destructive' : 'text-muted-foreground')}>
                          <CalendarDays className="w-3 h-3" />
                          {new Date(t.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      {t.due_time && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{t.due_time}</span>}
                      {t.subject && (() => {
                        const color = getSubjectColor(t.subject);
                        return <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 border-0", color.bg, color.text)}>{t.subject}</Badge>;
                      })()}
                      {t.location && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><MapPin className="w-3 h-3" />{t.location}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <p className="text-center text-[10px] text-muted-foreground py-4">
          Vista en tiempo real · No necesitas cuenta
        </p>
      </main>
    </div>
  );
};

export default SharedListView;
