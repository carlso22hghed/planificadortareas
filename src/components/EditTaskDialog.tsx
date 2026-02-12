import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { DbTask } from '@/types/app';

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
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [subject, setSubject] = useState('');
  const [rival, setRival] = useState('');
  const [homeAway, setHomeAway] = useState<string>('home');
  const [sportType, setSportType] = useState('');

  useEffect(() => {
    if (task) {
      setName(task.name);
      setDueDate(task.due_date);
      setDueTime(task.due_time || '');
      setSubject(task.subject || '');
      setRival(task.rival || '');
      setHomeAway(task.home_away || 'home');
      setSportType(task.sport_type || 'Fútbol');
    }
  }, [task]);

  if (!task) return null;

  const showSubjects = (task.type === 'homework' || task.type === 'exam') && subjects.length > 0;
  const showMatchFields = task.type === 'match';

  const handleSave = () => {
    if (!name || !dueDate) return;
    onSave({
      ...task,
      name,
      due_date: dueDate,
      due_time: dueTime || null,
      subject: showSubjects && subject ? subject : null,
      rival: showMatchFields && rival ? rival : null,
      home_away: showMatchFields ? homeAway : null,
      sport_type: showMatchFields ? sportType : task.sport_type,
    });
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
                      {sportTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
            <Label>{dateLabels[task.type] || 'Fecha'}</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div>
            <Label>{timeLabels[task.type] || 'Hora'} (opcional)</Label>
            <Input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} />
          </div>

          <Button onClick={handleSave} className="w-full" disabled={!name || !dueDate}>
            Guardar cambios
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditTaskDialog;
