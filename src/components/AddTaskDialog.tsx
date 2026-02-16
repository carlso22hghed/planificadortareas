import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus } from 'lucide-react';
import type { DbTask } from '@/types/app';
import { SPORT_EMOJIS } from '@/types/app';
import { toast } from '@/hooks/use-toast';

interface AddTaskDialogProps {
  type: DbTask['type'];
  onAdd: (task: Partial<DbTask>) => void;
  triggerLabel: string;
  subjects?: string[];
  sportTypes?: string[];
}

const typeLabels: Record<string, string> = {
  homework: 'Deber', exam: 'Examen', event: 'Evento', match: 'Partido', task: 'Tarea',
};

const dateLabels: Record<string, string> = {
  homework: 'Día de entrega', exam: 'Día del examen', event: 'Día del evento',
  match: 'Día del partido', task: 'Día de entrega',
};

const timeLabels: Record<string, string> = {
  homework: 'Hora de entrega', exam: 'Hora del examen', event: 'Hora del evento',
  match: 'Hora del partido', task: 'Hora de entrega',
};

const AddTaskDialog = ({ type, onAdd, triggerLabel, subjects = [], sportTypes = [] }: AddTaskDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [subject, setSubject] = useState('');
  const [rival, setRival] = useState('');
  const [homeAway, setHomeAway] = useState<'home' | 'away'>('home');
  const [sportType, setSportType] = useState(sportTypes[0] || 'Fútbol');
  const [location, setLocation] = useState('');

  const showSubjects = (type === 'homework' || type === 'exam') && subjects.length > 0;
  const showMatchFields = type === 'match';
  const showLocation = type === 'event';

  const handleNotificationToggle = async (checked: boolean) => {
    if (!checked) { setNotificationsEnabled(false); return; }
    if (!('Notification' in window)) {
      toast({ title: 'No soportado', description: 'Tu navegador no soporta notificaciones.', variant: 'destructive' });
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        toast({ title: '🔔 Notificaciones activadas', description: 'Recibirás recordatorios.' });
      } else {
        toast({
          title: 'Notificaciones bloqueadas',
          description: 'Actívalas en la configuración de tu navegador.',
          variant: 'destructive',
        });
        setNotificationsEnabled(false);
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudieron activar las notificaciones.', variant: 'destructive' });
      setNotificationsEnabled(false);
    }
  };

  const handleSubmit = () => {
    if (!name || !dueDate) return;
    if (notificationsEnabled && reminderTime && !reminderDate) return;

    const taskData: Partial<DbTask> = {
      name,
      due_date: dueDate,
      due_time: dueTime || null,
      reminder_time: notificationsEnabled && reminderTime ? reminderTime : null,
      completed: false,
      type,
      subject: showSubjects && subject ? subject : null,
      rival: showMatchFields && rival ? rival : null,
      home_away: showMatchFields ? homeAway : null,
      sport_type: showMatchFields ? sportType : null,
    } as any;

    if (showLocation && location) (taskData as any).location = location;
    if (notificationsEnabled && reminderDate) (taskData as any).reminder_date = reminderDate;

    // Schedule notification
    if (notificationsEnabled && reminderTime && reminderDate && 'Notification' in window && Notification.permission === 'granted') {
      const reminderDateObj = new Date(`${reminderDate}T${reminderTime}:00`);
      const delay = reminderDateObj.getTime() - Date.now();
      if (delay > 0) {
        setTimeout(() => {
          new Notification(`📚 Recordatorio: ${name}`, {
            body: `${typeLabels[type]} para ${new Date(dueDate).toLocaleDateString('es-ES')}`,
            icon: '/logo.png',
          });
          try {
            const audio = new Audio('/notification-sound.mp3');
            audio.volume = 0.7;
            audio.play().catch(() => {});
          } catch {}
        }, delay);
      }
    }

    onAdd(taskData);
    setName(''); setDueDate(''); setDueTime(''); setReminderTime(''); setReminderDate('');
    setNotificationsEnabled(false); setSubject(''); setRival(''); setLocation('');
    setHomeAway('home'); setSportType(sportTypes[0] || 'Fútbol');
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
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={`Nombre del ${typeLabels[type].toLowerCase()}`} />
          </div>

          {showSubjects && (
            <div>
              <Label>Asignatura</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger><SelectValue placeholder="Selecciona asignatura" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {showLocation && (
            <div>
              <Label>📍 Lugar del evento</Label>
              <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Ej: Salón de actos" />
            </div>
          )}

          {showMatchFields && (
            <>
              <div>
                <Label>Rival</Label>
                <Input value={rival} onChange={e => setRival(e.target.value)} placeholder="Nombre del equipo rival" />
              </div>
              {sportTypes.length > 1 && (
                <div>
                  <Label>Deporte</Label>
                  <Select value={sportType} onValueChange={setSportType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {sportTypes.map(s => <SelectItem key={s} value={s}>{SPORT_EMOJIS[s] || '🏅'} {s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Localización</Label>
                <RadioGroup value={homeAway} onValueChange={v => setHomeAway(v as 'home' | 'away')} className="flex gap-4 mt-1">
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
            <Label>{dateLabels[type] || 'Fecha'}</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div>
            <Label>{timeLabels[type] || 'Hora'} (opcional)</Label>
            <Input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <Label className="cursor-pointer">¿Activar recordatorio?</Label>
            <Switch checked={notificationsEnabled} onCheckedChange={handleNotificationToggle} />
          </div>
          {notificationsEnabled && (
            <div className="animate-slide-up space-y-3">
              <div>
                <Label>📅 Fecha del recordatorio</Label>
                <Input type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)} />
              </div>
              <div>
                <Label>🕐 Hora del recordatorio</Label>
                <Input type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)} />
              </div>
              {reminderTime && !reminderDate && (
                <p className="text-xs text-destructive">Debes poner la fecha del recordatorio</p>
              )}
            </div>
          )}
          <Button onClick={handleSubmit} className="w-full" disabled={!name || !dueDate || (notificationsEnabled && reminderTime && !reminderDate ? true : false)}>
            Añadir {typeLabels[type].toLowerCase()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddTaskDialog;
