
-- Add grouping_mode and schedule_tab_enabled to user_settings
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS grouping_mode text NOT NULL DEFAULT 'subject_title',
  ADD COLUMN IF NOT EXISTS schedule_tab_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'default';
