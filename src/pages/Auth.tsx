import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Link, useSearchParams } from 'react-router-dom';

const Auth = () => {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
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

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast({ title: 'Error al iniciar sesión', description: result.error.message, variant: 'destructive' });
      setLoading(false);
    }
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
            <h2 className="text-lg font-bold text-foreground">Inicia sesión</h2>
            <p className="text-sm text-muted-foreground mt-1">Accede con tu cuenta de Google</p>
          </div>

          {refCode && (
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-sm text-primary font-semibold">
              🎁 ¡Te han invitado! Ambos recibiréis 7 días Premium gratis
            </div>
          )}

          <div className="flex items-start space-x-2 text-left">
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
            onClick={handleGoogleSignIn}
            disabled={!accepted || loading}
            className="w-full gap-2 h-11 rounded-xl font-bold"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'Conectando…' : 'Continuar con Google'}
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
