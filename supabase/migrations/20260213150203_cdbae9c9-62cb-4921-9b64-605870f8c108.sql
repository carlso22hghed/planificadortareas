
-- Add location field to tasks for events
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS location text;

-- Add study_completed for exam study/practice sub-task
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS study_completed boolean NOT NULL DEFAULT false;

-- Add reminder_date for custom notification date
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS reminder_date text;

-- Add last_location to profiles for tracking where users log in from
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_location text;

-- Create schedule table
CREATE TABLE IF NOT EXISTS public.schedule (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 4),
  time_slot text NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own schedule"
ON public.schedule FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all schedules"
ON public.schedule FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
