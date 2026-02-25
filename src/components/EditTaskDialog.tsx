import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { DbTask } from '@/types/app';
import { SPORT_EMOJIS } from '@/types/app';
import { getSportEmoji } from '@/lib/sport-emojis';

interface EditTaskDialogProps {
  task: DbTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (task: DbTask) => void;
  subjects?: string[];
  sportTypes?: string[];
}

const dateLabels: Record<string, string> = {
  homework: 'Día de entrega', exam: 'Día del examen', event: 'Día del evento',
  match: 'Día del partido', task: 'Día de entrega',
};
const timeLabels: Record<string, string> = {
  homework: 'Hora de entrega', exam: 'Hora del examen', event: 'Hora del evento',
  match: 'Hora del partido', task: 'Hora de entrega',
};

const EditTaskDialog = ({ task, open, onOpenChange, onSave, subjects = [], sportTypes = [] }: EditTaskDialogProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [importance, setImportance] = useState('normal');
  const [customImportance, setCustomImportance] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [subject, setSubject] = useState('');
  const [rival, setRival] = useState('');
  const [homeAway, setHomeAway] = useState<string>('home');
  const [sportType, setSportType] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    if (task) {
      setName(task.name);
      setDescription((task as any).description || '');
      const imp = (task as any).importance || 'normal';
      const knownValues = ['normal', 'importante', 'urgente', 'voluntario'];
      if (knownValues.includes(imp)) {
        setImportance(imp);
        setCustomImportance('');
      } else {
        setImportance('otro');
        setCustomImportance(imp);
      }
      setDueDate(task.due_date || '');
      setDueTime(task.due_time || '');
      setSubject(task.subject || '');
      setRival(task.rival || '');
      setHomeAway(task.home_away || 'home');
      setSportType(task.sport_type || 'Fútbol');
      setLocation((task as any).location || '');
    }
  }, [task]);

  if (!task) return null;

  const showSubjects = (task.type === 'homework' || task.type === 'exam') && subjects.length > 0;
  const showMatchFields = task.type === 'match';
  const showLocation = task.type === 'event';
  const showImportance = task.type !== 'match' && task.type !== 'event';

  const handleSave = () => {
    if (!name) return;
    const finalImportance = importance === 'otro' ? (customImportance || 'normal') : importance;
    const updated = {
      ...task,
      name,
      due_date: dueDate || null,
      due_time: dueTime || null,
      subject: showSubjects && subject ? subject : null,
      rival: showMatchFields && rival ? rival : null,
      home_away: showMatchFields ? homeAway : null,
      sport_type: showMatchFields ? sportType : task.sport_type,
      description: description || null,
      importance: showImportance ? finalImportance : 'normal',
    } as any;
    if (showLocation) updated.location = location || null;
    onSave(updated);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Nombre</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
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
                <Input value={rival} onChange={e => setRival(e.target.value)} />
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
                <RadioGroup value={homeAway} onValueChange={setHomeAway} className="flex gap-4 mt-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="home" id="edit-home" />
                    <Label htmlFor="edit-home" className="cursor-pointer">🏠 Casa</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="away" id="edit-away" />
                    <Label htmlFor="edit-away" className="cursor-pointer">✈️ Fuera</Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}

          <div>
            <Label>{dateLabels[task.type] || 'Fecha'} (opcional)</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div>
            <Label>{timeLabels[task.type] || 'Hora'} (opcional)</Label>
            <Input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} />
          </div>

          <Button onClick={handleSave} className="w-full" disabled={!name}>
            Guardar cambios
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditTaskDialog;
