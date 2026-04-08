import { Sparkles, Pin, ClipboardList, Lightbulb, ChevronRight } from 'lucide-react';

interface NoxRecommendation {
  todayTasks: { name: string; subject: string; dueDate: string | null; daysUntilDue: number; priority: number }[];
  tomorrowTasks: { name: string; subject: string; dueDate: string | null; daysUntilDue: number; priority: number }[];
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

const NoxAISection = ({ loading, recommendation }: NoxAISectionProps) => {
  if (!recommendation && !loading) return null;

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3 border-purple-500/20">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Sparkles className="w-5 h-5 text-purple-400" />
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
          {/* Encouragement */}
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
                        {t.daysUntilDue <= 1 && <span className="text-destructive font-semibold ml-1">— vence hoy</span>}
                        {t.daysUntilDue === 2 && <span className="text-warning font-semibold ml-1">— vence mañana</span>}
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
                        {t.daysUntilDue <= 3 && <span className="text-muted-foreground ml-1">— en {t.daysUntilDue} días</span>}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Predictions - only shown when backed by real data */}
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
