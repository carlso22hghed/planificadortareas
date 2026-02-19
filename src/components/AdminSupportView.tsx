import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Clock, CheckCircle2, MessageSquareReply, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SupportTicket {
  id: string;
  user_id: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
}

interface Profile {
  user_id: string;
  display_name: string;
  email: string | null;
}

const AdminSupportView = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const { data: tickets = [] } = useQuery({
    queryKey: ['admin_support_tickets'],
    queryFn: async () => {
      const { data } = await supabase
        .from('support_tickets' as any)
        .select('*')
        .order('created_at', { ascending: false });
      return (data as unknown as SupportTicket[]) || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles_for_support'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, display_name, email');
      return (data || []) as Profile[];
    },
  });

  const profileMap = Object.fromEntries(profiles.map(p => [p.user_id, p]));

  const handleReplyAndClose = async (ticketId: string) => {
    const reply = (replyText[ticketId] || '').trim();
    if (!reply) return;
    const { error } = await supabase
      .from('support_tickets' as any)
      .update({ admin_reply: reply, status: 'closed' })
      .eq('id', ticketId);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo enviar la respuesta.', variant: 'destructive' });
    } else {
      toast({ title: '✅ Respondido y cerrado' });
      setReplyText(prev => ({ ...prev, [ticketId]: '' }));
      queryClient.invalidateQueries({ queryKey: ['admin_support_tickets'] });
    }
  };

  const handleReplyAndKeepOpen = async (ticketId: string) => {
    const reply = (replyText[ticketId] || '').trim();
    if (!reply) return;
    const { error } = await supabase
      .from('support_tickets' as any)
      .update({ admin_reply: reply })
      .eq('id', ticketId);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo enviar la respuesta.', variant: 'destructive' });
    } else {
      toast({ title: '✅ Respondido', description: 'El ticket sigue abierto.' });
      setReplyText(prev => ({ ...prev, [ticketId]: '' }));
      queryClient.invalidateQueries({ queryKey: ['admin_support_tickets'] });
    }
  };

  const handleCloseDirectly = async (ticketId: string) => {
    await supabase.from('support_tickets' as any).update({ status: 'closed' }).eq('id', ticketId);
    toast({ title: 'Ticket cerrado' });
    queryClient.invalidateQueries({ queryKey: ['admin_support_tickets'] });
  };

  const handleReopen = async (ticketId: string) => {
    await supabase.from('support_tickets' as any).update({ status: 'open' }).eq('id', ticketId);
    queryClient.invalidateQueries({ queryKey: ['admin_support_tickets'] });
  };

  const openCount = tickets.filter(t => t.status === 'open').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="font-bold text-foreground">💬 Soporte</h2>
        {openCount > 0 && (
          <Badge variant="destructive" className="text-[10px]">{openCount} pendiente{openCount !== 1 ? 's' : ''}</Badge>
        )}
      </div>

      {tickets.length === 0 && (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm text-muted-foreground">No hay tickets de soporte</p>
        </div>
      )}

      {tickets.map(ticket => {
        const profile = profileMap[ticket.user_id];
        const isExpanded = expandedId === ticket.id;
        return (
          <div key={ticket.id} className="glass-card rounded-2xl overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
              className="w-full p-4 text-left flex items-start gap-3"
            >
              {ticket.status === 'closed'
                ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                : <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              }
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-primary truncate">{profile?.display_name || 'Usuario'}</p>
                <p className="text-[10px] text-muted-foreground truncate">{profile?.email}</p>
                <p className="text-sm text-foreground mt-1 line-clamp-2">{ticket.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(ticket.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant="secondary" className={cn('text-[9px] px-1.5', ticket.status === 'closed' ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600')}>
                  {ticket.status === 'closed' ? 'Cerrado' : 'Pendiente'}
                </Badge>
                {isExpanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-border px-4 py-3 space-y-3">
                {ticket.admin_reply && (
                  <div className="bg-primary/5 rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-primary mb-1">Tu respuesta anterior:</p>
                    <p className="text-xs text-foreground">{ticket.admin_reply}</p>
                  </div>
                )}
                <Textarea
                  placeholder="Escribe una respuesta..."
                  value={replyText[ticket.id] || ''}
                  onChange={e => setReplyText(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                  className="resize-none text-sm min-h-[80px]"
                />
                <div className="flex flex-wrap gap-2">
                  {ticket.status === 'open' && (
                    <Button size="sm" variant="destructive" onClick={() => handleCloseDirectly(ticket.id)} className="gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Cerrar
                    </Button>
                  )}
                  <Button size="sm" onClick={() => handleReplyAndClose(ticket.id)} disabled={!replyText[ticket.id]?.trim()} className="gap-1.5">
                    <MessageSquareReply className="w-3.5 h-3.5" />
                    Responder y cerrar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReplyAndKeepOpen(ticket.id)} disabled={!replyText[ticket.id]?.trim()} className="gap-1.5">
                    <MessageSquareReply className="w-3.5 h-3.5" />
                    Responder (abierto)
                  </Button>
                  {ticket.status === 'closed' && (
                    <Button size="sm" variant="outline" onClick={() => handleReopen(ticket.id)}>
                      Reabrir
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AdminSupportView;
