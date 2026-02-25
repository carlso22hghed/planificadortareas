import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings, Pencil, Check, LogOut, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ALL_SUBJECTS, ALL_SPORT_TYPES, SPORT_EMOJIS, CUSTOM_SPORT_EMOJI } from '@/types/app';
import type { DbSettings } from '@/types/app';
import { useAuth } from '@/hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const FONT_OPTIONS = [
  { value: 'Nunito', label: 'Nunito' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Space Grotesk', label: 'Space Grotesk' },
  { value: 'Lora', label: 'Lora' },
  { value: 'EB Garamond', label: 'EB Garamond' },
  { value: 'Cormorant Garamond', label: 'Cormorant Garamond' },
  { value: 'Space Mono', label: 'Space Mono' },
  { value: 'IBM Plex Mono', label: 'IBM Plex Mono' },
  { value: 'Fira Code', label: 'Fira Code' },
];

interface SettingsPanelProps {
  settings: DbSettings;
  onUpdate: (updates: Partial<DbSettings>) => Promise<void>;
}

const SettingsPanel = ({ settings, onUpdate }: SettingsPanelProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(settings.app_name);
  const [editingSchool, setEditingSchool] = useState(false);
  const [tempSchool, setTempSchool] = useState(settings.school_name);
  const [newSubject, setNewSubject] = useState('');
  const [newSport, setNewSport] = useState('');
  const [fontOpen, setFontOpen] = useState(false);

  const saveName = () => {
    onUpdate({ app_name: tempName || 'Cosas que Hacer' });
    setEditingName(false);
  };
  const saveSchool = () => {
    onUpdate({ school_name: tempSchool || 'Mi Colegio' });
    setEditingSchool(false);
  };

  const toggleSubject = (subject: string) => {
    const enabled = settings.enabled_subjects.includes(subject);
    const newSubjects = enabled
      ? settings.enabled_subjects.filter(s => s !== subject)
      : [...settings.enabled_subjects, subject];
    onUpdate({ enabled_subjects: newSubjects });
  };

  const addCustomSubject = () => {
    if (!newSubject.trim()) return;
    const name = newSubject.trim();
    onUpdate({
      custom_subjects: [...settings.custom_subjects, name],
      enabled_subjects: settings.enabled_subjects.includes(name)
        ? settings.enabled_subjects
        : [...settings.enabled_subjects, name],
    });
    setNewSubject('');
  };

  const removeCustomSubject = (subject: string) => {
    onUpdate({ custom_subjects: settings.custom_subjects.filter(s => s !== subject) });
  };

  const toggleSportType = (sport: string) => {
    const enabled = settings.sport_types.includes(sport);
    if (sport === 'Fútbol' && enabled && settings.sport_types.length === 1) return;
    const newTypes = enabled
      ? settings.sport_types.filter(s => s !== sport)
      : [...settings.sport_types, sport];
    onUpdate({ sport_types: newTypes });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="p-2 rounded-full hover:bg-primary-foreground/20 transition-colors">
          <Settings className="w-5 h-5 text-primary-foreground" />
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>⚙️ Configuración</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-80px)] pr-4">
          <div className="space-y-6 mt-4 pb-8">
            {/* Design Style */}
            <div className="space-y-3">
              <Label className="font-bold">🎨 Estilo de diseño</Label>
              <RadioGroup
                value={(settings as any).design_style || 'minimalist'}
                onValueChange={value => onUpdate({ design_style: value } as any)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                  <RadioGroupItem value="minimalist" id="ds-min" />
                  <Label htmlFor="ds-min" className="cursor-pointer text-sm">Minimalista</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                  <RadioGroupItem value="school" id="ds-school" />
                  <Label htmlFor="ds-school" className="cursor-pointer text-sm">Escolar</Label>
                </div>
              </RadioGroup>
            </div>

            {/* School Background (only when school design) */}
            {(settings as any).design_style === 'school' && (
              <div className="space-y-3">
                <Label className="font-bold">🖼️ Fondo escolar</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'gradient', label: 'Degradado', emoji: '🌈' },
                    { value: 'notebook', label: 'Cuaderno', emoji: '📓' },
                    { value: 'dots', label: 'Puntos', emoji: '⚫' },
                    { value: 'grid', label: 'Cuadrícula', emoji: '📐' },
                    { value: 'chalkboard', label: 'Pizarra', emoji: '🟢' },
                    { value: 'pastel', label: 'Pastel', emoji: '🎀' },
                    { value: 'sunset', label: 'Atardecer', emoji: '🌅' },
                    { value: 'mountains', label: 'Montañas', emoji: '🏔️' },
                    { value: 'ocean', label: 'Océano', emoji: '🌊' },
                    { value: 'forest', label: 'Bosque', emoji: '🌲' },
                    { value: 'sky', label: 'Cielo', emoji: '☁️' },
                  ].map(bg => (
                    <button
                      key={bg.value}
                      onClick={() => onUpdate({ school_background: bg.value } as any)}
                      className={`p-3 rounded-xl text-center text-xs font-semibold transition-all ${
                        ((settings as any).school_background || 'gradient') === bg.value
                          ? 'bg-primary/15 ring-2 ring-primary text-primary'
                          : 'bg-muted/50 hover:bg-muted'
                      }`}
                    >
                      <span className="text-lg block mb-1">{bg.emoji}</span>
                      {bg.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Theme */}
            <div className="space-y-3">
              <Label className="font-bold">🎨 Tema de color</Label>
              <RadioGroup
                value={(settings as any).theme || 'default'}
                onValueChange={value => onUpdate({ theme: value } as any)}
                className="space-y-2"
              >
                {[
                  { value: 'default', label: 'Predeterminado' },
                  { value: 'blue', label: 'Azul' },
                  { value: 'green', label: 'Verde' },
                  { value: 'orange', label: 'Naranja' },
                ].map(t => (
                  <div key={t.value} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                    <RadioGroupItem value={t.value} id={`t-${t.value}`} />
                    <Label htmlFor={`t-${t.value}`} className="cursor-pointer text-sm">{t.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Font Family */}
            <Collapsible open={fontOpen} onOpenChange={setFontOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50">
                <Label className="font-bold cursor-pointer">🔤 Tipo de Letra</Label>
                {fontOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-1">
                {FONT_OPTIONS.map(font => (
                  <button
                    key={font.value}
                    onClick={() => onUpdate({ font_family: font.value } as any)}
                    className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${
                      (settings as any).font_family === font.value ? 'bg-primary/10 text-primary font-semibold' : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                    style={{ fontFamily: font.value }}
                  >
                    {font.label}
                  </button>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* Dark Mode */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <Label className="cursor-pointer text-sm font-semibold">🌙 Modo oscuro</Label>
              <Switch
                checked={settings.dark_mode}
                onCheckedChange={checked => onUpdate({ dark_mode: checked })}
              />
            </div>

            {/* Notification Sound */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <Label className="cursor-pointer text-sm font-semibold">🔊 Sonido de notificación</Label>
              <Switch
                checked={(settings as any).notification_sound !== false}
                onCheckedChange={checked => onUpdate({ notification_sound: checked } as any)}
              />
            </div>

            {/* Nav Position */}
            <div className="space-y-3">
              <Label className="font-bold">📱 Posición de pestañas</Label>
              <RadioGroup
                value={(settings as any).nav_position || 'bottom'}
                onValueChange={value => onUpdate({ nav_position: value } as any)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                  <RadioGroupItem value="bottom" id="nav-bottom" />
                  <Label htmlFor="nav-bottom" className="cursor-pointer text-sm">Barra inferior</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                  <RadioGroupItem value="left" id="nav-left" />
                  <Label htmlFor="nav-left" className="cursor-pointer text-sm">Lateral izquierda</Label>
                </div>
              </RadioGroup>
            </div>

            {/* App Name */}
            <div className="space-y-2">
              <Label className="font-bold">Nombre de la aplicación</Label>
              {editingName ? (
                <div className="flex gap-2">
                  <Input value={tempName} onChange={e => setTempName(e.target.value)} />
                  <Button size="icon" onClick={saveName}><Check className="w-4 h-4" /></Button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="font-semibold text-sm">{settings.app_name}</span>
                  <Button variant="ghost" size="icon" onClick={() => { setTempName(settings.app_name); setEditingName(true); }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* School Name */}
            <div className="space-y-2">
              <Label className="font-bold">Colegio / Espacio de trabajo</Label>
              {editingSchool ? (
                <div className="flex gap-2">
                  <Input value={tempSchool} onChange={e => setTempSchool(e.target.value)} />
                  <Button size="icon" onClick={saveSchool}><Check className="w-4 h-4" /></Button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="font-semibold text-sm">{settings.school_name}</span>
                  <Button variant="ghost" size="icon" onClick={() => { setTempSchool(settings.school_name); setEditingSchool(true); }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Tareas Tab */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <Label className="cursor-pointer text-sm font-semibold">Pestaña de Tareas</Label>
              <Switch
                checked={settings.tareas_enabled}
                onCheckedChange={checked => onUpdate({ tareas_enabled: checked })}
              />
            </div>

            {/* Schedule Tab */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <Label className="cursor-pointer text-sm font-semibold">Pestaña de Horario (abajo)</Label>
              <Switch
                checked={(settings as any).schedule_tab_enabled || false}
                onCheckedChange={checked => onUpdate({ schedule_tab_enabled: checked } as any)}
              />
            </div>

            {/* Grouping Mode */}
            <div className="space-y-3">
              <Label className="font-bold">Agrupación por asignatura</Label>
              <RadioGroup
                value={(settings as any).grouping_mode || 'subject_title'}
                onValueChange={value => onUpdate({ grouping_mode: value } as any)}
                className="space-y-2"
              >
                {[
                  { value: 'none', label: 'No agrupar' },
                  { value: 'subject_no_title', label: 'Agrupar sin título' },
                  { value: 'subject_title', label: 'Agrupar con título' },
                ].map(g => (
                  <div key={g.value} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                    <RadioGroupItem value={g.value} id={`g-${g.value}`} />
                    <Label htmlFor={`g-${g.value}`} className="cursor-pointer text-sm">{g.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Partidos Mode */}
            <div className="space-y-3">
              <Label className="font-bold">Pestaña de Partidos</Label>
              <RadioGroup
                value={settings.partidos_mode}
                onValueChange={value => onUpdate({ partidos_mode: value })}
                className="space-y-2"
              >
                {[
                  { value: 'off', label: 'Desactivada' },
                  { value: 'replace', label: 'Reemplazar Eventos' },
                  { value: 'new_tab', label: 'Añadir como pestaña nueva' },
                ].map(p => (
                  <div key={p.value} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                    <RadioGroupItem value={p.value} id={`p-${p.value}`} />
                    <Label htmlFor={`p-${p.value}`} className="cursor-pointer text-sm">{p.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Sport Types */}
            {settings.partidos_mode !== 'off' && (
              <div className="space-y-3">
                <Label className="font-bold">Tipos de deporte</Label>
                {ALL_SPORT_TYPES.map(sport => (
                  <label key={sport} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors text-sm">
                    <Checkbox
                      checked={settings.sport_types.includes(sport)}
                      onCheckedChange={() => toggleSportType(sport)}
                    />
                    <span>{SPORT_EMOJIS[sport] || CUSTOM_SPORT_EMOJI} {sport}</span>
                  </label>
                ))}

                {/* Custom sports added by user */}
                {settings.sport_types.filter(s => !ALL_SPORT_TYPES.includes(s)).map(sport => (
                  <div key={sport} className="flex items-center justify-between p-2 rounded-lg bg-primary/10 text-sm">
                    <span>{CUSTOM_SPORT_EMOJI} {sport}</span>
                    <button onClick={() => {
                      const newTypes = settings.sport_types.filter(s => s !== sport);
                      onUpdate({ sport_types: newTypes.length > 0 ? newTypes : ['Fútbol'] });
                    }} className="text-destructive text-xs font-bold">✕</button>
                  </div>
                ))}

                <div className="flex gap-2">
                  <Input
                    value={newSport}
                    onChange={e => setNewSport(e.target.value)}
                    placeholder="Ej: Rugby"
                    className="text-sm"
                    onKeyDown={e => e.key === 'Enter' && newSport.trim() && (() => {
                      onUpdate({ sport_types: [...settings.sport_types, newSport.trim()] });
                      setNewSport('');
                    })()}
                  />
                  <Button size="icon" variant="outline" onClick={() => {
                    if (!newSport.trim()) return;
                    onUpdate({ sport_types: [...settings.sport_types, newSport.trim()] });
                    setNewSport('');
                  }} disabled={!newSport.trim()}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Subjects */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-bold">Asignaturas</Label>
                <span className="text-xs text-muted-foreground">{settings.enabled_subjects.length} activas</span>
              </div>

              {settings.custom_subjects.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground">Personalizadas:</p>
                  {settings.custom_subjects.map(subject => (
                    <div key={subject} className="flex items-center justify-between p-2 rounded-lg bg-primary/10 text-sm">
                      <span>{subject}</span>
                      <button onClick={() => removeCustomSubject(subject)} className="text-destructive text-xs font-bold">✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  placeholder="Ej: Matemáticas 5ºC"
                  className="text-sm"
                  onKeyDown={e => e.key === 'Enter' && addCustomSubject()}
                />
                <Button size="icon" variant="outline" onClick={addCustomSubject} disabled={!newSubject.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {ALL_SUBJECTS.map(subject => (
                  <label key={subject} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors text-sm">
                    <Checkbox
                      checked={settings.enabled_subjects.includes(subject)}
                      onCheckedChange={() => toggleSubject(subject)}
                    />
                    <span className="truncate">{subject}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sign Out */}
            <Button variant="destructive" className="w-full gap-2" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </Button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default SettingsPanel;
