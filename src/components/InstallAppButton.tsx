import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

interface InstallAppButtonProps {
  className?: string;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  label?: string;
}

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  // @ts-ignore - iOS Safari
  window.navigator.standalone === true;

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);

const InstallAppButton = ({
  className,
  variant = 'secondary',
  size = 'default',
  label = 'Instalar app',
}: InstallAppButtonProps) => {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') setInstalled(true);
      setDeferred(null);
      return;
    }
    if (isIOS()) {
      toast({
        title: 'Instalar en iPhone/iPad',
        description: 'Toca el botón Compartir y elige "Añadir a pantalla de inicio".',
      });
      return;
    }
    toast({
      title: 'Instalación no disponible aún',
      description: 'Abre el menú del navegador y elige "Instalar app" o "Añadir a pantalla de inicio".',
    });
  };

  return (
    <Button onClick={handleClick} variant={variant} size={size} className={className}>
      <Download className="w-4 h-4 mr-2" /> {label}
    </Button>
  );
};

export default InstallAppButton;
