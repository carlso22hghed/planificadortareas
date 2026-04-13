import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LayoutTemplate } from 'lucide-react';
import { TASK_TEMPLATES, generateTasksFromTemplate } from '@/lib/task-templates';
import type { DbTask } from '@/types/app';

interface TaskTemplateDialogProps {
  onAdd: (task: Partial<DbTask>) => void;
  subjects?: string[];
}

const TaskTemplateDialog = ({ onAdd, subjects = [] }: TaskTemplateDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [subject, setSubject] = useState('');

  const template = TASK_TEMPLATES.find(t => t.id === selectedTemplate);

  const handleApply = () => {
    if (!template || !targetDate) return;
    const tasks = generateTasksFromTemplate(template, targetDate, subject || undefined);
    tasks.forEach(t => onAdd(t as Partial<DbTask>));
    setOpen(false);
    setSelectedTemplate('');
    setTargetDate('');
    setSubject('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 rounded-full">
          <LayoutTemplate className="w-4 h-4" />
          Plantilla
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Usar plantilla de tareas</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-1 gap-2">
            {TASK_TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplate(t.id)}
                className={`text-left p-3 rounded-xl border transition-all ${
                  selectedTemplate === t.id
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                    : 'border-border bg-muted/30 hover:bg-muted/50'
                }`}
              >
                <p className="font-semibold text-sm">{t.emoji} {t.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.tasks.length} tareas</p>
              </button>
            ))}
          </div>

          {template && (
            <>
              <div>
                <Label>📅 Fecha objetivo (del examen/entrega)</Label>
                <Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
              </div>

              {subjects.length > 0 && (
                <div>
                  <Label>Asignatura (opcional)</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger><SelectValue placeholder="Sin asignatura" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignatura</SelectItem>
                      {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="bg-muted/50 rounded-xl p-3 space-y-1">
                <p className="text-xs font-bold text-muted-foreground mb-2">Tareas que se crearán:</p>
                {template.tasks.map((t, i) => (
                  <p key={i} className="text-xs text-foreground">
                    • {t.name} {t.daysOffset > 0 ? `(${t.daysOffset} días antes)` : '(día D)'}
                  </p>
                ))}
              </div>

              <Button onClick={handleApply} className="w-full" disabled={!targetDate}>
                Crear {template.tasks.length} tareas
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskTemplateDialog;