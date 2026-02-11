import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import type { CountdownEvent } from '@/types/app';

interface AddCountdownDialogProps {
  onAdd: (event: CountdownEvent) => void;
}

const AddCountdownDialog = ({ onAdd }: AddCountdownDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('Vacaciones de Verano');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('14:00');

  const handleSubmit = () => {
    if (!name || !date) return;
    onAdd({
      id: crypto.randomUUID(),
      name,
      targetDate: date,
      targetTime: time,
    });
    setName('Vacaciones de Verano');
    setDate('');
    setTime('14:00');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 rounded-full border-dashed">
          <Plus className="w-4 h-4" />
          Añadir contador
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Contador</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label htmlFor="countdown-name">Nombre del evento</Label>
            <Input id="countdown-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vacaciones de Verano" />
          </div>
          <div>
            <Label htmlFor="countdown-date">Fecha</Label>
            <Input id="countdown-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="countdown-time">Hora</Label>
            <Input id="countdown-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <Button onClick={handleSubmit} className="w-full" disabled={!name || !date}>
            Crear contador
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddCountdownDialog;
