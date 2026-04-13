import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Paperclip, X, Repeat } from 'lucide-react';
import type { DbTask } from '@/types/app';
import { SPORT_EMOJIS } from '@/types/app';
import { getSportEmoji } from '@/lib/sport-emojis';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';

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
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [importance, setImportance] = useState('normal');
  const [customImportance, setCustomImportance] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [reminderFrequency, setReminderFrequency] = useState<number>(0);
  const [subject, setSubject] = useState('');
  const [rival, setRival] = useState('');
  const [homeAway, setHomeAway] = useState<'home' | 'away'>('home');
  const [sportType, setSportType] = useState(sportTypes[0] || 'Fútbol');
  const [location, setLocation] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState('none');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showSubjects = (type === 'homework' || type === 'exam') && subjects.length > 0;
  const showMatchFields = type === 'match';
  const showLocation = type === 'event';
  const showImportance = type !== 'match' && type !== 'event';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast({ title: 'Archivo demasiado grande', description: 'Máximo 10MB por archivo', variant: 'destructive' });
          continue;
        }
        const ext = file.name.split('.').pop();
        const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('task-attachments').upload(path, file);
        if (error) {
          toast({ title: 'Error al subir', description: error.message, variant: 'destructive' });
        } else {
          const { data: urlData } = supabase.storage.from('task-attachments').getPublicUrl(path);
          setAttachments(prev => [...prev, urlData.publicUrl]);
        }
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

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
        toast({ title: 'Notificaciones activadas', description: 'Recibirás recordatorios.' });
      } else {
        toast({ title: 'Notificaciones bloqueadas', description: 'Actívalas en la configuración de tu navegador.', variant: 'destructive' });
        setNotificationsEnabled(false);
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudieron activar las notificaciones.', variant: 'destructive' });
      setNotificationsEnabled(false);
    }
  };

  const handleSubmit = () => {
    if (!name) return;
    if (notificationsEnabled && reminderTime && !reminderDate) return;

    const finalImportance = importance === 'otro' ? (customImportance || 'normal') : importance;

    const taskData: Partial<DbTask> = {
      name,
      due_date: dueDate || null,
      due_time: dueTime || null,
      reminder_time: notificationsEnabled && reminderTime ? reminderTime : null,
      completed: false,
      type,
      subject: showSubjects && subject ? subject : null,
      rival: showMatchFields && rival ? rival : null,
      home_away: showMatchFields ? homeAway : null,
      sport_type: showMatchFields ? sportType : null,
    } as any;

    if (description) (taskData as any).description = description;
    if (showImportance && finalImportance !== 'normal') (taskData as any).importance = finalImportance;
    if (showLocation && location) (taskData as any).location = location;
    if (notificationsEnabled && reminderDate) (taskData as any).reminder_date = reminderDate;
    if (notificationsEnabled && reminderFrequency > 0) (taskData as any).reminder_frequency = reminderFrequency;
    if (attachments.length > 0) (taskData as any).attachments = attachments;
    if (recurrenceRule && recurrenceRule !== 'none') (taskData as any).recurrence_rule = recurrenceRule;
    if (estimatedMinutes && parseInt(estimatedMinutes) > 0) (taskData as any).estimated_minutes = parseInt(estimatedMinutes);

    onAdd(taskData);
    setName(''); setDescription(''); setImportance('normal'); setCustomImportance('');
    setDueDate(''); setDueTime(''); setReminderTime(''); setReminderDate('');
    setNotificationsEnabled(false); setReminderFrequency(0); setSubject(''); setRival(''); setLocation('');
    setHomeAway('home'); setSportType(sportTypes[0] || 'Fútbol');
    setAttachments([]); setRecurrenceRule('none'); setEstimatedMinutes('');
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

          <div>
            <Label>Descripción (opcional)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe la tarea..." className="resize-none" rows={2} />
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

          {showImportance && (
            <div>
              <Label>Importancia</Label>
              <Select value={importance} onValueChange={setImportance}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="importante">❗ Importante</SelectItem>
                  <SelectItem value="urgente">🔴 Urgente</SelectItem>
                  <SelectItem value="voluntario">💚 Voluntario</SelectItem>
                  <SelectItem value="otro">✏️ Otro</SelectItem>
                </SelectContent>
              </Select>
              {importance === 'otro' && (
                <Input value={customImportance} onChange={e => setCustomImportance(e.target.value)} placeholder="Escribe la importancia" className="mt-2" />
              )}
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
                      {sportTypes.map(s => <SelectItem key={s} value={s}>{SPORT_EMOJIS[s] || getSportEmoji(s)} {s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Localización</Label>
                <RadioGroup value={homeAway} onValueChange={v => setHomeAway(v as 'home' | 'away')} className="flex gap-4 mt-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="home" id="home" />
                    <Label htmlFor="home" className="cursor-pointer">Casa</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="away" id="away" />
                    <Label htmlFor="away" className="cursor-pointer">Fuera</Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}

          <div>
            <Label>{dateLabels[type] || 'Fecha'} (opcional)</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div>
            <Label>{timeLabels[type] || 'Hora'} (opcional)</Label>
            <Input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} />
          </div>

          {/* Estimated time */}
          <div>
            <Label>⏱️ Tiempo estimado (minutos, opcional)</Label>
            <Input type="number" value={estimatedMinutes} onChange={e => setEstimatedMinutes(e.target.value)} placeholder="Ej: 45" min="1" />
          </div>

          {/* Recurrence */}
          <div>
            <Label className="flex items-center gap-1"><Repeat className="w-3.5 h-3.5" /> Repetir (opcional)</Label>
            <Select value={recurrenceRule} onValueChange={setRecurrenceRule}>
              <SelectTrigger><SelectValue placeholder="Sin repetición" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin repetición</SelectItem>
                <SelectItem value="daily">Cada día</SelectItem>
                <SelectItem value="weekly_monday">Cada lunes</SelectItem>
                <SelectItem value="weekly_tuesday">Cada martes</SelectItem>
                <SelectItem value="weekly_wednesday">Cada miércoles</SelectItem>
                <SelectItem value="weekly_thursday">Cada jueves</SelectItem>
                <SelectItem value="weekly_friday">Cada viernes</SelectItem>
                <SelectItem value="weekly">Cada semana (mismo día)</SelectItem>
                <SelectItem value="biweekly">Cada 2 semanas</SelectItem>
                <SelectItem value="monthly">Cada mes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File attachments */}
          <div>
            <Label className="flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" /> Adjuntar archivos</Label>
            <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt" className="hidden" onChange={handleFileUpload} />
            <Button type="button" variant="outline" size="sm" className="w-full gap-2 mt-1" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Paperclip className="w-4 h-4" />
              {uploading ? 'Subiendo...' : 'Seleccionar archivos'}
            </Button>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {attachments.map((url, i) => (
                  <div key={i} className="flex items-center gap-1 bg-muted/50 rounded-lg px-2 py-1 text-xs">
                    <Paperclip className="w-3 h-3" />
                    <span className="max-w-[120px] truncate">Archivo {i + 1}</span>
                    <button onClick={() => removeAttachment(i)} className="text-destructive"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
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
              <div>
                <Label>🔁 Frecuencia de repetición</Label>
                <Select value={String(reminderFrequency)} onValueChange={v => setReminderFrequency(Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Sin repetición" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sin repetición</SelectItem>
                    <SelectItem value="5">Cada 5 minutos</SelectItem>
                    <SelectItem value="10">Cada 10 minutos</SelectItem>
                    <SelectItem value="15">Cada 15 minutos</SelectItem>
                    <SelectItem value="30">Cada 30 minutos</SelectItem>
                    <SelectItem value="60">Cada 1 hora</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {reminderTime && !reminderDate && (
                <p className="text-xs text-destructive">Debes poner la fecha del recordatorio</p>
              )}
            </div>
          )}
          <Button onClick={handleSubmit} className="w-full" disabled={!name || uploading || (notificationsEnabled && reminderTime && !reminderDate ? true : false)}>
            Añadir {typeLabels[type].toLowerCase()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddTaskDialog;