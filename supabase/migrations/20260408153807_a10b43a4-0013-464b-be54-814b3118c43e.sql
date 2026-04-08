
CREATE TABLE public.nox_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  memory_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_recommendation JSONB,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.nox_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own nox memory"
ON public.nox_memory
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_nox_memory_updated_at
BEFORE UPDATE ON public.nox_memory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
