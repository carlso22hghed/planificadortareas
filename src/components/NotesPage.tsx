import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Mic, Square, FileText, Volume2, Download, Share2, Pencil, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

type NotesTab = 'written' | 'voice';

const NotesPage = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<NotesTab>('written');

  return (
    <div className="space-y-4 animate-slide-up">
      <h2 className="font-bold text-foreground text-lg">📝 Notas</h2>
      <div className="flex gap-2">
        <button onClick={() => setTab('written')}
          className={cn('flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2',
            tab === 'written' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted')}>
          <FileText className="w-4 h-4" /> Notas escritas
        </button>
        <button onClick={() => setTab('voice')}
          className={cn('flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2',
            tab === 'voice' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted')}>
          <Volume2 className="w-4 h-4" /> Notas de voz
        </button>
      </div>
      {tab === 'written' ? <WrittenNotes userId={user?.id} /> : <VoiceNotes userId={user?.id} />}
    </div>
  );
};

const WrittenNotes = ({ userId }: { userId?: string }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [reminderFrequency, setReminderFrequency] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const { data: notes = [] } = useQuery({
    queryKey: ['written-notes', userId],
    queryFn: async () => {
      const { data } = await supabase.from('written_notes').select('*').eq('user_id', userId!).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  const addNote = async () => {
    if (!title.trim() || !userId) return;
    await supabase.from('written_notes').insert({
      title: title.trim(),
      content: content.trim(),
      user_id: userId,
      reminder_date: reminderEnabled && reminderDate ? reminderDate : null,
      reminder_time: reminderEnabled && reminderTime ? reminderTime : null,
      reminder_frequency: reminderEnabled && reminderFrequency > 0 ? reminderFrequency : null,
    });
    queryClient.invalidateQueries({ queryKey: ['written-notes'] });
    setTitle(''); setContent(''); setShowForm(false); setReminderEnabled(false);
    setReminderDate(''); setReminderTime(''); setReminderFrequency(0);
  };

  const deleteNote = async (id: string) => {
    await supabase.from('written_notes').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['written-notes'] });
  };

  const startEdit = (note: any) => {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content || '');
  };

  const saveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;
    await supabase.from('written_notes').update({ title: editTitle.trim(), content: editContent.trim() }).eq('id', editingId);
    queryClient.invalidateQueries({ queryKey: ['written-notes'] });
    setEditingId(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(!showForm)} className="gap-2 rounded-full" size="sm">
          <Plus className="w-4 h-4" /> Añadir nota
        </Button>
      </div>

      {showForm && (
        <div className="glass-card rounded-2xl p-4 space-y-3 animate-slide-up">
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título de la nota" autoFocus />
          <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Escribe tu nota..." rows={4} className="resize-none" />
          
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <Label className="cursor-pointer text-sm">🔔 Aviso para leer la nota</Label>
            <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
          </div>
          {reminderEnabled && (
            <div className="space-y-2 animate-slide-up">
              <Input type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)} />
              <Input type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)} />
              <Select value={String(reminderFrequency)} onValueChange={v => setReminderFrequency(Number(v))}>
                <SelectTrigger><SelectValue placeholder="Sin repetición" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sin repetición</SelectItem>
                  <SelectItem value="5">Cada 5 min</SelectItem>
                  <SelectItem value="10">Cada 10 min</SelectItem>
                  <SelectItem value="15">Cada 15 min</SelectItem>
                  <SelectItem value="30">Cada 30 min</SelectItem>
                  <SelectItem value="60">Cada 1 hora</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={addNote} className="flex-1" disabled={!title.trim()}>Guardar</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {notes.length === 0 && !showForm ? (
        <div className="glass-card rounded-2xl p-6 text-center">
          <p className="text-3xl mb-2">📄</p>
          <p className="text-sm text-muted-foreground">No tienes notas escritas</p>
        </div>
      ) : (
        notes.map((note: any) => (
          <div key={note.id} className="glass-card rounded-2xl p-4">
            {editingId === note.id ? (
              <div className="space-y-2">
                <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Título" />
                <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={3} className="resize-none" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEdit} disabled={!editTitle.trim()} className="gap-1"><Check className="w-3 h-3" /> Guardar</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="gap-1"><X className="w-3 h-3" /> Cancelar</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{note.title}</p>
                  {note.content && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{note.content}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(note.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button onClick={() => startEdit(note)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => deleteNote(note.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

const VoiceNotes = ({ userId }: { userId?: string }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [reminderFrequency, setReminderFrequency] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  const { data: notes = [] } = useQuery({
    queryKey: ['voice-notes', userId],
    queryFn: async () => {
      const { data } = await supabase.from('voice_notes').select('*').eq('user_id', userId!).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  const startRecording = async () => {
    if (!title.trim()) {
      toast({ title: 'Pon un nombre', description: 'Escribe el nombre de la nota de voz antes de grabar.', variant: 'destructive' });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      startTimeRef.current = Date.now();
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast({ title: 'Error', description: 'No se pudo acceder al micrófono.', variant: 'destructive' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const saveVoiceNote = async () => {
    if (!audioBlob || !userId || !title.trim()) return;
    const fileName = `${userId}/${Date.now()}.webm`;
    const { error } = await supabase.storage.from('voice-notes').upload(fileName, audioBlob);
    if (error) { toast({ title: 'Error', description: 'No se pudo guardar el audio.', variant: 'destructive' }); return; }
    const { data: urlData } = supabase.storage.from('voice-notes').getPublicUrl(fileName);
    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    await supabase.from('voice_notes').insert({
      title: title.trim(), audio_url: urlData.publicUrl, duration_seconds: duration, user_id: userId,
      reminder_date: reminderEnabled && reminderDate ? reminderDate : null,
      reminder_time: reminderEnabled && reminderTime ? reminderTime : null,
      reminder_frequency: reminderEnabled && reminderFrequency > 0 ? reminderFrequency : null,
    });
    queryClient.invalidateQueries({ queryKey: ['voice-notes'] });
    setTitle(''); setAudioBlob(null); setShowForm(false); setReminderEnabled(false);
    setReminderDate(''); setReminderTime(''); setReminderFrequency(0);
  };

  const deleteNote = async (id: string) => {
    await supabase.from('voice_notes').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['voice-notes'] });
  };

  const downloadNote = async (url: string, title: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${title}.webm`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast({ title: 'Error', description: 'No se pudo descargar.', variant: 'destructive' });
    }
  };

  const shareNote = async (url: string, title: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Nota de voz: ${title}`, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: '🔗 Enlace copiado', description: 'Se ha copiado el enlace de la nota de voz.' });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(!showForm)} className="gap-2 rounded-full" size="sm">
          <Mic className="w-4 h-4" /> Grabar nota
        </Button>
      </div>

      {showForm && (
        <div className="glass-card rounded-2xl p-4 space-y-3 animate-slide-up">
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nombre de la nota de voz" autoFocus />
          <div className="flex items-center justify-center gap-4 py-4">
            {!isRecording && !audioBlob && (
              <Button onClick={startRecording} className="gap-2 rounded-full bg-destructive hover:bg-destructive/90" disabled={!title.trim()}>
                <Mic className="w-5 h-5" /> Grabar
              </Button>
            )}
            {isRecording && (
              <Button onClick={stopRecording} className="gap-2 rounded-full" variant="outline">
                <Square className="w-4 h-4 fill-destructive text-destructive" /> Parar
              </Button>
            )}
            {isRecording && <span className="text-sm text-destructive animate-pulse font-semibold">🔴 Grabando...</span>}
            {audioBlob && !isRecording && (
              <div className="text-center space-y-2">
                <audio src={URL.createObjectURL(audioBlob)} controls className="w-full" />
                <Button onClick={() => setAudioBlob(null)} variant="ghost" size="sm">Repetir grabación</Button>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <Label className="cursor-pointer text-sm">🔔 Aviso para escuchar</Label>
            <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
          </div>
          {reminderEnabled && (
            <div className="space-y-2 animate-slide-up">
              <Input type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)} />
              <Input type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)} />
              <Select value={String(reminderFrequency)} onValueChange={v => setReminderFrequency(Number(v))}>
                <SelectTrigger><SelectValue placeholder="Sin repetición" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sin repetición</SelectItem>
                  <SelectItem value="5">Cada 5 min</SelectItem>
                  <SelectItem value="10">Cada 10 min</SelectItem>
                  <SelectItem value="15">Cada 15 min</SelectItem>
                  <SelectItem value="30">Cada 30 min</SelectItem>
                  <SelectItem value="60">Cada 1 hora</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={saveVoiceNote} className="flex-1" disabled={!audioBlob || !title.trim()}>Guardar</Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setAudioBlob(null); setTitle(''); }}>Cancelar</Button>
          </div>
        </div>
      )}

      {notes.length === 0 && !showForm ? (
        <div className="glass-card rounded-2xl p-6 text-center">
          <p className="text-3xl mb-2">🎙️</p>
          <p className="text-sm text-muted-foreground">No tienes notas de voz</p>
        </div>
      ) : (
        notes.map((note: any) => (
          <div key={note.id} className="glass-card rounded-2xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">🎙️ {note.title}</p>
                <audio src={note.audio_url} controls className="w-full mt-2" />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {note.duration_seconds && `${Math.floor(note.duration_seconds / 60)}:${String(note.duration_seconds % 60).padStart(2, '0')} · `}
                  {new Date(note.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={() => downloadNote(note.audio_url, note.title)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Descargar">
                  <Download className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => shareNote(note.audio_url, note.title)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Compartir">
                  <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => deleteNote(note.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default NotesPage;
