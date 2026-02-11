import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings, Pencil, Check } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import type { AppSettings } from '@/types/app';
import { ALL_SUBJECTS } from '@/types/app';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SettingsPanelProps {
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
}

const SettingsPanel = ({ settings, onUpdate }: SettingsPanelProps) => {
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(settings.appName);
  const [editingSchool, setEditingSchool] = useState(false);
  const [tempSchool, setTempSchool] = useState(settings.schoolName);

  const saveName = () => {
    onUpdate({ ...settings, appName: tempName || 'Cosas que Hacer' });
    setEditingName(false);
  };

  const saveSchool = () => {
    onUpdate({ ...settings, schoolName: tempSchool || 'Mi Colegio' });
    setEditingSchool(false);
  };

  const toggleSubject = (subject: string) => {
    const enabled = settings.enabledSubjects.includes(subject);
    const newSubjects = enabled
      ? settings.enabledSubjects.filter(s => s !== subject)
      : [...settings.enabledSubjects, subject];
    onUpdate({ ...settings, enabledSubjects: newSubjects });
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
                  <span className="font-semibold text-sm">{settings.appName}</span>
                  <Button variant="ghost" size="icon" onClick={() => { setTempName(settings.appName); setEditingName(true); }}>
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
                  <span className="font-semibold text-sm">{settings.schoolName}</span>
                  <Button variant="ghost" size="icon" onClick={() => { setTempSchool(settings.schoolName); setEditingSchool(true); }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Tareas Tab */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <Label className="cursor-pointer text-sm font-semibold">Pestaña de Tareas</Label>
              <Switch
                checked={settings.tareasEnabled}
                onCheckedChange={checked => onUpdate({ ...settings, tareasEnabled: checked })}
              />
            </div>

            {/* Partidos Mode */}
            <div className="space-y-3">
              <Label className="font-bold">Pestaña de Partidos</Label>
              <RadioGroup
                value={settings.partidosMode}
                onValueChange={(value) => onUpdate({ ...settings, partidosMode: value as AppSettings['partidosMode'] })}
                className="space-y-2"
              >
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                  <RadioGroupItem value="off" id="partidos-off" />
                  <Label htmlFor="partidos-off" className="cursor-pointer text-sm">Desactivada</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                  <RadioGroupItem value="replace" id="partidos-replace" />
                  <Label htmlFor="partidos-replace" className="cursor-pointer text-sm">Reemplazar pestaña de Eventos</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                  <RadioGroupItem value="new_tab" id="partidos-new" />
                  <Label htmlFor="partidos-new" className="cursor-pointer text-sm">Añadir como pestaña nueva</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Subjects */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-bold">Asignaturas</Label>
                <span className="text-xs text-muted-foreground">{settings.enabledSubjects.length} activas</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ALL_SUBJECTS.map(subject => (
                  <label
                    key={subject}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors text-sm"
                  >
                    <Checkbox
                      checked={settings.enabledSubjects.includes(subject)}
                      onCheckedChange={() => toggleSubject(subject)}
                    />
                    <span className="truncate">{subject}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default SettingsPanel;
