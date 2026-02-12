-- Change default school_name to empty string so onboarding asks for it
ALTER TABLE public.user_settings ALTER COLUMN school_name SET DEFAULT '';

-- Remove duplicate lowercase 'fútbol' default, keep 'Fútbol' 
ALTER TABLE public.user_settings ALTER COLUMN sport_types SET DEFAULT ARRAY['Fútbol'::text];