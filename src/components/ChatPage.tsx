import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Search, Send, MessageSquare, Check, CheckCheck, X, Users, Pencil, ArrowLeft, UserPlus, UserMinus, Clock, Loader2 } from 'lucide-react';
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
type Message = { id: string; chat_id: string; sender_id: string; content: string; created_at: string; _status?: 'sending' | 'sent' };
type UserHit = { user_id: string; display_name: string; email: string };
type ProfileLite = { user_id: string; display_name: string; email: string };

const sb = supabase as any;
const PAGE_SIZE = 30;

const ChatPage = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, Message[]>>({});
  const [lastMsgByChat, setLastMsgByChat] = useState<Record<string, Message>>({});
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [hasMore, setHasMore] = useState<Record<string, boolean>>({});
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, number>>({});
  const typingChannelRef = useRef<any>(null);
  const lastTypingSentRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeChatIdRef = useRef<string | null>(null);
  useEffect(() => { activeChatIdRef.current = activeChatId; }, [activeChatId]);

  const myMembership = (chatId: string) => members.find(m => m.chat_id === chatId && m.user_id === user?.id);
  const myChats = chats.filter(c => myMembership(c.id)?.status === 'accepted');
  const myPending = chats.filter(c => myMembership(c.id)?.status === 'pending');

  const loadAll = useCallback(async () => {
    if (!user) return;
    const { data: mems } = await sb.from('chat_members').select('*').eq('user_id', user.id);
    const myMems: Member[] = mems || [];
    const chatIds = myMems.map(m => m.chat_id);
    if (chatIds.length === 0) {
      setChats([]); setMembers([]); setLastMsgByChat({}); return;
    }
    const [{ data: cs }, { data: allMems }] = await Promise.all([
      sb.from('chats').select('*').in('id', chatIds),
      sb.from('chat_members').select('*').in('chat_id', chatIds),
    ]);
    setChats(cs || []);
    setMembers(allMems || []);
    const uids = Array.from(new Set((allMems || []).map((m: Member) => m.user_id)));
    if (uids.length) {
      const { data: profs } = await sb.from('profiles').select('user_id, display_name, email').in('user_id', uids);
      const map: Record<string, ProfileLite> = {};
      (profs || []).forEach((p: ProfileLite) => { map[p.user_id] = p; });
      setProfiles(map);
    }
    // Load latest message per chat (single query, group client-side)
    const acceptedIds = myMems.filter(m => m.status === 'accepted').map(m => m.chat_id);
    if (acceptedIds.length) {
      const { data: recents } = await sb.from('chat_messages')
        .select('*').in('chat_id', acceptedIds).order('created_at', { ascending: false }).limit(200);
      const last: Record<string, Message> = {};
      (recents || []).forEach((m: Message) => { if (!last[m.chat_id]) last[m.chat_id] = m; });
      setLastMsgByChat(last);
    }
  }, [user?.id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel('chat-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_members' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => loadAll())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_members' }, () => {
        // refresh members for read-receipt updates
        loadAll();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const m = payload.new as Message;
        setLastMsgByChat(prev => ({ ...prev, [m.chat_id]: m }));
        setMessagesByChat(prev => {
          const list = prev[m.chat_id] || [];
          if (list.find(x => x.id === m.id)) return prev;
          // Replace optimistic message if exists
          const filtered = list.filter(x => !(x._status === 'sending' && x.sender_id === m.sender_id && x.content === m.content));
          return { ...prev, [m.chat_id]: [...filtered, m] };
        });
        // Auto mark as read if this chat is open
        if (activeChatIdRef.current === m.chat_id && m.sender_id !== user.id) {
          markRead(m.chat_id);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, loadAll]);

  const markRead = useCallback(async (chatId: string) => {
    if (!user) return;
    await sb.from('chat_members').update({ last_read_at: new Date().toISOString() })
      .eq('chat_id', chatId).eq('user_id', user.id);
  }, [user?.id]);

  // Load latest page of messages when opening a chat
  useEffect(() => {
    if (!activeChatId || !user) return;
    (async () => {
      const { data } = await sb.from('chat_messages').select('*')
        .eq('chat_id', activeChatId).order('created_at', { ascending: false }).limit(PAGE_SIZE);
      const ordered = (data || []).slice().reverse();
      setMessagesByChat(prev => ({ ...prev, [activeChatId]: ordered }));
      setHasMore(prev => ({ ...prev, [activeChatId]: (data?.length || 0) === PAGE_SIZE }));
      await markRead(activeChatId);
      // refresh members so other people see our last_read_at quickly via realtime
    })();
  }, [activeChatId, user?.id, markRead]);

  // Auto scroll to bottom on new messages (only when near bottom)
  const lastMessageCount = useRef(0);
  useEffect(() => {
    const list = activeChatId ? messagesByChat[activeChatId] || [] : [];
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const isNew = list.length > lastMessageCount.current;
    lastMessageCount.current = list.length;
    if (isNew) {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
      if (nearBottom) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messagesByChat, activeChatId]);

  // Reset scroll on chat change
  useEffect(() => {
    lastMessageCount.current = 0;
    setTimeout(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, 0);
  }, [activeChatId]);

  // Typing indicator: broadcast channel per active chat
  useEffect(() => {
    if (!activeChatId || !user) return;
    setTypingUsers({});
    const ch = supabase.channel(`typing:${activeChatId}`, { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: 'typing' }, (payload) => {
      const uid = (payload.payload as any)?.user_id as string | undefined;
      if (!uid || uid === user.id) return;
      setTypingUsers(prev => ({ ...prev, [uid]: Date.now() }));
    });
    ch.subscribe();
    typingChannelRef.current = ch;
    const interval = setInterval(() => {
      setTypingUsers(prev => {
        const now = Date.now();
        const next: Record<string, number> = {};
        let changed = false;
        for (const k in prev) {
          if (now - prev[k] < 4000) next[k] = prev[k];
          else changed = true;
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => {
      clearInterval(interval);
      supabase.removeChannel(ch);
      typingChannelRef.current = null;
    };
  }, [activeChatId, user?.id]);

  const broadcastTyping = () => {
    const ch = typingChannelRef.current;
    if (!ch || !user) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1500) return;
    lastTypingSentRef.current = now;
    ch.send({ type: 'broadcast', event: 'typing', payload: { user_id: user.id } });
  };

  const loadOlder = async () => {
    if (!activeChatId || loadingOlder) return;
    const list = messagesByChat[activeChatId] || [];
    if (list.length === 0 || !hasMore[activeChatId]) return;
    setLoadingOlder(true);
    const oldest = list[0];
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight || 0;
    const { data } = await sb.from('chat_messages').select('*')
      .eq('chat_id', activeChatId).lt('created_at', oldest.created_at)
      .order('created_at', { ascending: false }).limit(PAGE_SIZE);
    const ordered = (data || []).slice().reverse();
    setMessagesByChat(prev => ({ ...prev, [activeChatId]: [...ordered, ...(prev[activeChatId] || [])] }));
    setHasMore(prev => ({ ...prev, [activeChatId]: (data?.length || 0) === PAGE_SIZE }));
    setLoadingOlder(false);
    setTimeout(() => {
      if (el) el.scrollTop = el.scrollHeight - prevHeight;
    }, 0);
  };

  const onScroll = () => {
    if (!scrollRef.current) return;
    if (scrollRef.current.scrollTop < 60) loadOlder();
  };

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

  const unreadInfo = (c: Chat) => {
    const m = myMembership(c.id);
    if (!m) return { unread: false, last: null as Message | null };
    const last = lastMsgByChat[c.id] || null;
    if (!last) return { unread: false, last: null };
    const unread = last.sender_id !== user?.id && new Date(last.created_at).getTime() > new Date(m.last_read_at).getTime();
    return { unread, last };
  };

  const sendMessage = async () => {
    if (!draft.trim() || !activeChatId || !user) return;
    const content = draft.trim();
    setDraft('');
    const tempId = 'temp-' + Math.random().toString(36).slice(2);
    const optimistic: Message = {
      id: tempId, chat_id: activeChatId, sender_id: user.id, content,
      created_at: new Date().toISOString(), _status: 'sending',
    };
    setMessagesByChat(prev => ({ ...prev, [activeChatId]: [...(prev[activeChatId] || []), optimistic] }));
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 0);
    const { data, error } = await sb.from('chat_messages')
      .insert({ chat_id: activeChatId, sender_id: user.id, content }).select().single();
    if (error) {
      setMessagesByChat(prev => ({ ...prev, [activeChatId]: (prev[activeChatId] || []).filter(m => m.id !== tempId) }));
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    // Replace optimistic with real
    setMessagesByChat(prev => {
      const list = prev[activeChatId] || [];
      const exists = list.find(x => x.id === data.id);
      const cleaned = list.filter(x => x.id !== tempId && (!exists || x.id !== data.id));
      return { ...prev, [activeChatId]: exists ? cleaned.concat() : [...cleaned, data] };
    });
    setLastMsgByChat(prev => ({ ...prev, [activeChatId]: data }));
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

  // Calculate other members' min last_read_at for read-receipt ticks (only accepted)
  const otherReadFloor = useMemo(() => {
    if (!activeChat) return 0;
    const others = activeMembers.filter(m => m.user_id !== user?.id && m.status === 'accepted');
    if (others.length === 0) return 0;
    return Math.min(...others.map(m => new Date(m.last_read_at).getTime()));
  }, [activeMembers, activeChat, user?.id]);

  return (
    <div className="space-y-4 animate-slide-up pb-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" /> Chat
        </h1>
        {!activeChat && <NewChatButton open={newChatOpen} setOpen={setNewChatOpen} onCreated={(id) => { setActiveChatId(id); loadAll(); }} excludeIds={[]} />}
      </div>

      {!activeChat && myPending.length > 0 && (
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
            const { unread, last } = unreadInfo(c);
            const senderP = last && profiles[last.sender_id];
            const preview = last
              ? `${last.sender_id === user?.id ? 'Tú: ' : c.is_group ? `${senderP?.display_name || senderP?.email || 'Alguien'}: ` : ''}${last.content}`
              : (c.is_group ? 'Chat de grupo' : 'Chat individual');
            return (
              <button key={c.id} onClick={() => setActiveChatId(c.id)} className="w-full glass-card rounded-2xl p-3 flex items-center gap-3 hover:ring-2 ring-primary/30 transition-all text-left">
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center relative', c.is_group ? 'bg-primary/20' : 'bg-muted')}>
                  {c.is_group ? <Users className="w-5 h-5 text-primary" /> : <MessageSquare className="w-5 h-5" />}
                  {unread && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-destructive rounded-full ring-2 ring-card" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm truncate', unread ? 'font-extrabold' : 'font-semibold')}>{chatLabel(c)}</p>
                  <p className={cn('text-xs truncate', unread ? 'text-foreground font-semibold' : 'text-muted-foreground')}>{preview}</p>
                </div>
                {unread && <span className="w-2.5 h-2.5 bg-destructive rounded-full" />}
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
            {activeChat.is_group && (
              <Button size="icon" variant="ghost" onClick={() => setMembersOpen(true)} title="Miembros"><Users className="w-4 h-4" /></Button>
            )}
            <Button size="icon" variant="ghost" onClick={() => setRenameOpen(true)} title="Renombrar"><Pencil className="w-4 h-4" /></Button>
          </div>
          <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto p-3 space-y-2">
            {loadingOlder && <div className="text-center py-2"><Loader2 className="w-4 h-4 animate-spin inline" /></div>}
            {!loadingOlder && hasMore[activeChatId!] && (
              <button onClick={loadOlder} className="text-xs text-primary mx-auto block">Cargar mensajes anteriores</button>
            )}
            {activeMessages.length === 0 && <p className="text-xs text-center text-muted-foreground py-6">Sin mensajes. Empieza la conversación.</p>}
            {activeMessages.map(m => {
              const mine = m.sender_id === user?.id;
              const senderP = profiles[m.sender_id];
              const isSending = m._status === 'sending';
              const isRead = !isSending && otherReadFloor >= new Date(m.created_at).getTime();
              return (
                <div key={m.id} className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
                  {activeChat.is_group && !mine && (
                    <span className="text-[10px] text-muted-foreground px-2">{senderP?.display_name || senderP?.email || 'Alguien'}</span>
                  )}
                  <div className={cn('max-w-[75%] rounded-2xl px-3 py-2 text-sm break-words',
                    mine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm')}>
                    {m.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground px-2 flex items-center gap-1">
                    {new Date(m.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    {mine && (
                      isSending ? <Clock className="w-3 h-3" />
                        : isRead ? <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
                        : <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </span>
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
      {activeChat && activeChat.is_group && (
        <ManageMembersDialog
          open={membersOpen}
          onOpenChange={setMembersOpen}
          chat={activeChat}
          members={activeMembers}
          profiles={profiles}
          currentUserId={user!.id}
          onChanged={loadAll}
        />
      )}
    </div>
  );
};

const NewChatButton = ({ open, setOpen, onCreated, excludeIds }: { open: boolean; setOpen: (v: boolean) => void; onCreated: (chatId: string) => void; excludeIds: string[] }) => {
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
      setResults(((data || []) as UserHit[]).filter(u => !excludeIds.includes(u.user_id)));
    }, 250);
    return () => clearTimeout(t);
  }, [query, excludeIds]);

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
      await sb.from('chat_members').insert({ chat_id: chat.id, user_id: user.id, status: 'accepted', invited_by: user.id });
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

const ManageMembersDialog = ({ open, onOpenChange, chat, members, profiles, currentUserId, onChanged }: {
  open: boolean; onOpenChange: (v: boolean) => void; chat: Chat; members: Member[];
  profiles: Record<string, ProfileLite>; currentUserId: string; onChanged: () => void;
}) => {
  const isCreator = chat.created_by === currentUserId;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserHit[]>([]);
  const [busy, setBusy] = useState(false);
  const existingIds = members.map(m => m.user_id);

  useEffect(() => { if (!open) { setQuery(''); setResults([]); } }, [open]);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await sb.rpc('search_users_by_email', { query: q });
      setResults(((data || []) as UserHit[]).filter(u => !existingIds.includes(u.user_id)));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const invite = async (u: UserHit) => {
    setBusy(true);
    const { error } = await sb.from('chat_members').insert({ chat_id: chat.id, user_id: u.user_id, status: 'pending', invited_by: currentUserId });
    setBusy(false);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Invitación enviada' }); setQuery(''); setResults([]); onChanged(); }
  };
  const kick = async (uid: string) => {
    if (!confirm('¿Expulsar a este miembro del grupo?')) return;
    const { error } = await sb.from('chat_members').delete().eq('chat_id', chat.id).eq('user_id', uid);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Miembro expulsado' }); onChanged(); }
  };
  const leave = async () => {
    if (!confirm('¿Salir del grupo?')) return;
    await sb.from('chat_members').delete().eq('chat_id', chat.id).eq('user_id', currentUserId);
    onChanged();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Miembros del grupo</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {members.map(m => {
              const p = profiles[m.user_id];
              const isMe = m.user_id === currentUserId;
              const isOwner = m.user_id === chat.created_by;
              return (
                <div key={m.id} className="flex items-center gap-2 px-2 py-2 rounded-lg bg-muted/30">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{(p?.display_name || p?.email || '?').slice(0, 1).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{p?.display_name || p?.email || '...'} {isMe && <span className="text-[10px] text-muted-foreground">(tú)</span>} {isOwner && <span className="text-[10px] text-primary">(creador)</span>}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{m.status === 'pending' ? 'Invitación pendiente' : p?.email}</p>
                  </div>
                  {isCreator && !isMe && !isOwner && (
                    <Button size="icon" variant="ghost" onClick={() => kick(m.user_id)} title="Expulsar"><UserMinus className="w-4 h-4 text-destructive" /></Button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="border-t border-border pt-3">
            <Label className="text-xs flex items-center gap-1"><UserPlus className="w-3.5 h-3.5" /> Invitar nuevo miembro</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="ejemplo@gmail.com" className="pl-9" />
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1 mt-2">
              {results.map(u => (
                <button key={u.user_id} onClick={() => invite(u)} disabled={busy} className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-muted/50">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{(u.display_name || u.email).slice(0, 1).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{u.display_name || u.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <UserPlus className="w-4 h-4 text-primary" />
                </button>
              ))}
            </div>
          </div>
          {!isCreator && (
            <Button variant="destructive" className="w-full" onClick={leave}>Salir del grupo</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatPage;

// ============================================
// Unread badge + system notifications hook
// ============================================
export const useChatUnreadCount = (isChatTabActive: boolean = false) => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const isActiveRef = useRef(isChatTabActive);
  useEffect(() => { isActiveRef.current = isChatTabActive; }, [isChatTabActive]);

  // Request notification permission once
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  const showNotification = (title: string, body: string) => {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      if (document.visibilityState === 'visible' && isActiveRef.current) return;
      const n = new Notification(title, { body, icon: '/placeholder.svg', tag: 'chat-' + title });
      n.onclick = () => { window.focus(); n.close(); };
    } catch {}
  };

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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, async (payload) => {
        const m = payload.new as Message;
        if (m.sender_id !== user.id) {
          // Notify if user is not viewing chat
          if (document.visibilityState !== 'visible' || !isActiveRef.current) {
            const { data: prof } = await sb.from('profiles').select('display_name,email').eq('user_id', m.sender_id).maybeSingle();
            const name = prof?.display_name || prof?.email || 'Nuevo mensaje';
            showNotification(name, m.content);
          }
        }
        refresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_members' }, async (payload: any) => {
        // Detect new pending invite for me
        if (payload.eventType === 'INSERT' && payload.new?.user_id === user.id && payload.new?.status === 'pending') {
          showNotification('Nueva invitación de chat', 'Has recibido una invitación');
        }
        refresh();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  return count;
};
