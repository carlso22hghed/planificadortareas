import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import type { DbProfile, DbTask, DbCountdown } from '@/types/app';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const typeLabels: Record<string, string> = {
  homework: 'Deber', exam: 'Examen', event: 'Evento', match: 'Partido', task: 'Tarea',
};

const Admin = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<DbProfile[]>([]);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userTasks, setUserTasks] = useState<DbTask[]>([]);
  const [userCountdowns, setUserCountdowns] = useState<DbCountdown[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    supabase.from('profiles').select('*').eq('is_active', true).order('display_name')
      .then(({ data }) => setUsers(data || []));
  }, [isAdmin, navigate]);

  const toggleUser = async (userId: string) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
      return;
    }
    setExpandedUser(userId);
    setLoadingData(true);
    const [tasksRes, countdownsRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', userId).order('due_date'),
      supabase.from('countdowns').select('*').eq('user_id', userId),
    ]);
    setUserTasks(tasksRes.data || []);
    setUserCountdowns(countdownsRes.data || []);
    setLoadingData(false);
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      <header className="gradient-hero px-5 pt-8 pb-6 rounded-b-3xl flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-primary-foreground hover:bg-primary-foreground/20">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-extrabold text-primary-foreground">👥 Usuarios</h1>
      </header>

      <main className="px-4 py-4 space-y-2">
        {users.map(u => (
          <div key={u.user_id} className="glass-card rounded-xl overflow-hidden">
            <button
              onClick={() => toggleUser(u.user_id)}
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{u.display_name || 'Sin nombre'}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {u.role === 'otro' ? u.custom_role || 'Otro' : u.role}
              </Badge>
              {expandedUser === u.user_id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {expandedUser === u.user_id && (
              <div className="px-4 pb-4 border-t border-border space-y-3 animate-slide-up">
                {loadingData ? (
                  <p className="text-sm text-muted-foreground py-2">Cargando...</p>
                ) : (
                  <>
                    {userCountdowns.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase mt-3 mb-1">Contadores</p>
                        {userCountdowns.map(c => (
                          <p key={c.id} className="text-sm py-1">⏳ {c.name} — {new Date(c.target_date).toLocaleDateString('es-ES')}</p>
                        ))}
                      </div>
                    )}
                    {['homework', 'exam', 'task', 'event', 'match'].map(type => {
                      const items = userTasks.filter(t => t.type === type);
                      if (!items.length) return null;
                      return (
                        <div key={type}>
                          <p className="text-xs font-bold text-muted-foreground uppercase mt-2 mb-1">{typeLabels[type] || type}s</p>
                          {items.map(t => (
                            <div key={t.id} className={cn('text-sm py-1 flex items-center gap-2', t.completed && 'line-through opacity-50')}>
                              <span>{t.completed ? '✅' : '⬜'}</span>
                              <span>{t.name}</span>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {new Date(t.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    {userTasks.length === 0 && userCountdowns.length === 0 && (
                      <p className="text-sm text-muted-foreground py-2">Sin datos</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
        {users.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-2">👻</p>
            <p className="text-muted-foreground text-sm">No hay usuarios registrados</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
