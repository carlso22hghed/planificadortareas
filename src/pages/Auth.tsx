import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';

const Auth = () => {
  const [accepted, setAccepted] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const refCode = searchParams.get('ref');

  useEffect(() => {
    if (refCode) {
      localStorage.setItem('pendingReferralCode', refCode);
    }
  }, [refCode]);

  useEffect(() => {
    const processReferral = async () => {
      const code = localStorage.getItem('pendingReferralCode');
      if (!code) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: referrerGamification } = await supabase
        .from('user_gamification')
        .select('user_id')
        .eq('referral_code', code)
        .maybeSingle();
      if (!referrerGamification || referrerGamification.user_id === user.id) {
        localStorage.removeItem('pendingReferralCode');
        return;
      }
      const { data: existing } = await supabase
        .from('referrals')
        .select('id')
        .eq('referrer_user_id', referrerGamification.user_id)
        .eq('referred_user_id', user.id)
        .maybeSingle();
      if (existing) {
        localStorage.removeItem('pendingReferralCode');
        return;
      }
      await supabase.from('referrals').insert({
        referrer_user_id: referrerGamification.user_id,
        referred_user_id: user.id,
        referral_code: code,
        status: 'completed',
      });
      const { data: referrerData } = await supabase
        .from('user_gamification')
        .select('premium_days_remaining, referral_count, total_points')
        .eq('user_id', referrerGamification.user_id)
        .single();
      if (referrerData) {
        await supabase.from('user_gamification').update({
          premium_days_remaining: (referrerData.premium_days_remaining || 0) + 7,
          referral_count: (referrerData.referral_count || 0) + 1,
          total_points: (referrerData.total_points || 0) + 50,
        }).eq('user_id', referrerGamification.user_id);
      }
      const { data: myData } = await supabase
        .from('user_gamification')
        .select('premium_days_remaining, total_points')
        .eq('user_id', user.id)
        .maybeSingle();
      if (myData) {
        await supabase.from('user_gamification').update({
          premium_days_remaining: (myData.premium_days_remaining || 0) + 7,
          total_points: (myData.total_points || 0) + 50,
        }).eq('user_id', user.id);
      }
      localStorage.removeItem('pendingReferralCode');
      toast({ title: '🎉 ¡Referido exitoso!', description: '¡Ambos habéis recibido 7 días Premium gratis!' });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setTimeout(processReferral, 2000);
      }
    });
    return () => subscription.unsubscribe();
  }, []);


  const enterDemoMode = () => {
    localStorage.setItem('demo-mode', 'true');
    navigate('/demo');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-foreground">📚 Planificador Tareas</h1>
          <p className="text-muted-foreground text-sm">Organiza tus deberes, exámenes y más</p>
        </div>

        <div className="glass-card rounded-2xl p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">Acceso</h2>
            <p className="text-sm text-muted-foreground mt-1">Prueba la app en modo demo</p>
          </div>

          {refCode && (
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-sm text-primary font-semibold">
              🎁 ¡Te han invitado! Ambos recibiréis 7 días Premium gratis
            </div>
          )}

          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={accepted}
              onCheckedChange={(v) => setAccepted(v === true)}
              className="mt-0.5"
            />
            <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight cursor-pointer">
              Acepto los{' '}
              <Link to="/uso" className="text-primary underline hover:text-primary/80">
                términos y condiciones
              </Link>
            </label>
          </div>

          <Button
            onClick={enterDemoMode}
            disabled={!accepted}
            variant="secondary"
            className="w-full gap-2 h-11 rounded-xl font-bold"
          >
            <Eye className="w-4 h-4" /> Probar Demo Gratis
          </Button>
        </div>


        <p className="text-xs text-muted-foreground">
          Al iniciar sesión, tus datos se guardarán de forma segura
        </p>
      </div>
    </div>
  );
};

export default Auth;
