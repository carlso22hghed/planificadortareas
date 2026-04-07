import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { toast } from 'sonner';

const CLASSROOM_SCOPES = 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me.readonly';

interface ClassroomCourse {
  id: string;
  name: string;
  courseState: string;
}

interface ClassroomCoursework {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours?: number; minutes?: number };
  workType: string;
  state: string;
}

export function useClassroom(userId: string | undefined) {
  const [syncing, setSyncing] = useState(false);
  const isSynced = localStorage.getItem('classroomSynced') === 'true';

  const fetchClassroomData = useCallback(async (accessToken: string): Promise<{ tasks: any[] }> => {
    // Fetch courses
    const coursesRes = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!coursesRes.ok) {
      if (coursesRes.status === 401 || coursesRes.status === 403) {
        throw new Error('TOKEN_EXPIRED');
      }
      throw new Error(`Classroom API error: ${coursesRes.status}`);
    }

    const coursesData = await coursesRes.json();
    const courses: ClassroomCourse[] = coursesData.courses || [];

    // Fetch coursework for each course
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
            const y = cw.dueDate.year;
            const m = String(cw.dueDate.month).padStart(2, '0');
            const d = String(cw.dueDate.day).padStart(2, '0');
            dueDate = `${y}-${m}-${d}`;
          }
          if (cw.dueTime) {
            const h = String(cw.dueTime.hours || 0).padStart(2, '0');
            const min = String(cw.dueTime.minutes || 0).padStart(2, '0');
            dueTime = `${h}:${min}`;
          }

          const taskType = cw.workType === 'SHORT_ANSWER_QUESTION' || cw.workType === 'MULTIPLE_CHOICE_QUESTION'
            ? 'exam' : 'homework';

          allTasks.push({
            name: cw.title,
            description: cw.description || null,
            type: taskType,
            subject: course.name,
            due_date: dueDate,
            due_time: dueTime,
            completed: false,
            user_id: userId,
            source: 'classroom',
            classroom_id: `${course.id}_${cw.id}`,
          });
        }
      } catch {
        // Skip failed courses
      }
    }
    return { tasks: allTasks };
  }, [userId]);

  const importTasks = useCallback(async (classroomTasks: any[]) => {
    if (!userId) return;

    // Delete existing classroom tasks
    await supabase.from('tasks').delete().eq('user_id', userId).eq('subject', '__classroom_source__');
    
    // We can't filter by source since the column doesn't exist yet
    // Instead, we'll delete tasks that match classroom pattern and re-insert
    // For now, just insert new tasks (avoiding duplicates by name+due_date)
    const { data: existingTasks } = await supabase
      .from('tasks')
      .select('name, due_date')
      .eq('user_id', userId);

    const existingKeys = new Set(
      (existingTasks || []).map(t => `${t.name}||${t.due_date}`)
    );

    const newTasks = classroomTasks.filter(t => 
      !existingKeys.has(`${t.name}||${t.due_date}`)
    );

    if (newTasks.length > 0) {
      // Remove source and classroom_id since they don't exist in the DB schema
      const tasksToInsert = newTasks.map(({ source, classroom_id, ...rest }) => rest);
      await supabase.from('tasks').insert(tasksToInsert);
    }

    return newTasks.length;
  }, [userId]);

  const startSync = useCallback(async () => {
    setSyncing(true);
    localStorage.setItem('classroomSyncPending', 'true');

    // Re-authenticate with Classroom scopes
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
      extraParams: {
        scope: `openid email profile ${CLASSROOM_SCOPES}`,
        prompt: 'consent',
        access_type: 'offline',
      },
    });

    if (result.error) {
      toast.error('Error al conectar con Classroom');
      localStorage.removeItem('classroomSyncPending');
      setSyncing(false);
    }
    // If redirected, the page will reload and we handle it in autoSync
  }, []);

  const autoSync = useCallback(async (silent = true) => {
    if (!userId) return;

    const { data: { session } } = await supabase.auth.getSession();
    const providerToken = session?.provider_token;

    if (!providerToken) {
      if (!silent) toast.error('Necesitas volver a sincronizar con Classroom');
      localStorage.setItem('classroomSynced', 'false');
      return;
    }

    try {
      const { tasks } = await fetchClassroomData(providerToken);
      const imported = await importTasks(tasks);
      localStorage.setItem('classroomSynced', 'true');
      localStorage.removeItem('classroomSyncPending');
      toast.success(`Classroom actualizado${imported ? ` (${imported} nuevas)` : ''}`);
    } catch (err: any) {
      if (err.message === 'TOKEN_EXPIRED') {
        if (!silent) {
          // Re-trigger OAuth
          startSync();
        } else {
          localStorage.setItem('classroomSynced', 'false');
        }
      } else {
        console.error('Classroom sync error:', err);
        if (!silent) toast.error('Error al sincronizar con Classroom');
      }
    }
  }, [userId, fetchClassroomData, importTasks, startSync]);

  const disconnect = useCallback(() => {
    localStorage.setItem('classroomSynced', 'false');
    localStorage.removeItem('classroomSyncPending');
    toast.success('Classroom desconectado');
  }, []);

  return {
    syncing,
    isSynced,
    startSync,
    autoSync,
    disconnect,
  };
}
