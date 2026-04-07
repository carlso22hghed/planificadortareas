import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CLASSROOM_SCOPES =
  'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me.readonly';

// Dynamically load Google Identity Services script
function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

async function fetchGoogleClientId(): Promise<string> {
  // First check localStorage cache
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
    if (!google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services not loaded'));
      return;
    }

    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: CLASSROOM_SCOPES,
      callback: (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.access_token);
        }
      },
    });
    client.requestAccessToken();
  });
}

interface ClassroomCourse {
  id: string;
  name: string;
}

interface ClassroomCoursework {
  id: string;
  title: string;
  description?: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours?: number; minutes?: number };
  workType: string;
}

export function useClassroom(userId: string | undefined) {
  const [syncing, setSyncing] = useState(false);
  const [isSynced, setIsSynced] = useState(() => localStorage.getItem('classroomSynced') === 'true');
  const initRef = useRef(false);

  // Pre-load GIS script
  useEffect(() => {
    loadGisScript().catch(() => {});
  }, []);

  const fetchClassroomData = useCallback(async (accessToken: string) => {
    const coursesRes = await fetch(
      'https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!coursesRes.ok) {
      if (coursesRes.status === 401 || coursesRes.status === 403) {
        throw new Error('TOKEN_EXPIRED');
      }
      throw new Error(`Classroom API error: ${coursesRes.status}`);
    }

    const coursesData = await coursesRes.json();
    const courses: ClassroomCourse[] = coursesData.courses || [];
    const allTasks: any[] = [];

    for (const course of courses) {
      try {
        const workRes = await fetch(
          `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork?orderBy=dueDate asc`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!workRes.ok) continue;
        const workData = await workRes.json();
        const courseWork: ClassroomCoursework[] = workData.courseWork || [];

        for (const cw of courseWork) {
          let dueDate: string | null = null;
          let dueTime: string | null = null;

          if (cw.dueDate) {
            dueDate = `${cw.dueDate.year}-${String(cw.dueDate.month).padStart(2, '0')}-${String(cw.dueDate.day).padStart(2, '0')}`;
          }
          if (cw.dueTime) {
            dueTime = `${String(cw.dueTime.hours || 0).padStart(2, '0')}:${String(cw.dueTime.minutes || 0).padStart(2, '0')}`;
          }

          const taskType =
            cw.workType === 'SHORT_ANSWER_QUESTION' || cw.workType === 'MULTIPLE_CHOICE_QUESTION'
              ? 'exam'
              : 'homework';

          allTasks.push({
            name: cw.title,
            description: cw.description || null,
            type: taskType,
            subject: course.name,
            due_date: dueDate,
            due_time: dueTime,
            completed: false,
            user_id: userId,
          });
        }
      } catch {
        // Skip failed courses
      }
    }
    return allTasks;
  }, [userId]);

  const importTasks = useCallback(
    async (classroomTasks: any[]) => {
      if (!userId || classroomTasks.length === 0) return 0;

      // Avoid duplicates by checking existing task name+due_date
      const { data: existing } = await supabase
        .from('tasks')
        .select('name, due_date')
        .eq('user_id', userId);

      const existingKeys = new Set((existing || []).map((t) => `${t.name}||${t.due_date}`));
      const newTasks = classroomTasks.filter((t) => !existingKeys.has(`${t.name}||${t.due_date}`));

      if (newTasks.length > 0) {
        await supabase.from('tasks').insert(newTasks);
      }
      return newTasks.length;
    },
    [userId]
  );

  const startSync = useCallback(async () => {
    setSyncing(true);
    try {
      await loadGisScript();
      const clientId = await fetchGoogleClientId();
      const accessToken = await requestClassroomToken(clientId);

      // Store token for auto-refresh
      localStorage.setItem('classroomAccessToken', accessToken);

      const tasks = await fetchClassroomData(accessToken);
      const imported = await importTasks(tasks);

      localStorage.setItem('classroomSynced', 'true');
      setIsSynced(true);
      toast.success(`Classroom sincronizado${imported ? ` (${imported} tareas nuevas)` : ''}`);
    } catch (err: any) {
      console.error('Classroom sync error:', err);
      if (err.message !== 'popup_closed_by_user') {
        toast.error('Error al sincronizar con Classroom');
      }
    } finally {
      setSyncing(false);
    }
  }, [fetchClassroomData, importTasks]);

  const autoSync = useCallback(async () => {
    if (!userId) return;
    const accessToken = localStorage.getItem('classroomAccessToken');
    if (!accessToken) return;

    try {
      const tasks = await fetchClassroomData(accessToken);
      const imported = await importTasks(tasks);
      toast.success(`Classroom actualizado${imported ? ` (${imported} nuevas)` : ''}`);
    } catch (err: any) {
      if (err.message === 'TOKEN_EXPIRED') {
        // Token expired – silently re-request
        try {
          await loadGisScript();
          const clientId = await fetchGoogleClientId();
          const newToken = await requestClassroomToken(clientId);
          localStorage.setItem('classroomAccessToken', newToken);

          const tasks = await fetchClassroomData(newToken);
          const imported = await importTasks(tasks);
          toast.success(`Classroom actualizado${imported ? ` (${imported} nuevas)` : ''}`);
        } catch {
          localStorage.setItem('classroomSynced', 'false');
          setIsSynced(false);
        }
      }
    }
  }, [userId, fetchClassroomData, importTasks]);

  const disconnect = useCallback(() => {
    localStorage.removeItem('classroomSynced');
    localStorage.removeItem('classroomAccessToken');
    localStorage.removeItem('classroomSyncPending');
    setIsSynced(false);
    toast.success('Classroom desconectado');
  }, []);

  return { syncing, isSynced, startSync, autoSync, disconnect };
}
