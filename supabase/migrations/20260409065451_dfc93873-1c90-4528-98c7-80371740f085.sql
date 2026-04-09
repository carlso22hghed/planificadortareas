
CREATE TABLE public.nox_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL,
  message_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nox_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own nox chat messages"
  ON public.nox_chat_messages FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_nox_chat_user_date ON public.nox_chat_messages (user_id, message_date);
