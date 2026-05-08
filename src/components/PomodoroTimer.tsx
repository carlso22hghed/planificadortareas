import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Coffee, Brain, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const DEFAULT_WORK = 25;
const DEFAULT_BREAK = 5;
const DEFAULT_LONG_BREAK = 15;

function loadCustomTimes() {
  try {
    const raw = localStorage.getItem('pomodoro-custom-times');
    if (raw) return JSON.parse(raw);
  } catch {}
  return { work: DEFAULT_WORK, break: DEFAULT_BREAK, longBreak: DEFAULT_LONG_BREAK };
}

const PomodoroTimer = () => {
  const [customTimes, setCustomTimes] = useState(loadCustomTimes);
  const [showCustom, setShowCustom] = useState(false);
  const [tempWork, setTempWork] = useState(customTimes.work);
  const [tempBreak, setTempBreak] = useState(customTimes.break);
  const [tempLong, setTempLong] = useState(customTimes.longBreak);

  const workMin = customTimes.work;
  const breakMin = customTimes.break;
  const longBreakMin = customTimes.longBreak;

  const [minutes, setMinutes] = useState(workMin);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'work' | 'break' | 'longBreak'>('work');
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getModeMinutes = useCallback((m: 'work' | 'break' | 'longBreak') => {
    switch (m) {
      case 'work': return workMin;
      case 'break': return breakMin;
      case 'longBreak': return longBreakMin;
    }
  }, [workMin, breakMin, longBreakMin]);

  const reset = useCallback((newMode: 'work' | 'break' | 'longBreak') => {
    setIsRunning(false);
    setMode(newMode);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setMinutes(getModeMinutes(newMode));
    setSeconds(0);
  }, [getModeMinutes]);

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev === 0) {
          setMinutes(m => {
            if (m === 0) {
              setIsRunning(false);
              if (mode === 'work') {
                const next = completedPomodoros + 1;
                setCompletedPomodoros(next);
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('🍅 ¡Pomodoro completado!', { body: 'Es hora de descansar.' });
                }
                reset(next % 4 === 0 ? 'longBreak' : 'break');
              } else {
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('☕ ¡Descanso terminado!', { body: 'Vuelve a concentrarte.' });
                }
                reset('work');
              }
              return 0;
            }
            return m - 1;
          });
          return 59;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, mode, completedPomodoros, reset]);

  const progress = (() => {
    const total = getModeMinutes(mode) * 60;
    const elapsed = total - (minutes * 60 + seconds);
    return (elapsed / total) * 100;
  })();

  const saveCustom = () => {
    const w = Math.max(1, Math.min(120, tempWork));
    const b = Math.max(1, Math.min(60, tempBreak));
    const l = Math.max(1, Math.min(60, tempLong));
    const newTimes = { work: w, break: b, longBreak: l };
    setCustomTimes(newTimes);
    localStorage.setItem('pomodoro-custom-times', JSON.stringify(newTimes));
    setShowCustom(false);
    reset('work');
  };

  return (
    <div className="glass-card rounded-2xl p-6 text-center space-y-4">
      <div className="flex items-center justify-center gap-2">
        {mode === 'work' ? <Brain className="w-5 h-5 text-primary" /> : <Coffee className="w-5 h-5 text-success" />}
        <h3 className="font-bold text-foreground">
          {mode === 'work' ? 'Concentración' : mode === 'break' ? 'Descanso' : 'Descanso largo'}
        </h3>
        <button onClick={() => { setShowCustom(!showCustom); setTempWork(workMin); setTempBreak(breakMin); setTempLong(longBreakMin); }} className="p-1 rounded-lg hover:bg-muted transition-colors">
          <Settings2 className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {showCustom && (
        <div className="bg-muted/30 rounded-xl p-3 space-y-2 text-left">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Personalizar tiempos (min)</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground">Trabajo</label>
              <input type="number" min={1} max={120} value={tempWork} onChange={e => setTempWork(Number(e.target.value))} className="w-full bg-background border border-border rounded-lg px-2 py-1 text-sm text-center" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Descanso</label>
              <input type="number" min={1} max={60} value={tempBreak} onChange={e => setTempBreak(Number(e.target.value))} className="w-full bg-background border border-border rounded-lg px-2 py-1 text-sm text-center" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Largo</label>
              <input type="number" min={1} max={60} value={tempLong} onChange={e => setTempLong(Number(e.target.value))} className="w-full bg-background border border-border rounded-lg px-2 py-1 text-sm text-center" />
            </div>
          </div>
          <button onClick={saveCustom} className="w-full py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold">Guardar</button>
        </div>
      )}

      <div className="relative w-40 h-40 mx-auto">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" strokeWidth="6" className="stroke-muted" />
          <circle cx="50" cy="50" r="45" fill="none" strokeWidth="6"
            className={cn(mode === 'work' ? 'stroke-primary' : 'stroke-success')}
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-extrabold text-foreground tabular-nums">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <Button size="icon" variant="outline" onClick={() => reset(mode)}>
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button size="lg" onClick={() => setIsRunning(!isRunning)}
          className={cn(mode === 'work' ? 'bg-primary' : 'bg-success', 'text-primary-foreground')}>
          {isRunning ? <Pause className="w-5 h-5 mr-1" /> : <Play className="w-5 h-5 mr-1" />}
          {isRunning ? 'Pausar' : 'Iniciar'}
        </Button>
      </div>

      <div className="flex items-center justify-center gap-1">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={cn('w-3 h-3 rounded-full', i < completedPomodoros % 4 ? 'bg-primary' : 'bg-muted')} />
        ))}
        <span className="text-xs text-muted-foreground ml-2">{completedPomodoros} pomodoros</span>
      </div>

      <div className="flex gap-2 justify-center flex-wrap">
        <button onClick={() => reset('work')} className={cn('text-xs px-3 py-1 rounded-full', mode === 'work' ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground')}>{workMin} min</button>
        <button onClick={() => reset('break')} className={cn('text-xs px-3 py-1 rounded-full', mode === 'break' ? 'bg-success/20 text-success font-bold' : 'text-muted-foreground')}>{breakMin} min</button>
        <button onClick={() => reset('longBreak')} className={cn('text-xs px-3 py-1 rounded-full', mode === 'longBreak' ? 'bg-success/20 text-success font-bold' : 'text-muted-foreground')}>{longBreakMin} min</button>
      </div>
    </div>
  );
};

export default PomodoroTimer;
