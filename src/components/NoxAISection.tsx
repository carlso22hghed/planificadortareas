import { Pin, ClipboardList, Lightbulb, ChevronRight, Bird } from 'lucide-react';

interface NoxRecommendation {
  todayTasks: { name: string; subject: string; dueDate: string | null; dueTime: string | null; daysUntilDue: number; priority: number }[];
  tomorrowTasks: { name: string; subject: string; dueDate: string | null; dueTime: string | null; daysUntilDue: number; priority: number }[];
  predictions: string[];
  encouragement: string;
}

interface NoxAISectionProps {
  loading: boolean;
  recommendation: NoxRecommendation | null;
}

function groupBySubject(tasks: NoxRecommendation['todayTasks']) {
  const groups: Record<string, typeof tasks> = {};
  for (const t of tasks) {
    if (!groups[t.subject]) groups[t.subject] = [];
    groups[t.subject].push(t);
  }
  return groups;
}

function formatDueLabel(dueDate: string | null, dueTime: string | null): string {
  if (!dueDate) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(dueDate);
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86400000);

  const timeLabel = dueTime ? getTimeOfDay(dueTime) : '';

  if (diffDays < 0) return '— ya venció';
  if (diffDays === 0) return timeLabel ? `— hoy ${timeLabel}` : '— se entrega hoy';
  if (diffDays === 1) return timeLabel ? `— mañana ${timeLabel}` : '— se entrega mañana';
  if (diffDays === 2) return '— se entrega pasado mañana';

  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  if (diffDays <= 6) return `— se entrega el ${dayNames[dueDay.getDay()]}`;
  return `— en ${diffDays} días`;
}

function getTimeOfDay(time: string): string {
  if (!time) return '';
  const [h] = time.split(':').map(Number);
  if (h < 7) return 'por la madrugada';
  if (h < 13) return 'por la mañana';
  if (h < 20) return 'por la tarde';
  return 'por la noche';
}

function getDueSeverity(daysUntilDue: number): string {
  if (daysUntilDue <= 0) return 'text-destructive font-semibold';
  if (daysUntilDue <= 1) return 'text-destructive font-semibold';
  if (daysUntilDue <= 2) return 'text-warning font-semibold';
  return 'text-muted-foreground';
}

const NoxAISection = ({ loading, recommendation }: NoxAISectionProps) => {
  if (!recommendation && !loading) return null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Bird className="w-5 h-5 text-purple-400" />
          <div className="absolute inset-0 w-5 h-5 bg-purple-500/30 rounded-full blur-md animate-pulse" />
        </div>
        <span className="font-bold text-sm bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
          Nox AI
        </span>
        {loading && (
          <span className="text-xs text-muted-foreground animate-pulse ml-auto">
            está pensando...
          </span>
        )}
      </div>

      {recommendation && (
        <div className="space-y-3">
          {/* Encouragement - friendly tone */}
          <p className="text-sm font-medium text-foreground/80">{recommendation.encouragement}</p>

          {/* Today's recommendations */}
          {recommendation.todayTasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Pin className="w-3.5 h-3.5 text-purple-400" />
                <h4 className="text-xs font-bold uppercase tracking-wide text-purple-400">Hoy</h4>
              </div>
              {Object.entries(groupBySubject(recommendation.todayTasks)).map(([subject, tasks]) => (
                <div key={subject} className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">{subject}</p>
                  {tasks.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm pl-2">
                      <ChevronRight className="w-3 h-3 text-purple-400 mt-1 shrink-0" />
                      <span className="text-foreground/90">
                        {t.name}
                        <span className={`ml-1 ${getDueSeverity(t.daysUntilDue)}`}>
                          {formatDueLabel(t.dueDate, t.dueTime)}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Tomorrow's recommendations */}
          {recommendation.tomorrowTasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5 text-purple-400/70" />
                <h4 className="text-xs font-bold uppercase tracking-wide text-purple-400/70">Próximos días</h4>
              </div>
              {Object.entries(groupBySubject(recommendation.tomorrowTasks)).map(([subject, tasks]) => (
                <div key={subject} className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">{subject}</p>
                  {tasks.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm pl-2">
                      <ChevronRight className="w-3 h-3 text-purple-400/60 mt-1 shrink-0" />
                      <span className="text-foreground/70">
                        {t.name}
                        <span className={`ml-1 ${getDueSeverity(t.daysUntilDue)}`}>
                          {formatDueLabel(t.dueDate, t.dueTime)}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Predictions */}
          {recommendation.predictions.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-border/30">
              <div className="flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-purple-400/70" />
                <h4 className="text-xs font-bold uppercase tracking-wide text-purple-400/70">Patrones detectados</h4>
              </div>
              {recommendation.predictions.map((p, i) => (
                <div key={i} className="flex items-start gap-2 pl-2">
                  <Lightbulb className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground italic">{p}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NoxAISection;
