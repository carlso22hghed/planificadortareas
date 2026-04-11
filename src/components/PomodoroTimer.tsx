import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Coffee, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const WORK_MINUTES = 25;
const BREAK_MINUTES = 5;
const LONG_BREAK_MINUTES = 15;

const PomodoroTimer = () => {
  const [minutes, setMinutes] = useState(WORK_MINUTES);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'work' | 'break' | 'longBreak'>('work');
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback((newMode: 'work' | 'break' | 'longBreak') => {
    setIsRunning(false);
    setMode(newMode);
    if (intervalRef.current) clearInterval(intervalRef.current);
    switch (newMode) {
      case 'work': setMinutes(WORK_MINUTES); break;
      case 'break': setMinutes(BREAK_MINUTES); break;
      case 'longBreak': setMinutes(LONG_BREAK_MINUTES); break;
    }
    setSeconds(0);
  }, []);

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
    const total = mode === 'work' ? WORK_MINUTES * 60 : mode === 'break' ? BREAK_MINUTES * 60 : LONG_BREAK_MINUTES * 60;
    const elapsed = total - (minutes * 60 + seconds);
    return (elapsed / total) * 100;
  })();

  return (
    <div className="glass-card rounded-2xl p-6 text-center space-y-4">
      <div className="flex items-center justify-center gap-2">
        {mode === 'work' ? <Brain className="w-5 h-5 text-primary" /> : <Coffee className="w-5 h-5 text-success" />}
        <h3 className="font-bold text-foreground">
          {mode === 'work' ? 'Concentración' : mode === 'break' ? 'Descanso' : 'Descanso largo'}
        </h3>
      </div>

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

      <div className="flex gap-2 justify-center">
        <button onClick={() => reset('work')} className={cn('text-xs px-3 py-1 rounded-full', mode === 'work' ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground')}>25 min</button>
        <button onClick={() => reset('break')} className={cn('text-xs px-3 py-1 rounded-full', mode === 'break' ? 'bg-success/20 text-success font-bold' : 'text-muted-foreground')}>5 min</button>
        <button onClick={() => reset('longBreak')} className={cn('text-xs px-3 py-1 rounded-full', mode === 'longBreak' ? 'bg-success/20 text-success font-bold' : 'text-muted-foreground')}>15 min</button>
      </div>
    </div>
  );
};

export default PomodoroTimer;
