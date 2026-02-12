import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import type { DbProfile, DbTask, DbCountdown, DbSettings } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, User, ChevronDown, ChevronUp, Pencil, Check, X, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import EditTaskDialog from '@/components/EditTaskDialog';

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
  const [userSettings, setUserSettings] = useState<DbSettings | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Editing states
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [tempRole, setTempRole] = useState('');
  const [editTask, setEditTask] = useState<DbTask | null>(null);

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
    const [tasksRes, countdownsRes, settingsRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', userId).order('due_date'),
      supabase.from('countdowns').select('*').eq('user_id', userId),
      supabase.from('user_settings').select('*').eq('user_id', userId).single(),
    ]);
    setUserTasks(tasksRes.data || []);
    setUserCountdowns(countdownsRes.data || []);
    setUserSettings(settingsRes.data || null);
    setLoadingData(false);
  };

  const saveUserName = async (userId: string) => {
    if (!tempName.trim()) return;
    await supabase.from('profiles').update({ display_name: tempName.trim() }).eq('user_id', userId);
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, display_name: tempName.trim() } : u));
    setEditingNameId(null);
  };

  const saveUserRole = async (userId: string) => {
    await supabase.from('profiles').update({ role: tempRole }).eq('user_id', userId);
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: tempRole } : u));
    setEditingRoleId(null);
  };

  const deleteUserTask = async (taskId: string) => {
    await supabase.from('tasks').delete().eq('id', taskId);
    setUserTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const updateUserTask = async (task: DbTask) => {
    const { id, user_id, created_at, ...rest } = task;
    await supabase.from('tasks').update(rest).eq('id', id);
    setUserTasks(prev => prev.map(t => t.id === id ? task : t));
  };

  const toggleUserTask = async (taskId: string) => {
    const task = userTasks.find(t => t.id === taskId);
    if (!task) return;
    await supabase.from('tasks').update({ completed: !task.completed }).eq('id', taskId);
    setUserTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
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
                <p className="text-[10px] text-muted-foreground">
                  📅 {new Date(u.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })} — {new Date(u.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </p>
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
                    {/* School */}
                    {userSettings && (
                      <div className="mt-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Colegio</p>
                        <p className="text-sm">{userSettings.school_name || 'Sin especificar'}</p>
                      </div>
                    )}

                    {/* Edit name */}
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Nombre</p>
                      {editingNameId === u.user_id ? (
                        <div className="flex gap-2">
                          <Input value={tempName} onChange={e => setTempName(e.target.value)} className="h-8 text-sm" />
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveUserName(u.user_id)}><Check className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingNameId(null)}><X className="w-4 h-4" /></Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{u.display_name || 'Sin nombre'}</span>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setTempName(u.display_name); setEditingNameId(u.user_id); }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Edit role */}
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Rol</p>
                      {editingRoleId === u.user_id ? (
                        <div className="flex gap-2 items-center">
                          <Select value={tempRole} onValueChange={setTempRole}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="estudiante">Estudiante</SelectItem>
                              <SelectItem value="profesor">Profesor</SelectItem>
                              <SelectItem value="otro">Otro</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveUserRole(u.user_id)}><Check className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingRoleId(null)}><X className="w-4 h-4" /></Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{u.role === 'otro' ? u.custom_role || 'Otro' : u.role}</span>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setTempRole(u.role); setEditingRoleId(u.user_id); }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Countdowns */}
                    {userCountdowns.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase mt-3 mb-1">Contadores</p>
                        {userCountdowns.map(c => (
                          <p key={c.id} className="text-sm py-1">⏳ {c.name} — {new Date(c.target_date).toLocaleDateString('es-ES')}</p>
                        ))}
                      </div>
                    )}

                    {/* Tasks by type */}
                    {['homework', 'exam', 'task', 'event', 'match'].map(type => {
                      const items = userTasks.filter(t => t.type === type);
                      if (!items.length) return null;
                      return (
                        <div key={type}>
                          <p className="text-xs font-bold text-muted-foreground uppercase mt-2 mb-1">{typeLabels[type] || type}s</p>
                          {items.map(t => (
                            <div key={t.id} className={cn('text-sm py-1 flex items-center gap-2', t.completed && 'line-through opacity-50')}>
                              <button onClick={() => toggleUserTask(t.id)} className="shrink-0">
                                {t.completed ? '✅' : '⬜'}
                              </button>
                              <span className="flex-1">{t.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(t.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                              </span>
                              <button onClick={() => setEditTask(t)} className="p-1 hover:bg-muted rounded">
                                <Pencil className="w-3 h-3 text-muted-foreground" />
                              </button>
                              <button onClick={() => deleteUserTask(t.id)} className="p-1 hover:bg-destructive/10 rounded">
                                <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                              </button>
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

      <EditTaskDialog
        task={editTask}
        open={!!editTask}
        onOpenChange={open => !open && setEditTask(null)}
        onSave={updateUserTask}
        subjects={userSettings ? [...userSettings.enabled_subjects, ...userSettings.custom_subjects] : []}
        sportTypes={userSettings?.sport_types || ['Fútbol']}
      />
    </div>
  );
};

export default Admin;
