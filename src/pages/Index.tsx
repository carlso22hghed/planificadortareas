import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useProductivity } from '@/hooks/use-productivity';
import { Switch } from '@/components/ui/switch';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useClassroom } from '@/hooks/use-classroom';
import { useNoxAI } from '@/hooks/use-nox-ai';
import { useTeacherMode } from '@/hooks/use-teacher-mode';
import type { DbTask, DbCountdown, TabType } from '@/types/app';
import SortableCountdownItem from '@/components/SortableCountdownItem';
import AddCountdownDialog from '@/components/AddCountdownDialog';
import EditCountdownDialog from '@/components/EditCountdownDialog';
import TaskList from '@/components/TaskList';
import TaskTemplateDialog from '@/components/TaskTemplateDialog';
import ScheduleInline from '@/components/ScheduleInline';
import SettingsPanel from '@/components/SettingsPanel';
import SupportDialog from '@/components/SupportDialog';
import DontForgetPage from '@/components/DontForgetPage';
import NotesPage from '@/components/NotesPage';
import ClassroomPromoDialog from '@/components/ClassroomPromoDialog';
import NoxAIFab from '@/components/NoxAIFab';
import ProductivityPage from '@/components/ProductivityPage';
import PrivacyFooter from '@/components/PrivacyFooter';
import PomodoroTimer from '@/components/PomodoroTimer';
import PremiosPage from '@/components/PremiosPage';
import CalendarView from '@/components/CalendarView';
import CommandPalette from '@/components/CommandPalette';
import TrashPage from '@/components/TrashPage';
import OrdenDiaPage from '@/components/OrdenDiaPage';
import { useGamification } from '@/hooks/use-gamification';
import QuickCapture from '@/components/QuickCapture';
import ShareListButton from '@/components/ShareListButton';
import WeeklySummaryDialog from '@/components/WeeklySummaryDialog';
import OnboardingTour from '@/components/OnboardingTour';
import KeyboardShortcutsHelp from '@/components/KeyboardShortcutsHelp';
import { Home, BookOpen, GraduationCap, Calendar, Trophy, ClipboardList, CalendarClock, AlertTriangle, FileText, X, BarChart3, Users, Hand, PartyPopper, CheckCircle, Tent, Timer, Palmtree, Quote, Gift, CalendarDays, Trash2, Search, ToggleLeft, ToggleRight, RotateCcw, ListChecks } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { triggerConfetti } from '@/lib/confetti';
import { getDailyQuote } from '@/lib/quotes';

const Index = () => {
  const { user, profile, settings, updateSettings, isAdmin } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const classroom = useClassroom(user?.id);
  const { isTeacher, labels: tl } = useTeacherMode();
  const classroomSyncedRef = useRef(false);
  const [activeTab, setActiveTab] = useState<TabType>('inicio');
  const [editCountdown, setEditCountdown] = useState<DbCountdown | null>(null);
  const notifiedRef = useRef(false);
  const [sidebarHover, setSidebarHover] = useState(false);
  const [showDontForgetPopup, setShowDontForgetPopup] = useState(false);
  const [dontForgetDismissed, setDontForgetDismissed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showPageToggleMenu, setShowPageToggleMenu] = useState(false);
  const [pageTogglePos, setPageTogglePos] = useState({ x: 0, y: 0 });
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Block UI for blocked minors
  const isBlocked = (profile as any)?.status === 'bloqueado';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('tasks').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
      return (data || []) as DbTask[];
    },
    enabled: !!user,
  });

  const tasks = useMemo(() => allTasks.filter(t => !(t as any).deleted_at), [allTasks]);

  const noxAI = useNoxAI(tasks);
  const { lastWeekSummary } = useProductivity(tasks);
  const { addPoints, stats: gamificationStats } = useGamification();
  const isPremium = (gamificationStats?.premiumDaysRemaining ?? 0) > 0;
  

  const { data: countdowns = [] } = useQuery({
    queryKey: ['countdowns', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('countdowns').select('*').eq('user_id', user!.id).order('sort_order');
      return (data || []) as DbCountdown[];
    },
    enabled: !!user,
  });

  const { data: dontForgetItems = [] } = useQuery({
    queryKey: ['dont-forget-header', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('dont_forget').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    const dismissed = localStorage.getItem('dont-forget-dismissed');
    if (dismissed) {
      const dismissedAt = new Date(dismissed).getTime();
      if (Date.now() - dismissedAt < 24 * 60 * 60 * 1000) {
        setDontForgetDismissed(true);
      } else {
        localStorage.removeItem('dont-forget-dismissed');
        setDontForgetDismissed(false);
      }
    }
  }, []);

  const dismissDontForget = () => {
    setDontForgetDismissed(true);
    localStorage.setItem('dont-forget-dismissed', new Date().toISOString());
    setShowDontForgetPopup(false);
  };

  const showDontForgetButton = (settings as any)?.dont_forget_enabled && dontForgetItems.length > 0 && !dontForgetDismissed;

  // Register service worker for push notifications
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // Realtime sync for tasks
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '?' && !e.ctrlKey) { setShowShortcuts(true); return; }
      if (e.key === 'n' || e.key === 'N') { setActiveTab('tareas'); return; }
      if (e.key === 'd' || e.key === 'D') { setActiveTab('deberes'); return; }
      if (e.key === 'e' || e.key === 'E') { setActiveTab('examenes'); return; }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Auto-sync Classroom on load
  useEffect(() => {
    if (classroomSyncedRef.current || !user) return;
    const isPending = localStorage.getItem('classroomSyncPending') === 'true';
    const isSynced = localStorage.getItem('classroomSynced') === 'true';
    if (isPending || isSynced) {
      classroomSyncedRef.current = true;
      // Request notification permission on first classroom sync
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      classroom.autoSync().then(() => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      });
    }
  }, [user, classroom, queryClient]);

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

  const playNotificationSound = useCallback(() => {
    if (!settings || (settings as any).notification_sound === false) return;
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.7;
      audio.play().catch(() => {});
    } catch {}
  }, [settings]);

  useEffect(() => {
    if (notifiedRef.current || !tasks.length) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const now = new Date();
    const typeNames: Record<string, string> = { homework: 'deber', exam: 'examen', event: 'evento', match: 'partido', task: 'tarea' };
    let didNotify = false;
    tasks.filter(t => !t.completed).forEach(t => {
      if (t.reminder_date && t.reminder_time) {
        const reminderDate = new Date(`${t.reminder_date}T${t.reminder_time}:00`);
        const dueDate = t.due_date ? new Date(`${t.due_date}T${t.due_time || '23:59'}:00`) : new Date('2099-12-31');
        const frequency = t.reminder_frequency;
        if (now >= reminderDate && now <= dueDate) {
          const sessionKey = `notified-custom-${t.id}`;
          const lastNotified = sessionStorage.getItem(sessionKey);
          const lastNotifiedTime = lastNotified ? parseInt(lastNotified) : 0;
          const freqMs = frequency && frequency > 0 ? frequency * 60 * 1000 : Infinity;
          if (!lastNotified || (frequency && frequency > 0 && (now.getTime() - lastNotifiedTime) >= freqMs)) {
            new Notification(`Recordatorio: ${t.name}`, {
              body: `Tienes un ${typeNames[t.type] || 'evento'}${t.due_date ? ` para ${new Date(t.due_date).toLocaleDateString('es-ES')}` : ''}`,
              icon: '/logo.png',
            });
            sessionStorage.setItem(sessionKey, String(now.getTime()));
            didNotify = true;
          }
        }
      } else if (t.due_date) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        if (t.due_date === tomorrowStr) {
          const sessionKey = `notified-${tomorrowStr}`;
          if (!sessionStorage.getItem(sessionKey)) {
            new Notification(`Mañana: ${t.name}`, { body: `Tienes un ${typeNames[t.type] || 'evento'} mañana`, icon: '/logo.png' });
            sessionStorage.setItem(sessionKey, 'true');
            didNotify = true;
          }
        }
      }
    });
    if (didNotify) playNotificationSound();
    notifiedRef.current = true;
  }, [tasks, playNotificationSound]);

  const addTask = async (taskData: Partial<DbTask>) => {
    await supabase.from('tasks').insert({ ...taskData, user_id: user!.id } as any);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newCompleted = !task.completed;
    await supabase.from('tasks').update({ completed: newCompleted }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    if (newCompleted) {
      triggerConfetti();
      addPoints(10);
      // Auto-create next recurring task
      const rule = (task as any).recurrence_rule;
      if (rule && rule !== 'none' && task.due_date) {
        const nextDate = getNextRecurrenceDate(task.due_date, rule);
        if (nextDate) {
          const { id: _id, created_at: _ca, completed: _c, study_completed: _sc, sort_order: _so, ...rest } = task as any;
          await supabase.from('tasks').insert({
            ...rest,
            user_id: user!.id,
            due_date: nextDate,
            completed: false,
            study_completed: false,
          } as any);
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
      }
    }
  };

  function getNextRecurrenceDate(currentDate: string, rule: string): string | null {
    const d = new Date(currentDate + 'T12:00:00');
    switch (rule) {
      case 'daily': d.setDate(d.getDate() + 1); break;
      case 'weekly': d.setDate(d.getDate() + 7); break;
      case 'biweekly': d.setDate(d.getDate() + 14); break;
      case 'monthly': d.setMonth(d.getMonth() + 1); break;
      case 'weekly_monday': d.setDate(d.getDate() + (((1 - d.getDay()) + 7) % 7 || 7)); break;
      case 'weekly_tuesday': d.setDate(d.getDate() + (((2 - d.getDay()) + 7) % 7 || 7)); break;
      case 'weekly_wednesday': d.setDate(d.getDate() + (((3 - d.getDay()) + 7) % 7 || 7)); break;
      case 'weekly_thursday': d.setDate(d.getDate() + (((4 - d.getDay()) + 7) % 7 || 7)); break;
      case 'weekly_friday': d.setDate(d.getDate() + (((5 - d.getDay()) + 7) % 7 || 7)); break;
      default: return null;
    }
    return d.toISOString().split('T')[0];
  }

  const toggleStudy = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    await supabase.from('tasks').update({ study_completed: !task.study_completed }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').update({ deleted_at: new Date().toISOString() } as any).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const updateTask = async (task: DbTask) => {
    const { id, user_id, created_at, ...rest } = task;
    await supabase.from('tasks').update(rest).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

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

  const scheduleTabEnabled = (settings as any).schedule_tab_enabled || false;
  const navPosition = (settings as any).nav_position || 'bottom';

  // Toggleable pages configuration
  const DEFAULT_TOGGLEABLE_PAGES = [
    { key: 'deberes_enabled', label: tl.tabHomework, settingKey: 'deberes_enabled' },
    { key: 'examenes_enabled', label: tl.tabExam, settingKey: 'examenes_enabled' },
    { key: 'tareas_enabled', label: tl.tabTask, settingKey: 'tareas_enabled' },
    { key: 'orden_dia_enabled', label: 'Orden del día', settingKey: 'orden_dia_enabled' },
    { key: 'eventos_enabled', label: 'Eventos', settingKey: 'eventos_enabled' },
    { key: 'partidos_enabled', label: 'Partidos', settingKey: 'partidos_enabled' },
    { key: 'horario_enabled', label: isTeacher ? 'Agenda' : 'Horario', settingKey: 'schedule_tab_enabled' },
    { key: 'dont_forget_enabled', label: '¡No olvidar!', settingKey: 'dont_forget_enabled' },
    { key: 'notes_enabled', label: 'Notas', settingKey: 'notes_enabled' },
    { key: 'pomodoro_enabled', label: 'Pomodoro', settingKey: 'pomodoro_enabled' },
    { key: 'productividad_enabled', label: 'Progreso', settingKey: 'productividad_enabled' },
    { key: 'calendario_enabled', label: 'Calendario', settingKey: 'calendario_enabled' },
    { key: 'premios_enabled', label: 'Premios', settingKey: 'premios_enabled' },
    { key: 'papelera_enabled', label: 'Papelera', settingKey: 'papelera_enabled' },
  ];

  const savedOrder: string[] = (settings as any).context_menu_order || [];
  const TOGGLEABLE_PAGES = useMemo(() => {
    if (!savedOrder.length) return DEFAULT_TOGGLEABLE_PAGES;
    const ordered: typeof DEFAULT_TOGGLEABLE_PAGES = [];
    for (const key of savedOrder) {
      const found = DEFAULT_TOGGLEABLE_PAGES.find(p => p.key === key);
      if (found) ordered.push(found);
    }
    // Add any new pages not yet in saved order
    for (const p of DEFAULT_TOGGLEABLE_PAGES) {
      if (!ordered.find(o => o.key === p.key)) ordered.push(p);
    }
    return ordered;
  }, [savedOrder, isTeacher, tl]);

  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const moveMenuItem = useCallback((fromIdx: number, toIdx: number) => {
    const keys = TOGGLEABLE_PAGES.map(p => p.key);
    const reordered = [...keys];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    updateSettings({ context_menu_order: reordered } as any);
  }, [TOGGLEABLE_PAGES, updateSettings]);

  const handleMainContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setPageTogglePos({ x: e.clientX, y: e.clientY });
    setShowPageToggleMenu(true);
  };

  const isPageEnabled = (key: string) => (settings as any)[key] !== false;

  const buildTabs = () => {
    const result: { id: TabType; label: string; shortLabel: string; icon: typeof Home }[] = [
      { id: 'inicio', label: 'Inicio', shortLabel: 'Ini.', icon: Home },
    ];

    // Map from settingKey to tab definition(s)
    const tabMap: Record<string, () => void> = {
      'deberes_enabled': () => { if (isPageEnabled('deberes_enabled')) result.push({ id: 'deberes', label: tl.tabHomework, shortLabel: tl.shortHomework, icon: BookOpen }); },
      'examenes_enabled': () => { if (isPageEnabled('examenes_enabled')) result.push({ id: 'examenes', label: tl.tabExam, shortLabel: tl.shortExam, icon: GraduationCap }); },
      'tareas_enabled': () => { if (settings.tareas_enabled) result.push({ id: 'tareas', label: tl.tabTask, shortLabel: tl.shortTask, icon: ClipboardList }); },
      'orden_dia_enabled': () => { if ((settings as any).orden_dia_enabled) result.push({ id: 'orden-dia', label: 'Orden del día', shortLabel: 'Orden', icon: ListChecks }); },
      'eventos_enabled': () => {
        if (isPageEnabled('eventos_enabled')) {
          if (settings.partidos_mode === 'replace') {
            result.push({ id: 'partidos', label: 'Partidos', shortLabel: 'Part.', icon: Trophy });
          } else {
            result.push({ id: 'eventos', label: 'Eventos', shortLabel: 'Even.', icon: Calendar });
          }
        }
      },
      'partidos_enabled': () => {
        if (settings.partidos_mode === 'new_tab' && isPageEnabled('partidos_enabled')) {
          result.push({ id: 'partidos', label: 'Partidos', shortLabel: 'Part.', icon: Trophy });
        }
      },
      'schedule_tab_enabled': () => { if (scheduleTabEnabled) result.push({ id: 'horario', label: isTeacher ? 'Agenda' : 'Horario', shortLabel: isTeacher ? 'Ag.' : 'Hor.', icon: CalendarClock }); },
      'dont_forget_enabled': () => { if ((settings as any).dont_forget_enabled) result.push({ id: 'no-olvidar', label: '¡No olvidar!', shortLabel: '¡No!', icon: AlertTriangle }); },
      'notes_enabled': () => { if ((settings as any).notes_enabled) result.push({ id: 'notas', label: 'Notas', shortLabel: 'Not.', icon: FileText }); },
      'pomodoro_enabled': () => { /* Pomodoro is inline, not a tab */ },
      'productividad_enabled': () => { if (isPageEnabled('productividad_enabled')) result.push({ id: 'productividad', label: 'Progreso', shortLabel: 'Prog.', icon: BarChart3 }); },
      'calendario_enabled': () => { if (isPageEnabled('calendario_enabled')) result.push({ id: 'calendario', label: 'Calendario', shortLabel: 'Cal.', icon: CalendarDays }); },
      'premios_enabled': () => { if (isPageEnabled('premios_enabled')) result.push({ id: 'premios', label: 'Premios', shortLabel: 'Prem.', icon: Gift }); },
      'papelera_enabled': () => { if (isPageEnabled('papelera_enabled')) result.push({ id: 'papelera', label: 'Papelera', shortLabel: 'Pap.', icon: Trash2 }); },
    };

    // Build tabs in context_menu_order
    const orderedKeys = TOGGLEABLE_PAGES.map(p => p.settingKey);
    for (const key of orderedKeys) {
      tabMap[key]?.();
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
  const showScheduleInHeader = !scheduleTabEnabled;
  const isLeftNav = navPosition === 'left';
  const sidebarExpanded = sidebarHover;
  const sidebarWidth = isLeftNav ? (sidebarExpanded ? 'w-48' : 'w-14') : '';

  const designStyle = (settings as any).design_style || 'minimalist';
  const isGaming = designStyle === 'gaming';

  // Greeting
  const getGreeting = () => {
    const h = currentTime.getHours();
    if (h >= 6 && h < 14) return 'Buenos días';
    if (h >= 14 && h < 21) return 'Buenas tardes';
    return 'Buenas noches';
  };
  const getTodayDate = () => {
    const raw = currentTime.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };
  const getTimeString = () => {
    return currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass-card rounded-2xl p-8 max-w-sm text-center space-y-4">
          <p className="text-5xl">🔒</p>
          <h1 className="text-xl font-bold text-foreground">Cuenta restringida</h1>
          <p className="text-sm text-muted-foreground">
            Tu cuenta está bloqueada porque eres menor de 14 años y usas un correo personal.
            Pide a tu colegio una cuenta institucional para acceder.
          </p>
          <p className="text-xs text-muted-foreground">
            Cuando cumplas 14 años, tu cuenta se desbloqueará automáticamente.
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="mt-4 px-6 py-2 bg-destructive text-destructive-foreground rounded-xl text-sm font-semibold"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div onClick={() => showPageToggleMenu && setShowPageToggleMenu(false)} className={cn(
      'min-h-screen flex',
      isLeftNav ? 'flex-row' : 'flex-col',
      isGaming ? 'gaming-bg-container' : designStyle === 'school' ? 'school-bg-container' : 'bg-background'
    )}>

      {/* Left sidebar nav - collapses to icons, expands on hover */}
      {isLeftNav && (
        <nav
          onMouseEnter={() => setSidebarHover(true)}
          onMouseLeave={() => setSidebarHover(false)}
          className={cn(
            'shrink-0 bg-card/90 backdrop-blur-md border-r border-border flex flex-col pt-4 fixed left-0 top-0 bottom-0 z-40 transition-all duration-200',
            sidebarWidth
          )}
        >
          <div className={cn('px-3 pb-4 flex justify-center', sidebarExpanded && 'px-4')}>
            <button
              onClick={(e) => { e.stopPropagation(); const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setPageTogglePos({ x: r.right + 8, y: r.top }); setShowPageToggleMenu(true); }}
              title="Páginas visibles"
              className="cursor-pointer"
            >
              <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg" />
            </button>
          </div>
          {currentTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 transition-colors w-full py-3',
                  sidebarExpanded ? 'px-4' : 'px-0 justify-center',
                  isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}>
                <Icon className="w-5 h-5 shrink-0" />
                {sidebarExpanded && <span className="text-xs font-bold uppercase tracking-wide whitespace-nowrap">{tab.label}</span>}
              </button>
            );
          })}
        </nav>
      )}

      <div className={cn(
        'flex-1 flex flex-col w-full',
        isLeftNav ? 'ml-14' : '',
      )}>
        <div className={cn('max-w-4xl w-full', isLeftNav ? 'mx-auto' : 'mx-auto')}>
          <header className="gradient-hero px-5 pt-8 pb-6 rounded-b-3xl flex items-start justify-between relative">
            <div className="flex items-center gap-3">
              {!isLeftNav && (
                <button
                  onClick={(e) => { e.stopPropagation(); const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setPageTogglePos({ x: r.left, y: r.bottom + 4 }); setShowPageToggleMenu(true); }}
                  title="Páginas visibles"
                  className="cursor-pointer"
                >
                  <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-xl" />
                </button>
              )}
              <div>
                <h1 className="text-2xl font-extrabold text-primary-foreground">{settings.app_name}</h1>
                <p className="text-primary-foreground/70 text-sm font-medium mt-0.5">{settings.school_name}</p>
                {profile && <p className="text-primary-foreground/60 text-xs mt-0.5 flex items-center gap-1">Hola, {profile.display_name} <Hand className="w-3 h-3" /></p>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {showDontForgetButton && (
                <button
                  onClick={() => setShowDontForgetPopup(true)}
                  className="px-2 py-1 rounded-lg bg-destructive text-destructive-foreground text-[10px] font-extrabold uppercase tracking-wide animate-pulse hover:bg-destructive/90 transition-colors"
                >
                  NO OLVIDAR
                </button>
              )}
              {showScheduleInHeader && (
                <button onClick={() => navigate('/schedule')} className="p-2 rounded-full hover:bg-primary-foreground/20 transition-colors text-primary-foreground">
                  <CalendarClock className="w-5 h-5" />
                </button>
              )}
              {isAdmin && (
                <button onClick={() => navigate('/admin')} className="p-2 rounded-full hover:bg-primary-foreground/20 transition-colors text-primary-foreground">
                  <Users className="w-5 h-5" />
                </button>
              )}
              <SettingsPanel settings={settings} onUpdate={updateSettings} />
            </div>
          </header>

          <main onContextMenu={handleMainContextMenu} className={cn('flex-1 px-4 py-4 overflow-y-auto', !isLeftNav && 'pb-24')}>
            {activeTab === 'inicio' && (
              <div className="space-y-5 animate-slide-up">
                {/* Greeting */}
                <div className="text-center py-2" style={{ fontFamily: 'inherit' }}>
                  <h2 className="text-3xl font-extrabold text-foreground" style={{ fontFamily: 'system-ui, sans-serif' }}>{getGreeting()}</h2>
                  <p className="text-sm text-muted-foreground mt-1" style={{ fontFamily: 'system-ui, sans-serif' }}>{getTodayDate()}</p>
                  <p className="text-lg font-semibold text-foreground/70 mt-1" style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}>{getTimeString()}</p>
                </div>


                {/* Motivational Quote */}
                <div className="glass-card rounded-2xl p-4 text-center">
                  <Quote className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-sm italic text-foreground/80">"{getDailyQuote().text}"</p>
                  <p className="text-xs text-muted-foreground mt-1">— {getDailyQuote().author}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setActiveTab('deberes')} className="glass-card rounded-2xl p-4 text-center hover:ring-2 ring-primary/30 transition-all">
                    <p className="text-3xl font-extrabold text-primary">{pendingHomework}</p>
                    <p className="text-xs text-muted-foreground font-semibold mt-1">{tl.pendingHomework}</p>
                  </button>
                  <button onClick={() => setActiveTab('examenes')} className="glass-card rounded-2xl p-4 text-center hover:ring-2 ring-primary/30 transition-all">
                    <p className="text-3xl font-extrabold text-exam">{pendingExams}</p>
                    <p className="text-xs text-muted-foreground font-semibold mt-1">{tl.pendingExams}</p>
                  </button>
                </div>

                {/* Quick Capture moved to individual task pages */}

                {/* Share & Template buttons */}
                <div className="flex justify-center gap-2">
                  <TaskTemplateDialog onAdd={addTask} subjects={allSubjects} />
                  <ShareListButton />
                </div>

                {/* Pomodoro Timer */}
                {(settings as any).pomodoro_enabled !== false && <PomodoroTimer />}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-bold text-foreground flex items-center gap-2"><Timer className="w-5 h-5 text-primary" /> Contadores</h2>
                    <AddCountdownDialog onAdd={addCountdown} />
                  </div>
                  {countdowns.length === 0 ? (
                    <div className="glass-card rounded-2xl p-6 text-center">
                      <Palmtree className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
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
                triggerLabel={tl.addHomework} emptyMessage={tl.emptyHomework} emptyIcon={PartyPopper}
                subjects={allSubjects} sportTypes={settings.sport_types} groupingMode={(settings as any).grouping_mode || 'subject_title'} highlightUrgent />
            )}

            {activeTab === 'examenes' && (
              <TaskList tasks={tasks} type="exam" onAdd={addTask} onToggle={toggleTask} onDelete={deleteTask} onUpdate={updateTask}
                onToggleStudy={toggleStudy}
                triggerLabel={tl.addExam} emptyMessage={tl.emptyExam} emptyIcon={FileText}
                subjects={allSubjects} sportTypes={settings.sport_types} groupingMode={(settings as any).grouping_mode || 'subject_title'} highlightUrgent />
            )}

            {activeTab === 'tareas' && (
              <TaskList tasks={tasks} type="task" onAdd={addTask} onToggle={toggleTask} onDelete={deleteTask} onUpdate={updateTask}
                triggerLabel={tl.addTask} emptyMessage={tl.emptyTask} emptyIcon={CheckCircle}
                subjects={allSubjects} sportTypes={settings.sport_types} highlightUrgent />
            )}

            {activeTab === 'eventos' && (
              <TaskList tasks={tasks} type="event" onAdd={addTask} onToggle={toggleTask} onDelete={deleteTask} onUpdate={updateTask}
                triggerLabel="Añadir evento" emptyMessage="No hay eventos próximos" emptyIcon={Tent}
                sportTypes={settings.sport_types} />
            )}

            {activeTab === 'partidos' && (
              <TaskList tasks={tasks} type="match" onAdd={addTask} onToggle={toggleTask} onDelete={deleteTask} onUpdate={updateTask}
                triggerLabel="Añadir partido" emptyMessage="No hay partidos programados" emptyIcon={Trophy}
                sportTypes={settings.sport_types} />
            )}

            {activeTab === 'horario' && <ScheduleInline userId={user!.id} />}
            {activeTab === 'no-olvidar' && <DontForgetPage />}
            {activeTab === 'notas' && <NotesPage />}
            {activeTab === 'productividad' && <ProductivityPage tasks={tasks} />}
            {activeTab === 'premios' && <PremiosPage />}
            {activeTab === 'calendario' && <CalendarView tasks={tasks} />}
            {activeTab === 'papelera' && <TrashPage />}
            <PrivacyFooter />
          </main>
        </div>

        <EditCountdownDialog
          countdown={editCountdown}
          open={!!editCountdown}
          onOpenChange={(open) => !open && setEditCountdown(null)}
          onSave={saveCountdown}
        />

        {/* Bottom nav */}
        {!isLeftNav && (
          <nav className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-md border-t border-border">
            <div className="max-w-lg mx-auto flex overflow-x-auto">
              {currentTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex flex-1 flex-col items-center py-3 gap-1 justify-center transition-colors',
                      isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    )}>
                    <Icon className={cn('w-5 h-5', isActive && 'animate-pulse-soft')} />
                    <span className="text-[10px] font-bold uppercase tracking-wide">
                      {isMobile ? tab.shortLabel : tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </div>

      {/* No Olvidar Popup */}
      <Dialog open={showDontForgetPopup} onOpenChange={setShowDontForgetPopup}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> ¡No olvidar!</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {dontForgetItems.map((item: any) => (
              <div key={item.id} className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                <p className="font-semibold text-sm text-destructive flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {item.content}</p>
              </div>
            ))}
          </div>
          <button onClick={dismissDontForget} className="w-full mt-2 py-2 rounded-xl bg-muted text-muted-foreground text-sm font-semibold hover:bg-muted/80 transition-colors">
            Ocultar por hoy
          </button>
        </DialogContent>
      </Dialog>

      <CommandPalette tasks={tasks} onNavigate={setActiveTab} />
      <ClassroomPromoDialog onSync={classroom.startSync} />
      {noxAI.enabled && <NoxAIFab loading={noxAI.loading} recommendation={noxAI.recommendation} tasks={tasks} isPremium={isPremium} />}
      <SupportDialog />
      <WeeklySummaryDialog completed={lastWeekSummary.completed} pending={lastWeekSummary.pending} bestDay={lastWeekSummary.bestDay} total={lastWeekSummary.total} />
      <KeyboardShortcutsHelp open={showShortcuts} onOpenChange={setShowShortcuts} />

      {/* Page Toggle Context Menu */}
      {showPageToggleMenu && (
        <div
          className="fixed z-[100] bg-card border border-border rounded-xl shadow-xl p-3 space-y-1 min-w-[240px] max-h-[70vh] overflow-y-auto animate-slide-up"
          style={{ left: Math.min(pageTogglePos.x, window.innerWidth - 260), top: Math.min(pageTogglePos.y, window.innerHeight - 500) }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold text-foreground uppercase tracking-wide">Páginas visibles</p>
            <div className="flex items-center gap-1">
              <button onClick={() => updateSettings({ context_menu_order: [] } as any)} className="text-muted-foreground hover:text-foreground" title="Restablecer orden"><RotateCcw className="w-3.5 h-3.5" /></button>
              <button onClick={() => setShowPageToggleMenu(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
          </div>
          {TOGGLEABLE_PAGES.map((page, idx) => {
            const isOn = (settings as any)[page.settingKey] !== false;
            return (
              <div key={page.key}
                draggable
                onDragStart={() => setDragIdx(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragIdx !== null && dragIdx !== idx) moveMenuItem(dragIdx, idx); setDragIdx(null); }}
                onDragEnd={() => setDragIdx(null)}
                className={cn(
                  'flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50 cursor-grab active:cursor-grabbing select-none',
                  dragIdx === idx && 'opacity-50'
                )}>
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">⠿</span>
                  {page.label}
                </span>
                <Switch
                  checked={isOn}
                  onCheckedChange={(checked) => updateSettings({ [page.settingKey]: checked } as any)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Index;
