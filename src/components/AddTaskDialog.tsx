import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus } from 'lucide-react';
import type { Task } from '@/types/app';
import { toast } from '@/hooks/use-toast';

interface AddTaskDialogProps {
  type: Task['type'];
  onAdd: (task: Task) => void;
  triggerLabel: string;
}

const typeLabels: Record<Task['type'], string> = {
  homework: 'Deber',
  exam: 'Examen',
  event: 'Evento',
  match: 'Partido',
};

const AddTaskDialog = ({ type, onAdd, triggerLabel }: AddTaskDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const handleNotificationToggle = async (checked: boolean) => {
    if (checked && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        toast({ title: '🔔 Notificaciones activadas', description: 'Recibirás recordatorios.' });
      } else {
        toast({ title: 'Notificaciones bloqueadas', description: 'Actívalas en la configuración del navegador.', variant: 'destructive' });
        setNotificationsEnabled(false);
      }
    } else {
      setNotificationsEnabled(false);
    }
  };

  const handleSubmit = () => {
    if (!name || !dueDate) return;

    const task: Task = {
      id: crypto.randomUUID(),
      name,
      dueDate,
      dueTime: dueTime || undefined,
      reminderTime: notificationsEnabled && reminderTime ? reminderTime : undefined,
      completed: false,
      type,
    };

    // Schedule notification if enabled
    if (notificationsEnabled && reminderTime && dueDate) {
      const reminderDate = new Date(`${dueDate}T${reminderTime}:00`);
      const now = new Date();
      const delay = reminderDate.getTime() - now.getTime();
      if (delay > 0) {
        setTimeout(() => {
          new Notification(`📚 Recordatorio: ${name}`, {
            body: `${typeLabels[type]} para ${new Date(dueDate).toLocaleDateString('es-ES')}`,
            icon: '/favicon.ico',
          });
        }, delay);
      }
    }

    onAdd(task);
    setName('');
    setDueDate('');
    setDueTime('');
    setReminderTime('');
    setNotificationsEnabled(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-full">
          <Plus className="w-4 h-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo {typeLabels[type]}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Nombre del ${typeLabels[type].toLowerCase()}`} />
          </div>
          <div>
            <Label>Día de entrega</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <Label>Hora de entrega (opcional)</Label>
            <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <Label className="cursor-pointer">¿Activar recordatorio?</Label>
            <Switch checked={notificationsEnabled} onCheckedChange={handleNotificationToggle} />
          </div>
          {notificationsEnabled && (
            <div className="animate-slide-up">
              <Label>Hora del recordatorio</Label>
              <Input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
            </div>
          )}
          <Button onClick={handleSubmit} className="w-full" disabled={!name || !dueDate}>
            Añadir {typeLabels[type].toLowerCase()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddTaskDialog;
