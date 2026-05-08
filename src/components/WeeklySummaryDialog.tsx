import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trophy, CheckCircle, Clock, TrendingUp } from 'lucide-react';

interface WeeklySummaryProps {
  completed: number;
  pending: number;
  bestDay: string;
  total: number;
}

const WeeklySummaryDialog = ({ completed, pending, bestDay, total }: WeeklySummaryProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const now = new Date();
    if (now.getDay() !== 1) return; // Only Monday
    const key = 'weekly-summary-shown';
    const lastShown = localStorage.getItem(key);
    const thisMonday = new Date(now);
    thisMonday.setHours(0, 0, 0, 0);
    if (lastShown && new Date(lastShown) >= thisMonday) return;
    if (total === 0) return;
    const timer = setTimeout(() => {
      setOpen(true);
      localStorage.setItem(key, now.toISOString());
    }, 2000);
    return () => clearTimeout(timer);
  }, [total]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Trophy className="w-6 h-6 text-yellow-500" /> Resumen semanal
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-foreground/80 text-center">
            ¡Esta semana lograste completar <span className="font-extrabold text-primary">{completed}</span> tareas
            {pending > 0 && <>, tienes <span className="font-extrabold text-warning">{pending}</span> pendientes</>}
            {bestDay && <> y tu día más productivo fue el <span className="font-extrabold text-success">{bestDay}</span></>}!
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-3 rounded-xl bg-primary/10">
              <CheckCircle className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-xl font-extrabold text-primary">{completed}</p>
              <p className="text-[9px] text-muted-foreground">Completadas</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-warning/10">
              <Clock className="w-5 h-5 mx-auto text-warning mb-1" />
              <p className="text-xl font-extrabold text-warning">{pending}</p>
              <p className="text-[9px] text-muted-foreground">Pendientes</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-success/10">
              <TrendingUp className="w-5 h-5 mx-auto text-success mb-1" />
              <p className="text-xl font-extrabold text-success">{bestDay}</p>
              <p className="text-[9px] text-muted-foreground">Mejor día</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
            ¡A por esta semana!
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WeeklySummaryDialog;
