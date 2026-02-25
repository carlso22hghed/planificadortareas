
-- Add new columns to tasks
ALTER TABLE public.tasks ALTER COLUMN due_date DROP NOT NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS importance text DEFAULT 'normal';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS grade text;

-- Add settings for new pages
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS dont_forget_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS notes_enabled boolean NOT NULL DEFAULT false;

-- Create dont_forget table
CREATE TABLE public.dont_forget (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.dont_forget ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own reminders" ON public.dont_forget FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create written_notes table
CREATE TABLE public.written_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  reminder_time text,
  reminder_date text,
  reminder_frequency integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.written_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own written notes" ON public.written_notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create voice_notes table
CREATE TABLE public.voice_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  audio_url text NOT NULL,
  duration_seconds integer,
  reminder_time text,
  reminder_date text,
  reminder_frequency integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.voice_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own voice notes" ON public.voice_notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Storage bucket for voice notes
INSERT INTO storage.buckets (id, name, public) VALUES ('voice-notes', 'voice-notes', true) ON CONFLICT DO NOTHING;
CREATE POLICY "Users can upload voice notes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'voice-notes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can read own voice notes" ON storage.objects FOR SELECT USING (bucket_id = 'voice-notes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own voice notes" ON storage.objects FOR DELETE USING (bucket_id = 'voice-notes' AND auth.uid()::text = (storage.foldername(name))[1]);
