import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DbTask, DbCountdown, DbSettings, DbProfile, TabType } from '@/types/app';
import ScheduleInline from '@/components/ScheduleInline';
import { Home, BookOpen, GraduationCap, Calendar, Trophy, ClipboardList, CalendarClock, ArrowLeft, AlertTriangle, FileText, BarChart3, CalendarDays, Gift, Trash2 } from 'lucide-react';
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

  useEffect(() => {
    supabase.from('user_settings').select('*').eq('user_id', userId).single()
      .then(({ data }) => setSettings(data));
  }, [userId]);

  const { data: allTasks = [] } = useQuery({
    queryKey: ['admin-tasks', userId],
    queryFn: async () => {
      const { data } = await supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      return (data || []) as DbTask[];
    },
  });

  const tasks = allTasks.filter(t => !(t as any).deleted_at);
  const trashedTasks = allTasks.filter(t => !!(t as any).deleted_at);

  const { data: countdowns = [] } = useQuery({
    queryKey: ['admin-countdowns', userId],
    queryFn: async () => {
      const { data } = await supabase.from('countdowns').select('*').eq('user_id', userId).order('sort_order');
      return (data || []) as DbCountdown[];
    },
  });

  const { data: dontForgetItems = [] } = useQuery({
    queryKey: ['admin-dont-forget', userId],
    queryFn: async () => {
      const { data } = await supabase.from('dont_forget').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: writtenNotes = [] } = useQuery({
    queryKey: ['admin-written-notes', userId],
    queryFn: async () => {
      const { data } = await supabase.from('written_notes').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: voiceNotes = [] } = useQuery({
    queryKey: ['admin-voice-notes', userId],
    queryFn: async () => {
      const { data } = await supabase.from('voice_notes').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: gamification } = useQuery({
    queryKey: ['admin-gamification', userId],
    queryFn: async () => {
      const { data } = await supabase.from('user_gamification').select('*').eq('user_id', userId).single();
      return data;
    },
  });

  const { data: badges = [] } = useQuery({
    queryKey: ['admin-badges', userId],
    queryFn: async () => {
      const { data } = await supabase.from('user_badges').select('*').eq('user_id', userId).order('unlocked_at', { ascending: false });
      return data || [];
    },
  });

  if (!settings) return <p className="text-sm text-muted-foreground p-4">Cargando...</p>;

  const pendingHomework = tasks.filter(t => t.type === 'homework' && !t.completed).length;
  const pendingExams = tasks.filter(t => t.type === 'exam' && !t.completed).length;

  const buildTabs = () => {
    const result: { id: TabType; label: string; icon: typeof Home }[] = [
      { id: 'inicio', label: 'Inicio', icon: Home },
      { id: 'deberes', label: 'Deberes', icon: BookOpen },
      { id: 'examenes', label: 'Exámenes', icon: GraduationCap },
      { id: 'tareas', label: 'Tareas', icon: ClipboardList },
      { id: 'eventos', label: 'Eventos', icon: Calendar },
      { id: 'partidos', label: 'Partidos', icon: Trophy },
      { id: 'horario' as TabType, label: 'Horario', icon: CalendarClock },
      { id: 'no-olvidar' as TabType, label: '¡No olvidar!', icon: AlertTriangle },
      { id: 'notas' as TabType, label: 'Notas', icon: FileText },
      { id: 'productividad' as TabType, label: 'Progreso', icon: BarChart3 },
      { id: 'calendario' as TabType, label: 'Calendario', icon: CalendarDays },
      { id: 'premios' as TabType, label: 'Premios', icon: Gift },
      { id: 'papelera' as TabType, label: 'Papelera', icon: Trash2 },
    ];
    return result;
  };

  const currentTabs = buildTabs();

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-4xl mx-auto">
      <header className="gradient-hero px-5 pt-8 pb-6 rounded-b-3xl flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-primary-foreground hover:bg-primary-foreground/20">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-extrabold text-primary-foreground">{settings.app_name}</h1>
            <p className="text-primary-foreground/70 text-sm font-medium mt-0.5">{settings.school_name}</p>
            <p className="text-primary-foreground/60 text-xs mt-0.5">Vista de {profile.display_name} 👁️ (Solo lectura)</p>
          </div>
        </div>
      </header>

      {/* Scrollable tab bar */}
      <div className="border-b border-border bg-card/50 overflow-x-auto">
        <div className="flex min-w-max px-2">
          {currentTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn('flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold uppercase tracking-wide whitespace-nowrap border-b-2 transition-colors',
                  isActive ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground')}>
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <main className="flex-1 px-4 py-4 overflow-y-auto pb-8">
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
            {/* Gamification summary */}
            {gamification && (
              <div className="glass-card rounded-2xl p-4">
                <h3 className="font-bold text-sm mb-2">🏆 Gamificación</h3>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div><p className="text-lg font-bold text-primary">{gamification.level}</p><p className="text-muted-foreground">Nivel</p></div>
                  <div><p className="text-lg font-bold text-primary">{gamification.total_points}</p><p className="text-muted-foreground">Puntos</p></div>
                  <div><p className="text-lg font-bold text-primary">{gamification.tasks_completed_total}</p><p className="text-muted-foreground">Completadas</p></div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Premium: {gamification.premium_days_remaining > 0 ? `${gamification.premium_days_remaining} días` : 'No'} · Referidos: {gamification.referral_count}
                </div>
              </div>
            )}
            {/* Badges */}
            {badges.length > 0 && (
              <div className="glass-card rounded-2xl p-4">
                <h3 className="font-bold text-sm mb-2">🎖️ Insignias ({badges.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {badges.map((b: any) => (
                    <span key={b.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-xs">
                      {b.badge_icon} {b.badge_name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {/* Countdowns */}
            <div>
              <h2 className="font-bold text-foreground mb-3">⏳ Contadores</h2>
              {countdowns.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin contadores</p>
              ) : (
                <div className="space-y-2">
                  {countdowns.map(c => (
                    <div key={c.id} className="glass-card rounded-2xl p-4">
                      <p className="font-semibold text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(c.target_date).toLocaleDateString('es-ES')} · {c.target_time}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Settings overview */}
            <div className="glass-card rounded-2xl p-4">
              <h3 className="font-bold text-sm mb-2">⚙️ Ajustes del usuario</h3>
              <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                <span>Tema: {(settings as any).theme}</span>
                <span>Estilo: {(settings as any).design_style}</span>
                <span>Nav: {(settings as any).nav_position}</span>
                <span>Fuente: {(settings as any).font_family}</span>
                <span>Asignaturas: {settings.enabled_subjects?.length || 0}</span>
                <span>Deportes: {settings.sport_types?.length || 0}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'deberes' && <ReadOnlyTaskList tasks={tasks} type="homework" groupingMode={(settings as any).grouping_mode} />}
        {activeTab === 'examenes' && <ReadOnlyTaskList tasks={tasks} type="exam" groupingMode={(settings as any).grouping_mode} />}
        {activeTab === 'tareas' && <ReadOnlyTaskList tasks={tasks} type="task" />}
        {activeTab === 'eventos' && <ReadOnlyTaskList tasks={tasks} type="event" />}
        {activeTab === 'partidos' && <ReadOnlyTaskList tasks={tasks} type="match" />}
        {activeTab === ('horario' as TabType) && <ScheduleInline userId={userId} readOnly />}

        {activeTab === ('no-olvidar' as TabType) && (
          <div className="space-y-2">
            <h2 className="font-bold text-foreground mb-3">🔴 ¡No olvidar!</h2>
            {dontForgetItems.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Sin recordatorios</p> : (
              dontForgetItems.map((item: any) => (
                <div key={item.id} className="glass-card rounded-2xl p-4 border-l-4 border-destructive">
                  <p className="font-semibold text-sm">{item.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(item.created_at).toLocaleDateString('es-ES')}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === ('notas' as TabType) && (
          <div className="space-y-4">
            <h2 className="font-bold text-foreground mb-3">📝 Notas escritas ({writtenNotes.length})</h2>
            {writtenNotes.map((n: any) => (
              <div key={n.id} className="glass-card rounded-2xl p-4">
                <p className="font-semibold text-sm">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{n.content}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleDateString('es-ES')}</p>
              </div>
            ))}
            <h2 className="font-bold text-foreground mb-3 mt-6">🎙️ Notas de voz ({voiceNotes.length})</h2>
            {voiceNotes.map((n: any) => (
              <div key={n.id} className="glass-card rounded-2xl p-4">
                <p className="font-semibold text-sm">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.duration_seconds ? `${Math.floor(n.duration_seconds / 60)}:${String(n.duration_seconds % 60).padStart(2, '0')}` : 'Sin duración'}</p>
                {n.audio_url && <audio controls src={n.audio_url} className="mt-2 w-full h-8" />}
              </div>
            ))}
          </div>
        )}

        {activeTab === ('productividad' as TabType) && (
          <div className="space-y-4">
            <h2 className="font-bold text-foreground mb-3">📊 Progreso</h2>
            {gamification && (
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card rounded-2xl p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{gamification.level}</p>
                  <p className="text-xs text-muted-foreground">Nivel</p>
                </div>
                <div className="glass-card rounded-2xl p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{gamification.total_points}</p>
                  <p className="text-xs text-muted-foreground">Puntos totales</p>
                </div>
                <div className="glass-card rounded-2xl p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{gamification.tasks_completed_total}</p>
                  <p className="text-xs text-muted-foreground">Tareas completadas</p>
                </div>
                <div className="glass-card rounded-2xl p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{gamification.referral_count}</p>
                  <p className="text-xs text-muted-foreground">Referidos</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === ('calendario' as TabType) && (
          <div className="space-y-2">
            <h2 className="font-bold text-foreground mb-3">📅 Calendario</h2>
            <p className="text-sm text-muted-foreground">Vista calendario del usuario con {tasks.filter(t => !t.completed).length} tareas pendientes.</p>
            <div className="space-y-2">
              {tasks.filter(t => !t.completed && t.due_date).sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '')).slice(0, 20).map(t => (
                <div key={t.id} className="glass-card rounded-xl p-3 flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground w-16 shrink-0">{t.due_date ? new Date(t.due_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '—'}</span>
                  <span className="text-sm font-medium">{t.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto uppercase">{t.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === ('premios' as TabType) && (
          <div className="space-y-4">
            <h2 className="font-bold text-foreground mb-3">🎁 Premios</h2>
            {gamification && (
              <div className="glass-card rounded-2xl p-4">
                <p className="text-sm"><strong>Código de referido:</strong> {gamification.referral_code}</p>
                <p className="text-sm mt-1"><strong>Referidos:</strong> {gamification.referral_count}</p>
                <p className="text-sm mt-1"><strong>Premium:</strong> {gamification.premium_days_remaining > 0 ? `${gamification.premium_days_remaining} días restantes` : 'No activo'}</p>
              </div>
            )}
            {badges.length > 0 && (
              <div className="glass-card rounded-2xl p-4">
                <h3 className="font-bold text-sm mb-2">Insignias desbloqueadas</h3>
                <div className="space-y-2">
                  {badges.map((b: any) => (
                    <div key={b.id} className="flex items-center gap-2">
                      <span className="text-lg">{b.badge_icon}</span>
                      <div>
                        <p className="text-sm font-semibold">{b.badge_name}</p>
                        <p className="text-xs text-muted-foreground">{b.badge_description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === ('papelera' as TabType) && (
          <div className="space-y-2">
            <h2 className="font-bold text-foreground mb-3">🗑️ Papelera ({trashedTasks.length})</h2>
            {trashedTasks.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Papelera vacía</p> : (
              trashedTasks.map(t => (
                <div key={t.id} className="glass-card rounded-2xl p-4 opacity-60">
                  <p className="font-semibold text-sm line-through">{t.name}</p>
                  <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                    <span>{t.type}</span>
                    {t.subject && <span>· {t.subject}</span>}
                    <span>· Eliminado: {new Date((t as any).deleted_at).toLocaleDateString('es-ES')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};

// Simple read-only task list
const ReadOnlyTaskList = ({ tasks, type, groupingMode }: { tasks: DbTask[]; type: string; groupingMode?: string }) => {
  const filtered = tasks.filter(t => t.type === type).sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return (a.due_date || '').localeCompare(b.due_date || '');
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
                {t.due_date && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(t.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </span>
                )}
                {t.subject && <span className="text-xs text-muted-foreground">· {t.subject}</span>}
                {t.due_time && <span className="text-xs text-muted-foreground">· {t.due_time}</span>}
                {t.location && <span className="text-xs text-muted-foreground">· 📍 {t.location}</span>}
                {t.rival && <span className="text-xs text-muted-foreground">· vs {t.rival}</span>}
                {(t as any).importance && (t as any).importance !== 'normal' && (
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', (t as any).importance === 'alta' ? 'bg-destructive/20 text-destructive' : 'bg-amber-500/20 text-amber-600')}>
                    {(t as any).importance}
                  </span>
                )}
              </div>
              {(t as any).description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{(t as any).description}</p>}
              {type === 'exam' && (
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px]">{(t as any).study_completed ? '✅' : '⬜'}</span>
                  <span className={cn('text-[10px] text-muted-foreground', (t as any).study_completed && 'line-through')}>
                    Estudiar / Practicar
                  </span>
                  {(t as any).grade && <span className="text-[10px] font-bold text-primary ml-2">Nota: {(t as any).grade}</span>}
                </div>
              )}
              {(t as any).estimated_minutes && (
                <span className="text-[10px] text-muted-foreground">⏱ {(t as any).estimated_minutes} min estimados</span>
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
