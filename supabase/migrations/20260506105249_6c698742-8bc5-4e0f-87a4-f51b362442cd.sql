
ALTER TABLE public.user_settings
ADD COLUMN context_menu_order text[] NOT NULL DEFAULT '{}';
