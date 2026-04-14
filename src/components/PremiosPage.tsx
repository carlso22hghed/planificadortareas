import { Gift, Trophy, Star, Lock, Copy, Check, Users, Zap, Medal, Crown, Sparkles } from 'lucide-react';
import { useGamification, ALL_BADGES } from '@/hooks/use-gamification';
import { useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

const REWARDS = [
  { requiredReferrals: 1, name: 'Tema Premium: Amanecer', description: 'Un tema cálido exclusivo', icon: '🌅' },
  { requiredReferrals: 3, name: 'Tema Ciberpunk', description: 'Interfaz estilo neón futurista', icon: '🌃' },
  { requiredReferrals: 5, name: 'Tema Bosque Zen', description: 'Colores naturales relajantes', icon: '🌲' },
  { requiredReferrals: 3, name: '+50MB Almacenamiento', description: 'Sube más archivos a tus tareas', icon: '💾' },
  { requiredReferrals: 1, name: '7 días Premium', description: 'Funciones Pro gratis para ti y tu amigo', icon: '⭐' },
  { requiredReferrals: 5, name: 'Icono Dorado', description: 'Un icono de app exclusivo', icon: '👑' },
];

const PremiosPage = () => {
  const { stats, badges, allBadges, progressToNextLevel, pointsInCurrentLevel, pointsPerLevel, copyInviteLink } = useGamification();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyInviteLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const unlockedKeys = new Set(badges.map((b: any) => b.badge_key));

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Points & Level */}
      <div className="glass-card rounded-2xl p-5 text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <Crown className="w-8 h-8 text-white" />
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-wide">Nivel</p>
          <p className="text-4xl font-extrabold text-foreground">{stats.level}</p>
        </div>
        <div className="space-y-1">
          <Progress value={progressToNextLevel} className="h-3" />
          <p className="text-[10px] text-muted-foreground">{pointsInCurrentLevel}/{pointsPerLevel} puntos para el siguiente nivel</p>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-2">
          <div className="text-center">
            <Zap className="w-4 h-4 mx-auto text-yellow-500 mb-1" />
            <p className="text-lg font-bold text-foreground">{stats.totalPoints}</p>
            <p className="text-[9px] text-muted-foreground">Puntos</p>
          </div>
          <div className="text-center">
            <Check className="w-4 h-4 mx-auto text-green-500 mb-1" />
            <p className="text-lg font-bold text-foreground">{stats.tasksCompletedTotal}</p>
            <p className="text-[9px] text-muted-foreground">Tareas</p>
          </div>
          <div className="text-center">
            <Users className="w-4 h-4 mx-auto text-blue-500 mb-1" />
            <p className="text-lg font-bold text-foreground">{stats.referralCount}</p>
            <p className="text-[9px] text-muted-foreground">Invitados</p>
          </div>
        </div>
      </div>

      {/* Invite Section */}
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">Invita amigos, gana premios</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Cada amigo que se una usando tu enlace os dará 7 días Premium gratis a ambos, +50MB de almacenamiento y puntos extra.
        </p>
        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? '¡Copiado!' : 'Copiar enlace de invitación'}
        </button>
        {stats.referralCode && (
          <p className="text-[10px] text-muted-foreground text-center">
            Tu código: <span className="font-mono font-bold text-foreground">{stats.referralCode}</span>
          </p>
        )}
      </div>

      {/* Badges */}
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Medal className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">Insignias</h3>
          <Badge variant="secondary" className="ml-auto">{badges.length}/{allBadges.length}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {allBadges.map(badge => {
            const unlocked = unlockedKeys.has(badge.key);
            return (
              <div
                key={badge.key}
                className={`p-3 rounded-xl border text-center space-y-1 transition-all ${
                  unlocked
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-muted/20 border-border opacity-50'
                }`}
              >
                <div className="text-2xl">{unlocked ? badge.icon : '🔒'}</div>
                <p className="text-xs font-bold text-foreground">{badge.name}</p>
                <p className="text-[9px] text-muted-foreground">{badge.requirement}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rewards */}
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">Recompensas por invitaciones</h3>
        </div>
        <div className="space-y-2">
          {REWARDS.map((reward, i) => {
            const unlocked = stats.referralCount >= reward.requiredReferrals;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  unlocked
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-muted/10 border-border'
                }`}
              >
                <div className="text-2xl">{unlocked ? reward.icon : '🔒'}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>{reward.name}</p>
                  <p className="text-[10px] text-muted-foreground">{reward.description}</p>
                </div>
                <Badge variant={unlocked ? 'default' : 'outline'} className="shrink-0 text-[9px]">
                  {unlocked ? '✓' : `${reward.requiredReferrals} inv.`}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PremiosPage;
