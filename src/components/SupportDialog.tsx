import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, Clock, CheckCircle2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SupportTicket {
  id: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
}

const SupportDialog = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const { data: tickets = [] } = useQuery({
    queryKey: ['support_tickets', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('support_tickets' as any)
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return (data as unknown as SupportTicket[]) || [];
    },
    enabled: !!user && open,
  });

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || trimmed.length < 5) {
      toast({ title: 'Mensaje muy corto', description: 'Escribe al menos 5 caracteres.', variant: 'destructive' });
      return;
    }
    if (trimmed.length > 1000) {
      toast({ title: 'Mensaje muy largo', description: 'Máximo 1000 caracteres.', variant: 'destructive' });
      return;
    }
    setSending(true);
    const { error } = await supabase.from('support_tickets' as any).insert({
      user_id: user!.id,
      message: trimmed,
    });
    setSending(false);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo enviar. Inténtalo de nuevo.', variant: 'destructive' });
    } else {
      toast({ title: 'Enviado', description: 'Tu queja ha sido enviada correctamente.' });
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['support_tickets'] });
    }
  };

  const handleReply = async (ticketId: string) => {
    const trimmed = replyText.trim();
    if (!trimmed || trimmed.length < 3) return;
    setSending(true);
    // Append user reply to the existing message
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    const updatedMessage = `${ticket.message}\n\n--- Respuesta del usuario ---\n${trimmed}`;
    const { error } = await supabase.from('support_tickets' as any)
      .update({ message: updatedMessage, status: 'open' })
      .eq('id', ticketId);
    setSending(false);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo enviar la respuesta.', variant: 'destructive' });
    } else {
      toast({ title: 'Respuesta enviada' });
      setReplyText('');
      setReplyingId(null);
      queryClient.invalidateQueries({ queryKey: ['support_tickets'] });
    }
  };

  const openTickets = tickets.filter(t => t.status === 'open').length;

  return (
    <>
      <button
        onClick={() => setOpen(prev => !prev)}
        className="fixed bottom-20 right-4 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!open && openTickets > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
            {openTickets}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-36 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[70vh] animate-slide-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              <span className="font-bold text-foreground text-sm">Soporte y quejas</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-3 border border-border rounded-xl p-3 bg-muted/30">
              <p className="text-sm font-semibold text-foreground">Nueva queja o sugerencia</p>
              <Textarea
                placeholder="Escribe aquí tu queja, problema o sugerencia..."
                value={message}
                onChange={e => setMessage(e.target.value.slice(0, 1000))}
                className="resize-none min-h-[80px] text-sm"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{message.length}/1000</span>
                <Button size="sm" onClick={handleSend} disabled={sending || message.trim().length < 5} className="gap-1.5">
                  <Send className="w-3.5 h-3.5" />
                  {sending ? 'Enviando...' : 'Enviar'}
                </Button>
              </div>
            </div>

            {tickets.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tus mensajes anteriores</p>
                {tickets.map(ticket => (
                  <div key={ticket.id} className="border border-border rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedId(expandedId === ticket.id ? null : ticket.id)}
                      className="w-full p-3 text-left flex items-start gap-2 hover:bg-muted/30 transition-colors"
                    >
                      {ticket.status === 'closed'
                        ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        : <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground line-clamp-2 leading-snug">{ticket.message.split('\n')[0]}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(ticket.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge
                          variant="secondary"
                          className={cn('text-[9px] px-1.5 py-0', ticket.status === 'closed' ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600')}
                        >
                          {ticket.status === 'closed' ? 'Respondido' : 'Pendiente'}
                        </Badge>
                        {expandedId === ticket.id ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                      </div>
                    </button>
                    {expandedId === ticket.id && (
                      <div className="border-t border-border">
                        {ticket.admin_reply && (
                          <div className="px-3 py-2 bg-primary/5">
                            <p className="text-[10px] font-semibold text-primary mb-1">Respuesta del equipo:</p>
                            <p className="text-xs text-foreground">{ticket.admin_reply}</p>
                          </div>
                        )}
                        {/* User can reply if ticket is still open */}
                        {ticket.status === 'open' && (
                          <div className="px-3 py-2 space-y-2 bg-muted/20">
                            {replyingId === ticket.id ? (
                              <>
                                <Textarea
                                  placeholder="Escribe tu respuesta..."
                                  value={replyText}
                                  onChange={e => setReplyText(e.target.value.slice(0, 500))}
                                  className="resize-none min-h-[60px] text-xs"
                                />
                                <div className="flex gap-2 justify-end">
                                  <Button size="sm" variant="ghost" onClick={() => { setReplyingId(null); setReplyText(''); }} className="text-xs h-7">
                                    Cancelar
                                  </Button>
                                  <Button size="sm" onClick={() => handleReply(ticket.id)} disabled={sending || replyText.trim().length < 3} className="text-xs h-7 gap-1">
                                    <Send className="w-3 h-3" /> Enviar
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => setReplyingId(ticket.id)} className="w-full text-xs h-7">
                                Responder
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tickets.length === 0 && (
              <div className="text-center py-6">
                <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aún no has enviado ningún mensaje</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SupportDialog;
