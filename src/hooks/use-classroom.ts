import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CLASSROOM_SCOPES =
  'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me.readonly https://www.googleapis.com/auth/classroom.student-submissions.me.readonly';

function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) { resolve(); return; }
    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existing) { existing.addEventListener('load', () => resolve()); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load GIS'));
    document.head.appendChild(script);
  });
}

async function fetchGoogleClientId(): Promise<string> {
  const cached = localStorage.getItem('googleClientId');
  if (cached) return cached;
  const { data, error } = await supabase.functions.invoke('get-google-client-id');
  if (error || !data?.clientId) throw new Error('Could not fetch Google Client ID');
  localStorage.setItem('googleClientId', data.clientId);
  return data.clientId;
}

function requestClassroomToken(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const google = (window as any).google;
    if (!google?.accounts?.oauth2) { reject(new Error('GIS not loaded')); return; }
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: CLASSROOM_SCOPES,
      callback: (r: any) => r.error ? reject(new Error(r.error)) : resolve(r.access_token),
    });
    client.requestAccessToken();
  });
}

interface ClassroomCoursework {
  id: string;
  title: string;
  description?: string;
  courseId: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours?: number; minutes?: number };
  workType: string;
}

export function useClassroom(userId: string | undefined) {
  const [syncing, setSyncing] = useState(false);
  const [isSynced, setIsSynced] = useState(() => localStorage.getItem('classroomSynced') === 'true');
  const initRef = useRef(false);

  useEffect(() => { loadGisScript().catch(() => {}); }, []);

  const fetchClassroomData = useCallback(async (accessToken: string) => {
    const coursesRes = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!coursesRes.ok) {
      if (coursesRes.status === 401 || coursesRes.status === 403) throw new Error('TOKEN_EXPIRED');
      throw new Error(`Classroom API error: ${coursesRes.status}`);
    }
    const coursesData = await coursesRes.json();
    const courses: { id: string; name: string }[] = coursesData.courses || [];
    const allTasks: any[] = [];

    for (const course of courses) {
      try {
        const workRes = await fetch(
          `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork?orderBy=dueDate asc`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!workRes.ok) continue;
        const workData = await workRes.json();
        const courseWork: ClassroomCoursework[] = (workData.courseWork || []).map((cw: any) => ({ ...cw, courseId: course.id }));

        for (const cw of courseWork) {
          let dueDate: string | null = null;
          let dueTime: string | null = null;
          if (cw.dueDate) {
            dueDate = `${cw.dueDate.year}-${String(cw.dueDate.month).padStart(2, '0')}-${String(cw.dueDate.day).padStart(2, '0')}`;
          }
          if (cw.dueTime) {
            dueTime = `${String(cw.dueTime.hours || 0).padStart(2, '0')}:${String(cw.dueTime.minutes || 0).padStart(2, '0')}`;
          }
          const taskType = cw.workType === 'SHORT_ANSWER_QUESTION' || cw.workType === 'MULTIPLE_CHOICE_QUESTION' ? 'exam' : 'homework';

          allTasks.push({
            name: cw.title,
            description: cw.description || null,
            type: taskType,
            subject: course.name,
            due_date: dueDate,
            due_time: dueTime,
            completed: false,
            user_id: userId,
            // Store classroom metadata in description prefix for identification
            _classroom_course_id: course.id,
            _classroom_work_id: cw.id,
          });
        }
      } catch { /* skip */ }
    }
    return allTasks;
  }, [userId]);

  const checkSubmissions = useCallback(async (accessToken: string) => {
    if (!userId) return;
    // Get existing tasks to check for classroom-sourced ones
    const { data: existingTasks } = await supabase.from('tasks').select('*').eq('user_id', userId);
    if (!existingTasks) return;

    const coursesRes = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!coursesRes.ok) return;
    const { courses = [] } = await coursesRes.json();

    for (const course of courses) {
      try {
        const workRes = await fetch(
          `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!workRes.ok) continue;
        const { courseWork = [] } = await workRes.json();

        for (const cw of courseWork) {
          const subRes = await fetch(
            `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork/${cw.id}/studentSubmissions?userId=me`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (!subRes.ok) continue;
          const { studentSubmissions = [] } = await subRes.json();

          const turnedIn = studentSubmissions.some((s: any) => s.state === 'TURNED_IN' || s.state === 'RETURNED');
          if (turnedIn) {
            // Find matching task by name + subject
            const match = existingTasks.find(t => t.name === cw.title && t.subject === course.name && !t.completed);
            if (match) {
              await supabase.from('tasks').update({ completed: true }).eq('id', match.id);
              toast.success(`✓ Tarea entregada detectada: ${cw.title}`);
            }
          }
        }
      } catch { /* skip */ }
    }
  }, [userId]);

  const importTasks = useCallback(async (classroomTasks: any[]) => {
    if (!userId || classroomTasks.length === 0) return 0;
    const { data: existing } = await supabase.from('tasks').select('name, due_date').eq('user_id', userId);
    const existingKeys = new Set((existing || []).map((t) => `${t.name}||${t.due_date}`));
    const newTasks = classroomTasks
      .filter((t) => !existingKeys.has(`${t.name}||${t.due_date}`))
      .map(({ _classroom_course_id, _classroom_work_id, ...rest }) => rest);
    if (newTasks.length > 0) {
      await supabase.from('tasks').insert(newTasks);
    }
    return newTasks.length;
  }, [userId]);

  const startSync = useCallback(async () => {
    setSyncing(true);
    try {
      await loadGisScript();
      const clientId = await fetchGoogleClientId();
      const accessToken = await requestClassroomToken(clientId);
      localStorage.setItem('classroomAccessToken', accessToken);

      const tasks = await fetchClassroomData(accessToken);
      const imported = await importTasks(tasks);
      await checkSubmissions(accessToken);

      localStorage.setItem('classroomSynced', 'true');
      setIsSynced(true);
      toast.success(`Classroom sincronizado${imported ? ` (${imported} tareas nuevas)` : ''}`);

      // Schedule push notifications for imported tasks
      schedulePushNotifications(tasks);
    } catch (err: any) {
      console.error('Classroom sync error:', err);
      if (err.message !== 'popup_closed_by_user') toast.error('Error al sincronizar con Classroom');
    } finally {
      setSyncing(false);
    }
  }, [fetchClassroomData, importTasks, checkSubmissions]);

  const autoSync = useCallback(async () => {
    if (!userId) return;
    const accessToken = localStorage.getItem('classroomAccessToken');
    if (!accessToken) return;
    try {
      const tasks = await fetchClassroomData(accessToken);
      const imported = await importTasks(tasks);
      await checkSubmissions(accessToken);
      toast.success(`Classroom actualizado${imported ? ` (${imported} nuevas)` : ''}`);
      schedulePushNotifications(tasks);
    } catch (err: any) {
      if (err.message === 'TOKEN_EXPIRED') {
        try {
          await loadGisScript();
          const clientId = await fetchGoogleClientId();
          const newToken = await requestClassroomToken(clientId);
          localStorage.setItem('classroomAccessToken', newToken);
          const tasks = await fetchClassroomData(newToken);
          const imported = await importTasks(tasks);
          await checkSubmissions(newToken);
          toast.success(`Classroom actualizado${imported ? ` (${imported} nuevas)` : ''}`);
          schedulePushNotifications(tasks);
        } catch {
          localStorage.setItem('classroomSynced', 'false');
          setIsSynced(false);
        }
      }
    }
  }, [userId, fetchClassroomData, importTasks, checkSubmissions]);

  const disconnect = useCallback(() => {
    localStorage.removeItem('classroomSynced');
    localStorage.removeItem('classroomAccessToken');
    localStorage.removeItem('classroomSyncPending');
    setIsSynced(false);
    toast.success('Classroom desconectado');
  }, []);

  return { syncing, isSynced, startSync, autoSync, disconnect };
}

// Push notification scheduling
function schedulePushNotifications(tasks: any[]) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  const scheduled = JSON.parse(localStorage.getItem('pushScheduled') || '{}');
  const now = Date.now();

  tasks.forEach(t => {
    if (!t.due_date) return;
    const dueMs = new Date(`${t.due_date}T${t.due_time || '23:59'}:00`).getTime();
    const key24 = `${t.name}_24h`;
    const key2 = `${t.name}_2h`;

    // 24h before
    const time24 = dueMs - 24 * 60 * 60 * 1000;
    if (time24 > now && !scheduled[key24]) {
      const delay = time24 - now;
      setTimeout(() => {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification('Planificador de Tareas', {
            body: `📚 Mañana vence: ${t.name}`,
            icon: '/logo.png',
          });
        });
      }, delay);
      scheduled[key24] = true;
    }

    // 2h before
    const time2 = dueMs - 2 * 60 * 60 * 1000;
    if (time2 > now && !scheduled[key2]) {
      const delay = time2 - now;
      setTimeout(() => {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification('Planificador de Tareas', {
            body: `⏰ En 2 horas vence: ${t.name}`,
            icon: '/logo.png',
          });
        });
      }, delay);
      scheduled[key2] = true;
    }
  });

  localStorage.setItem('pushScheduled', JSON.stringify(scheduled));
}
