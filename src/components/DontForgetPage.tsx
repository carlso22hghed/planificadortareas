import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus } from 'lucide-react';

const DontForgetPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newItem, setNewItem] = useState('');
  const [showInput, setShowInput] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: ['dont-forget', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('dont_forget').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const addItem = async () => {
    if (!newItem.trim() || !user) return;
    await supabase.from('dont_forget').insert({ content: newItem.trim(), user_id: user.id });
    queryClient.invalidateQueries({ queryKey: ['dont-forget'] });
    setNewItem('');
    setShowInput(false);
  };

  const deleteItem = async (id: string) => {
    await supabase.from('dont_forget').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['dont-forget'] });
  };

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-foreground text-lg">🚨 ¡No olvidar!</h2>
        <Button
          onClick={() => setShowInput(!showInput)}
          className="gap-2 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
        >
          <Plus className="w-4 h-4" />
          ¡NO OLVIDAR!
        </Button>
      </div>

      {showInput && (
        <div className="glass-card rounded-2xl p-4 animate-slide-up">
          <Input
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            placeholder="¿Qué no puedes olvidar?"
            onKeyDown={e => e.key === 'Enter' && addItem()}
            autoFocus
          />
          <div className="flex gap-2 mt-3">
            <Button onClick={addItem} className="flex-1" disabled={!newItem.trim()}>Añadir</Button>
            <Button variant="outline" onClick={() => { setShowInput(false); setNewItem(''); }}>Cancelar</Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="glass-card rounded-2xl p-6 text-center">
          <p className="text-3xl mb-2">✅</p>
          <p className="text-sm text-muted-foreground">No tienes nada pendiente por recordar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item: any) => (
            <div key={item.id} className="glass-card rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="flex-1">
                <p className="font-semibold text-sm text-destructive">🚨 {item.content}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(item.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button onClick={() => deleteItem(item.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DontForgetPage;
