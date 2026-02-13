import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';

const ForceProfileDialog = () => {
  const { profile, settings, updateProfile, updateSettings, needsNameOrSchool } = useAuth();
  const [name, setName] = useState(profile?.display_name || '');
  const [school, setSchool] = useState(settings?.school_name || '');
  const [saving, setSaving] = useState(false);

  if (!needsNameOrSchool) return null;

  const nameMissing = !profile?.display_name?.trim();
  const schoolMissing = !settings?.school_name?.trim();

  const handleSave = async () => {
    if (nameMissing && !name.trim()) return;
    if (schoolMissing && !school.trim()) return;
    setSaving(true);
    if (nameMissing && name.trim()) await updateProfile({ display_name: name.trim() });
    if (schoolMissing && school.trim()) await updateSettings({ school_name: school.trim() });
    setSaving(false);
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-sm" onPointerDownOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>⚠️ Completa tu perfil</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {nameMissing && (
            <div>
              <Label className="font-bold">¿Cómo te llamas?</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" autoFocus />
            </div>
          )}
          {schoolMissing && (
            <div>
              <Label className="font-bold">🏫 Colegio / Espacio de trabajo</Label>
              <Input value={school} onChange={e => setSchool(e.target.value)} placeholder="Nombre de tu colegio o espacio" />
            </div>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || (nameMissing && !name.trim()) || (schoolMissing && !school.trim())}
            className="w-full"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ForceProfileDialog;
