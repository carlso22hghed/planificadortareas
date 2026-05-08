
-- Add task_status column for paused/blocked states
ALTER TABLE public.tasks
ADD COLUMN task_status text NOT NULL DEFAULT 'pendiente';

-- Add comments column for inline task notes
ALTER TABLE public.tasks
ADD COLUMN comments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Add onboarding_tour_completed to user_settings
ALTER TABLE public.user_settings
ADD COLUMN onboarding_tour_completed boolean NOT NULL DEFAULT false;
