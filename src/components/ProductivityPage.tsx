import { Flame, Trophy, TrendingUp, Clock, Target, Zap, Bed, BookOpen, Dumbbell, GraduationCap, Rocket, Calendar, BarChart3, ArrowUp, ArrowDown, Activity, Download } from 'lucide-react';
import type { DbTask } from '@/types/app';
import { useProductivity } from '@/hooks/use-productivity';
import { useMemo, useCallback } from 'react';
import { jsPDF } from 'jspdf';

const LEVEL_ICONS: Record<string, typeof Bed> = {
  'bed': Bed, 'book-open': BookOpen, 'dumbbell': Dumbbell, 'graduation-cap': GraduationCap, 'rocket': Rocket,
};

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

interface ProductivityPageProps {
  tasks: DbTask[];
}

const ProductivityPage = ({ tasks }: ProductivityPageProps) => {
  const { streak, productivity, level, levelConfig, weeklyHistory } = useProductivity(tasks);
  const LevelIcon = LEVEL_ICONS[level.emoji] || Bed;

  const analytics = useMemo(() => {
    const history = weeklyHistory || [];
    if (history.length === 0) return null;

    const dayTotals = [0, 0, 0, 0, 0, 0, 0];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    history.forEach(h => {
      const dow = new Date(h.date + 'T12:00:00').getDay();
      dayTotals[dow] += h.completed;
      dayCounts[dow]++;
    });
    const dayAvgs = dayTotals.map((t, i) => dayCounts[i] > 0 ? t / dayCounts[i] : 0);
    const bestDayIdx = dayAvgs.indexOf(Math.max(...dayAvgs));
    const worstDayIdx = dayAvgs.indexOf(Math.min(...dayAvgs.filter(a => a >= 0)));

    const totalCompleted = history.reduce((s, h) => s + h.completed, 0);
    const activeDays = history.filter(h => h.completed > 0).length;
    const dailyAvg = activeDays > 0 ? (totalCompleted / activeDays).toFixed(1) : '0';

    const hourCounts: number[] = new Array(24).fill(0);
    tasks.filter(t => t.completed).forEach(t => {
      if (t.created_at) {
        const h = new Date(t.created_at).getHours();
        hourCounts[h]++;
      }
    });
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

    const weeks: { label: string; score: number; completed: number }[] = [];
    const now = new Date();
    for (let w = 3; w >= 0; w--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() - w * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const startStr = weekStart.toISOString().split('T')[0];
      const endStr = weekEnd.toISOString().split('T')[0];
      const weekDays = history.filter(h => h.date >= startStr && h.date <= endStr);
      const comp = weekDays.reduce((s, d) => s + d.completed, 0);
      const total = weekDays.reduce((s, d) => s + d.total, 0);
      const score = total > 0 ? Math.round((comp / total) * 100) : 0;
      weeks.push({ label: `${weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`, score, completed: comp });
    }

    const weekdayAvg = [1, 2, 3, 4, 5].reduce((s, d) => s + dayAvgs[d], 0) / 5;
    const weekendAvg = (dayAvgs[0] + dayAvgs[6]) / 2;
    const pattern = weekdayAvg > weekendAvg * 1.5
      ? 'Eres más productivo entre semana'
      : weekendAvg > weekdayAvg * 1.5
        ? 'Rindes más los fines de semana'
        : 'Tu productividad es constante toda la semana';

    const last14 = history.slice(-14);
    const weakDays = last14.filter(h => h.completed === 0 && h.total > 0).length;

    return { bestDayIdx, worstDayIdx, dailyAvg, peakHour, weeks, pattern, weakDays, dayAvgs, history };
  }, [weeklyHistory, tasks]);

  const currentWeekScore = analytics?.weeks?.[analytics.weeks.length - 1]?.score ?? 0;

  const exportPDF = useCallback(() => {
    const doc = new jsPDF();
    const w = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Informe Semanal de Productividad', w / 2, y, { align: 'center' });
    y += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), w / 2, y, { align: 'center' });
    y += 15;

    // Level & streak
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Nivel: ${level.name} (${level.score}/100)`, 20, y);
    y += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Racha actual: ${streak.currentStreak} dias | Mejor racha: ${streak.bestStreak} dias`, 20, y);
    y += 10;

    // Today
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Productividad de hoy', 20, y);
    y += 7;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Completadas: ${productivity.tasksCompletedToday} / ${productivity.totalTasksToday} (${productivity.percentComplete}%)`, 20, y);
    y += 10;

    if (analytics) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Estadisticas', 20, y);
      y += 7;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Dia mas productivo: ${DAY_NAMES[analytics.bestDayIdx]} (${analytics.dayAvgs[analytics.bestDayIdx].toFixed(1)} tareas/dia)`, 20, y);
      y += 6;
      doc.text(`Dia mas flojo: ${DAY_NAMES[analytics.worstDayIdx]} (${analytics.dayAvgs[analytics.worstDayIdx].toFixed(1)} tareas/dia)`, 20, y);
      y += 6;
      doc.text(`Promedio diario: ${analytics.dailyAvg} tareas`, 20, y);
      y += 6;
      doc.text(`Pico productivo: ${analytics.peakHour}:00`, 20, y);
      y += 6;
      doc.text(`Patron: ${analytics.pattern}`, 20, y);
      y += 10;

      // Weeks
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Semanas', 20, y);
      y += 7;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      analytics.weeks.forEach(wk => {
        doc.text(`${wk.label}: ${wk.completed} completadas (${wk.score}/100)`, 20, y);
        y += 6;
      });
      y += 5;

      // Completed tasks list
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Tareas completadas esta semana', 20, y);
      y += 7;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const startStr = weekStart.toISOString().split('T')[0];
      const weekTasks = tasks.filter(t => t.completed && (t.due_date || '') >= startStr);
      weekTasks.slice(0, 30).forEach(t => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`- ${t.name}${t.subject ? ` (${t.subject})` : ''}${t.due_date ? ` - ${t.due_date}` : ''}`, 20, y);
        y += 5;
      });
    }

    doc.save('informe-productividad.pdf');
  }, [level, streak, productivity, analytics, tasks]);

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Export button */}
      <div className="flex justify-end">
        <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors">
          <Download className="w-3.5 h-3.5" /> Exportar PDF
        </button>
      </div>

      {/* Level Card */}
      <div className="glass-card rounded-2xl p-5 text-center space-y-3">
        <LevelIcon className={`w-12 h-12 mx-auto ${level.color}`} />
        <div>
          <h2 className={`text-2xl font-extrabold ${level.color}`}>{level.name}</h2>
          <p className="text-xs text-muted-foreground mt-1">Nivel de productividad</p>
        </div>
        <div className="flex gap-1 justify-center">
          {levelConfig.map((l) => (
            <div key={l.name} className="flex flex-col items-center gap-1">
              <div className={`w-12 h-2 rounded-full transition-all ${level.score >= l.minScore ? 'bg-gradient-to-r from-purple-500 to-purple-400' : 'bg-muted/30'}`} />
              {(() => { const I = LEVEL_ICONS[l.emoji] || Bed; return <I className="w-3 h-3 text-muted-foreground" />; })()}
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
        <div className="flex items-center justify-center">
          <div className="relative w-28 h-28">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted)/0.2)" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--primary))" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${productivity.percentComplete * 2.64} 264`} className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold text-foreground">{productivity.percentComplete}%</span>
              <span className="text-[9px] text-muted-foreground">completado</span>
            </div>
          </div>
        </div>
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
      </div>

      {analytics && (
        <>
          <div className="glass-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground">Puntuación semanal</h3>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-center">
                <p className="text-5xl font-extrabold text-primary">{currentWeekScore}</p>
                <p className="text-xs text-muted-foreground mt-1">de 100 puntos esta semana</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground">Gráfica de productividad</h3>
            </div>
            <div className="flex items-end gap-1 h-24">
              {(analytics.history || []).slice(-14).map((h, i) => {
                const maxVal = Math.max(...(analytics.history || []).slice(-14).map(d => d.completed), 1);
                const height = (h.completed / maxVal) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full rounded-t bg-primary/70 transition-all" style={{ height: `${Math.max(height, 4)}%` }} />
                    <span className="text-[7px] text-muted-foreground">{DAY_NAMES[new Date(h.date + 'T12:00:00').getDay()]}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground text-center">Últimos 14 días</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card rounded-2xl p-4 text-center space-y-1">
              <ArrowUp className="w-5 h-5 text-success mx-auto" />
              <p className="text-lg font-extrabold text-foreground">{DAY_NAMES[analytics.bestDayIdx]}</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Día más productivo</p>
              <p className="text-[10px] text-muted-foreground">{analytics.dayAvgs[analytics.bestDayIdx].toFixed(1)} tareas/día</p>
            </div>
            <div className="glass-card rounded-2xl p-4 text-center space-y-1">
              <ArrowDown className="w-5 h-5 text-destructive mx-auto" />
              <p className="text-lg font-extrabold text-foreground">{DAY_NAMES[analytics.worstDayIdx]}</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Día más flojo</p>
              <p className="text-[10px] text-muted-foreground">{analytics.dayAvgs[analytics.worstDayIdx].toFixed(1)} tareas/día</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card rounded-2xl p-3 text-center">
              <p className="text-xl font-extrabold text-primary">{analytics.dailyAvg}</p>
              <p className="text-[9px] text-muted-foreground font-semibold uppercase">Promedio diario</p>
            </div>
            <div className="glass-card rounded-2xl p-3 text-center">
              <p className="text-xl font-extrabold text-primary">{analytics.peakHour}:00</p>
              <p className="text-[9px] text-muted-foreground font-semibold uppercase">Pico productivo</p>
            </div>
            <div className="glass-card rounded-2xl p-3 text-center">
              <p className="text-xl font-extrabold text-destructive">{analytics.weakDays}</p>
              <p className="text-[9px] text-muted-foreground font-semibold uppercase">Días flojos (14d)</p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground">Semanas más fuertes</h3>
            </div>
            <div className="space-y-2">
              {analytics.weeks.map((w, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-20 shrink-0">{w.label}</span>
                  <div className="flex-1 h-4 bg-muted/20 rounded-full overflow-hidden">
                    <div className="h-full bg-primary/70 rounded-full transition-all" style={{ width: `${w.score}%` }} />
                  </div>
                  <span className="text-xs font-bold text-foreground w-8 text-right">{w.score}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground">Patrones de productividad</h3>
            </div>
            <p className="text-sm text-foreground/80">{analytics.pattern}</p>
            <div className="flex gap-1">
              {analytics.dayAvgs.map((avg, i) => (
                <div key={i} className="flex-1 text-center">
                  <div className="h-12 flex items-end justify-center">
                    <div className="w-full rounded-t bg-primary/50"
                      style={{ height: `${Math.max((avg / Math.max(...analytics.dayAvgs, 1)) * 100, 8)}%` }} />
                  </div>
                  <span className="text-[8px] text-muted-foreground">{DAY_NAMES[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <p className="text-[10px] text-muted-foreground text-center">
        Datos calculados directamente desde tus tareas · Sincronizado entre dispositivos
      </p>
    </div>
  );
};

export default ProductivityPage;
