import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { DbProfile, DbSettings } from '@/types/app';

interface AuthContextType {
  user: User | null;
  profile: DbProfile | null;
  settings: DbSettings | null;
  isAdmin: boolean;
  loading: boolean;
  needsNameOrSchool: boolean;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<DbProfile>) => Promise<void>;
  updateSettings: (updates: Partial<DbSettings>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>(null!);

export const useAuth = () => useContext(AuthContext);

async function getUserLocation(): Promise<string | null> {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    return data.city ? `${data.city}, ${data.country_name}` : null;
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [settings, setSettings] = useState<DbSettings | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [needsNameOrSchool, setNeedsNameOrSchool] = useState(false);

  const loadUserData = async (userId: string) => {
    const [profileRes, settingsRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).single(),
      supabase.from('user_settings').select('*').eq('user_id', userId).single(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
    ]);

    if (profileRes.data) {
      setProfile(profileRes.data);
      if (!profileRes.data.is_active) {
        await supabase.from('profiles').update({ is_active: true }).eq('user_id', userId);
      }
      // Update location
      getUserLocation().then(loc => {
        if (loc) {
          supabase.from('profiles').update({ last_location: loc }).eq('user_id', userId);
        }
      });
    }

    if (settingsRes.data) {
      setSettings(settingsRes.data);
      document.documentElement.classList.toggle('dark', settingsRes.data.dark_mode);
      document.documentElement.setAttribute('data-theme', (settingsRes.data as any).theme || 'default');
      document.documentElement.setAttribute('data-design', (settingsRes.data as any).design_style || 'minimalist');
      const bg = (settingsRes.data as any).school_background || 'gradient';
      if (bg.startsWith('gaming:')) {
        document.documentElement.setAttribute('data-gaming-bg', bg.replace('gaming:', ''));
        document.documentElement.setAttribute('data-school-bg', '');
      } else {
        document.documentElement.setAttribute('data-school-bg', bg.startsWith('color:') ? 'custom-color' : bg);
        document.documentElement.setAttribute('data-gaming-bg', '');
      }
      if (bg.startsWith('color:')) document.documentElement.style.setProperty('--custom-bg-color', bg.replace('color:', ''));
      else document.documentElement.style.removeProperty('--custom-bg-color');
      document.documentElement.style.setProperty('--font-sans', `'${(settingsRes.data as any).font_family || 'Nunito'}', sans-serif`);
      document.body.style.fontFamily = `'${(settingsRes.data as any).font_family || 'Nunito'}', sans-serif`;
      // Check if name or school is missing (for users who completed onboarding but have empty values)
      const nameMissing = !profileRes.data?.display_name?.trim();
      const schoolMissing = !settingsRes.data.school_name?.trim();
      setNeedsNameOrSchool(profileRes.data?.onboarding_completed === true && (nameMissing || schoolMissing));
    }

    setIsAdmin(rolesRes.data?.some(r => r.role === 'admin') || false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        setTimeout(async () => {
          await loadUserData(u.id);
          setLoading(false);
        }, 0);
      } else {
        setProfile(null);
        setSettings(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (user) {
      await supabase.from('profiles').update({ is_active: false }).eq('user_id', user.id);
    }
    await supabase.auth.signOut();
    document.documentElement.classList.remove('dark');
  };

  const updateProfile = async (updates: Partial<DbProfile>) => {
    if (!user) return;
    await supabase.from('profiles').update(updates).eq('user_id', user.id);
    setProfile(prev => prev ? { ...prev, ...updates } as DbProfile : null);
    // Recheck needs
    if ('display_name' in updates) {
      const nameMissing = !updates.display_name?.toString().trim();
      const schoolMissing = !settings?.school_name?.trim();
      setNeedsNameOrSchool(nameMissing || schoolMissing);
    }
  };

  const updateSettings = async (updates: Partial<DbSettings>) => {
    if (!user) return;
    await supabase.from('user_settings').update(updates).eq('user_id', user.id);
    setSettings(prev => prev ? { ...prev, ...updates } as DbSettings : null);
    if ('dark_mode' in updates) {
      document.documentElement.classList.toggle('dark', !!updates.dark_mode);
    }
    if ('theme' in updates) {
      document.documentElement.setAttribute('data-theme', (updates as any).theme || 'default');
    }
    if ('design_style' in updates) {
      document.documentElement.setAttribute('data-design', (updates as any).design_style || 'minimalist');
    }
    if ('school_background' in updates) {
      const bg = (updates as any).school_background || 'gradient';
      if (bg.startsWith('gaming:')) {
        document.documentElement.setAttribute('data-gaming-bg', bg.replace('gaming:', ''));
        document.documentElement.setAttribute('data-school-bg', '');
      } else {
        document.documentElement.setAttribute('data-school-bg', bg.startsWith('color:') ? 'custom-color' : bg);
        document.documentElement.setAttribute('data-gaming-bg', '');
      }
      if (bg.startsWith('color:')) document.documentElement.style.setProperty('--custom-bg-color', bg.replace('color:', ''));
      else document.documentElement.style.removeProperty('--custom-bg-color');
    }
    if ('font_family' in updates) {
      document.documentElement.style.setProperty('--font-sans', `'${(updates as any).font_family || 'Nunito'}', sans-serif`);
      document.body.style.fontFamily = `'${(updates as any).font_family || 'Nunito'}', sans-serif`;
    }
    if ('school_name' in updates) {
      const schoolMissing = !updates.school_name?.toString().trim();
      const nameMissing = !profile?.display_name?.trim();
      setNeedsNameOrSchool(nameMissing || schoolMissing);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
    if (data) setProfile(data);
  };

  const refreshSettings = async () => {
    if (!user) return;
    const { data } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single();
    if (data) {
      setSettings(data);
      document.documentElement.classList.toggle('dark', data.dark_mode);
      document.documentElement.setAttribute('data-theme', (data as any).theme || 'default');
      document.documentElement.setAttribute('data-design', (data as any).design_style || 'minimalist');
      const bg = (data as any).school_background || 'gradient';
      if (bg.startsWith('gaming:')) {
        document.documentElement.setAttribute('data-gaming-bg', bg.replace('gaming:', ''));
        document.documentElement.setAttribute('data-school-bg', '');
      } else {
        document.documentElement.setAttribute('data-school-bg', bg.startsWith('color:') ? 'custom-color' : bg);
        document.documentElement.setAttribute('data-gaming-bg', '');
      }
      if (bg.startsWith('color:')) document.documentElement.style.setProperty('--custom-bg-color', bg.replace('color:', ''));
      else document.documentElement.style.removeProperty('--custom-bg-color');
      document.documentElement.style.setProperty('--font-sans', `'${(data as any).font_family || 'Nunito'}', sans-serif`);
      document.body.style.fontFamily = `'${(data as any).font_family || 'Nunito'}', sans-serif`;
    }
  };

  return (
    <AuthContext.Provider value={{
      user, profile, settings, isAdmin, loading, needsNameOrSchool,
      signOut, updateProfile, updateSettings, refreshProfile, refreshSettings,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
