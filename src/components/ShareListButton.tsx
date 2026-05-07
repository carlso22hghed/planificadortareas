import { useState } from 'react';
import { Share2, Copy, Check, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ShareListButton = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shares, setShares] = useState<any[]>([]);
  const [listType, setListType] = useState('all');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState('');
  const [open, setOpen] = useState(false);

  const loadShares = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('shared_lists' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setShares(data || []);
  };

  const createShare = async () => {
    if (!user) return;
    setCreating(true);
    const { data, error } = await supabase
      .from('shared_lists' as any)
      .insert({ user_id: user.id, list_type: listType } as any)
      .select()
      .single();
    if (data) {
      setShares(prev => [data, ...prev]);
      const url = `${window.location.origin}/shared/${(data as any).share_token}`;
      await navigator.clipboard.writeText(url);
      toast({ title: '¡Enlace creado y copiado!' });
    }
    if (error) toast({ title: 'Error al crear enlace', variant: 'destructive' });
    setCreating(false);
  };

  const deleteShare = async (id: string) => {
    await supabase.from('shared_lists' as any).delete().eq('id', id);
    setShares(prev => prev.filter(s => s.id !== id));
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(''), 2000);
  };

  const typeLabels: Record<string, string> = {
    all: 'Todas', homework: 'Deberes', exam: 'Exámenes', task: 'Tareas', event: 'Eventos', match: 'Partidos',
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) loadShares(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs">
          <Share2 className="w-3.5 h-3.5" /> Compartir
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Share2 className="w-5 h-5" /> Compartir listas</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Select value={listType} onValueChange={setListType}>
              <SelectTrigger className="flex-1 rounded-xl text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las tareas</SelectItem>
                <SelectItem value="homework">Solo deberes</SelectItem>
                <SelectItem value="exam">Solo exámenes</SelectItem>
                <SelectItem value="task">Solo tareas</SelectItem>
                <SelectItem value="event">Solo eventos</SelectItem>
                <SelectItem value="match">Solo partidos</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={createShare} disabled={creating} className="rounded-xl text-sm">
              {creating ? '...' : 'Crear enlace'}
            </Button>
          </div>

          {shares.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase">Enlaces activos</p>
              {shares.map((s: any) => (
                <div key={s.id} className="flex items-center gap-2 p-2 rounded-xl bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">{typeLabels[s.list_type] || s.list_type}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{s.share_token}</p>
                  </div>
                  <button onClick={() => copyLink(s.share_token)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                    {copied === s.share_token ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                  <button onClick={() => deleteShare(s.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground text-center">
            Quien tenga el enlace podrá ver tus tareas en tiempo real sin necesitar cuenta.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareListButton;
