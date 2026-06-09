import { useEffect, useMemo, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Star, Clock, ListTodo, Heart, StickyNote, Repeat, Info, Users, Calendar, CheckCircle2, Paperclip } from 'lucide-react';

type Priority = { id: string; text: string; done: boolean };
type Appointment = { id: string; time: string; endTime: string; title: string; place: string };
type Todo = { id: string; text: string; importance: 'alta' | 'media' | 'baja'; done: boolean };
type FreeTime = { id: string; activity: string; time: string };
type Habit = { id: string; name: string; done: boolean };
type AgendaItem = { id: string; time: string; duration: string; topic: string; owner: string; objective: 'informar' | 'debatir' | 'decidir' };
type Agreement = { id: string; task: string; owner: string; deadline: string };

type AgendaData = {
  // Información Básica
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  place: string;
  participants: string;
  moderator: string;
  noteTaker: string;
  // Núcleo
  priorities: Priority[];
  appointments: Appointment[];
  todos: Todo[];
  freeTime: FreeTime[];
  notes: string;
  habits: Habit[];
  // Cuerpo de la agenda
  agendaItems: AgendaItem[];
  // Cierre
  questions: string;
  agreements: Agreement[];
  attachments: string;
};

const EMPTY_DATA: AgendaData = {
  title: '',
  date: '',
  startTime: '',
  endTime: '',
  place: '',
  participants: '',
  moderator: '',
  noteTaker: '',
  priorities: [],
  appointments: [],
  todos: [],
  freeTime: [],
  notes: '',
  habits: [
    { id: crypto.randomUUID(), name: 'Beber agua', done: false },
    { id: crypto.randomUUID(), name: 'Leer', done: false },
    { id: crypto.randomUUID(), name: 'Ejercicio', done: false },
  ],
  agendaItems: [],
  questions: '',
  agreements: [],
  attachments: '',
};

const uid = () => crypto.randomUUID();
const todayStr = () => new Date().toISOString().split('T')[0];

const OrdenDiaPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState<AgendaData>(EMPTY_DATA);
  const [saving, setSaving] = useState(false);

  const { data: agenda } = useQuery({
    queryKey: ['daily-agenda', user?.id, date],
    queryFn: async () => {
      const { data } = await (supabase as any).from('daily_agendas').select('*').eq('user_id', user!.id).eq('date', date).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (agenda?.data) {
      setData({ ...EMPTY_DATA, ...(agenda.data as AgendaData) });
    } else {
      setData({ ...EMPTY_DATA, date });
    }
  }, [agenda, date]);

  const save = useCallback(async (next: AgendaData) => {
    if (!user) return;
    setSaving(true);
    await (supabase as any).from('daily_agendas').upsert({ user_id: user.id, date, data: next }, { onConflict: 'user_id,date' });
    queryClient.invalidateQueries({ queryKey: ['daily-agenda', user.id, date] });
    setSaving(false);
  }, [user, date, queryClient]);

  // Debounced save
  useEffect(() => {
    if (!user || !data) return;
    const t = setTimeout(() => { save(data); }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const update = (patch: Partial<AgendaData>) => setData(d => ({ ...d, ...patch }));

  // Priorities (max 3)
  const addPriority = () => {
    if (data.priorities.length >= 3) return;
    update({ priorities: [...data.priorities, { id: uid(), text: '', done: false }] });
  };
  const sortedTodos = useMemo(() => {
    const order = { alta: 0, media: 1, baja: 2 } as const;
    return [...data.todos].sort((a, b) => order[a.importance] - order[b.importance]);
  }, [data.todos]);

  return (
    <div className="space-y-6 animate-slide-up pb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2"><Calendar className="w-6 h-6 text-primary" /> Orden del día</h1>
          <p className="text-sm text-muted-foreground">{saving ? 'Guardando…' : 'Guardado automáticamente'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Fecha</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" />
        </div>
      </div>

      {/* Información Básica */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Info className="w-4 h-4 text-primary" /> Información básica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Título / Objetivo central</Label>
            <Input value={data.title} onChange={e => update({ title: e.target.value })} placeholder="Propósito de la sesión" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Inicio</Label>
              <Input type="time" value={data.startTime} onChange={e => update({ startTime: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Fin</Label>
              <Input type="time" value={data.endTime} onChange={e => update({ endTime: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Lugar / Enlace</Label>
              <Input value={data.place} onChange={e => update({ place: e.target.value })} placeholder="Sala / URL" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Participantes</Label>
              <Input value={data.participants} onChange={e => update({ participants: e.target.value })} placeholder="Lista de asistentes" />
            </div>
            <div>
              <Label className="text-xs">Moderador</Label>
              <Input value={data.moderator} onChange={e => update({ moderator: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Encargado de notas</Label>
              <Input value={data.noteTaker} onChange={e => update({ noteTaker: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prioridades */}
      <Card className="rounded-2xl">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" /> Prioridades principales <span className="text-xs text-muted-foreground font-normal">(máx. 3)</span></CardTitle>
          <Button size="sm" variant="outline" onClick={addPriority} disabled={data.priorities.length >= 3}><Plus className="w-4 h-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.priorities.length === 0 && <p className="text-sm text-muted-foreground">Sin prioridades. Añade hasta 3 tareas críticas para hoy.</p>}
          {data.priorities.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2">
              <Checkbox checked={p.done} onCheckedChange={(v) => update({ priorities: data.priorities.map(x => x.id === p.id ? { ...x, done: !!v } : x) })} />
              <span className="text-xs font-bold w-5">{i + 1}.</span>
              <Input value={p.text} onChange={e => update({ priorities: data.priorities.map(x => x.id === p.id ? { ...x, text: e.target.value } : x) })} placeholder="Tarea crítica" />
              <Button size="icon" variant="ghost" onClick={() => update({ priorities: data.priorities.filter(x => x.id !== p.id) })}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Citas y eventos */}
      <Card className="rounded-2xl">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-blue-500" /> Citas y eventos</CardTitle>
          <Button size="sm" variant="outline" onClick={() => update({ appointments: [...data.appointments, { id: uid(), time: '', endTime: '', title: '', place: '' }] })}><Plus className="w-4 h-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.appointments.length === 0 && <p className="text-sm text-muted-foreground">Sin compromisos con horas fijas.</p>}
          {data.appointments.map(a => (
            <div key={a.id} className="grid grid-cols-12 gap-2 items-center">
              <Input type="time" value={a.time} onChange={e => update({ appointments: data.appointments.map(x => x.id === a.id ? { ...x, time: e.target.value } : x) })} className="col-span-3 sm:col-span-2" />
              <Input type="time" value={a.endTime} onChange={e => update({ appointments: data.appointments.map(x => x.id === a.id ? { ...x, endTime: e.target.value } : x) })} className="col-span-3 sm:col-span-2" />
              <Input value={a.title} onChange={e => update({ appointments: data.appointments.map(x => x.id === a.id ? { ...x, title: e.target.value } : x) })} placeholder="Reunión / Cita" className="col-span-6 sm:col-span-4" />
              <Input value={a.place} onChange={e => update({ appointments: data.appointments.map(x => x.id === a.id ? { ...x, place: e.target.value } : x) })} placeholder="Lugar / Enlace" className="col-span-10 sm:col-span-3" />
              <Button size="icon" variant="ghost" className="col-span-2 sm:col-span-1" onClick={() => update({ appointments: data.appointments.filter(x => x.id !== a.id) })}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Lista de tareas (To-Do) */}
      <Card className="rounded-2xl">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2"><ListTodo className="w-4 h-4 text-emerald-500" /> Lista de tareas (To-Do)</CardTitle>
          <Button size="sm" variant="outline" onClick={() => update({ todos: [...data.todos, { id: uid(), text: '', importance: 'media', done: false }] })}><Plus className="w-4 h-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {sortedTodos.length === 0 && <p className="text-sm text-muted-foreground">Sin tareas. Se ordenan por importancia.</p>}
          {sortedTodos.map(t => (
            <div key={t.id} className="flex items-center gap-2">
              <Checkbox checked={t.done} onCheckedChange={(v) => update({ todos: data.todos.map(x => x.id === t.id ? { ...x, done: !!v } : x) })} />
              <Input value={t.text} onChange={e => update({ todos: data.todos.map(x => x.id === t.id ? { ...x, text: e.target.value } : x) })} placeholder="Pendiente" className="flex-1" />
              <select
                value={t.importance}
                onChange={e => update({ todos: data.todos.map(x => x.id === t.id ? { ...x, importance: e.target.value as Todo['importance'] } : x) })}
                className="h-10 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
              <Button size="icon" variant="ghost" onClick={() => update({ todos: data.todos.filter(x => x.id !== t.id) })}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tiempo libre / Autocuidado */}
      <Card className="rounded-2xl">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2"><Heart className="w-4 h-4 text-pink-500" /> Tiempo libre / Autocuidado</CardTitle>
          <Button size="sm" variant="outline" onClick={() => update({ freeTime: [...data.freeTime, { id: uid(), activity: '', time: '' }] })}><Plus className="w-4 h-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.freeTime.length === 0 && <p className="text-sm text-muted-foreground">Reserva espacios para ejercicio, descanso o desconexión.</p>}
          {data.freeTime.map(f => (
            <div key={f.id} className="grid grid-cols-12 gap-2 items-center">
              <Input value={f.activity} onChange={e => update({ freeTime: data.freeTime.map(x => x.id === f.id ? { ...x, activity: e.target.value } : x) })} placeholder="Ejercicio, lectura, paseo…" className="col-span-7 sm:col-span-8" />
              <Input type="time" value={f.time} onChange={e => update({ freeTime: data.freeTime.map(x => x.id === f.id ? { ...x, time: e.target.value } : x) })} className="col-span-4 sm:col-span-3" />
              <Button size="icon" variant="ghost" className="col-span-1" onClick={() => update({ freeTime: data.freeTime.filter(x => x.id !== f.id) })}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notas rápidas */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><StickyNote className="w-4 h-4 text-amber-500" /> Notas rápidas e ideas</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea value={data.notes} onChange={e => update({ notes: e.target.value })} placeholder="Apuntes rápidos del día…" rows={4} />
        </CardContent>
      </Card>

      {/* Hábitos */}
      <Card className="rounded-2xl">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2"><Repeat className="w-4 h-4 text-violet-500" /> Seguimiento de hábitos</CardTitle>
          <Button size="sm" variant="outline" onClick={() => update({ habits: [...data.habits, { id: uid(), name: '', done: false }] })}><Plus className="w-4 h-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.habits.map(h => (
            <div key={h.id} className="flex items-center gap-2">
              <Checkbox checked={h.done} onCheckedChange={(v) => update({ habits: data.habits.map(x => x.id === h.id ? { ...x, done: !!v } : x) })} />
              <Input value={h.name} onChange={e => update({ habits: data.habits.map(x => x.id === h.id ? { ...x, name: e.target.value } : x) })} placeholder="Hábito (ej. beber agua)" />
              <Button size="icon" variant="ghost" onClick={() => update({ habits: data.habits.filter(x => x.id !== h.id) })}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Cuerpo de la agenda */}
      <Card className="rounded-2xl">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Cuerpo de la agenda (por temas)</CardTitle>
          <Button size="sm" variant="outline" onClick={() => update({ agendaItems: [...data.agendaItems, { id: uid(), time: '', duration: '', topic: '', owner: '', objective: 'informar' }] })}><Plus className="w-4 h-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.agendaItems.length === 0 && <p className="text-sm text-muted-foreground">Añade temas con hora, responsable y objetivo.</p>}
          {data.agendaItems.map(it => (
            <div key={it.id} className="grid grid-cols-12 gap-2 items-center">
              <Input type="time" value={it.time} onChange={e => update({ agendaItems: data.agendaItems.map(x => x.id === it.id ? { ...x, time: e.target.value } : x) })} className="col-span-3 sm:col-span-2" placeholder="Hora" />
              <Input value={it.duration} onChange={e => update({ agendaItems: data.agendaItems.map(x => x.id === it.id ? { ...x, duration: e.target.value } : x) })} placeholder="Dur." className="col-span-3 sm:col-span-1" />
              <Input value={it.topic} onChange={e => update({ agendaItems: data.agendaItems.map(x => x.id === it.id ? { ...x, topic: e.target.value } : x) })} placeholder="Tema" className="col-span-6 sm:col-span-4" />
              <Input value={it.owner} onChange={e => update({ agendaItems: data.agendaItems.map(x => x.id === it.id ? { ...x, owner: e.target.value } : x) })} placeholder="Responsable" className="col-span-8 sm:col-span-3" />
              <select
                value={it.objective}
                onChange={e => update({ agendaItems: data.agendaItems.map(x => x.id === it.id ? { ...x, objective: e.target.value as AgendaItem['objective'] } : x) })}
                className="col-span-3 sm:col-span-1 h-10 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="informar">Informar</option>
                <option value="debatir">Debatir</option>
                <option value="decidir">Decidir</option>
              </select>
              <Button size="icon" variant="ghost" className="col-span-1" onClick={() => update({ agendaItems: data.agendaItems.filter(x => x.id !== it.id) })}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Cierre */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Cierre y seguimiento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Preguntas y comentarios abiertos</Label>
            <Textarea value={data.questions} onChange={e => update({ questions: e.target.value })} rows={3} placeholder="Dudas, comentarios…" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Acuerdos (tareas, responsables, fechas)</Label>
              <Button size="sm" variant="outline" onClick={() => update({ agreements: [...data.agreements, { id: uid(), task: '', owner: '', deadline: '' }] })}><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-2">
              {data.agreements.length === 0 && <p className="text-sm text-muted-foreground">Sin acuerdos registrados.</p>}
              {data.agreements.map(a => (
                <div key={a.id} className="grid grid-cols-12 gap-2 items-center">
                  <Input value={a.task} onChange={e => update({ agreements: data.agreements.map(x => x.id === a.id ? { ...x, task: e.target.value } : x) })} placeholder="Tarea acordada" className="col-span-6" />
                  <Input value={a.owner} onChange={e => update({ agreements: data.agreements.map(x => x.id === a.id ? { ...x, owner: e.target.value } : x) })} placeholder="Responsable" className="col-span-3" />
                  <Input type="date" value={a.deadline} onChange={e => update({ agreements: data.agreements.map(x => x.id === a.id ? { ...x, deadline: e.target.value } : x) })} className="col-span-2" />
                  <Button size="icon" variant="ghost" className="col-span-1" onClick={() => update({ agreements: data.agreements.filter(x => x.id !== a.id) })}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" /> Anexos (enlaces o documentos)</Label>
            <Textarea value={data.attachments} onChange={e => update({ attachments: e.target.value })} rows={2} placeholder="https://… / Documentos previos" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdenDiaPage;
