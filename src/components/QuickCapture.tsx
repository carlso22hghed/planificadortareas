import { useState, useRef } from 'react';
import { Zap, Mic, MicOff } from 'lucide-react';
import { parseNaturalLanguage } from '@/lib/natural-language-parser';
import type { DbTask } from '@/types/app';
import { cn } from '@/lib/utils';

interface QuickCaptureProps {
  onAdd: (task: Partial<DbTask>) => Promise<void>;
  type?: string;
  placeholder?: string;
}

const QuickCapture = ({ onAdd, type = 'task', placeholder }: QuickCaptureProps) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const handleSubmit = async () => {
    const parsed = parseNaturalLanguage(input);
    if (!parsed) return;
    
    setLoading(true);
    await onAdd({
      name: parsed.name,
      type,
      due_date: parsed.due_date,
      due_time: parsed.due_time,
    });
    setInput('');
    setLoading(false);
  };

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev ? `${prev} ${transcript}` : transcript);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const preview = input.trim() ? parseNaturalLanguage(input) : null;
  const placeholderText = placeholder || (
    type === 'homework' ? 'mañana ejercicios de matemáticas...'
    : type === 'exam' ? 'jueves examen de historia...'
    : type === 'event' ? 'viernes 18:00 reunión de padres...'
    : type === 'match' ? 'sábado 11:00 partido vs Alcalá...'
    : 'mañana 18:00 comprar leche...'
  );
  const hasSpeech = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  return (
    <div className="glass-card rounded-2xl p-3 space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder={placeholderText}
            className="w-full bg-muted/50 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
            disabled={loading}
          />
        </div>
        {hasSpeech && (
          <button
            onClick={toggleVoice}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all',
              listening ? 'bg-destructive text-destructive-foreground animate-pulse' : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            )}
          >
            {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || loading}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0',
            'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40'
          )}
        >
          {loading ? '...' : 'Crear'}
        </button>
      </div>
      {preview && (
        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground px-1">
          <span className="font-semibold text-foreground">{preview.name}</span>
          {preview.due_date && <span>📅 {new Date(preview.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>}
          {preview.due_time && <span>🕐 {preview.due_time}</span>}
        </div>
      )}
    </div>
  );
};

export default QuickCapture;
