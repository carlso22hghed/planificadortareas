
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_type text,
  ADD COLUMN IF NOT EXISTS audio_duration_ms integer;

DROP POLICY IF EXISTS "Senders can update own messages" ON public.chat_messages;
CREATE POLICY "Senders can update own messages"
  ON public.chat_messages FOR UPDATE
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Senders can delete own messages" ON public.chat_messages;
CREATE POLICY "Senders can delete own messages"
  ON public.chat_messages FOR DELETE
  USING (auth.uid() = sender_id);

CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  is_online boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.user_presence TO authenticated;
GRANT ALL ON public.user_presence TO service_role;

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read presence" ON public.user_presence;
CREATE POLICY "Anyone authenticated can read presence"
  ON public.user_presence FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users upsert own presence" ON public.user_presence;
CREATE POLICY "Users upsert own presence"
  ON public.user_presence FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own presence" ON public.user_presence;
CREATE POLICY "Users update own presence"
  ON public.user_presence FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
ALTER TABLE public.user_presence REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
