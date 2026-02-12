import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DbCountdown } from '@/types/app';

interface EditCountdownDialogProps {
  countdown: DbCountdown | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (countdown: DbCountdown) => void;
}

const EditCountdownDialog = ({ countdown, open, onOpenChange, onSave }: EditCountdownDialogProps) => {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => {
    if (countdown) {
      setName(countdown.name);
      setDate(countdown.target_date);
      setTime(countdown.target_time);
    }
  }, [countdown]);

  if (!countdown) return null;

  const handleSave = () => {
    if (!name || !date) return;
    onSave({ ...countdown, name, target_date: date, target_time: time || '00:00' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Contador</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Nombre</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Hora</Label>
            <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
          <Button onClick={handleSave} className="w-full" disabled={!name || !date}>
            Guardar cambios
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditCountdownDialog;
