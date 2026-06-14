import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus, Search, Send, MessageSquare, Check, CheckCheck, X, Users, Pencil, ArrowLeft,
  UserPlus, UserMinus, Clock, Loader2, Mic, Square, Trash2, Reply, MoreVertical, Bell, Play, Pause,
} from 'lucide-react';
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
type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  reply_to_id?: string | null;
  edited_at?: string | null;
  deleted_at?: string | null;
  attachment_url?: string | null;
  attachment_type?: string | null;
  audio_duration_ms?: number | null;
  _status?: 'sending' | 'sent';
};
type UserHit = { user_id: string; display_name: string; email: string };
type ProfileLite = { user_id: string; display_name: string; email: string };
type Presence = { user_id: string; is_online: boolean; last_seen_at: string };

const sb = supabase as any;
const PAGE_SIZE = 30;
const ONLINE_THRESHOLD_MS = 75_000; // count as online if heartbeat within 75s

const ChatPage = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, Message[]>>({});
  const [lastMsgByChat, setLastMsgByChat] = useState<Record<string, Message>>({});
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [presence, setPresence] = useState<Record<string, Presence>>({});
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<{ id: string; content: string } | null>(null);
  const [hasMore, setHasMore] = useState<Record<string, boolean>>({});
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, number>>({});
  const [recording, setRecording] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(typeof Notification !== 'undefined' ? Notification.permission : 'default');
  const typingChannelRef = useRef<any>(null);
  const lastTypingSentRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeChatIdRef = useRef<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef(0);
  const recordTimerRef = useRef<number | null>(null);
  useEffect(() => { activeChatIdRef.current = activeChatId; }, [activeChatId]);

  const myMembership = (chatId: string) => members.find(m => m.chat_id === chatId && m.user_id === user?.id);
  const myChats = useMemo(() => {
    const list = chats.filter(c => myMembership(c.id)?.status === 'accepted');
    return list.sort((a, b) => {
      const ta = new Date(lastMsgByChat[a.id]?.created_at || a.updated_at).getTime();
      const tb = new Date(lastMsgByChat[b.id]?.created_at || b.updated_at).getTime();
      return tb - ta;
    });
  }, [chats, members, lastMsgByChat, user?.id]);
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
      const [{ data: profs }, { data: pres }] = await Promise.all([
        sb.from('profiles').select('user_id, display_name, email').in('user_id', uids),
        sb.from('user_presence').select('user_id, is_online, last_seen_at').in('user_id', uids),
      ]);
      const pmap: Record<string, ProfileLite> = {};
      (profs || []).forEach((p: ProfileLite) => { pmap[p.user_id] = p; });
      setProfiles(pmap);
      const prmap: Record<string, Presence> = {};
      (pres || []).forEach((p: Presence) => { prmap[p.user_id] = p; });
      setPresence(prmap);
    }
    const acceptedIds = myMems.filter(m => m.status === 'accepted').map(m => m.chat_id);
    if (acceptedIds.length) {
      const { data: recents } = await sb.from('chat_messages')
        .select('*').in('chat_id', acceptedIds).order('created_at', { ascending: false }).limit(300);
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const m = payload.new as Message;
        setLastMsgByChat(prev => ({ ...prev, [m.chat_id]: m }));
        setMessagesByChat(prev => {
          const list = prev[m.chat_id] || [];
          if (list.find(x => x.id === m.id)) return prev;
          const filtered = list.filter(x => !(x._status === 'sending' && x.sender_id === m.sender_id && x.content === m.content));
          return { ...prev, [m.chat_id]: [...filtered, m] };
        });
        if (activeChatIdRef.current === m.chat_id && m.sender_id !== user.id) {
          markRead(m.chat_id);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' }, (payload) => {
        const m = payload.new as Message;
        setMessagesByChat(prev => {
          const list = prev[m.chat_id];
          if (!list) return prev;
          return { ...prev, [m.chat_id]: list.map(x => x.id === m.id ? { ...x, ...m } : x) };
        });
        setLastMsgByChat(prev => prev[m.chat_id]?.id === m.id ? { ...prev, [m.chat_id]: { ...prev[m.chat_id], ...m } } : prev);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' }, (payload) => {
        const m = payload.old as Message;
        setMessagesByChat(prev => {
          const list = prev[m.chat_id];
          if (!list) return prev;
          return { ...prev, [m.chat_id]: list.filter(x => x.id !== m.id) };
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' }, (payload: any) => {
        const p = (payload.new || payload.old) as Presence;
        if (!p) return;
        setPresence(prev => ({ ...prev, [p.user_id]: { user_id: p.user_id, is_online: p.is_online, last_seen_at: p.last_seen_at } }));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, loadAll]);

  // Force re-render every 30s so "online" state expires
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(i);
  }, []);

  const markRead = useCallback(async (chatId: string) => {
    if (!user) return;
    await sb.from('chat_members').update({ last_read_at: new Date().toISOString() })
      .eq('chat_id', chatId).eq('user_id', user.id);
  }, [user?.id]);

  useEffect(() => {
    if (!activeChatId || !user) return;
    (async () => {
      const { data } = await sb.from('chat_messages').select('*')
        .eq('chat_id', activeChatId).order('created_at', { ascending: false }).limit(PAGE_SIZE);
      const ordered = (data || []).slice().reverse();
      setMessagesByChat(prev => ({ ...prev, [activeChatId]: ordered }));
      setHasMore(prev => ({ ...prev, [activeChatId]: (data?.length || 0) === PAGE_SIZE }));
      await markRead(activeChatId);
    })();
  }, [activeChatId, user?.id, markRead]);

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

  useEffect(() => {
    lastMessageCount.current = 0;
    setReplyTo(null);
    setEditing(null);
    setTimeout(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, 0);
  }, [activeChatId]);

  // Typing indicator
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
    setTimeout(() => { if (el) el.scrollTop = el.scrollHeight - prevHeight; }, 0);
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

  const previewText = (m: Message) => {
    if (m.deleted_at) return 'Mensaje eliminado';
    if (m.attachment_type === 'audio') return '🎤 Mensaje de voz';
    return m.content;
  };

  const isUserOnline = (uid: string) => {
    const p = presence[uid];
    if (!p) return false;
    if (!p.is_online) return false;
    return Date.now() - new Date(p.last_seen_at).getTime() < ONLINE_THRESHOLD_MS;
  };

  const formatLastSeen = (uid: string) => {
    const p = presence[uid];
    if (!p) return 'desconectado';
    const d = new Date(p.last_seen_at);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const hh = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    if (sameDay) return `ult. vez a las ${hh}`;
    if (isYesterday) return `ult. vez ayer a las ${hh}`;
    return `ult. vez ${d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })} a las ${hh}`;
  };

  const sendMessage = async () => {
    if (!draft.trim() || !activeChatId || !user) return;
    const content = draft.trim();
    const reply_to_id = replyTo?.id || null;
    setDraft('');
    setReplyTo(null);
    const tempId = 'temp-' + Math.random().toString(36).slice(2);
    const optimistic: Message = {
      id: tempId, chat_id: activeChatId, sender_id: user.id, content, reply_to_id,
      created_at: new Date().toISOString(), _status: 'sending',
    };
    setMessagesByChat(prev => ({ ...prev, [activeChatId]: [...(prev[activeChatId] || []), optimistic] }));
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 0);
    const { data, error } = await sb.from('chat_messages')
      .insert({ chat_id: activeChatId, sender_id: user.id, content, reply_to_id }).select().single();
    if (error) {
      setMessagesByChat(prev => ({ ...prev, [activeChatId]: (prev[activeChatId] || []).filter(m => m.id !== tempId) }));
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setMessagesByChat(prev => {
      const list = prev[activeChatId] || [];
      const exists = list.find(x => x.id === data.id);
      const cleaned = list.filter(x => x.id !== tempId && (!exists || x.id !== data.id));
      return { ...prev, [activeChatId]: exists ? cleaned.concat() : [...cleaned, data] };
    });
    setLastMsgByChat(prev => ({ ...prev, [activeChatId]: data }));
  };

  // Audio recording
  const startRecording = async () => {
    if (!activeChatId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recordChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) recordChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(recordChunksRef.current, { type: mr.mimeType || 'audio/webm' });
        const durationMs = Date.now() - recordStartRef.current;
        await uploadAudio(blob, durationMs);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      recordStartRef.current = Date.now();
      setRecording(true);
      setRecordingMs(0);
      recordTimerRef.current = window.setInterval(() => setRecordingMs(Date.now() - recordStartRef.current), 200);
    } catch (e: any) {
      toast({ title: 'Sin acceso al micrófono', description: e?.message || 'Permite el micrófono para grabar', variant: 'destructive' });
    }
  };

  const stopRecording = (cancel = false) => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (cancel) mr.onstop = () => { mr.stream.getTracks().forEach(t => t.stop()); };
    try { mr.stop(); } catch {}
    mediaRecorderRef.current = null;
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
    setRecording(false);
    setRecordingMs(0);
  };

  const uploadAudio = async (blob: Blob, durationMs: number) => {
    if (!activeChatId || !user) return;
    const ext = blob.type.includes('mp4') ? 'm4a' : 'webm';
    const path = `${activeChatId}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const tempId = 'temp-audio-' + Math.random().toString(36).slice(2);
    const optimistic: Message = {
      id: tempId, chat_id: activeChatId, sender_id: user.id, content: '',
      attachment_type: 'audio', audio_duration_ms: durationMs,
      created_at: new Date().toISOString(), _status: 'sending',
    };
    setMessagesByChat(prev => ({ ...prev, [activeChatId]: [...(prev[activeChatId] || []), optimistic] }));
    const { error: upErr } = await sb.storage.from('chat-audio').upload(path, blob, { contentType: blob.type, upsert: false });
    if (upErr) {
      setMessagesByChat(prev => ({ ...prev, [activeChatId]: (prev[activeChatId] || []).filter(m => m.id !== tempId) }));
      toast({ title: 'Error subiendo audio', description: upErr.message, variant: 'destructive' });
      return;
    }
    const { data, error } = await sb.from('chat_messages').insert({
      chat_id: activeChatId, sender_id: user.id, content: '',
      attachment_url: path, attachment_type: 'audio', audio_duration_ms: durationMs,
      reply_to_id: replyTo?.id || null,
    }).select().single();
    setReplyTo(null);
    if (error || !data) {
      setMessagesByChat(prev => ({ ...prev, [activeChatId]: (prev[activeChatId] || []).filter(m => m.id !== tempId) }));
      toast({ title: 'Error', description: error?.message || 'No se pudo enviar el audio', variant: 'destructive' });
      return;
    }
    setMessagesByChat(prev => {
      const list = prev[activeChatId] || [];
      const exists = list.find(x => x.id === data.id);
      const cleaned = list.filter(x => x.id !== tempId && (!exists || x.id !== data.id));
      return { ...prev, [activeChatId]: exists ? cleaned.concat() : [...cleaned, data] };
    });
    setLastMsgByChat(prev => ({ ...prev, [activeChatId]: data }));
  };

  const deleteMessage = async (m: Message) => {
    if (!confirm('¿Eliminar este mensaje?')) return;
    const { error } = await sb.from('chat_messages').update({
      deleted_at: new Date().toISOString(), content: '', attachment_url: null,
    }).eq('id', m.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else if (m.attachment_url) {
      await sb.storage.from('chat-audio').remove([m.attachment_url]).catch(() => {});
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    const newContent = editing.content.trim();
    if (!newContent) { setEditing(null); return; }
    const { error } = await sb.from('chat_messages').update({
      content: newContent, edited_at: new Date().toISOString(),
    }).eq('id', editing.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    setEditing(null);
  };

  const requestNotifications = async () => {
    try {
      const p = await Notification.requestPermission();
      setNotifPerm(p);
      if (p === 'granted') toast({ title: 'Notificaciones activadas' });
    } catch {}
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

  const otherReadFloor = useMemo(() => {
    if (!activeChat) return 0;
    const others = activeMembers.filter(m => m.user_id !== user?.id && m.status === 'accepted');
    if (others.length === 0) return 0;
    return Math.min(...others.map(m => new Date(m.last_read_at).getTime()));
  }, [activeMembers, activeChat, user?.id]);

  // For 1-1 chats, the other user
  const otherUserId = activeChat && !activeChat.is_group
    ? activeMembers.find(m => m.user_id !== user?.id)?.user_id
    : null;

  const messagesById = useMemo(() => {
    const map: Record<string, Message> = {};
    activeMessages.forEach(m => { map[m.id] = m; });
    return map;
  }, [activeMessages]);

  return (
    <div className="space-y-4 animate-slide-up pb-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" /> Chat
        </h1>
        {!activeChat && <NewChatButton open={newChatOpen} setOpen={setNewChatOpen} onCreated={(id) => { setActiveChatId(id); loadAll(); }} excludeIds={[]} />}
      </div>

      {!activeChat && notifPerm !== 'granted' && (
        <button onClick={requestNotifications} className="w-full glass-card rounded-2xl p-3 flex items-center gap-2 hover:ring-2 ring-primary/30 transition-all text-left">
          <Bell className="w-4 h-4 text-primary" />
          <span className="text-sm flex-1">Activa las notificaciones para enterarte de mensajes nuevos</span>
          <span className="text-xs text-primary font-semibold">Activar</span>
        </button>
      )}

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
              ? `${last.sender_id === user?.id ? 'Tú: ' : c.is_group ? `${senderP?.display_name || senderP?.email || 'Alguien'}: ` : ''}${previewText(last)}`
              : (c.is_group ? 'Chat de grupo' : 'Chat individual');
            const other = !c.is_group ? members.find(m => m.chat_id === c.id && m.user_id !== user?.id) : null;
            const online = other && isUserOnline(other.user_id);
            return (
              <button key={c.id} onClick={() => setActiveChatId(c.id)} className="w-full glass-card rounded-2xl p-3 flex items-center gap-3 hover:ring-2 ring-primary/30 transition-all text-left">
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center relative', c.is_group ? 'bg-primary/20' : 'bg-muted')}>
                  {c.is_group ? <Users className="w-5 h-5 text-primary" /> : <MessageSquare className="w-5 h-5" />}
                  {online && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-card" />}
                  {unread && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-destructive rounded-full ring-2 ring-card" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm truncate', unread ? 'font-extrabold' : 'font-semibold')}>{chatLabel(c)}</p>
                  <p className={cn('text-xs truncate', unread ? 'text-foreground font-semibold' : 'text-muted-foreground')}>{preview}</p>
                </div>
                {last && <span className="text-[10px] text-muted-foreground self-start whitespace-nowrap">{new Date(last.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>}
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
              <p className="text-[11px] truncate flex items-center gap-1">
                {!activeChat.is_group && otherUserId ? (
                  isUserOnline(otherUserId) ? (
                    <><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-emerald-600 dark:text-emerald-400 font-medium">en línea</span></>
                  ) : (
                    <span className="text-muted-foreground">{formatLastSeen(otherUserId)}</span>
                  )
                ) : (
                  <span className="text-muted-foreground truncate">
                    {activeMembers.filter(m => m.status === 'accepted').map(m => profiles[m.user_id]?.display_name || profiles[m.user_id]?.email || '...').join(', ')}
                  </span>
                )}
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
              const isDeleted = !!m.deleted_at;
              const isEditing = editing?.id === m.id;
              const quoted = m.reply_to_id ? messagesById[m.reply_to_id] : null;
              const quotedSender = quoted ? profiles[quoted.sender_id] : null;
              return (
                <div key={m.id} className={cn('group flex flex-col', mine ? 'items-end' : 'items-start')}>
                  {activeChat.is_group && !mine && (
                    <span className="text-[10px] text-muted-foreground px-2">{senderP?.display_name || senderP?.email || 'Alguien'}</span>
                  )}
                  <div className="flex items-end gap-1 max-w-[85%]">
                    {mine && !isDeleted && (
                      <MessageActions
                        canEdit={!m.attachment_url}
                        onReply={() => setReplyTo(m)}
                        onEdit={() => setEditing({ id: m.id, content: m.content })}
                        onDelete={() => deleteMessage(m)}
                      />
                    )}
                    <div className={cn('rounded-2xl px-3 py-2 text-sm break-words',
                      mine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm',
                      isDeleted && 'italic opacity-70')}>
                      {quoted && !isDeleted && (
                        <div className={cn('border-l-2 pl-2 mb-1 text-[11px] opacity-90',
                          mine ? 'border-primary-foreground/60' : 'border-primary/60')}>
                          <p className="font-semibold truncate">{quotedSender?.display_name || quotedSender?.email || (quoted.sender_id === user?.id ? 'Tú' : 'Alguien')}</p>
                          <p className="truncate">{previewText(quoted)}</p>
                        </div>
                      )}
                      {isDeleted ? (
                        <span>Mensaje eliminado</span>
                      ) : isEditing ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editing!.content}
                            onChange={e => setEditing({ ...editing!, content: e.target.value })}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveEdit(); } if (e.key === 'Escape') setEditing(null); }}
                            autoFocus
                            className="h-7 text-sm bg-background text-foreground"
                          />
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveEdit}><Check className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(null)}><X className="w-3.5 h-3.5" /></Button>
                        </div>
                      ) : m.attachment_type === 'audio' && m.attachment_url ? (
                        <AudioPlayer path={m.attachment_url} durationMs={m.audio_duration_ms || 0} mine={mine} />
                      ) : (
                        <span>{m.content}</span>
                      )}
                    </div>
                    {!mine && !isDeleted && (
                      <MessageActions
                        canEdit={false}
                        onReply={() => setReplyTo(m)}
                      />
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground px-2 flex items-center gap-1">
                    {new Date(m.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    {m.edited_at && !isDeleted && <span className="italic">editado</span>}
                    {mine && !isDeleted && (
                      isSending ? <Clock className="w-3 h-3" />
                        : isRead ? <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
                        : <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          {(() => {
            const now = Date.now();
            const ids = Object.entries(typingUsers).filter(([, ts]) => now - ts < 4000).map(([id]) => id);
            if (ids.length === 0) return null;
            const names = ids.map(id => profiles[id]?.display_name || profiles[id]?.email?.split('@')[0] || 'Alguien');
            let label: string;
            if (!activeChat?.is_group) label = 'está escribiendo…';
            else if (names.length === 1) label = `${names[0]} está escribiendo…`;
            else if (names.length === 2) label = `${names[0]} y ${names[1]} están escribiendo…`;
            else label = 'Varios están escribiendo…';
            return (
              <div className="px-3 pb-1 text-xs text-muted-foreground italic flex items-center gap-1.5">
                <span className="flex gap-0.5">
                  <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                {label}
              </div>
            );
          })()}
          {replyTo && (
            <div className="px-3 py-2 border-t border-border bg-muted/30 flex items-center gap-2">
              <Reply className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0 border-l-2 border-primary pl-2">
                <p className="text-[11px] font-semibold text-primary truncate">
                  {replyTo.sender_id === user?.id ? 'Tú' : (profiles[replyTo.sender_id]?.display_name || profiles[replyTo.sender_id]?.email || 'Alguien')}
                </p>
                <p className="text-xs truncate text-muted-foreground">{previewText(replyTo)}</p>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setReplyTo(null)}><X className="w-4 h-4" /></Button>
            </div>
          )}
          <div className="border-t border-border p-2 flex gap-2 items-center">
            {recording ? (
              <>
                <Button size="icon" variant="ghost" onClick={() => stopRecording(true)} title="Cancelar"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md bg-destructive/10">
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  <span className="text-sm font-mono">{Math.floor(recordingMs / 1000)}s</span>
                  <span className="text-xs text-muted-foreground">Grabando…</span>
                </div>
                <Button onClick={() => stopRecording(false)} title="Enviar audio"><Send className="w-4 h-4" /></Button>
              </>
            ) : (
              <>
                <Input
                  value={draft}
                  onChange={e => { setDraft(e.target.value); if (e.target.value.trim()) broadcastTyping(); }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Escribe un mensaje…"
                />
                {draft.trim() ? (
                  <Button onClick={sendMessage}><Send className="w-4 h-4" /></Button>
                ) : (
                  <Button variant="outline" onClick={startRecording} title="Grabar audio"><Mic className="w-4 h-4" /></Button>
                )}
              </>
            )}
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

const MessageActions = ({ onReply, onEdit, onDelete, canEdit }: {
  onReply: () => void; onEdit?: () => void; onDelete?: () => void; canEdit: boolean;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted/50 self-center" aria-label="Acciones">
        <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={onReply}><Reply className="w-4 h-4 mr-2" />Responder</DropdownMenuItem>
      {onEdit && canEdit && <DropdownMenuItem onClick={onEdit}><Pencil className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>}
      {onDelete && <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="w-4 h-4 mr-2" />Eliminar</DropdownMenuItem>}
    </DropdownMenuContent>
  </DropdownMenu>
);

const AudioPlayer = ({ path, durationMs, mine }: { path: string; durationMs: number; mine: boolean }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await sb.storage.from('chat-audio').createSignedUrl(path, 3600);
      if (!cancelled && data?.signedUrl) setUrl(data.signedUrl);
    })();
    return () => { cancelled = true; };
  }, [path]);
  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); } else { a.play().catch(() => {}); }
  };
  const secs = Math.max(1, Math.round(durationMs / 1000));
  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <button onClick={toggle} disabled={!url} className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0',
        mine ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary text-primary-foreground')}>
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>
      <div className="flex-1">
        <div className={cn('h-1 rounded-full', mine ? 'bg-primary-foreground/30' : 'bg-primary/30')} />
        <span className={cn('text-[10px]', mine ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{secs}s</span>
      </div>
      {url && (
        <audio
          ref={audioRef}
          src={url}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          preload="none"
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
          if (document.visibilityState !== 'visible' || !isActiveRef.current) {
            const { data: prof } = await sb.from('profiles').select('display_name,email').eq('user_id', m.sender_id).maybeSingle();
            const name = prof?.display_name || prof?.email || 'Nuevo mensaje';
            const body = m.attachment_type === 'audio' ? '🎤 Mensaje de voz' : m.content;
            showNotification(name, body);
          }
        }
        refresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_members' }, async (payload: any) => {
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
