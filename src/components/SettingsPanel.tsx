import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings, Pencil, Check, LogOut, Plus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ALL_SUBJECTS, ALL_SPORT_TYPES, SPORT_EMOJIS } from '@/types/app';
import type { DbSettings } from '@/types/app';
import { useAuth } from '@/hooks/use-auth';
import { useNavigate } from 'react-router-dom';

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
    // Auto-enable the custom subject
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
    if (sport === 'Fútbol' && enabled && settings.sport_types.length === 1) return; // keep at least fútbol
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
            {/* Theme */}
            <div className="space-y-3">
              <Label className="font-bold">🎨 Tema</Label>
              <RadioGroup
                value={(settings as any).theme || 'default'}
                onValueChange={value => onUpdate({ theme: value } as any)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                  <RadioGroupItem value="default" id="t-default" />
                  <Label htmlFor="t-default" className="cursor-pointer text-sm">Predeterminado</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                  <RadioGroupItem value="blue" id="t-blue" />
                  <Label htmlFor="t-blue" className="cursor-pointer text-sm">Azul</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                  <RadioGroupItem value="green" id="t-green" />
                  <Label htmlFor="t-green" className="cursor-pointer text-sm">Verde</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                  <RadioGroupItem value="orange" id="t-orange" />
                  <Label htmlFor="t-orange" className="cursor-pointer text-sm">Naranja</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Dark Mode */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <Label className="cursor-pointer text-sm font-semibold">🌙 Modo oscuro</Label>
              <Switch
                checked={settings.dark_mode}
                onCheckedChange={checked => onUpdate({ dark_mode: checked })}
              />
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
              <Label className="font-bold">Colegio</Label>
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
              <Label className="cursor-pointer text-sm font-semibold">Pestaña de Horario</Label>
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
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                  <RadioGroupItem value="none" id="g-none" />
                  <Label htmlFor="g-none" className="cursor-pointer text-sm">No agrupar</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                  <RadioGroupItem value="subject_no_title" id="g-no-title" />
                  <Label htmlFor="g-no-title" className="cursor-pointer text-sm">Agrupar sin título</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                  <RadioGroupItem value="subject_title" id="g-title" />
                  <Label htmlFor="g-title" className="cursor-pointer text-sm">Agrupar con título</Label>
                </div>
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
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                  <RadioGroupItem value="off" id="p-off" />
                  <Label htmlFor="p-off" className="cursor-pointer text-sm">Desactivada</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                  <RadioGroupItem value="replace" id="p-replace" />
                  <Label htmlFor="p-replace" className="cursor-pointer text-sm">Reemplazar pestaña de Eventos</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                  <RadioGroupItem value="new_tab" id="p-new" />
                  <Label htmlFor="p-new" className="cursor-pointer text-sm">Añadir como pestaña nueva</Label>
                </div>
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
                    <span>{SPORT_EMOJIS[sport] || '🏅'} {sport}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Subjects */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-bold">Asignaturas</Label>
                <span className="text-xs text-muted-foreground">{settings.enabled_subjects.length} activas</span>
              </div>

              {/* Custom subjects */}
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

              {/* Add custom subject */}
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
