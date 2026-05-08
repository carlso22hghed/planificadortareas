import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarCheck, Sparkles } from 'lucide-react';

interface OrganizeDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (prompt: string) => void;
}

const OrganizeDayDialog = ({ open, onOpenChange, onSubmit }: OrganizeDayDialogProps) => {
  const [priority, setPriority] = useState<'exams' | 'deadline' | 'importance'>('deadline');
  const [startHour, setStartHour] = useState('09:00');
  const [endHour, setEndHour] = useState('21:00');

  const handleSubmit = () => {
    const priorityText = priority === 'exams' ? 'prioriza los exámenes sobre todo lo demás'
      : priority === 'deadline' ? 'prioriza por fecha de entrega más cercana'
      : 'prioriza por nivel de importancia (urgente > importante > normal > voluntario)';

    const prompt = `Organiza mi día de hoy paso a paso. Mi horario disponible es de ${startHour} a ${endHour}. ${priorityText}. Para cada tarea, indícame DE QUÉ HORA A QUÉ HORA debo hacerla (ej: "09:00–10:30: Estudiar Matemáticas"). Ten en cuenta las horas que tengo ocupadas en mi horario escolar/laboral y NO me asignes tareas durante esas horas. Distribuye descansos cortos entre tareas largas.`;

    onSubmit(prompt);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-primary" /> Organizar mi día
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Prioridad</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'exams' as const, label: 'Exámenes primero' },
                { id: 'deadline' as const, label: 'Plazo más cercano' },
                { id: 'importance' as const, label: 'Por importancia' },
              ].map(opt => (
                <button key={opt.id} onClick={() => setPriority(opt.id)}
                  className={`p-2 rounded-xl text-xs font-semibold text-center transition-all ${
                    priority === opt.id ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Horario disponible</p>
            <div className="flex items-center gap-2">
              <input type="time" value={startHour} onChange={e => setStartHour(e.target.value)}
                className="flex-1 bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm" />
              <span className="text-muted-foreground text-sm">a</span>
              <input type="time" value={endHour} onChange={e => setEndHour(e.target.value)}
                className="flex-1 bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm" />
            </div>
          </div>
          <button onClick={handleSubmit}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
            <Sparkles className="w-4 h-4" /> Planificar con Nox AI
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrganizeDayDialog;
