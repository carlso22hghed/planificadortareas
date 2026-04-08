import { Flame, Trophy, TrendingUp, Clock, Target, Zap } from 'lucide-react';
import type { DbTask } from '@/types/app';
import { useProductivity } from '@/hooks/use-productivity';

interface ProductivityPageProps {
  tasks: DbTask[];
}

const ProductivityPage = ({ tasks }: ProductivityPageProps) => {
  const { streak, productivity, level, levelConfig } = useProductivity(tasks);

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Level Card */}
      <div className="glass-card rounded-2xl p-5 text-center space-y-3">
        <div className="text-5xl">{level.emoji}</div>
        <div>
          <h2 className={`text-2xl font-extrabold ${level.color}`}>{level.name}</h2>
          <p className="text-xs text-muted-foreground mt-1">Nivel de productividad</p>
        </div>
        {/* Level progress bar */}
        <div className="flex gap-1 justify-center">
          {levelConfig.map((l, i) => (
            <div key={l.name} className="flex flex-col items-center gap-1">
              <div
                className={`w-12 h-2 rounded-full transition-all ${
                  level.score >= l.minScore
                    ? 'bg-gradient-to-r from-purple-500 to-purple-400'
                    : 'bg-muted/30'
                }`}
              />
              <span className="text-[9px] text-muted-foreground">{l.emoji}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Puntuación: {level.score}/100</p>
      </div>

      {/* Streak Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card rounded-2xl p-4 text-center space-y-1">
          <Flame className="w-6 h-6 text-orange-400 mx-auto" />
          <p className="text-3xl font-extrabold text-orange-400">{streak.currentStreak}</p>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Racha actual</p>
          <p className="text-[10px] text-muted-foreground">días seguidos</p>
        </div>
        <div className="glass-card rounded-2xl p-4 text-center space-y-1">
          <Trophy className="w-6 h-6 text-yellow-400 mx-auto" />
          <p className="text-3xl font-extrabold text-yellow-400">{streak.bestStreak || 0}</p>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Mejor racha</p>
          <p className="text-[10px] text-muted-foreground">récord personal</p>
        </div>
      </div>

      {/* Productivity Panel */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">Productividad de hoy</h3>
        </div>

        {/* Progress circle */}
        <div className="flex items-center justify-center">
          <div className="relative w-28 h-28">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted)/0.2)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${productivity.percentComplete * 2.64} 264`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold text-foreground">{productivity.percentComplete}%</span>
              <span className="text-[9px] text-muted-foreground">completado</span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-xl bg-muted/20">
            <Target className="w-4 h-4 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold text-foreground">{productivity.tasksCompletedToday}</p>
            <p className="text-[9px] text-muted-foreground">Hechas</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-muted/20">
            <Zap className="w-4 h-4 mx-auto text-warning mb-1" />
            <p className="text-lg font-bold text-foreground">{productivity.totalTasksToday}</p>
            <p className="text-[9px] text-muted-foreground">Total</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-muted/20">
            <Clock className="w-4 h-4 mx-auto text-success mb-1" />
            <p className="text-lg font-bold text-foreground">{productivity.avgMinutesPerTask || '—'}</p>
            <p className="text-[9px] text-muted-foreground">min/tarea</p>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Se resetea cada día · No cuenta horas de actividades extraescolares
        </p>
      </div>
    </div>
  );
};

export default ProductivityPage;
