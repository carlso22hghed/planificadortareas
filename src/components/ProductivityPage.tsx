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

function getDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** ISO Monday (start of current week) */
function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0..6 (Sun..Sat)
  const offset = day === 0 ? -6 : 1 - day; // back to Monday
  const r = new Date(d);
  r.setDate(r.getDate() + offset);
  r.setHours(0, 0, 0, 0);
  return r;
}

const ProductivityPage = ({ tasks }: ProductivityPageProps) => {
  const { streak, productivity, level, levelConfig, weeklyHistory } = useProductivity(tasks);
  const LevelIcon = LEVEL_ICONS[level.emoji] || Bed;

  const analytics = useMemo(() => {
    // Aggregate completions across all time, per-day.
    const dayMap = new Map<string, number>(); // date -> completed count
    const completedTasks = tasks.filter(t => t.completed);
    completedTasks.forEach(t => {
      const ts = (t as any).completed_at || t.due_date || t.created_at;
      if (!ts) return;
      const date = ts.split ? ts.split('T')[0] : new Date(ts).toISOString().split('T')[0];
      dayMap.set(date, (dayMap.get(date) || 0) + 1);
    });

    // Current week (Mon..Sun): best/worst day
    const wkStart = startOfWeek(new Date());
    const weekDayCounts = [0, 0, 0, 0, 0, 0, 0]; // index 0 = Mon ... 6 = Sun
    for (let i = 0; i < 7; i++) {
      const d = new Date(wkStart);
      d.setDate(d.getDate() + i);
      const ds = getDateStr(d);
      weekDayCounts[i] = dayMap.get(ds) || 0;
    }
    // Map index 0..6 (Mon..Sun) → Spanish day name index in DAY_NAMES (0=Dom..6=Sáb)
    const WEEK_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const maxC = Math.max(...weekDayCounts);
    const minC = Math.min(...weekDayCounts);
    const bestDayIdx = weekDayCounts.indexOf(maxC);
    const worstDayIdx = weekDayCounts.indexOf(minC);
    const bestDayLabel = WEEK_LABELS[bestDayIdx];
    const worstDayLabel = WEEK_LABELS[worstDayIdx];
    const bestDayCount = weekDayCounts[bestDayIdx];
    const worstDayCount = weekDayCounts[worstDayIdx];

    // Daily average (across all time): mean completions/day across days that have any completion.
    const allCounts = Array.from(dayMap.values());
    const totalCompleted = allCounts.reduce((s, n) => s + n, 0);
    const dailyAvg = allCounts.length > 0 ? (totalCompleted / allCounts.length).toFixed(1) : '0';

    // Peak hour: hour-of-day with most completions (uses completed_at when available).
    const hourCounts: number[] = new Array(24).fill(0);
    completedTasks.forEach(t => {
      const ts = (t as any).completed_at || t.created_at;
      if (!ts) return;
      hourCounts[new Date(ts).getHours()]++;
    });
    const peakHour = hourCounts.some(c => c > 0) ? hourCounts.indexOf(Math.max(...hourCounts)) : null;

    // Last 4 weeks: number of tasks completed each week.
    const weeks: { label: string; completed: number }[] = [];
    for (let w = 3; w >= 0; w--) {
      const ws = new Date(wkStart);
      ws.setDate(ws.getDate() - w * 7);
      const we = new Date(ws);
      we.setDate(we.getDate() + 6);
      let comp = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(ws);
        d.setDate(d.getDate() + i);
        comp += dayMap.get(getDateStr(d)) || 0;
      }
      weeks.push({
        label: ws.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        completed: comp,
      });
    }

    // Productivity pattern: weekday vs weekend average completions/day across all time.
    const dowTotals = [0, 0, 0, 0, 0, 0, 0];
    const dowDayCounts = [0, 0, 0, 0, 0, 0, 0];
    dayMap.forEach((count, date) => {
      const dow = new Date(date + 'T12:00:00').getDay();
      dowTotals[dow] += count;
      dowDayCounts[dow]++;
    });
    const dowAvgs = dowTotals.map((t, i) => dowDayCounts[i] > 0 ? t / dowDayCounts[i] : 0);
    const weekdayAvg = [1, 2, 3, 4, 5].reduce((s, d) => s + dowAvgs[d], 0) / 5;
    const weekendAvg = (dowAvgs[0] + dowAvgs[6]) / 2;
    const pattern = weekdayAvg > weekendAvg * 1.3
      ? 'Eres más productivo entre semana'
      : weekendAvg > weekdayAvg * 1.3
        ? 'Rindes más los fines de semana'
        : 'Tu productividad es constante toda la semana';

    // Chart data: last 14 days completion counts.
    const chart: { date: string; completed: number }[] = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = getDateStr(d);
      chart.push({ date: ds, completed: dayMap.get(ds) || 0 });
    }

    return {
      bestDayLabel, worstDayLabel, bestDayCount, worstDayCount,
      dailyAvg, peakHour, weeks, pattern, chart, dowAvgs,
    };
  }, [tasks]);

  const exportPDF = useCallback(() => {
    const doc = new jsPDF();
    const w = doc.internal.pageSize.getWidth();
    let y = 20;
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Informe de Productividad', w / 2, y, { align: 'center' });
    y += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), w / 2, y, { align: 'center' });
    y += 15;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Nivel: ${level.name} (${level.score}/100)`, 20, y);
    y += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Racha actual: ${streak.currentStreak} dias | Mejor racha: ${streak.bestStreak} dias`, 20, y);
    y += 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Productividad de hoy', 20, y);
    y += 7;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Hechas: ${productivity.tasksCompletedToday} / Resaltadas: ${productivity.totalTasksToday} (${productivity.percentComplete}%)`, 20, y);
    y += 10;
    if (analytics) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Esta semana', 20, y);
      y += 7;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Dia mas productivo: ${analytics.bestDayLabel} (${analytics.bestDayCount} tareas)`, 20, y);
      y += 6;
      doc.text(`Dia mas flojo: ${analytics.worstDayLabel} (${analytics.worstDayCount} tareas)`, 20, y);
      y += 6;
      doc.text(`Promedio diario (siempre): ${analytics.dailyAvg} tareas/dia`, 20, y);
      y += 6;
      doc.text(`Pico productivo: ${analytics.peakHour !== null ? analytics.peakHour + ':00' : '—'}`, 20, y);
      y += 6;
      doc.text(`Patron: ${analytics.pattern}`, 20, y);
      y += 10;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Ultimas semanas', 20, y);
      y += 7;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      analytics.weeks.forEach(wk => {
        doc.text(`${wk.label}: ${wk.completed} tareas completadas`, 20, y);
        y += 6;
      });
    }
    doc.save('informe-productividad.pdf');
  }, [level, streak, productivity, analytics]);

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
                strokeDasharray={`${Math.min(productivity.percentComplete, 100) * 2.64} 264`} className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold text-foreground">{productivity.percentComplete}%</span>
              <span className="text-[9px] text-muted-foreground">completado</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-xl bg-muted/20">
            <Zap className="w-4 h-4 mx-auto text-warning mb-1" />
            <p className="text-lg font-bold text-foreground">{productivity.totalTasksToday}</p>
            <p className="text-[9px] text-muted-foreground">Total resaltadas</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-muted/20">
            <Target className="w-4 h-4 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold text-foreground">{productivity.tasksCompletedToday}</p>
            <p className="text-[9px] text-muted-foreground">Hechas hoy</p>
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
          {/* Chart: completed tasks per day */}
          <div className="glass-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground">Gráfica de productividad</h3>
            </div>
            <div className="flex items-end gap-1 h-24">
              {analytics.chart.map((h, i) => {
                const maxVal = Math.max(...analytics.chart.map(d => d.completed), 1);
                const height = (h.completed / maxVal) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full rounded-t bg-primary/70 transition-all" style={{ height: `${Math.max(height, 4)}%` }} title={`${h.date}: ${h.completed}`} />
                    <span className="text-[7px] text-muted-foreground">{DAY_NAMES[new Date(h.date + 'T12:00:00').getDay()]}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground text-center">Tareas completadas en los últimos 14 días</p>
          </div>

          {/* Best/worst day THIS WEEK */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card rounded-2xl p-4 text-center space-y-1">
              <ArrowUp className="w-5 h-5 text-success mx-auto" />
              <p className="text-lg font-extrabold text-foreground">{analytics.bestDayLabel}</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Día más productivo</p>
              <p className="text-[10px] text-muted-foreground">{analytics.bestDayCount} tareas completadas</p>
            </div>
            <div className="glass-card rounded-2xl p-4 text-center space-y-1">
              <ArrowDown className="w-5 h-5 text-destructive mx-auto" />
              <p className="text-lg font-extrabold text-foreground">{analytics.worstDayLabel}</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Día más flojo</p>
              <p className="text-[10px] text-muted-foreground">{analytics.worstDayCount} tareas completadas</p>
            </div>
          </div>

          {/* Daily average + peak hour */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card rounded-2xl p-3 text-center">
              <p className="text-xl font-extrabold text-primary">{analytics.dailyAvg}</p>
              <p className="text-[9px] text-muted-foreground font-semibold uppercase">Promedio diario</p>
              <p className="text-[9px] text-muted-foreground">tareas/día</p>
            </div>
            <div className="glass-card rounded-2xl p-3 text-center">
              <p className="text-xl font-extrabold text-primary">{analytics.peakHour !== null ? `${analytics.peakHour}:00` : '—'}</p>
              <p className="text-[9px] text-muted-foreground font-semibold uppercase">Pico productivo</p>
              <p className="text-[9px] text-muted-foreground">hora habitual</p>
            </div>
          </div>

          {/* Last 4 weeks */}
          <div className="glass-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground">Últimas semanas</h3>
            </div>
            <div className="space-y-2">
              {(() => {
                const max = Math.max(...analytics.weeks.map(w => w.completed), 1);
                return analytics.weeks.map((w, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">{w.label}</span>
                    <div className="flex-1 h-4 bg-muted/20 rounded-full overflow-hidden">
                      <div className="h-full bg-primary/70 rounded-full transition-all" style={{ width: `${(w.completed / max) * 100}%` }} />
                    </div>
                    <span className="text-xs font-bold text-foreground w-10 text-right">{w.completed}</span>
                  </div>
                ));
              })()}
            </div>
            <p className="text-[10px] text-muted-foreground text-center">Tareas completadas por semana</p>
          </div>

          {/* Productivity pattern */}
          <div className="glass-card rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground">Patrones de productividad</h3>
            </div>
            <p className="text-sm text-foreground/80">{analytics.pattern}</p>
            <div className="flex gap-1">
              {analytics.dowAvgs.map((avg, i) => (
                <div key={i} className="flex-1 text-center">
                  <div className="h-12 flex items-end justify-center">
                    <div className="w-full rounded-t bg-primary/50"
                      style={{ height: `${Math.max((avg / Math.max(...analytics.dowAvgs, 1)) * 100, 8)}%` }} />
                  </div>
                  <span className="text-[8px] text-muted-foreground">{DAY_NAMES[i]}</span>
                  <span className="block text-[8px] text-foreground/70 font-semibold">{avg.toFixed(1)}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground text-center">Media de tareas completadas por día (siempre)</p>
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
