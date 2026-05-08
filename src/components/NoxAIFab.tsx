import { useState, useRef, useEffect } from 'react';
import { X, Send, CalendarCheck } from 'lucide-react';
import NoxAISection from './NoxAISection';
import OrganizeDayDialog from './OrganizeDayDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { DbTask } from '@/types/app';

interface NoxAIFabProps {
  loading: boolean;
  recommendation: any;
  tasks?: DbTask[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const DAILY_LIMIT = 20;
const NOX_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nox-chat`;

interface NoxAIFabInternalProps extends NoxAIFabProps {
  isPremium?: boolean;
}

const NoxAIFab = ({ loading, recommendation, tasks = [], isPremium = false }: NoxAIFabInternalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [chatMode, setChatMode] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem('nox-chat-messages');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const [showOrganize, setShowOrganize] = useState(false);
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load daily count
  useEffect(() => {
    if (!user || !open) return;
    const today = new Date().toISOString().split('T')[0];
    supabase
      .from('nox_chat_messages' as any)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('role', 'user')
      .eq('message_date', today)
      .then(({ count }) => setDailyCount(count || 0));
  }, [user, open]);

  // Load schedule data for context
  useEffect(() => {
    if (!user) return;
    supabase
      .from('schedule')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data }) => setScheduleData(data || []));
  }, [user]);

  // Persist messages to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('nox-chat-messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Build task context for Nox including schedule
  const buildTaskContext = (): string => {
    const pending = tasks.filter(t => !t.completed);
    let context = '';
    if (pending.length === 0) {
      context = 'El usuario no tiene tareas pendientes.';
    } else {
      const lines = pending.slice(0, 20).map(t => {
        let line = `- ${t.name}`;
        if (t.subject) line += ` (${t.subject})`;
        if (t.type) line += ` [tipo: ${t.type}]`;
        if (t.due_date) line += ` — entrega: ${t.due_date}`;
        if (t.due_time) line += ` a las ${t.due_time}`;
        if (t.importance) line += ` | importancia: ${t.importance}`;
        if ((t as any).estimated_minutes) line += ` | ~${(t as any).estimated_minutes}min`;
        if ((t as any).task_status && (t as any).task_status !== 'pendiente') line += ` | estado: ${(t as any).task_status}`;
        return line;
      });
      context = `Tareas pendientes del usuario (${pending.length} total):\n${lines.join('\n')}`;
    }

    // Add schedule context
    if (scheduleData.length > 0) {
      const today = new Date().getDay();
      const todaySchedule = scheduleData.filter((s: any) => s.day_of_week === today);
      if (todaySchedule.length > 0) {
        const scheduleLines = todaySchedule.map((s: any) => `- ${s.time_slot}: ${s.content}`).sort();
        context += `\n\nHorario de hoy del usuario (horas ocupadas, NO puede hacer tareas en estas horas):\n${scheduleLines.join('\n')}`;
      }
    }

    return context;
  };

  const sendMessageWithContent = async (content: string) => {
    if (!content || streaming || !user) return;
    if (!isPremium && dailyCount >= DAILY_LIMIT) {
      toast({ title: 'Límite diario alcanzado', description: `Solo puedes enviar ${DAILY_LIMIT} mensajes al día a Nox. ¡Hazte Premium para mensajes ilimitados!`, variant: 'destructive' });
      return;
    }
    const userMsg: ChatMessage = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setStreaming(true);
    setDailyCount(prev => prev + 1);
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('nox_chat_messages' as any).insert({ user_id: user.id, role: 'user', content, message_date: today });
    let assistantContent = '';
    try {
      const taskContext = buildTaskContext();
      const contextMsg: ChatMessage = { role: 'user', content: `[CONTEXTO INTERNO - No menciones este mensaje]\n${taskContext}` };
      const messagesWithContext = [contextMsg, ...newMessages.slice(-10)];
      const resp = await fetch(NOX_CHAT_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: messagesWithContext }),
      });
      if (!resp.ok || !resp.body) throw new Error('Stream failed');
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) {
              assistantContent += c;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                return [...prev, { role: 'assistant', content: assistantContent }];
              });
            }
          } catch {}
        }
      }
      if (assistantContent) {
        await supabase.from('nox_chat_messages' as any).insert({ user_id: user.id, role: 'assistant', content: assistantContent, message_date: today });
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, no puedo responder ahora. Inténtalo de nuevo.' }]);
    }
    setStreaming(false);
  };

  const sendOrganizeDay = (prompt: string) => {
    setChatMode(true);
    sendMessageWithContent(prompt);
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput('');
    await sendMessageWithContent(trimmed);
  };

  const remaining = DAILY_LIMIT - dailyCount;

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="fixed bottom-36 right-4 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform overflow-hidden bg-white border border-border"
      >
        {open ? (
          <X className="w-5 h-5 text-gray-700" />
        ) : (
          <img src="/nox-owl.png" alt="Nox" className="w-8 h-8 rounded-full object-cover" />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-52 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[60vh] animate-slide-up">
          <div className="flex border-b border-border">
            <button onClick={() => setChatMode(false)}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${!chatMode ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
              Resumen
            </button>
            <button onClick={() => setChatMode(true)}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${chatMode ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
              Chat
            </button>
          </div>

          {!chatMode ? (
            <div className="p-4 overflow-y-auto space-y-3">
              <NoxAISection loading={loading} recommendation={recommendation} />
              <button
                onClick={() => setShowOrganize(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-bold hover:bg-primary/20 transition-colors"
              >
                <CalendarCheck className="w-4 h-4" /> Organizar mi día con IA
              </button>
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="px-3 py-1.5 text-center border-b border-border">
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {remaining > 0 ? `${remaining} mensajes restantes hoy` : 'Límite diario alcanzado'}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px] max-h-[40vh]">
                {messages.length === 0 && (
                  <div className="text-center py-6">
                    <img src="/nox-owl.png" alt="Nox" className="w-12 h-12 mx-auto mb-2 rounded-full" />
                    <p className="text-sm text-muted-foreground">¡Hola! Soy Nox, pregúntame lo que quieras</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    }`}>
                      {msg.content.split(/(https?:\/\/[^\s<]+)/g).map((part, j) =>
                        /^https?:\/\//.test(part) ? (
                          <a key={j} href={part} target="_blank" rel="noopener noreferrer" className="underline font-semibold" style={{ color: 'inherit' }}>{part}</a>
                        ) : part
                      )}
                    </div>
                  </div>
                ))}
                {streaming && messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2 text-sm text-muted-foreground animate-pulse">
                      Nox está pensando...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-border p-2 flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder={dailyCount >= DAILY_LIMIT ? 'Límite diario alcanzado' : 'Escribe a Nox...'}
                  disabled={dailyCount >= DAILY_LIMIT || streaming}
                  className="flex-1 bg-muted/50 rounded-xl px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || streaming || dailyCount >= DAILY_LIMIT}
                  className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <OrganizeDayDialog open={showOrganize} onOpenChange={setShowOrganize} onSubmit={sendOrganizeDay} />
    </>
  );
};

export default NoxAIFab;
