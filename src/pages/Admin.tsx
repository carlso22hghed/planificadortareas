import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import type { DbProfile } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, User, MessageCircle, Search, ArrowUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminUserView from '@/components/AdminUserView';
import AdminSupportView from '@/components/AdminSupportView';

type SortMode = 'alpha' | 'date_asc' | 'date_desc' | 'last_activity';

const Admin = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<DbProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<DbProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'support'>('users');
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('alpha');
  const [lastActivity, setLastActivity] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    supabase.from('profiles').select('*').eq('is_active', true).order('display_name')
      .then(({ data }) => setUsers(data || []));
    // Fetch last activity per user from tasks, countdowns, etc.
    Promise.all([
      supabase.from('tasks').select('user_id, created_at').order('created_at', { ascending: false }),
      supabase.from('countdowns').select('user_id, created_at').order('created_at', { ascending: false }),
      supabase.from('dont_forget').select('user_id, created_at').order('created_at', { ascending: false }),
      supabase.from('written_notes').select('user_id, created_at').order('created_at', { ascending: false }),
      supabase.from('voice_notes').select('user_id, created_at').order('created_at', { ascending: false }),
    ]).then(results => {
      const activityMap: Record<string, string> = {};
      results.forEach(({ data }) => {
        (data || []).forEach((row: any) => {
          if (!activityMap[row.user_id] || row.created_at > activityMap[row.user_id]) {
            activityMap[row.user_id] = row.created_at;
          }
        });
      });
      setLastActivity(activityMap);
    });
  }, [isAdmin, navigate]);

  const filteredUsers = useMemo(() => {
    let list = users;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u => (u.display_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      if (sortMode === 'alpha') return (a.display_name || '').localeCompare(b.display_name || '');
      if (sortMode === 'date_asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortMode === 'last_activity') {
        const aAct = lastActivity[a.user_id] || '1970-01-01';
        const bAct = lastActivity[b.user_id] || '1970-01-01';
        return new Date(bAct).getTime() - new Date(aAct).getTime();
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [users, search, sortMode, lastActivity]);

  if (!isAdmin) return null;

  if (selectedUser) {
    return <AdminUserView userId={selectedUser.user_id} profile={selectedUser} onBack={() => setSelectedUser(null)} />;
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      <header className="gradient-hero px-5 pt-8 pb-6 rounded-b-3xl flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-primary-foreground hover:bg-primary-foreground/20">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-extrabold text-primary-foreground">Panel Admin</h1>
          <p className="text-primary-foreground/70 text-sm font-medium">{users.length} usuario{users.length !== 1 ? 's' : ''} activo{users.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setActiveTab('users')}
            className={activeTab === 'users' ? 'bg-primary-foreground/20 text-primary-foreground' : 'text-primary-foreground/70 hover:bg-primary-foreground/10'}>
            <User className="w-4 h-4 mr-1" /> Usuarios
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setActiveTab('support')}
            className={activeTab === 'support' ? 'bg-primary-foreground/20 text-primary-foreground' : 'text-primary-foreground/70 hover:bg-primary-foreground/10'}>
            <MessageCircle className="w-4 h-4 mr-1" /> Soporte
          </Button>
        </div>
      </header>

      <main className="px-4 py-4 space-y-2">
        {activeTab === 'users' && (
          <>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o correo..." className="pl-9 h-9 rounded-xl text-sm" />
              </div>
              <Select value={sortMode} onValueChange={v => setSortMode(v as SortMode)}>
                <SelectTrigger className="w-auto h-9 gap-1 rounded-xl text-xs">
                  <ArrowUpDown className="w-3 h-3" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alpha">A-Z</SelectItem>
                  <SelectItem value="date_desc">Más reciente</SelectItem>
                  <SelectItem value="date_asc">Más antiguo</SelectItem>
                  <SelectItem value="last_activity">Última actividad</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredUsers.map(u => (
              <button key={u.user_id} onClick={() => setSelectedUser(u)}
                className="w-full glass-card rounded-2xl p-4 flex items-center gap-3 text-left hover:ring-2 ring-primary/30 transition-all">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{u.display_name || 'Sin nombre'}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  <p className="text-[10px] text-muted-foreground">
                    📅 {new Date(u.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })} — {new Date(u.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {u.last_location && <p className="text-[10px] text-muted-foreground">📍 {u.last_location}</p>}
                  {lastActivity[u.user_id] && <p className="text-[10px] text-muted-foreground">🕐 Última actividad: {new Date(lastActivity[u.user_id]).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>}
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {u.role === 'otro' ? u.custom_role || 'Otro' : u.role}
                </Badge>
              </button>
            ))}
            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-4xl mb-2">{search ? '🔍' : '👻'}</p>
                <p className="text-muted-foreground text-sm">{search ? 'No se encontraron resultados' : 'No hay usuarios registrados'}</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'support' && <AdminSupportView />}
      </main>
    </div>
  );
};

export default Admin;
