import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus } from 'lucide-react';
import type { Task } from '@/types/app';
import { toast } from '@/hooks/use-toast';

interface AddTaskDialogProps {
  type: Task['type'];
  onAdd: (task: Task) => void;
  triggerLabel: string;
  subjects?: string[];
}

const typeLabels: Record<Task['type'], string> = {
  homework: 'Deber',
  exam: 'Examen',
  event: 'Evento',
  match: 'Partido',
  task: 'Tarea',
};

const AddTaskDialog = ({ type, onAdd, triggerLabel, subjects = [] }: AddTaskDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [subject, setSubject] = useState('');
  const [rival, setRival] = useState('');
  const [homeAway, setHomeAway] = useState<'home' | 'away'>('home');

  const showSubjects = (type === 'homework' || type === 'exam') && subjects.length > 0;
  const showMatchFields = type === 'match';

  const handleNotificationToggle = async (checked: boolean) => {
    if (checked && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setNotificationsEnabled(true);
          toast({ title: '🔔 Notificaciones activadas', description: 'Recibirás recordatorios.' });
        } else if (permission === 'denied') {
          toast({ title: 'Notificaciones bloqueadas', description: 'Ve a la configuración de tu navegador, busca los permisos de este sitio y permite las notificaciones.', variant: 'destructive' });
          setNotificationsEnabled(false);
        } else {
          // default - user dismissed, don't show error
          setNotificationsEnabled(false);
        }
      } catch {
        toast({ title: 'Error', description: 'No se pudieron activar las notificaciones.', variant: 'destructive' });
        setNotificationsEnabled(false);
      }
    } else if (!('Notification' in window)) {
      toast({ title: 'No soportado', description: 'Tu navegador no soporta notificaciones.', variant: 'destructive' });
      setNotificationsEnabled(false);
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
      subject: showSubjects && subject ? subject : undefined,
      rival: showMatchFields && rival ? rival : undefined,
      homeAway: showMatchFields ? homeAway : undefined,
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
    setSubject('');
    setRival('');
    setHomeAway('home');
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo {typeLabels[type]}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Nombre del ${typeLabels[type].toLowerCase()}`} />
          </div>

          {showSubjects && (
            <div>
              <Label>Asignatura</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona asignatura" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showMatchFields && (
            <>
              <div>
                <Label>Rival</Label>
                <Input value={rival} onChange={(e) => setRival(e.target.value)} placeholder="Nombre del equipo rival" />
              </div>
              <div>
                <Label>Localización</Label>
                <RadioGroup value={homeAway} onValueChange={(v) => setHomeAway(v as 'home' | 'away')} className="flex gap-4 mt-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="home" id="home" />
                    <Label htmlFor="home" className="cursor-pointer">🏠 Casa</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="away" id="away" />
                    <Label htmlFor="away" className="cursor-pointer">✈️ Fuera</Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}

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
