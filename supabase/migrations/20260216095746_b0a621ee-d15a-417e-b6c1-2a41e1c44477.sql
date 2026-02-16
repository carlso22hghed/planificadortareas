
-- Add schedule_name to schedule table for multiple schedules per user
ALTER TABLE public.schedule ADD COLUMN schedule_name text NOT NULL DEFAULT 'Mi Horario';

-- Add design_style, font_family, nav_position to user_settings
ALTER TABLE public.user_settings ADD COLUMN design_style text NOT NULL DEFAULT 'minimalist';
ALTER TABLE public.user_settings ADD COLUMN font_family text NOT NULL DEFAULT 'Nunito';
ALTER TABLE public.user_settings ADD COLUMN nav_position text NOT NULL DEFAULT 'bottom';

-- Admin needs to read all schedules and manage them
CREATE POLICY "Admins can manage all schedules"
ON public.schedule
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin needs to read user_settings for viewing user apps
CREATE POLICY "Admins can view all settings"
ON public.user_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
