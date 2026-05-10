ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE OR REPLACE FUNCTION public.set_task_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.completed = true AND (OLD.completed IS DISTINCT FROM true) THEN
    NEW.completed_at = now();
  ELSIF NEW.completed = false THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_completed_at ON public.tasks;
CREATE TRIGGER trg_tasks_completed_at
BEFORE INSERT OR UPDATE OF completed ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.set_task_completed_at();

UPDATE public.tasks SET completed_at = COALESCE(completed_at, created_at) WHERE completed = true AND completed_at IS NULL;