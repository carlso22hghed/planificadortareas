import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Download } from 'lucide-react';
import InstallAppButton from '@/components/InstallAppButton';

interface ClassroomPromoDialogProps {
  onSync?: () => void;
}

// Show promo until June 30, 2026 (inclusive). Hide from July 1, 2026 onwards.
const PROMO_END = new Date('2026-07-01T00:00:00');

const ClassroomPromoDialog = (_props: ClassroomPromoDialogProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (new Date() >= PROMO_END) return;
    const dismissed = localStorage.getItem('installPromoDismissed') === 'true';
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      // @ts-ignore - iOS Safari
      window.navigator.standalone === true;
    if (dismissed || isStandalone) return;
    setOpen(true);
  }, []);

  const handleClose = () => {
    localStorage.setItem('installPromoDismissed', 'true');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="text-2xl">🆕</span> Nueva función
          </DialogTitle>
          <DialogDescription className="text-sm">
            Instalar Planificador Tareas
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/20">
            <Download className="w-10 h-10 text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Planificador Tareas en tu dispositivo</p>
              <p className="text-xs text-muted-foreground">Acceso rápido desde tu pantalla de inicio, como una app nativa.</p>
            </div>
          </div>

          <InstallAppButton label="Instalar app" className="w-full h-11 rounded-xl" variant="default" />

          <button
            onClick={handleClose}
            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            Ahora no
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClassroomPromoDialog;
