
-- 1. Add minor protection columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'activo';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS unlocked_at timestamptz;

-- 2. Protect immutable profile fields (date_of_birth once set, status, unlocked_at, role, email)
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only apply restrictions to non-admin users editing their own profile
  IF auth.uid() = OLD.user_id AND NOT has_role(auth.uid(), 'admin') THEN
    -- date_of_birth is immutable once set
    IF OLD.date_of_birth IS NOT NULL AND NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth THEN
      RAISE EXCEPTION 'La fecha de nacimiento no se puede modificar una vez establecida';
    END IF;
    -- status cannot be changed by the user
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      NEW.status := OLD.status;
    END IF;
    -- unlocked_at cannot be changed by the user
    IF NEW.unlocked_at IS DISTINCT FROM OLD.unlocked_at THEN
      NEW.unlocked_at := OLD.unlocked_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_immutable ON public.profiles;
CREATE TRIGGER protect_profile_immutable
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_fields();

-- 3. Check minor access - blocks inserts if user status is 'bloqueado'
CREATE OR REPLACE FUNCTION public.check_minor_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_status text;
  user_dob date;
BEGIN
  SELECT status, date_of_birth INTO user_status, user_dob
  FROM public.profiles
  WHERE user_id = auth.uid();

  -- Auto-unblock if they turned 14
  IF user_status = 'bloqueado' AND user_dob IS NOT NULL THEN
    IF age(current_date, user_dob) >= interval '14 years' THEN
      UPDATE public.profiles
      SET status = 'activo', unlocked_at = now()
      WHERE user_id = auth.uid();
      user_status := 'activo';
    END IF;
  END IF;

  IF user_status = 'bloqueado' THEN
    RAISE EXCEPTION 'Acceso restringido: cuenta bloqueada por edad';
  END IF;

  RETURN NEW;
END;
$$;

-- Apply minor access check triggers
DROP TRIGGER IF EXISTS check_minor_tasks ON public.tasks;
CREATE TRIGGER check_minor_tasks
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.check_minor_access();

DROP TRIGGER IF EXISTS check_minor_written_notes ON public.written_notes;
CREATE TRIGGER check_minor_written_notes
  BEFORE INSERT ON public.written_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_minor_access();

DROP TRIGGER IF EXISTS check_minor_voice_notes ON public.voice_notes;
CREATE TRIGGER check_minor_voice_notes
  BEFORE INSERT ON public.voice_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_minor_access();

DROP TRIGGER IF EXISTS check_minor_dont_forget ON public.dont_forget;
CREATE TRIGGER check_minor_dont_forget
  BEFORE INSERT ON public.dont_forget
  FOR EACH ROW
  EXECUTE FUNCTION public.check_minor_access();

DROP TRIGGER IF EXISTS check_minor_countdowns ON public.countdowns;
CREATE TRIGGER check_minor_countdowns
  BEFORE INSERT ON public.countdowns
  FOR EACH ROW
  EXECUTE FUNCTION public.check_minor_access();

-- 4. Auto-unblock function that runs on login (called from frontend after auth)
CREATE OR REPLACE FUNCTION public.auto_unblock_minor()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_status text;
  user_dob date;
BEGIN
  SELECT status, date_of_birth INTO user_status, user_dob
  FROM public.profiles
  WHERE user_id = auth.uid();

  IF user_status = 'bloqueado' AND user_dob IS NOT NULL THEN
    IF age(current_date, user_dob) >= interval '14 years' THEN
      UPDATE public.profiles
      SET status = 'activo', unlocked_at = now()
      WHERE user_id = auth.uid();
    END IF;
  END IF;
END;
$$;
