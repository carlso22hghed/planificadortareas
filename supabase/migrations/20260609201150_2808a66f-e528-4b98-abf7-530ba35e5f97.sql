
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS orden_dia_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.daily_agendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_agendas TO authenticated;
GRANT ALL ON public.daily_agendas TO service_role;

ALTER TABLE public.daily_agendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own daily agendas" ON public.daily_agendas
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_daily_agendas_updated_at
  BEFORE UPDATE ON public.daily_agendas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
