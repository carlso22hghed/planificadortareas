import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useCallback, useEffect } from 'react';

export interface Badge {
  key: string;
  name: string;
  description: string;
  icon: string;
  requirement: string;
  check: (stats: GamificationStats) => boolean;
}

export interface GamificationStats {
  totalPoints: number;
  level: number;
  tasksCompletedTotal: number;
  referralCode: string;
  referralCount: number;
  premiumDaysRemaining: number;
  extraStorageMb: number;
}

const POINTS_PER_LEVEL = 100;

export const ALL_BADGES: Badge[] = [
  { key: 'first_task', name: 'Primera Tarea', description: 'Completa tu primera tarea', icon: '✅', requirement: '1 tarea completada', check: s => s.tasksCompletedTotal >= 1 },
  { key: 'ten_tasks', name: 'Productivo', description: 'Completa 10 tareas', icon: '🔥', requirement: '10 tareas completadas', check: s => s.tasksCompletedTotal >= 10 },
  { key: 'fifty_tasks', name: 'Imparable', description: 'Completa 50 tareas', icon: '💪', requirement: '50 tareas completadas', check: s => s.tasksCompletedTotal >= 50 },
  { key: 'hundred_tasks', name: 'Centurión', description: 'Completa 100 tareas', icon: '🏆', requirement: '100 tareas completadas', check: s => s.tasksCompletedTotal >= 100 },
  { key: 'level_5', name: 'Nivel 5', description: 'Alcanza el nivel 5', icon: '⭐', requirement: 'Nivel 5', check: s => s.level >= 5 },
  { key: 'level_10', name: 'Maestro', description: 'Alcanza el nivel 10', icon: '👑', requirement: 'Nivel 10', check: s => s.level >= 10 },
  { key: 'referral_1', name: 'Referidor Nivel 1', description: 'Invita a 1 amigo', icon: '🤝', requirement: '1 amigo invitado', check: s => s.referralCount >= 1 },
  { key: 'referral_3', name: 'Embajador', description: 'Invita a 3 amigos', icon: '🌟', requirement: '3 amigos invitados', check: s => s.referralCount >= 3 },
  { key: 'referral_5', name: 'Referidor Nivel 2', description: 'Invita a 5 amigos', icon: '💎', requirement: '5 amigos invitados', check: s => s.referralCount >= 5 },
  { key: 'referral_10', name: 'Leyenda Social', description: 'Invita a 10 amigos', icon: '🏅', requirement: '10 amigos invitados', check: s => s.referralCount >= 10 },
];

export function useGamification() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: gamification } = useQuery({
    queryKey: ['gamification', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        // Create if missing (for existing users)
        const { data: created } = await supabase
          .from('user_gamification')
          .insert({ user_id: user!.id })
          .select()
          .single();
        return created;
      }
      return data;
    },
    enabled: !!user,
  });

  const { data: badges = [] } = useQuery({
    queryKey: ['badges', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ['referrals', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_user_id', user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const stats: GamificationStats = {
    totalPoints: gamification?.total_points ?? 0,
    level: gamification?.level ?? 1,
    tasksCompletedTotal: gamification?.tasks_completed_total ?? 0,
    referralCode: gamification?.referral_code ?? '',
    referralCount: gamification?.referral_count ?? 0,
    premiumDaysRemaining: gamification?.premium_days_remaining ?? 0,
    extraStorageMb: gamification?.extra_storage_mb ?? 0,
  };

  const pointsInCurrentLevel = stats.totalPoints % POINTS_PER_LEVEL;
  const progressToNextLevel = (pointsInCurrentLevel / POINTS_PER_LEVEL) * 100;

  // Check and unlock badges
  useEffect(() => {
    if (!user || !gamification) return;
    const unlockedKeys = new Set(badges.map((b: any) => b.badge_key));
    const newBadges = ALL_BADGES.filter(b => b.check(stats) && !unlockedKeys.has(b.key));
    if (newBadges.length > 0) {
      Promise.all(
        newBadges.map(b =>
          supabase.from('user_badges').insert({
            user_id: user.id,
            badge_key: b.key,
            badge_name: b.name,
            badge_description: b.description,
            badge_icon: b.icon,
          })
        )
      ).then(() => queryClient.invalidateQueries({ queryKey: ['badges'] }));
    }
  }, [user, gamification, badges, stats, queryClient]);

  const addPoints = useCallback(async (points: number) => {
    if (!user || !gamification) return;
    const newTotal = (gamification.total_points || 0) + points;
    const newTasksCompleted = (gamification.tasks_completed_total || 0) + 1;
    const newLevel = Math.floor(newTotal / POINTS_PER_LEVEL) + 1;
    await supabase.from('user_gamification').update({
      total_points: newTotal,
      tasks_completed_total: newTasksCompleted,
      level: newLevel,
    }).eq('user_id', user.id);
    queryClient.invalidateQueries({ queryKey: ['gamification'] });
  }, [user, gamification, queryClient]);

  const copyInviteLink = useCallback(async () => {
    if (!stats.referralCode) return;
    const link = `${window.location.origin}/auth?ref=${stats.referralCode}`;
    const msg = `🎯 ¡Únete a Planificador de Tareas! Organiza tus deberes, exámenes y más. Usa mi enlace: ${link}`;
    await navigator.clipboard.writeText(msg);
  }, [stats.referralCode]);

  return {
    stats,
    badges,
    referrals,
    allBadges: ALL_BADGES,
    progressToNextLevel,
    pointsInCurrentLevel,
    pointsPerLevel: POINTS_PER_LEVEL,
    addPoints,
    copyInviteLink,
  };
}
