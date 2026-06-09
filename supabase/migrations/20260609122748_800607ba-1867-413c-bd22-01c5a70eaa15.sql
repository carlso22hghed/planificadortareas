ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS deberes_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS examenes_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS eventos_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS partidos_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS productividad_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS calendario_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS premios_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS papelera_enabled boolean NOT NULL DEFAULT true;