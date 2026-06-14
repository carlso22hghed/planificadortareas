
DROP POLICY IF EXISTS "Chat members can read audio" ON storage.objects;
CREATE POLICY "Chat members can read audio"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-audio'
    AND public.is_chat_member_any( (split_part(name, '/', 1))::uuid, auth.uid() )
  );

DROP POLICY IF EXISTS "Chat members can upload audio" ON storage.objects;
CREATE POLICY "Chat members can upload audio"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-audio'
    AND public.is_chat_member_any( (split_part(name, '/', 1))::uuid, auth.uid() )
    AND owner = auth.uid()
  );

DROP POLICY IF EXISTS "Senders can delete own audio" ON storage.objects;
CREATE POLICY "Senders can delete own audio"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-audio' AND owner = auth.uid());
