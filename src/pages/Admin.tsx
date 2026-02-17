import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import type { DbProfile } from '@/types/app';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import AdminUserView from '@/components/AdminUserView';
import AdminSupportView from '@/components/AdminSupportView';

const Admin = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<DbProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<DbProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'support'>('users');

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    supabase.from('profiles').select('*').eq('is_active', true).order('display_name')
      .then(({ data }) => setUsers(data || []));
  }, [isAdmin, navigate]);

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
          <Button
            variant="ghost" size="sm"
            onClick={() => setActiveTab('users')}
            className={activeTab === 'users' ? 'bg-primary-foreground/20 text-primary-foreground' : 'text-primary-foreground/70 hover:bg-primary-foreground/10'}
          >
            <User className="w-4 h-4 mr-1" />
            Usuarios
          </Button>
          <Button
            variant="ghost" size="sm"
            onClick={() => setActiveTab('support')}
            className={activeTab === 'support' ? 'bg-primary-foreground/20 text-primary-foreground' : 'text-primary-foreground/70 hover:bg-primary-foreground/10'}
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            Soporte
          </Button>
        </div>
      </header>

      <main className="px-4 py-4 space-y-2">
        {activeTab === 'users' && (
          <>
            {users.map(u => (
              <button
                key={u.user_id}
                onClick={() => setSelectedUser(u)}
                className="w-full glass-card rounded-2xl p-4 flex items-center gap-3 text-left hover:ring-2 ring-primary/30 transition-all"
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
                  {u.last_location && (
                    <p className="text-[10px] text-muted-foreground">📍 {u.last_location}</p>
                  )}
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {u.role === 'otro' ? u.custom_role || 'Otro' : u.role}
                </Badge>
              </button>
            ))}
            {users.length === 0 && (
              <div className="text-center py-12">
                <p className="text-4xl mb-2">👻</p>
                <p className="text-muted-foreground text-sm">No hay usuarios registrados</p>
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
