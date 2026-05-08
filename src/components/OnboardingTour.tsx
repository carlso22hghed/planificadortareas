import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { BookOpen, CheckCircle, CalendarDays, Sparkles } from 'lucide-react';

interface OnboardingTourProps {
  show: boolean;
  onComplete: () => void;
  onCreateSampleTask: () => void;
}

const STEPS = [
  {
    icon: BookOpen,
    title: '¡Bienvenido a tu planificador!',
    description: 'Organiza deberes, exámenes, eventos y más. Todo en un solo lugar.',
  },
  {
    icon: CalendarDays,
    title: 'Crea tus tareas',
    description: 'Usa el botón "+" en cada pestaña o escribe en la captura rápida: "mañana 18:00 estudiar Historia"',
  },
  {
    icon: Sparkles,
    title: 'Nox AI te ayuda',
    description: 'Pulsa el búho flotante para que la IA organice tu día, te dé consejos y más.',
  },
  {
    icon: CheckCircle,
    title: '¡Listo para empezar!',
    description: 'Vamos a crear tu primera tarea de ejemplo para que veas cómo funciona.',
  },
];

const OnboardingTour = ({ show, onComplete, onCreateSampleTask }: OnboardingTourProps) => {
  const [step, setStep] = useState(0);

  if (!show) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onCreateSampleTask();
      onComplete();
    } else {
      setStep(s => s + 1);
    }
  };

  return (
    <Dialog open={show} onOpenChange={() => { onComplete(); }}>
      <DialogContent className="max-w-sm">
        <div className="text-center space-y-4 py-4">
          <Icon className="w-12 h-12 mx-auto text-primary" />
          <h2 className="text-xl font-extrabold text-foreground">{current.title}</h2>
          <p className="text-sm text-muted-foreground">{current.description}</p>
          <div className="flex justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i === step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={onComplete} className="flex-1 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
              Saltar
            </button>
            <button onClick={handleNext}
              className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
              {isLast ? 'Crear tarea de ejemplo' : 'Siguiente'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingTour;
