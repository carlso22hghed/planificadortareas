
-- Fix profile email exposure: restrict SELECT to own profile + admins
DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Make voice-notes bucket private
UPDATE storage.buckets SET public = false WHERE id = 'voice-notes';

-- Storage policies for voice-notes (owner-scoped)
DROP POLICY IF EXISTS "Voice notes owner read" ON storage.objects;
DROP POLICY IF EXISTS "Voice notes owner insert" ON storage.objects;
DROP POLICY IF EXISTS "Voice notes owner update" ON storage.objects;
DROP POLICY IF EXISTS "Voice notes owner delete" ON storage.objects;

CREATE POLICY "Voice notes owner read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'voice-notes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Voice notes owner insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'voice-notes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Voice notes owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'voice-notes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Voice notes owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'voice-notes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Explicit deny: only admins (or service_role bypass) may write to user_roles
CREATE POLICY "Admins manage user_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
