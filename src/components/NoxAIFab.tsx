import { useState } from 'react';
import { X, Bird } from 'lucide-react';
import NoxAISection from './NoxAISection';

interface NoxAIFabProps {
  loading: boolean;
  recommendation: any;
}

const NoxAIFab = ({ loading, recommendation }: NoxAIFabProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* FAB button with owl icon */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="fixed bottom-36 right-4 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        style={{
          background: 'linear-gradient(135deg, hsl(270 80% 55%), hsl(280 90% 40%))',
        }}
      >
        {open ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Bird className="w-7 h-7 text-white" />
        )}
        <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-md animate-pulse" />
      </button>

      {/* Nox AI panel */}
      {open && (
        <div className="fixed bottom-52 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[60vh] animate-slide-up overflow-y-auto">
          <div className="p-4">
            <NoxAISection loading={loading} recommendation={recommendation} />
          </div>
        </div>
      )}
    </>
  );
};

export default NoxAIFab;
