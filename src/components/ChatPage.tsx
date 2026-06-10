import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Search, Send, MessageSquare, Check, X, Users, Pencil, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type Chat = {
  id: string;
  name: string | null;
  is_group: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};
type Member = {
  id: string;
  chat_id: string;
  user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  custom_name: string | null;
  last_read_at: string;
  invited_by: string | null;
};
type Message = { id: string; chat_id: string; sender_id: string; content: string; created_at: string };
type UserHit = { user_id: string; display_name: string; email: string };
type ProfileLite = { user_id: string; display_name: string; email: string };

const sb = supabase as any;

const ChatPage = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, Message[]>>({});
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const myMembership = (chatId: string) => members.find(m => m.chat_id === chatId && m.user_id === user?.id);
  const myChats = chats.filter(c => {
    const m = myMembership(c.id);
    return m?.status === 'accepted';
  });
  const myPending = chats.filter(c => myMembership(c.id)?.status === 'pending');

  const loadAll = async () => {
    if (!user) return;
    const { data: mems } = await sb.from('chat_members').select('*').eq('user_id', user.id);
    const myMems: Member[] = mems || [];
    const chatIds = myMems.map(m => m.chat_id);
    if (chatIds.length === 0) {
      setChats([]); setMembers([]); return;
    }
    const { data: cs } = await sb.from('chats').select('*').in('id', chatIds);
    const { data: allMems } = await sb.from('chat_members').select('*').in('chat_id', chatIds);
    setChats(cs || []);
    setMembers(allMems || []);
    // Load profiles for all involved user ids
    const uids = Array.from(new Set((allMems || []).map((m: Member) => m.user_id)));
    if (uids.length) {
      const { data: profs } = await sb.from('profiles').select('user_id, display_name, email').in('user_id', uids);
      const map: Record<string, ProfileLite> = {};
      (profs || []).forEach((p: ProfileLite) => { map[p.user_id] = p; });
      setProfiles(map);
    }
  };

  useEffect(() => { loadAll(); }, [user?.id]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel('chat-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_members' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => loadAll())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const m = payload.new as Message;
        setMessagesByChat(prev => {
          const list = prev[m.chat_id] || [];
          if (list.find(x => x.id === m.id)) return prev;
          return { ...prev, [m.chat_id]: [...list, m] };
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  // Load messages for active chat
  useEffect(() => {
    if (!activeChatId) return;
    (async () => {
      const { data } = await sb.from('chat_messages').select('*').eq('chat_id', activeChatId).order('created_at');
      setMessagesByChat(prev => ({ ...prev, [activeChatId]: data || [] }));
      // mark as read
      await sb.from('chat_members').update({ last_read_at: new Date().toISOString() })
        .eq('chat_id', activeChatId).eq('user_id', user!.id);
      loadAll();
    })();
  }, [activeChatId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messagesByChat, activeChatId]);

  const chatLabel = (c: Chat) => {
    const mine = myMembership(c.id);
    if (mine?.custom_name) return mine.custom_name;
    if (c.name) return c.name;
    if (!c.is_group) {
      const other = members.find(m => m.chat_id === c.id && m.user_id !== user?.id);
      const p = other && profiles[other.user_id];
      return p?.display_name || p?.email || 'Chat';
    }
    return 'Grupo';
  };

  const unreadCount = (c: Chat) => {
    const m = myMembership(c.id);
    if (!m) return 0;
    const msgs = messagesByChat[c.id] || [];
    const last = new Date(m.last_read_at).getTime();
    return msgs.filter(x => x.sender_id !== user?.id && new Date(x.created_at).getTime() > last).length;
  };

  const sendMessage = async () => {
    if (!draft.trim() || !activeChatId || !user) return;
    const content = draft.trim();
    setDraft('');
    const { error } = await sb.from('chat_messages').insert({ chat_id: activeChatId, sender_id: user.id, content });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
  };

  const acceptInvite = async (chatId: string) => {
    await sb.from('chat_members').update({ status: 'accepted' }).eq('chat_id', chatId).eq('user_id', user!.id);
    loadAll();
  };
  const declineInvite = async (chatId: string) => {
    await sb.from('chat_members').delete().eq('chat_id', chatId).eq('user_id', user!.id);
    loadAll();
  };

  const activeChat = chats.find(c => c.id === activeChatId);
  const activeMembers = members.filter(m => m.chat_id === activeChatId);
  const activeMessages = activeChatId ? messagesByChat[activeChatId] || [] : [];

  return (
    <div className="space-y-4 animate-slide-up pb-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" /> Chat
        </h1>
        <NewChatButton open={newChatOpen} setOpen={setNewChatOpen} onCreated={(id) => { setActiveChatId(id); loadAll(); }} />
      </div>

      {/* Pending invitations */}
      {myPending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Invitaciones</p>
          {myPending.map(c => {
            const inviter = members.find(m => m.chat_id === c.id && m.user_id === c.created_by);
            const inviterP = inviter && profiles[inviter.user_id];
            return (
              <div key={c.id} className="glass-card rounded-2xl p-3 flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-sm font-semibold">{chatLabel(c)}</p>
                  <p className="text-xs text-muted-foreground">Te invitó {inviterP?.display_name || inviterP?.email || 'alguien'}{c.is_group ? ' a un grupo' : ''}</p>
                </div>
                <Button size="sm" onClick={() => acceptInvite(c.id)}><Check className="w-4 h-4" />Aceptar</Button>
                <Button size="sm" variant="outline" onClick={() => declineInvite(c.id)}><X className="w-4 h-4" /></Button>
              </div>
            );
          })}
        </div>
      )}

      {!activeChat ? (
        <div className="space-y-2">
          {myChats.length === 0 && myPending.length === 0 && (
            <div className="glass-card rounded-2xl p-8 text-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No tienes chats todavía. Crea uno nuevo.</p>
            </div>
          )}
          {myChats.map(c => {
            const unread = unreadCount(c);
            return (
              <button key={c.id} onClick={() => setActiveChatId(c.id)} className="w-full glass-card rounded-2xl p-3 flex items-center gap-3 hover:ring-2 ring-primary/30 transition-all text-left">
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', c.is_group ? 'bg-primary/20' : 'bg-muted')}>
                  {c.is_group ? <Users className="w-5 h-5 text-primary" /> : <MessageSquare className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{chatLabel(c)}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {(messagesByChat[c.id] || []).slice(-1)[0]?.content || (c.is_group ? 'Chat de grupo' : 'Chat individual')}
                  </p>
                </div>
                {unread > 0 && <span className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{unread}</span>}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="glass-card rounded-2xl flex flex-col h-[70vh]">
          <div className="border-b border-border p-3 flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={() => setActiveChatId(null)}><ArrowLeft className="w-4 h-4" /></Button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate flex items-center gap-1">
                {activeChat.is_group && <Users className="w-3.5 h-3.5" />}
                {chatLabel(activeChat)}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {activeMembers.filter(m => m.status === 'accepted').map(m => profiles[m.user_id]?.display_name || profiles[m.user_id]?.email || '...').join(', ')}
              </p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setRenameOpen(true)}><Pencil className="w-4 h-4" /></Button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
            {activeMessages.length === 0 && <p className="text-xs text-center text-muted-foreground py-6">Sin mensajes. Empieza la conversación.</p>}
            {activeMessages.map(m => {
              const mine = m.sender_id === user?.id;
              const senderP = profiles[m.sender_id];
              return (
                <div key={m.id} className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
                  {activeChat.is_group && !mine && (
                    <span className="text-[10px] text-muted-foreground px-2">{senderP?.display_name || senderP?.email || 'Alguien'}</span>
                  )}
                  <div className={cn('max-w-[75%] rounded-2xl px-3 py-2 text-sm break-words',
                    mine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm')}>
                    {m.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground px-2">{new Date(m.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              );
            })}
          </div>
          <div className="border-t border-border p-2 flex gap-2">
            <Input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Escribe un mensaje…" />
            <Button onClick={sendMessage} disabled={!draft.trim()}><Send className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {activeChat && (
        <RenameDialog
          open={renameOpen}
          onOpenChange={setRenameOpen}
          chat={activeChat}
          currentCustom={myMembership(activeChat.id)?.custom_name || ''}
          onSaved={loadAll}
          userId={user!.id}
        />
      )}
    </div>
  );
};

const NewChatButton = ({ open, setOpen, onCreated }: { open: boolean; setOpen: (v: boolean) => void; onCreated: (chatId: string) => void }) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserHit[]>([]);
  const [selected, setSelected] = useState<UserHit[]>([]);
  const [groupName, setGroupName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) { setQuery(''); setResults([]); setSelected([]); setGroupName(''); }
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await sb.rpc('search_users_by_email', { query: q });
      setResults((data || []) as UserHit[]);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const toggleSelect = (u: UserHit) => {
    setSelected(prev => prev.find(x => x.user_id === u.user_id)
      ? prev.filter(x => x.user_id !== u.user_id)
      : [...prev, u]);
  };

  const create = async () => {
    if (selected.length === 0 || !user) return;
    setBusy(true);
    try {
      const isGroup = selected.length > 1;
      const { data: chat, error } = await sb.from('chats').insert({
        is_group: isGroup,
        name: isGroup ? (groupName.trim() || 'Grupo') : null,
        created_by: user.id,
      }).select().single();
      if (error || !chat) throw error;
      // Add creator as accepted
      await sb.from('chat_members').insert({ chat_id: chat.id, user_id: user.id, status: 'accepted', invited_by: user.id });
      // Add invitees as pending
      await sb.from('chat_members').insert(selected.map(s => ({
        chat_id: chat.id, user_id: s.user_id, status: 'pending', invited_by: user.id,
      })));
      onCreated(chat.id);
      setOpen(false);
      toast({ title: 'Invitación enviada', description: `${selected.length} invitación(es) enviadas` });
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'No se pudo crear el chat', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1 rounded-full"><Plus className="w-4 h-4" />Nuevo chat</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Nuevo chat</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Buscar usuarios por gmail</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="ejemplo@gmail.com" className="pl-9" />
            </div>
          </div>
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selected.map(s => (
                <span key={s.user_id} className="bg-primary/20 text-foreground rounded-full px-2 py-0.5 text-xs flex items-center gap-1">
                  {s.display_name || s.email}
                  <button onClick={() => toggleSelect(s)}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}
          {selected.length > 1 && (
            <div>
              <Label className="text-xs">Nombre del grupo</Label>
              <Input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Mi grupo" />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto space-y-1">
            {query.trim().length >= 2 && results.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">Sin resultados</p>}
            {results.map(u => {
              const isSel = !!selected.find(s => s.user_id === u.user_id);
              return (
                <button key={u.user_id} onClick={() => toggleSelect(u)} className={cn('w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-muted/50 transition-colors', isSel && 'bg-primary/10')}>
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{(u.display_name || u.email).slice(0, 1).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{u.display_name || u.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  {isSel && <Check className="w-4 h-4 text-primary" />}
                </button>
              );
            })}
          </div>
          <Button className="w-full" onClick={create} disabled={busy || selected.length === 0}>
            {selected.length > 1 ? `Crear grupo con ${selected.length} usuarios` : selected.length === 1 ? 'Enviar invitación' : 'Selecciona al menos un usuario'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const RenameDialog = ({ open, onOpenChange, chat, currentCustom, onSaved, userId }: { open: boolean; onOpenChange: (v: boolean) => void; chat: Chat; currentCustom: string; onSaved: () => void; userId: string }) => {
  const [groupName, setGroupName] = useState(chat.name || '');
  const [custom, setCustom] = useState(currentCustom);
  useEffect(() => { setGroupName(chat.name || ''); setCustom(currentCustom); }, [chat, currentCustom, open]);

  const save = async () => {
    if (chat.is_group && groupName.trim()) {
      await sb.from('chats').update({ name: groupName.trim() }).eq('id', chat.id);
    }
    await sb.from('chat_members').update({ custom_name: custom.trim() || null }).eq('chat_id', chat.id).eq('user_id', userId);
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Renombrar chat</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {chat.is_group && (
            <div>
              <Label className="text-xs">Nombre del grupo (para todos)</Label>
              <Input value={groupName} onChange={e => setGroupName(e.target.value)} />
            </div>
          )}
          <div>
            <Label className="text-xs">Nombre personalizado (solo para ti)</Label>
            <Input value={custom} onChange={e => setCustom(e.target.value)} placeholder="Apodo del chat" />
          </div>
          <Button className="w-full" onClick={save}>Guardar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatPage;

// Hook to fetch total unread message count for the chat tab badge
export const useChatUnreadCount = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = async () => {
    if (!user) { setCount(0); return; }
    const { data: mems } = await sb.from('chat_members').select('chat_id,last_read_at,status').eq('user_id', user.id);
    const accepted = (mems || []).filter((m: any) => m.status === 'accepted');
    const pendingCount = (mems || []).filter((m: any) => m.status === 'pending').length;
    if (accepted.length === 0) { setCount(pendingCount); return; }
    let total = pendingCount;
    for (const m of accepted) {
      const { count: c } = await sb.from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', m.chat_id)
        .neq('sender_id', user.id)
        .gt('created_at', m.last_read_at);
      total += c || 0;
    }
    setCount(total);
  };

  useEffect(() => { refresh(); }, [user?.id]);
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel('chat-unread-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_members' }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  return count;
};
