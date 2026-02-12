
-- Add sort_order to tasks and countdowns for reordering
ALTER TABLE public.tasks ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.countdowns ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

-- Admin can update any profile (name, role)
CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can update any task
CREATE POLICY "Admins can update all tasks"
ON public.tasks
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete any task
CREATE POLICY "Admins can delete all tasks"
ON public.tasks
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
