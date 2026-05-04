
-- Revoke anon access to security definer functions
REVOKE EXECUTE ON FUNCTION public.protect_profile_fields() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_minor_access() FROM anon;
REVOKE EXECUTE ON FUNCTION public.auto_unblock_minor() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon;

-- Fix permissive referrals INSERT policy
DROP POLICY IF EXISTS "Anyone can create referrals" ON public.referrals;
CREATE POLICY "Users can create own referrals"
  ON public.referrals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = referrer_user_id);
