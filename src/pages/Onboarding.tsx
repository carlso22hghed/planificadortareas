import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const Onboarding = () => {
  const { updateProfile, updateSettings } = useAuth();
  const [name, setName] = useState('');
  const [role, setRole] = useState('estudiante');
  const [customRole, setCustomRole] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !schoolName.trim()) return;
    setSaving(true);
    await updateSettings({ school_name: schoolName.trim() });
    await updateProfile({
      display_name: name.trim(),
      role: role === 'otro' ? 'otro' : role,
      custom_role: role === 'otro' ? customRole.trim() || 'otro' : null,
      onboarding_completed: true,
    });
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <img src="/logo.png" alt="Logo" className="w-16 h-16 mx-auto rounded-2xl" />
          <h1 className="text-3xl font-extrabold text-foreground">¡Bienvenido!</h1>
          <p className="text-muted-foreground text-sm">Cuéntanos un poco sobre ti</p>
        </div>

        <div className="glass-card rounded-2xl p-6 space-y-5">
          <div className="space-y-2">
            <Label className="font-bold">¿Cómo te llamas?</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Tu nombre"
              autoFocus
            />
          </div>

          <div className="space-y-3">
            <Label className="font-bold">Soy...</Label>
            <RadioGroup value={role} onValueChange={setRole} className="space-y-2">
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                <RadioGroupItem value="estudiante" id="r-estudiante" />
                <Label htmlFor="r-estudiante" className="cursor-pointer text-sm">Estudiante</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                <RadioGroupItem value="profesor" id="r-profesor" />
                <Label htmlFor="r-profesor" className="cursor-pointer text-sm">Profesor</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                <RadioGroupItem value="otro" id="r-otro" />
                <Label htmlFor="r-otro" className="cursor-pointer text-sm">Otro</Label>
              </div>
            </RadioGroup>

            {role === 'otro' && (
              <Input
                value={customRole}
                onChange={e => setCustomRole(e.target.value)}
                placeholder="¿Cuál es tu rol?"
                className="animate-slide-up"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label className="font-bold">🏫 Colegio / Espacio de trabajo</Label>
            <Input
              value={schoolName}
              onChange={e => setSchoolName(e.target.value)}
              placeholder="Nombre de tu colegio o espacio de trabajo"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !schoolName.trim() || saving}
            className="w-full h-12 text-base rounded-xl"
          >
            {saving ? 'Guardando...' : 'Empezar'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
