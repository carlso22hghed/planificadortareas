import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { sanitizeInput, isPersonalEmail, calculateAge } from '@/lib/sanitize';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Onboarding = () => {
  const { user, updateProfile, updateSettings } = useAuth();
  const [name, setName] = useState('');
  const [role, setRole] = useState('estudiante');
  const [customRole, setCustomRole] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const cleanName = sanitizeInput(name);
    const cleanSchool = sanitizeInput(schoolName);
    if (!cleanName || !cleanSchool) return;

    // Age verification
    if (!dateOfBirth) {
      toast({ title: 'Fecha de nacimiento requerida', description: 'Necesitamos tu fecha de nacimiento para continuar.', variant: 'destructive' });
      return;
    }

    const dob = new Date(dateOfBirth);
    const age = calculateAge(dob);
    const email = user?.email || '';
    const personal = isPersonalEmail(email);

    // Block minors under 14 with personal email
    if (age < 14 && personal) {
      toast({
        title: '⚠️ Acceso restringido',
        description: 'Los menores de 14 años solo pueden acceder con una cuenta de correo escolar o institucional. Pide a tu colegio una cuenta autorizada.',
        variant: 'destructive',
      });
      // Set profile as blocked in DB
      setSaving(true);
      await updateProfile({
        display_name: cleanName,
        role: role === 'otro' ? 'otro' : role,
        custom_role: role === 'otro' ? sanitizeInput(customRole) || 'otro' : null,
        date_of_birth: dateOfBirth,
        status: 'bloqueado',
        onboarding_completed: true,
      } as any);
      await updateSettings({ school_name: cleanSchool });
      // Sign out the blocked user
      await supabase.auth.signOut();
      setSaving(false);
      return;
    }

    setSaving(true);
    await updateSettings({ school_name: cleanSchool });
    await updateProfile({
      display_name: cleanName,
      role: role === 'otro' ? 'otro' : role,
      custom_role: role === 'otro' ? sanitizeInput(customRole) || 'otro' : null,
      date_of_birth: dateOfBirth,
      onboarding_completed: true,
    } as any);
    setSaving(false);
  };

  // Max date: today, min date: reasonable (e.g. 1920)
  const today = new Date().toISOString().split('T')[0];

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
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label className="font-bold">🎂 Fecha de nacimiento</Label>
            <Input
              type="date"
              value={dateOfBirth}
              onChange={e => setDateOfBirth(e.target.value)}
              max={today}
              min="1920-01-01"
            />
            <p className="text-xs text-muted-foreground">
              Necesitamos verificar tu edad según nuestra política de privacidad
            </p>
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
                maxLength={50}
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
              maxLength={200}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !schoolName.trim() || !dateOfBirth || saving}
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
