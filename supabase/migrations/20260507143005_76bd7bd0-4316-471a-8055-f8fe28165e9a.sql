
-- Table for shareable task list links
CREATE TABLE public.shared_lists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  share_token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  list_type text NOT NULL DEFAULT 'all',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone
);

ALTER TABLE public.shared_lists ENABLE ROW LEVEL SECURITY;

-- Owner can manage their shares
CREATE POLICY "Users can manage own shared lists"
  ON public.shared_lists FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Anyone can read by token (for public shared views)
CREATE POLICY "Anyone can view shared lists by token"
  ON public.shared_lists FOR SELECT
  USING (true);
