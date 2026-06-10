
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  is_group BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chats TO authenticated;
GRANT ALL ON public.chats TO service_role;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.chat_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  custom_name TEXT,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chat_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_members TO authenticated;
GRANT ALL ON public.chat_members TO service_role;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON public.chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_chat ON public.chat_members(chat_id);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON public.chat_messages(chat_id, created_at);

CREATE OR REPLACE FUNCTION public.is_chat_member(_chat_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.chat_members WHERE chat_id = _chat_id AND user_id = _user_id AND status = 'accepted')
$$;

CREATE OR REPLACE FUNCTION public.is_chat_member_any(_chat_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.chat_members WHERE chat_id = _chat_id AND user_id = _user_id)
$$;

CREATE POLICY "Members can view their chats" ON public.chats FOR SELECT TO authenticated
  USING (public.is_chat_member_any(id, auth.uid()) OR created_by = auth.uid());
CREATE POLICY "Authenticated can create chats" ON public.chats FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Members can update chat" ON public.chats FOR UPDATE TO authenticated
  USING (public.is_chat_member(id, auth.uid()) OR created_by = auth.uid())
  WITH CHECK (public.is_chat_member(id, auth.uid()) OR created_by = auth.uid());
CREATE POLICY "Creators can delete chats" ON public.chats FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Members view memberships" ON public.chat_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_chat_member_any(chat_id, auth.uid()));
CREATE POLICY "Invite or self-add" ON public.chat_members FOR INSERT TO authenticated
  WITH CHECK (invited_by = auth.uid() OR user_id = auth.uid());
CREATE POLICY "Update own membership" ON public.chat_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Leave chat" ON public.chat_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Members view messages" ON public.chat_messages FOR SELECT TO authenticated
  USING (public.is_chat_member(chat_id, auth.uid()));
CREATE POLICY "Members send messages" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_chat_member(chat_id, auth.uid()));
CREATE POLICY "Senders delete own messages" ON public.chat_messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

CREATE TRIGGER trg_chats_updated_at BEFORE UPDATE ON public.chats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.chats REPLICA IDENTITY FULL;
ALTER TABLE public.chat_members REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

CREATE OR REPLACE FUNCTION public.search_users_by_email(query TEXT)
RETURNS TABLE(user_id UUID, display_name TEXT, email TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.user_id, p.display_name, p.email
  FROM public.profiles p
  WHERE p.email IS NOT NULL
    AND query IS NOT NULL
    AND length(trim(query)) >= 2
    AND p.email ILIKE '%' || query || '%'
    AND p.user_id <> auth.uid()
  ORDER BY p.email
  LIMIT 20
$$;

GRANT EXECUTE ON FUNCTION public.search_users_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_chat_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_chat_member_any(UUID, UUID) TO authenticated;

ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS chat_enabled BOOLEAN NOT NULL DEFAULT true;
