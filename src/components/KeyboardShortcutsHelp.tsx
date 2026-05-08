import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUTS = [
  { key: 'N', desc: 'Nueva tarea' },
  { key: 'D', desc: 'Nuevo deber' },
  { key: 'E', desc: 'Nuevo examen' },
  { key: 'Ctrl+K', desc: 'Buscar (paleta de comandos)' },
  { key: '?', desc: 'Mostrar atajos' },
];

const KeyboardShortcutsHelp = ({ open, onOpenChange }: KeyboardShortcutsHelpProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-xs">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Keyboard className="w-5 h-5 text-primary" /> Atajos de teclado
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-2">
        {SHORTCUTS.map(s => (
          <div key={s.key} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
            <span className="text-sm text-foreground">{s.desc}</span>
            <kbd className="px-2 py-0.5 rounded bg-muted text-xs font-mono font-bold text-foreground">{s.key}</kbd>
          </div>
        ))}
      </div>
    </DialogContent>
  </Dialog>
);

export default KeyboardShortcutsHelp;
