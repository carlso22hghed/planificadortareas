import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GraduationCap } from 'lucide-react';

interface ClassroomPromoDialogProps {
  onSync: () => void;
}

const ClassroomPromoDialog = ({ onSync }: ClassroomPromoDialogProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const count = parseInt(localStorage.getItem('classroomPromoCount') || '0', 10);
    const alreadySynced = localStorage.getItem('classroomSynced') === 'true';

    if (count < 2 && !alreadySynced) {
      setOpen(true);
      localStorage.setItem('classroomPromoCount', String(count + 1));
    }
  }, []);

  const handleSync = () => {
    setOpen(false);
    onSync();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="text-2xl">🆕</span> Nuevo
          </DialogTitle>
          <DialogDescription className="text-sm">
            Sincroniza tus tareas con Google Classroom
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
            <GraduationCap className="w-10 h-10 text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Google Classroom</p>
              <p className="text-xs text-muted-foreground">Importa automáticamente tus tareas y deberes de Classroom</p>
            </div>
          </div>

          <Button onClick={handleSync} className="w-full gap-2 h-11 rounded-xl">
            <GraduationCap className="w-4 h-4" />
            Sincronizar con Classroom
          </Button>

          <button
            onClick={() => setOpen(false)}
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
